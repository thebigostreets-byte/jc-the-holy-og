import * as THREE from './three.module.js';

// Packed from the 2026-10-21 JC gamewide concept atlas: 11 HUD sigils,
// six explosion frames and six teleport frames. All cells are 16 x 16 px.
// The original large panel is reference art, NOT a rig or a complete sprite set.
export const JC_RUNTIME_SPRITE_ATLAS='./assets/sprites/jc-runtime-icons.png';
export const JC_SPRITE_CELLS={columns:6,rows:4,cell:16,icons:11,explosion:2,teleport:3,frames:6};
export function abilitySpriteIndex(id=''){
 const name=String(id).toLowerCase();
 if(/(teleport|portal|phase|recall|vortex|singularity)/.test(name))return 4;
 if(/(heal|bless|prayer|grace|restore|redemption)/.test(name))return 2;
 if(/(shield|sanctuary|protect)/.test(name))return 3;
 if(/(fire|hell|devil|demon|curse|ruin)/.test(name))return 5;
 if(/(rain|water|cleanse|mercy)/.test(name))return 7;
 if(/(lightning|storm|chain|electric)/.test(name))return 9;
 if(/(flight|sky|air|hover|glide|leap|dash|hypersonic)/.test(name))return 8;
 if(/(telekinesis|sling|rod|shoot|gun|weapon|spear)/.test(name))return 1;
 if(/(reveal|night|sight|vision)/.test(name))return 10;
 if(/(light|beam|sunrise|radiance|pulse|nova|exorcise)/.test(name))return 0;
 return 6;
}
export function decorateAbilityBadge(element,id){
 if(!element)return;
 const i=abilitySpriteIndex(id),x=i%6,y=Math.floor(i/6);
 element.classList.add('jc-sprite-sigil');
 element.setAttribute('aria-hidden','true');
 element.style.backgroundImage='url("'+JC_RUNTIME_SPRITE_ATLAS+'")';
 element.style.backgroundSize='600% 400%';
 element.style.backgroundPosition=(x*20)+'% '+(y*100/3)+'%';
}
// 3D camera-facing VFX are optional additive layers on top of the original
// Three.js character rigs, particles and physical hit/collision logic.
export function createAtlasBursts(scene,clock=()=>performance.now(),mobile=false){
 const slots=[],limit=mobile?3:7;
 let disposed=false,loaded=null;
 const browser=typeof window!=='undefined'&&typeof document!=='undefined';
 const ready=(!browser?Promise.resolve(null):new THREE.TextureLoader().loadAsync(JC_RUNTIME_SPRITE_ATLAS))
  .then(t=>{if(!t)return null;t.colorSpace=THREE.SRGBColorSpace;t.flipY=true;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.magFilter=THREE.LinearFilter;loaded=t;return t;})
  .catch(error=>{console.warn('JC sprite atlas disabled; original VFX remain available',error);return null;});
 function stop(slot){
  scene.remove(slot.sprite);
  slot.sprite.material.map?.dispose();
  slot.sprite.material.dispose();
 }
 function spawn(position,kind='explosion',scale=9){
  if(disposed||!position)return;
  ready.then(base=>{
   if(disposed||!base)return;
   if(slots.length>=limit)stop(slots.shift());
   const tex=base.clone();
   tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
   tex.repeat.set(1/6,1/4);
   const row=kind==='teleport'?3:2;
   tex.offset.set(0,(3-row)/4);
   tex.needsUpdate=true;
   const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,opacity:.86,
    blending:THREE.AdditiveBlending,color:0xffffff});
   const sprite=new THREE.Sprite(mat);
   sprite.position.set(Number(position.x)||0,(Number(position.y)||0)+Math.min(12,scale*.3),Number(position.z)||0);
   sprite.scale.set(scale,scale,1);
   scene.add(sprite);
   slots.push({sprite,row,start:clock(),duration:kind==='teleport'?880:660,scale});
  });
 }
 function update(now){
  for(let i=slots.length-1;i>=0;i--){
   const slot=slots[i],t=(now-slot.start)/slot.duration;
   if(t>=1){stop(slot);slots.splice(i,1);continue;}
   const frame=Math.min(5,Math.floor(Math.max(0,t)*6));
   slot.sprite.material.map.offset.set(frame/6,(3-slot.row)/4);
   slot.sprite.material.opacity=.95*(1-t);
   slot.sprite.scale.setScalar(slot.scale*(.8+.55*t));
   slot.sprite.material.needsUpdate=false;
  }
 }
 function onDestroyed(event){
  const point=event.detail?.position;if(!point)return;
  spawn(point,event.detail?.mode==='explode'?'explosion':'teleport',event.detail?.mode==='explode'?15:9);
 }
 if(browser)window.addEventListener('jc:building-destroyed',onDestroyed);
 function dispose(){
  disposed=true;if(browser)window.removeEventListener('jc:building-destroyed',onDestroyed);
  while(slots.length)stop(slots.pop());
  loaded?.dispose();loaded=null;
 }
 return {spawn,update,dispose,stats:()=>({loaded:!!loaded,active:slots.length,capacity:limit})};
}
