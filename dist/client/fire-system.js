import * as THREE from './three.module.js';

const validPoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);

export function createFireSystem(scene, {capacity=16, clock=()=>performance.now()}={}) {
 const size=Number.isFinite(capacity)?Math.max(1,Math.min(64,Math.floor(capacity))):16;
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=128;
 const g=canvas.getContext('2d'),glow=g.createRadialGradient(48,83,3,48,83,44);
 glow.addColorStop(0,'#fff7b5');glow.addColorStop(.2,'#ffc347');glow.addColorStop(.55,'#ff681b');glow.addColorStop(1,'#d8200200');
 g.fillStyle=glow;g.fillRect(0,0,96,128);g.fillStyle='#ff8a29';g.beginPath();g.moveTo(26,110);
 g.quadraticCurveTo(10,61,40,17);g.quadraticCurveTo(35,66,53,67);g.quadraticCurveTo(76,28,67,13);g.quadraticCurveTo(99,80,64,111);g.closePath();g.fill();
 const texture=new THREE.CanvasTexture(canvas);
 const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const pool=Array.from({length:size},()=>{
  // SpriteMaterial.rotation is shared by reference: each fire needs its own material.
  const sprite=new THREE.Sprite(material.clone());sprite.visible=false;sprite.scale.set(3.2,4.3,1);scene.add(sprite);
  return {sprite,id:'',expires:0,position:new THREE.Vector3()};
 });
 material.dispose();
 let disposed=false;
 function ignite(id,position,duration=14000){
  if(disposed||!validPoint(position)||!Number.isFinite(duration)||duration<=0)return false;
  const now=clock();if(!Number.isFinite(now))return false;
  const fire=pool.find(x=>x.sprite.visible&&x.id===id)||pool.find(x=>!x.sprite.visible)||pool.reduce((a,b)=>a.expires<b.expires?a:b);
  fire.id=id;fire.position.copy(position);fire.expires=now+Math.min(duration,60000);
  fire.sprite.visible=true;fire.sprite.position.set(position.x,position.y+2,position.z);
  return true;
 }
 function extinguish(position,radius=180){
  if(disposed||!validPoint(position)||!Number.isFinite(radius)||radius<0)return 0;
  let n=0;
  for(const fire of pool)if(fire.sprite.visible&&fire.position.distanceTo(position)<=radius){fire.sprite.visible=false;fire.id='';n++;}
  return n;
 }
 function update(now=clock()){
  if(disposed||!Number.isFinite(now))return;
  for(const fire of pool)if(fire.sprite.visible){
   if(now>=fire.expires){fire.sprite.visible=false;fire.id='';continue;}
   fire.sprite.position.y=fire.position.y+2+Math.sin(now*.009+fire.position.x)*.2;
   fire.sprite.material.rotation=Math.sin(now*.003+fire.position.z)*.045;
  }
 }
 function dispose(){
  if(disposed)return;
  disposed=true;
  for(const fire of pool){scene.remove(fire.sprite);fire.sprite.material.dispose();fire.sprite.visible=false;fire.id='';}
  texture.dispose();
 }
 return {ignite,extinguish,update,dispose};
}
