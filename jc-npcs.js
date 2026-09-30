import * as THREE from './three.module.js';
import {createCharacter3D} from './jc-character3d.js';

const AVATARS = [
  ['civilian-01','civilian'],['civilian-02','civilian'],['civilian-03','civilian'],['civilian-04','civilian'],
  ['authority-01','authority'],['authority-02','authority'],['authority-03','authority'],['authority-04','authority'],
  ['angel-01','angel'],['angel-02','angel'],['angel-03','angel'],['angel-04','angel'],
  ['demon-01','demon'],['demon-02','demon'],['demon-03','demon'],['demon-04','demon'],
];

function chooseOpen(x,z,isSafe) {
  if (isSafe(x,z,2)) return [x,z];
  for (let radius=5;radius<=32;radius+=5) for(let n=0;n<12;n++) {
    const a=n*Math.PI/6,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;
    if(isSafe(px,pz,2)) return [px,pz];
  }
  return [x,z];
}

export function createNpcSystem({scene,player,groundAt,isSafe,onReport,count=8}) {
  const root=new THREE.Group();root.name='JC responsive NPC crowd';scene.add(root);
  root.visible=false;
  const npcs=[];
  const size=Math.max(6,Math.min(16,Math.round(count||8)));
  let lastReport=0;
  const labels={civilian:'CIVILIANS',authority:'RESPONDERS',angel:'ANGELS',demon:'DEMONS'};

  for(let i=0;i<size;i++) {
    const [avatar,faction]=AVATARS[(i%4)*4+Math.floor(i/4)];
    const angle=i*2.3999632297;
    const ring=18+Math.floor(i/4)*13;
    const [x,z]=chooseOpen(player.position.x+Math.cos(angle)*ring,player.position.z+Math.sin(angle)*ring,isSafe);
    const given=['Mara','Darius','Sol','Nia','Ezra','Vale','Imani','Theo','Rae','Jonah','Ash','Micah','Zuri','Cal','Noor','Eli'];
    const npc={faction,avatar,name:given[i%given.length],sprite:null,position:new THREE.Vector3(x,groundAt(x,z)+1.55,z),target:new THREE.Vector3(x,0,z),event:null,state:'idle',nextWander:0,emotionUntil:0,gait:Math.random()*Math.PI*2,stepDistance:0};
    npcs.push(npc);
    const sprite=createCharacter3D({faction});
    sprite.position.set(x,groundAt(x,z),z);
    Object.assign(sprite.userData,{faction,avatar,name:npc.name,emotion:'calm'});
    root.add(sprite);npc.sprite=sprite;
  }

  function report(now) {
    if(now-lastReport<2200)return;
    const active=new Set(npcs.filter(n=>n.event&&n.emotionUntil>now).map(n=>n.faction));
    if(!active.size)return;
    const text=[...active].map(k=>`${labels[k]} ${k==='civilian'?'FLEE':k==='authority'?'RESPOND':k==='angel'?'DRAW NEAR':'RETREAT'}`).join(' · ');
    lastReport=now;onReport?.(text);
  }

  function signal(type,position,radius=95) {
    const now=performance.now(),center=position.clone();
    for(const npc of npcs) {
      if(npc.position.distanceTo(center)>radius)continue;
      npc.event={type,position:center.clone(),time:now};npc.emotionUntil=now+6500;
      npc.state=npc.faction==='civilian'?'fear':npc.faction==='authority'?'respond':npc.faction==='angel'?'awe':'retreat';
      if(npc.faction==='civilian')setDestination(npc,center,28);
      else if(npc.faction==='authority'){
        const [x,z]=chooseOpen(center.x,center.z,isSafe);npc.target.set(x,groundAt(x,z)+1.55,z);
      } else if(npc.faction==='angel')setDestination(npc,player.position,20);
      else setDestination(npc,player.position,34);
      npc.sprite?.userData && (npc.sprite.userData.emotion=npc.state);
    }
    report(now);
  }

  function setDestination(npc,center,distance) {
    const direction=npc.position.clone().sub(center).setY(0);
    if(direction.lengthSq()<.01)direction.set(Math.cos(npcs.indexOf(npc)),0,Math.sin(npcs.indexOf(npc)));
    direction.normalize();
    const [x,z]=chooseOpen(center.x+direction.x*distance,center.z+direction.z*distance,isSafe);
    npc.target.set(x,groundAt(x,z)+1.55,z);
  }

  function update(dt,now=performance.now()) {
    const playerPosition=player.position;
    for(const npc of npcs) {
      if(!npc.sprite)continue;
      let distance=npc.position.distanceTo(playerPosition);
      if(distance>180&&now>npc.emotionUntil&&now>npc.nextWander){
        const i=npcs.indexOf(npc),angle=i*2.3999632297,radius=18+(i%4)*11;
        const [x,z]=chooseOpen(playerPosition.x+Math.cos(angle)*radius,playerPosition.z+Math.sin(angle)*radius,isSafe);
        npc.position.set(x,groundAt(x,z)+1.55,z);npc.target.copy(npc.position);npc.event=null;npc.state='idle';npc.nextWander=now+1800;distance=npc.position.distanceTo(playerPosition);
      }
      if(npc.faction==='demon'&&distance<48&&now>npc.emotionUntil) {
        npc.state='retreat';npc.event={type:'JC-nearby',position:playerPosition.clone(),time:now};npc.emotionUntil=now+3500;setDestination(npc,playerPosition,38);
      }
      if(npc.faction==='angel'&&distance<60&&now>npc.emotionUntil) {
        npc.state='awe';npc.event={type:'JC-nearby',position:playerPosition.clone(),time:now};npc.emotionUntil=now+2600;setDestination(npc,playerPosition,Math.max(12,Math.min(26,distance*.55)));
      }
      if(npc.event&&now<npc.emotionUntil) {
        // The event target is chosen once in signal(); per-frame work stays light.
      } else {
        npc.event=null;
        if(now>npc.nextWander||npc.position.distanceTo(npc.target)<1.5) {
          const angle=Math.random()*Math.PI*2,range=5+Math.random()*13;
          const [x,z]=chooseOpen(playerPosition.x+Math.cos(angle)*range,playerPosition.z+Math.sin(angle)*range,isSafe);
          npc.target.set(x,groundAt(x,z)+1.55,z);npc.state='wander';npc.nextWander=now+2200+Math.random()*4200;
        }
      }
      const dx=npc.target.x-npc.position.x,dz=npc.target.z-npc.position.z,len=Math.hypot(dx,dz);
      const running=npc.state==='fear'||npc.state==='retreat';
      const speed=running?4.4:npc.state==='respond'?2.6:1.1;
      if(len>.12) {
        const step=Math.min(len,speed*dt),nx=npc.position.x+dx/len*step,nz=npc.position.z+dz/len*step;
        if(isSafe(nx,nz,1.4)){npc.position.x=nx;npc.position.z=nz;npc.position.y=THREE.MathUtils.lerp(npc.position.y,npc.target.y,step/len);npc.stepDistance+=step;npc.gait+=step*(npc.state==='fear'||npc.state==='retreat'?.95:.62);}
        else npc.nextWander=0;
      }
      npc.sprite.position.set(npc.position.x,npc.position.y-1.55,npc.position.z);
      if(len>.12)npc.sprite.rotation.y=Math.atan2(dx,dz);
      const pose=len>.12?(running?31+Math.floor(npc.gait/.45)%8:23+Math.floor(npc.gait/.6)%8):npc.state==='respond'?6:npc.state==='awe'?11:0;
      npc.sprite.userData.character.setPose(pose,npc.gait,len>.12?speed:0,now,false);
    }
    report(now);
  }

  return {npcs,signal,update,setVisible(value){root.visible=!!value;},dispose(){scene.remove(root);root.traverse(o=>{if(o.material){o.material.map?.dispose();o.material.dispose();}});}};
}
