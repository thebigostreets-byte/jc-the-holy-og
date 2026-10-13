import {cloneBuildingMaterial} from './map-materials.js';
export function createBuildingPhotoLibrary(THREE,mobile=false){
 const cache=new Map();
 const ready=new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(Error('Photo storage is not supported in this browser'));
  const q=indexedDB.open('jc-building-photos',1);
  q.onupgradeneeded=()=>q.result.createObjectStore('photos');
  q.onsuccess=()=>resolve(q.result);
  q.onerror=()=>reject(q.error||Error('Photo storage unavailable'));
 });
 async function transaction(id,blob,mode='readonly'){
  const db=await ready;
  return new Promise((resolve,reject)=>{
   const req=(db.transaction('photos',mode).objectStore('photos'));
   const op=blob===undefined?req.get(id):blob===null?req.delete(id):req.put(blob,id);
   op.onsuccess=()=>resolve(op.result);op.onerror=()=>reject(op.error);
  });
 }
 async function save(id,file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>25e6)throw Error('Select a PNG/JPG/WebP photo under 25 MB');
  const url=URL.createObjectURL(file),image=new Image();
  try{await new Promise((ok,fail)=>{image.onload=ok;image.onerror=()=>fail(Error('Cannot open photo'));image.src=url;});
   const max=mobile?1024:2048,ratio=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(Error('Image conversion failed')),'image/webp',.94));
   await transaction(id,blob,'readwrite');
   const previous=cache.get(id);cache.delete(id);previous?.then(t=>t?.dispose()).catch(()=>{});
   return blob.size;
  }finally{URL.revokeObjectURL(url);}
 }
 async function get(id){
  if(!cache.has(id))cache.set(id,(async()=>{
   const blob=await transaction(id);if(!blob)return null;
   const url=URL.createObjectURL(blob);
   try{const tex=await new THREE.TextureLoader().loadAsync(url);
    tex.flipY=false;tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.ClampToEdgeWrapping;tex.anisotropy=mobile?1:4;tex.needsUpdate=true;return tex;
   }finally{URL.revokeObjectURL(url);}
  })().catch(e=>{cache.delete(id);throw e;}));
  return cache.get(id);
 }
 async function remove(id){await transaction(id,null,'readwrite');const prior=cache.get(id);cache.delete(id);prior?.then(t=>t?.dispose()).catch(()=>{});}
 async function exportPhotos(ids){
  const photos={};for(const id of ids){const blob=await transaction(id);if(!blob)continue;photos[id]=await new Promise((ok,fail)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=fail;f.readAsDataURL(blob);});}return photos;
 }
 async function importPhotos(photos){
  for(const [id,data] of Object.entries(photos||{})){
   if(!/^NGA14-\d+$/.test(id)||typeof data!=='string'||data.length>12e6||!/^data:image\/(?:png|jpeg|webp);base64,/.test(data))continue;
   const blob=await (await fetch(data)).blob();await transaction(id,blob,'readwrite');const p=cache.get(id);cache.delete(id);p?.then(t=>t?.dispose()).catch(()=>{});
  }
 }
 function clear(ob){
  for(const mesh of ob?.children||[]){if(!mesh.isMesh||!mesh.userData.jcPhotoOwn)continue;
   const mat=mesh.material;delete mat.userData.customTexture;
   if(mesh.userData.jcPhotoUv&&mesh.userData.jcOldUv)mesh.geometry.setAttribute('uv',mesh.userData.jcOldUv);
   mesh.userData.jcPhotoUv=false;mat.map=mat.userData.original?.map||null;
   if(mat.userData.original?.color?.isColor)mat.color.copy(mat.userData.original.color);
   mat.roughness=mat.userData.original?.roughness??.9;mat.needsUpdate=true;
  }
 }
 function apply(ob,edit,edits,notify){
  const id=ob?.userData?.buildingId;if(!id||!edit?.textureId||edit.surface==='plain')return;
  get(edit.textureId).then(tex=>{
   if(!tex||!ob.parent||edits.get(id)?.textureId!==edit.textureId||edits.get(id)?.surface==='plain')return;
   for(const mesh of ob.children){if(!mesh.isMesh||!mesh.material?.name.endsWith('_walls'))continue;
    if(!mesh.userData.jcPhotoOwn){mesh.material=cloneBuildingMaterial(mesh.material);mesh.userData.jcPhotoOwn=true;}
    const mat=mesh.material,pos=mesh.geometry.getAttribute('position'),normal=mesh.geometry.getAttribute('normal');
    if(pos&&normal&&!mesh.userData.jcPhotoUv){
     mesh.userData.jcOldUv=mesh.geometry.getAttribute('uv')?.clone()||null;mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;
     const width=Math.max(12,box.max.x-box.min.x,box.max.z-box.min.z),height=Math.max(10,Number(ob.userData.heightMetres)||box.max.y-box.min.y);
     const uv=new Float32Array(pos.count*2);
     for(let i=0;i<pos.count;i++){const nx=normal.getX(i),nz=normal.getZ(i);uv[2*i]=(pos.getX(i)*nz-pos.getZ(i)*nx)/(Math.hypot(nx,nz)||1)/width;uv[2*i+1]=(pos.getY(i)-box.min.y)/height;}
     mesh.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));mesh.userData.jcPhotoUv=true;
    }
    mat.map=tex;mat.userData.customTexture=tex;mat.color.set('#ffffff');mat.roughness=edit.roughness??.32;mat.metalness=.12;mat.emissiveMap=null;mat.needsUpdate=true;
   }
  }).catch(e=>notify?.('Photo texture error: '+e.message));
 }
 return {save,get,remove,exportPhotos,importPhotos,apply,clear};
}
