import * as THREE from './three.module.js';
let pending;
// Four shared cropped textures avoid atlas bleeding and per-building GPU copies.
export function loadPhotoFacades(){
 return pending ||= new Promise((resolve,reject)=>{
  const image=new Image();const timer=setTimeout(()=>reject(Error('Photographic facades timed out')),8000);image.onerror=()=>{clearTimeout(timer);reject(Error('Photographic facades unavailable'));};
  image.onload=()=>{
   clearTimeout(timer);
   try{
    const textures=[];
    for(let i=0;i<4;i++){
     const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
     canvas.getContext('2d').drawImage(image,(i%2)*image.width/2,Math.floor(i/2)*image.height/2,image.width/2,image.height/2,0,0,512,512);
     const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
     texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=1;
     textures.push(texture);
    }
    resolve(textures);
   }catch(error){reject(error);}
  };
  image.src='./facades/photographic-atlas-v2.webp';
 });
}

const emissiveCache=new WeakMap();
// Keep the bright facade windows illuminated without making the masonry glow.
export function getFacadeEmissiveMap(texture){
 if(!texture)return null;
 if(emissiveCache.has(texture))return emissiveCache.get(texture);
 try{
  const source=texture.image;if(!source?.width||!source?.height)return null;
  const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4){
   const luminance=.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2];
   const brightness=Math.max(0,Math.min(255,(luminance-105)*2.5));
   pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=brightness;
  }
  context.putImageData(pixels,0,0);
  const result=new THREE.CanvasTexture(canvas);result.colorSpace=THREE.SRGBColorSpace;
  result.wrapS=texture.wrapS;result.wrapT=texture.wrapT;result.repeat.copy(texture.repeat);
  emissiveCache.set(texture,result);return result;
 }catch{return null;}
}
