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
