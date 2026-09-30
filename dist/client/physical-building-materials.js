import * as THREE from './three.module.js';
let pending;
export function loadPhysicalMaterials(){
 return pending ||= new Promise((resolve,reject)=>{
  const image=new Image(),timer=setTimeout(()=>reject(Error('Material download timed out')),8000);
  image.onerror=()=>{clearTimeout(timer);reject(Error('Materials unavailable'));};
  image.onload=()=>{clearTimeout(timer);try{
   const maps=[];
   for(let i=0;i<6;i++){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    canvas.getContext('2d').drawImage(image,(i%3)*image.width/3,Math.floor(i/3)*image.height/2,image.width/3,image.height/2,0,0,512,512);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=2;
    if(i===4){map.channel=1;map.colorSpace=THREE.NoColorSpace;}
    maps.push(map);
   }
   resolve(maps);
  }catch(error){reject(error);}};
  image.src='./facades/physical-materials-v1.webp';
 });
}
export function buildingHash(id){let hash=2166136261;for(const c of id){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
// Appearance is a fictional, deterministic art assignment, not surveyed paint.
export function buildingSurface(id,height,photos,physical){
 const h=buildingHash(id),paint=['#f1eee7','#ddd5c8','#c8c4bc','#d8d0c0','#c6b9a6','#e2deda'];
 let map,scale,roughness=.86,metalness=0,color='#ffffff',kind='facade';
 if(height>=24){map=photos[(h%2)%photos.length];scale=[9,12];roughness=h%2?.74:.33;metalness=h%2?0:.18;}
 else if(height>=8 || !physical.length || h%5!==0){map=photos[(2+h%2)%photos.length];scale=[6,6];color=paint[h%paint.length];}
 else {
  const index=[0,0,1,2,3,5][h%6];map=physical[index];
  kind=['painted stucco','concrete','brick','stone','roof aggregate','painted metal'][index];
  scale=index===0?[2,2]:index===2?[3,3]:[4,4];
  color=index===0?paint[h%paint.length]:'#ffffff';roughness=index===5?.58:.94;metalness=index===5?.22:0;
 }
 return {map,scale,roughness,metalness,color,kind};
}
// Meter-based projection avoids stretching windows over an entire skyscraper.
// Only walls are remapped; original aerial roof photographs keep their UVs.
export function wallUV(positions,normals,width,height){
 const result=new Float32Array(positions.count*2);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i),nx=normals.getX(i),nz=normals.getZ(i);
  const length=Math.hypot(nx,nz)||1;
  result[i*2]=(x*nz-z*nx)/(length*width);
  result[i*2+1]=positions.getY(i)/height;
 }
 return result;
}
