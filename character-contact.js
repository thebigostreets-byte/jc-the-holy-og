import * as THREE from './three.module.js';
export function createCharacterContact(scene){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,30);
 gradient.addColorStop(0,'rgba(0,0,0,.55)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const texture=new THREE.CanvasTexture(canvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.5),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
 shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 return {update(player,ground,height,playing){shadow.visible=playing&&height<40;shadow.position.set(player.position.x,ground+.08,player.position.z);shadow.material.opacity=Math.max(0,1-height/40);shadow.scale.setScalar(1+Math.min(height,40)*.025);},dispose(){scene.remove(shadow);shadow.geometry.dispose();shadow.material.dispose();texture.dispose();}};
}
