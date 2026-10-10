import * as THREE from './three.module.js';
import {getJCPose} from './jc-pose-bank.js';

const palette={
  civilian:{skin:0xc78f70,cloth:0x293b50,accent:0xd29c60,pants:0x202b38},
  authority:{skin:0x9b684f,cloth:0x203951,accent:0xe1bc68,pants:0x182736},
  angel:{skin:0xe4b89d,cloth:0xf1ead5,accent:0xffd875,pants:0xd8d1bd},
  demon:{skin:0x9b5c57,cloth:0x321c2b,accent:0xff526a,pants:0x1e1725},
};
const SKIN_POOL=[0xf0c8ae,0xe2b08d,0xd49a77,0xc38462,0xaf7256,0x986047,0x7e4d39,0x673e31,0x543229,0x3f2822];
const CLOTH_POOL=[0x24364b,0x48596b,0x4f3e48,0x3d594c,0x66513f,0x363b58,0x6a3f43,0x566139,0x315962,0x6b5e67,0x2e2f35,0x7a6648,0x394e68,0x704c5d,0x3f654f,0x5b4d3e];
const PANTS_POOL=[0x171d26,0x28313a,0x312d31,0x3a3833,0x1f3138,0x403846,0x494137,0x20252d,0x2f3c42,0x3e3230];
const ACCENT_POOL=[0xd2a45f,0xb7685d,0x6d9dbc,0x76a171,0xa17bc0,0xc6c8c5,0xc58450,0x8b8d98,0xd1b57b,0x5f91a0];
const HAIR_POOL=[0x171514,0x2a211d,0x3c2c24,0x51392d,0x6b4b35,0x8a6746,0xb09670,0x25262c,0x4a4341,0x1e2024];
function npcHash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function npcAppearance(faction,ordinal=0,player=false){
  const base=palette[faction]||palette.civilian;
  if(player||faction==='angel'||faction==='demon')return {...base,hair:faction==='demon'?0x211723:faction==='angel'?0x3a2f29:0,hairStyle:0,height:1,width:1};
  let seed=npcHash(faction+':'+ordinal),next=()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
  const skin=SKIN_POOL[Math.floor(next()*SKIN_POOL.length)],cloth=CLOTH_POOL[Math.floor(next()*CLOTH_POOL.length)],pants=PANTS_POOL[Math.floor(next()*PANTS_POOL.length)],accent=ACCENT_POOL[Math.floor(next()*ACCENT_POOL.length)],hair=HAIR_POOL[Math.floor(next()*HAIR_POOL.length)];
  return {skin,cloth,pants,accent,hair,hairStyle:Math.floor(next()*6),height:.94+next()*.13,width:.9+next()*.2};
}
const sph=new THREE.SphereGeometry(1,12,10), cyl=new THREE.CylinderGeometry(.13,.17,.58,10,1), smallCyl=new THREE.CylinderGeometry(.105,.13,.5,9,1);
function mat(color,roughness=.7,metalness=0,emissive=0){return new THREE.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity:emissive?1.2:0});}
function orb(parent,material,position,scale){const m=new THREE.Mesh(sph,material);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function segment(parent,material,geometry,position){const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function createCharacter3D({faction='civilian',player=false,ordinal=0}={}){
  const colors=npcAppearance(faction,ordinal,player),group=new THREE.Group();group.name=`${faction} ${player?'player':'NPC'} full 3D character`;
  if(!player)group.scale.set(colors.width,colors.height,colors.width);
  const skin=mat(colors.skin,.62,0),shirt=mat(colors.cloth,.82,.01),trim=mat(colors.accent,.42,.22, faction==='angel'?0x362600:faction==='demon'?0x31000b:0),pants=mat(colors.pants,.88,.01),boot=mat(0x171a21,.48,.12),iris=mat(faction==='demon'?0xff435d:0x27384a,.18,0, faction==='demon'?0x8e0011:0),glow=mat(colors.accent,.28,.32,colors.accent);
  const torso=new THREE.Group();torso.position.y=1.76;group.add(torso);
  orb(torso,shirt,[0,.06,0],[.39,.53,.23]);orb(torso,trim,[0,.48,0],[.2,.08,.21]);
  // Layered hoodie geometry gives JC a less toy-like silhouette without adding a skinned-mesh dependency.
  if(faction==='angel'){
    const hood=orb(torso,shirt,[0,.5,-.11],[.31,.28,.18]);hood.scale.z=.62;
    const neck=orb(torso,skin,[0,.56,.01],[.115,.12,.11]);
    const laceMat=mat(0xe7e0cf,.9,0);
    for(const x of [-.07,.07]){const lace=segment(torso,laceMat,new THREE.CylinderGeometry(.012,.012,.33,6),[x,.28,.22]);lace.rotation.x=.08;}
  }
  // Raised waist belt and a compact chest insignia give factions a readable silhouette.
  const belt=new THREE.Mesh(new THREE.TorusGeometry(.35,.045,6,20),trim);belt.position.set(0,-.37,0);belt.rotation.x=Math.PI/2;torso.add(belt);
  orb(torso,glow,[0,.11,.236],[.075,.11,.035]);
  const head=new THREE.Group();head.position.set(0,.79,0);torso.add(head);
  orb(head,skin,[0,0,0],[.245,.29,.235]);
  const hairMat=mat(colors.hair||0x302b2c,.92,0);
  const hairCap=orb(head,hairMat,[0,.205,-.025],[.25,.115,.24]);
  if(!player&&faction!=='angel'&&faction!=='demon'){
    if(colors.hairStyle===1){for(const side of [-1,1]){const lock=segment(head,hairMat,new THREE.CylinderGeometry(.025,.035,.42,7),[side*.19,-.02,-.02]);lock.rotation.z=side*.08;}}
    else if(colors.hairStyle===2){orb(head,hairMat,[0,.26,-.04],[.15,.12,.15]);}
    else if(colors.hairStyle===3){for(const side of [-1,1])orb(head,hairMat,[side*.13,.17,-.01],[.13,.15,.13]);}
    else if(colors.hairStyle===4){hairCap.scale.set(.27,.07,.245);}
    else if(colors.hairStyle===5){const bun=orb(head,hairMat,[0,.30,-.12],[.10,.10,.10]);bun.rotation.x=.15;}
  }
  // Ears, nose and brow break the spherical head silhouette at gameplay distance.
  for(const x of [-.235,.235])orb(head,skin,[x,-.005,0],[.035,.07,.045]);
  orb(head,skin,[0,-.025,.225],[.035,.055,.04]);
  const browMat=mat(0x4a372f,.95,0);
  for(const x of [-.09,.09]){const brow=orb(head,browMat,[x,.072,.223],[.055,.012,.012]);brow.rotation.z=x<0?-.08:.08;}
  for(const x of [-.088,.088]){orb(head,mat(0xf4f1eb,.35,0),[x,.015,.211],[.041,.027,.012]);orb(head,iris,[x,.015,.223],[.018,.02,.009]);}
  const mouth=orb(head,mat(0x7c4b43,.72,0),[0,-.115,.222],[.065,.012,.01]);
  if(faction==='angel'){
    for(const side of [-1,1]){
      const strand=segment(head,hairMat,new THREE.CylinderGeometry(.018,.026,.72,7),[side*.19,-.18,-.015]);
      strand.rotation.z=side*.08;
    }
  }
  // Shoulders, articulated arms, fingers, and hands.
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.43,.39,0);torso.add(arm);
    orb(arm,trim,[0,0,0],[.19,.18,.19]);segment(arm,shirt,cyl,[0,-.32,0]);
    const elbow=new THREE.Group();elbow.position.y=-.62;arm.add(elbow);orb(elbow,skin,[0,-.02,0],[.115,.12,.115]);segment(elbow,shirt,smallCyl,[0,-.27,0]);
    const hand=new THREE.Group();hand.position.y=-.57;elbow.add(hand);orb(hand,skin,[0,0,.025],[.12,.13,.105]);
    for(let finger=0;finger<4;finger++){const f=segment(hand,skin,new THREE.CylinderGeometry(.012,.016,.12,6),[(finger-1.5)*.035,-.09,.08]);f.rotation.x=.18;}
    arms.push({arm,elbow,hand,side});
    const leg=new THREE.Group();leg.position.set(side*.2,1.42,0);group.add(leg);orb(leg,trim,[0,0,0],[.18,.17,.19]);segment(leg,pants,cyl,[0,-.39,0]);
    const knee=new THREE.Group();knee.position.y=-.74;leg.add(knee);orb(knee,pants,[0,0,0],[.13,.14,.14]);segment(knee,pants,smallCyl,[0,-.28,0]);
    const shoe=orb(knee,boot,[0,-.57,.10],[.17,.105,.27]);
    if(faction==='angel'){
      shoe.material=mat(0xf5f2e8,.58,.03);
      const sole=orb(knee,mat(0xd7d3c9,.82,0),[0,-.65,.12],[.175,.035,.275]);
      const cross=orb(knee,trim,[side*.02,-.56,.365],[.028,.06,.012]);
    }
    legs.push({leg,knee,side});
  }
  if(faction==='angel'){
    const halo=new THREE.Mesh(new THREE.TorusGeometry(.25,.035,6,20),glow);halo.position.set(0,3.02,0);halo.rotation.x=Math.PI/2;group.add(halo);
    for(const side of [-1,1]){const wing=orb(group,mat(0xfff6e3),[side*.48,1.98,-.16],[.23,.67,.09]);wing.rotation.z=side*-.42;}
  }
  if(faction==='demon')for(const side of [-1,1]){const horn=segment(head,trim,new THREE.ConeGeometry(.085,.32,7),[side*.16,.28,-.04]);horn.rotation.z=side*-.34;}
  if(faction==='authority'){const cap=orb(head,trim,[0,.24,0],[.27,.09,.25]);cap.material=trim;}
  const poses=Array.from({length:39},(_,i)=>({arm:[0,0],elbow:[0,0],body:0,lean:0}));
  // 0–13 miracles and interaction gestures.
  [[-.15,-.15],[.15,.15],[-1.08,-.82],[1.12,1.12],[-.55,-.45],[1.85,-1.85],[-1.55,1.55],[-.8,-.8],[2.35,2.35],[-.45,.8],[1.35,-1.2],[.72,.72],[-1.2,1.2],[2.65,2.65]].forEach((a,i)=>{poses[i].arm=a;poses[i].elbow=i===5?[-.5,-.5]:[0,0];poses[i].body=[0,0,.06,-.06,0,.08,-.05,0,.03,0,0,0,.04,.1][i];});
  // 14–21 hover, strafe, glide, rise, dive, cruise, and braking.
  const flight=[[1.05,-1.05],[-.1,-1.3],[1.3,.1],[.65,-.65],[-2.1,-2.1],[1.6,1.6],[.15,-.15],[.95,.95]];
  flight.forEach((a,i)=>{poses[14+i].arm=a;poses[14+i].elbow=i===7?[-1.05,-1.05]:[.05,.05];poses[14+i].body=i===4?.48:i===5?-.12:0;poses[14+i].lean=i===1?-.24:i===2?.24:0;});
  const api={setPose(index=0,gait=0,speed=0,now=0,flying=false){
    const extra=getJCPose(index),pose=extra||poses[index]||poses[0],step=extra?0:(index>=31&&index<=38)?1:index>=23&&index<=30?.66:0;
    torso.rotation.z=pose.body+pose.lean+(step?Math.sin(gait)*.04:0);
    torso.rotation.x=(flying?-.08:Math.sin(gait)*step*.025)+(extra?pose.body*.28:0);
    torso.rotation.y=extra?pose.twist:0;
    head.rotation.y=extra?pose.head:0;
    for(const {arm,elbow,side} of arms){const swing=step?Math.sin(gait+(side>0?Math.PI:0))*.56:0;arm.rotation.x=(pose.arm[side>0?1:0]||0)+swing;arm.rotation.z=side*(pose.lean*.4);elbow.rotation.x=(pose.elbow[side>0?1:0]||0)+(step?-.14:0);}
    for(const {leg,knee,side} of legs){const swing=step?Math.sin(gait+(side>0?Math.PI:0))*(index>=31&&index<=38?.78:.48):0;leg.rotation.x=extra?pose.leg[side>0?1:0]:swing+(index===19?-.36:0);
      knee.rotation.x=extra?pose.knee[side>0?1:0]:step?Math.max(0,Math.sin(gait+(side>0?Math.PI:0)))*.62:index===19?.8:0;}
    group.rotation.z=THREE.MathUtils.lerp(group.rotation.z,pose.lean*.22,.3);
    group.userData.lastPose=index;group.userData.lastSpeed=speed;group.userData.lastUpdated=now;
  }};
  group.userData.character=api;group.userData.dispose=()=>group.traverse(o=>{if(o.isMesh){o.geometry===sph||o.geometry===cyl||o.geometry===smallCyl?null:o.geometry.dispose();if(o.material&&!Object.values({skin,shirt,trim,pants,boot,iris,glow}).includes(o.material))o.material.dispose();}});
  return group;
}
