import * as THREE from './three.module.js';
export function createCharacterContact(scene){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,30);
 gradient.addColorStop(0,'rgba(0,0,0,.55)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const texture=new THREE.CanvasTexture(canvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.5),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
 shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 return {update(player,ground,height,playing){const x=player?.position?.x,z=player?.position?.z;const valid=Boolean(playing)&&Number.isFinite(x)&&Number.isFinite(z)&&Number.isFinite(ground)&&Number.isFinite(height);const altitude=valid?Math.max(0,height):40;shadow.visible=valid&&altitude<40;if(!shadow.visible)return;shadow.position.set(x,ground+.08,z);shadow.material.opacity=Math.max(0,1-altitude/40);shadow.scale.setScalar(1+altitude*.025);},dispose(){scene.remove(shadow);shadow.geometry.dispose();shadow.material.dispose();texture.dispose();}};
}
