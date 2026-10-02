import * as THREE from './three.module.js';
import {createCharacter3D} from './jc-character3d.js';
import {createAmbientCrowd} from './jc-crowd.js';
import {createNpcMemoryStore} from './npc-memory.js';

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

export function createNpcSystem({scene,player,groundAt,isSafe,canSee=()=>true,onReport,count=8,crowdCount=500,mobile=false}) {
  const root=new THREE.Group();root.name='JC responsive NPC crowd';scene.add(root);
  root.visible=false;
  const npcs=[];
  const memoryStore=createNpcMemoryStore();
  const size=Math.max(6,Math.min(16,Math.round(count||8)));
  let trackedId=null;
  const crowd=createAmbientCrowd({scene,player,groundAt,isSafe,count:crowdCount,mobile});
  let lastReport=0;
  const restorative=new Set(['heal','shield','cleanse','sunrise','sanctuary','restore','grace-surge','rain','rebuild','bless','redemption-wave']);
  const travel=new Set(['flight','hypersonic','hover','glide','sky-lift','leap','teleport','beam-down','recall','phase-step']);
  const labels={civilian:'CIVILIANS',authority:'RESPONDERS',angel:'ANGELS',demon:'DEMONS'};
  const characterProfiles={
    civilian:{role:'local resident',personality:'observant, independent, and grounded',goals:'stay safe, understand what is happening, and protect people they care about',speechStyle:'plain, conversational, occasionally skeptical'},
    authority:{role:'local responder',personality:'alert, procedural, and protective',goals:'protect civilians, assess danger, and restore order',speechStyle:'direct, concise, situational'},
    angel:{role:'heavenly observer',personality:'calm, perceptive, compassionate, and serious',goals:'guide people away from harm and respond to spiritual events',speechStyle:'measured, vivid, and reassuring'},
    demon:{role:'adversarial supernatural presence',personality:'provocative, cunning, watchful, and self-interested',goals:'advance its own agenda and exploit opportunities',speechStyle:'taunting, confident, and sharp'}
  };

  for(let i=0;i<size;i++) {
    const [avatar,faction]=AVATARS[(i%4)*4+Math.floor(i/4)];
    const angle=i*2.3999632297;
    const ring=18+Math.floor(i/4)*13;
    const [x,z]=chooseOpen(player.position.x+Math.cos(angle)*ring,player.position.z+Math.sin(angle)*ring,isSafe);
    const given=['Mara','Darius','Sol','Nia','Ezra','Vale','Imani','Theo','Rae','Jonah','Ash','Micah','Zuri','Cal','Noor','Eli'];
    const name=given[i%given.length],id=[faction,avatar,name].join(':');
    const profile=characterProfiles[faction]||characterProfiles.civilian,savedMemory=memoryStore.get(id);
    const npc={id,faction,avatar,name,...profile,sprite:null,trackerRing:null,position:new THREE.Vector3(x,groundAt(x,z)+1.55,z),target:new THREE.Vector3(x,0,z),event:null,state:'idle',nextWander:0,emotionUntil:0,gait:Math.random()*Math.PI*2,stepDistance:0,lifeMemory:savedMemory,observedPlayer:savedMemory?.lastPlayerState?{state:savedMemory.lastPlayerState,appearance:savedMemory.appearance}:null};
    npcs.push(npc);
    const sprite=createCharacter3D({faction});
    sprite.position.set(x,groundAt(x,z),z);
    Object.assign(sprite.userData,{faction,avatar,name:npc.name,emotion:'calm',npcRef:npc});
    const trackerRingMesh=new THREE.Mesh(new THREE.TorusGeometry(1.15,.065,6,20),new THREE.MeshBasicMaterial({color:0xffd45a,transparent:true,opacity:.9,depthWrite:false}));
    trackerRingMesh.name='NPC contact tracking ring';trackerRingMesh.rotation.x=Math.PI/2;trackerRingMesh.position.y=.07;trackerRingMesh.visible=false;sprite.add(trackerRingMesh);npc.trackerRing=trackerRingMesh;
    root.add(sprite);npc.sprite=sprite;
  }

  const eventWitnessText={flight:'saw JC take flight above the street',hypersonic:'saw JC streak through the sky at hypersonic speed',hover:'saw JC hover above the street',glide:'saw JC glide over the city','sky-lift':'saw JC rise into the air',leap:'saw JC leap high above the ground',teleport:'saw JC vanish and reappear nearby','phase-step':'saw JC pass through an obstacle','beam-down':'saw JC descend in a flash of light',rain:'saw JC call rain over the street',lightning:'saw lightning strike near JC',heal:'saw JC heal someone nearby',bless:'saw JC bless someone nearby',shield:'saw JC shield people nearby',cleanse:'saw JC cleanse the area',sunrise:'saw a wave of light spread from JC',sanctuary:'saw JC create a place of safety','redemption-wave':'saw JC send a bright wave through the street',rebuild:'saw JC repair the surroundings','dive-impact':'saw JC dive hard into the street','traffic-impact':'saw a traffic collision nearby'};
  function refreshMemory(npc){npc.lifeMemory=memoryStore.get(npc.id);return npc.lifeMemory;}
  function canWitness(npc,position,range=112){
    const target=position?.isVector3?position:new THREE.Vector3(position?.x||0,position?.y||0,position?.z||0);
    if(npc.position.distanceTo(target)>range||Math.abs(npc.position.y-target.y)>95)return false;
    const eye=npc.position.clone().add(new THREE.Vector3(0,1.15,0)),focus=target.clone().add(new THREE.Vector3(0,1.35,0));
    return !!canSee(eye,focus,npc);
  }

  function report(now) {
    if(now-lastReport<2200)return;
    const active=new Map();
    for(const npc of npcs)if(npc.event&&npc.emotionUntil>now)active.set(npc.faction,npc.state);
    if(!active.size)return;
    const text=[...active].map(([faction,state])=>`${labels[faction]} ${state.toUpperCase()}`).join(' · ');
    lastReport=now;onReport?.(text);
  }

  function signal(type,position,radius=95) {
    const now=performance.now(),center=position.clone();
    for(const npc of npcs) {
      if(npc.position.distanceTo(center)>radius||!canWitness(npc,center,Math.min(112,radius)))continue;
      const witnessed=eventWitnessText[type]||`saw ${String(type).replace(/[-_]/g,' ')} happen nearby`;
      memoryStore.remember(npc,{key:`event:${type}:${Math.floor(now/1000)}`,kind:'event',text:`I ${witnessed}.`,at:Date.now()});refreshMemory(npc);
      npc.event={type,position:center.clone(),time:now};npc.memory={type,time:now};npc.emotionUntil=now+6500;
      const peaceful=restorative.has(type)||travel.has(type);
      npc.state=npc.faction==='civilian'?(peaceful?'awe':'fear'):npc.faction==='authority'?(peaceful?'awe':'respond'):npc.faction==='angel'?'awe':'retreat';
      if(npc.faction==='civilian')setDestination(npc,center,peaceful?Math.max(6,Math.min(14,npc.position.distanceTo(center))):28);
      else if(npc.faction==='authority'){
        const [x,z]=chooseOpen(center.x,center.z,isSafe);npc.target.set(x,groundAt(x,z)+1.55,z);
      } else if(npc.faction==='angel')setDestination(npc,player.position,20);
      else setDestination(npc,player.position,34);
      npc.sprite?.userData && (npc.sprite.userData.emotion=npc.state);
    }
    crowd.signal(type,center,radius);
    report(now);
  }

  function setDestination(npc,center,distance) {
    const direction=npc.position.clone().sub(center).setY(0);
    if(direction.lengthSq()<.01)direction.set(Math.cos(npcs.indexOf(npc)),0,Math.sin(npcs.indexOf(npc)));
    direction.normalize();
    const [x,z]=chooseOpen(center.x+direction.x*distance,center.z+direction.z*distance,isSafe);
    npc.target.set(x,groundAt(x,z)+1.55,z);
  }

  function observePlayer({position,appearance='white hooded robe with gold trim, a glowing halo, and white wings',state='grounded'}={}) {
    if(!position)return 0;
    let observed=0;
    for(const npc of npcs){
      if(!canWitness(npc,position,112))continue;
      const record=memoryStore.observe(npc,{appearance,state,at:Date.now()});
      if(!record)continue;
      npc.lifeMemory=record;npc.observedPlayer={state,appearance,at:Date.now()};observed++;
    }
    return observed;
  }

  function update(dt,now=performance.now()) {
    const playerPosition=player.position;
    for(const npc of npcs) {
      if(!npc.sprite)continue;
      let distance=npc.position.distanceTo(playerPosition);
      if(distance>180&&npc.id!==trackedId&&now>npc.emotionUntil&&now>npc.nextWander){
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
        const previousX=npc.position.x,previousZ=npc.position.z;
        if(isSafe(nx,nz,1.4)){npc.position.x=nx;npc.position.z=nz;}
        else if(isSafe(nx,npc.position.z,1.4))npc.position.x=nx;
        else if(isSafe(npc.position.x,nz,1.4))npc.position.z=nz;
        const moved=Math.hypot(npc.position.x-previousX,npc.position.z-previousZ);
        if(moved>.0001){npc.position.y=groundAt(npc.position.x,npc.position.z)+1.55;npc.stepDistance+=moved;npc.gait+=moved*(running?.95:.62);npc.blockedSince=null;}
        else if(dt>0){npc.blockedSince??=now;if(now-npc.blockedSince>350){const angle=Math.atan2(dz,dx)+Math.PI/2;const [x,z]=chooseOpen(npc.position.x+Math.cos(angle)*5,npc.position.z+Math.sin(angle)*5,isSafe);npc.target.set(x,groundAt(x,z)+1.55,z);npc.nextWander=now+800;npc.blockedSince=null;}}
        npc.moving=moved>.0001;
      }
      if(len<=.12)npc.moving=false;
      npc.sprite.position.set(npc.position.x,npc.position.y-1.55,npc.position.z);
      if(len>.12)npc.sprite.rotation.y=Math.atan2(dx,dz);
      const pose=npc.moving?(running?31+Math.floor(npc.gait/.45)%8:23+Math.floor(npc.gait/.6)%8):npc.state==='respond'?6:npc.state==='awe'?11:0;
      npc.sprite.userData.character.setPose(pose,npc.gait,npc.moving?speed:0,now,false);
      if(npc.trackerRing?.visible)npc.trackerRing.material.opacity=.68+Math.sin(now*.006)*.22;
    }
    crowd.update(dt,now);
    report(now);
  }

  function setTracked(id) {
    trackedId=id||null;
    for(const npc of npcs){if(npc.trackerRing)npc.trackerRing.visible=npc.id===trackedId;}
    return !trackedId||npcs.some(npc=>npc.id===trackedId);
  }

  function trafficImpact(npc,car) {
    if(!npc)return;
    const now=performance.now(),center=new THREE.Vector3(car.x,groundAt(car.x,car.z)+1.55,car.z);
    memoryStore.remember(npc,{key:`event:traffic-impact:${Math.floor(now/1000)}`,kind:'event',text:'A vehicle struck me in the street.',at:Date.now()});refreshMemory(npc);
    npc.event={type:'traffic-impact',position:center.clone(),time:now};npc.memory={type:'traffic-impact',time:now};npc.state='fear';npc.emotionUntil=now+4500;setDestination(npc,center,22);
    if(npc.sprite?.userData)npc.sprite.userData.emotion='fear';
  }

  return {npcs,signal,update,observePlayer,setTracked,trafficImpact,memorySummary:id=>memoryStore.summary(id),get trackedId(){return trackedId;},totalPopulation:npcs.length+crowd.count,crowd,
    setVisible(value){root.visible=!!value;crowd.setVisible(value);},
    dispose(){scene.remove(root);crowd.dispose();for(const npc of npcs)npc.sprite?.userData.dispose?.();const materials=new Set();root.traverse(o=>{if(o.material)materials.add(o.material);});for(const material of materials){material.map?.dispose();material.dispose();}}};
}
