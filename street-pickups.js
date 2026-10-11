import * as THREE from './three.module.js';

// Street pickups must remain safe when streamed tiles, NPCs or browser clocks fail.
export function createStreetPickups(scene, player, groundAt, clearSpot, {onCharge=()=>{}, onHeal=()=>{}, onUse=()=>{}, onStatus=()=>{}}={}) {
  if (!scene || typeof scene.add !== 'function' || typeof scene.remove !== 'function' || !player?.position) {
    throw new TypeError('Street pickups require a scene and player position');
  }
  const kinds=[
    {id:'battery',name:'STORM CELL',color:0x89d8ff},
    {id:'medkit',name:'FIRST AID',color:0x92ffbd},
    {id:'relic',name:'MIRACLE RELIC',color:0xffd675},
    {id:'flare',name:'SIGNAL FLARE',color:0xff664d},
    {id:'sidearm',name:'SIDEARM',color:0xffbd72}
  ];
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const validPosition=p=>p&&finite(p.x)&&finite(p.z)&&(!('y' in p)||finite(p.y));
  const safeGround=(x,z)=>{
    if(typeof groundAt!=='function')return 0;
    try {const y=groundAt(x,z);return finite(y)?y:0;} catch {return 0;}
  };
  const safeSpot=(x,z)=>{
    if(typeof clearSpot!=='function')return [x,z];
    try {const point=clearSpot(x,z);return Array.isArray(point)&&finite(point[0])&&finite(point[1])?[point[0],point[1]]:[x,z];}
    catch {return [x,z];}
  };
  const geo=new THREE.OctahedronGeometry(.7,1);
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,emissive:0x1a1a1a,roughness:.36,metalness:.2});
  const mesh=new THREE.InstancedMesh(geo,mat,25);
  const dummy=new THREE.Object3D(),rows=[],inventory=new Map();
  mesh.count=25;mesh.frustumCulled=false;scene.add(mesh);
  const initialX=finite(player.position.x)?player.position.x:0;
  const initialZ=finite(player.position.z)?player.position.z:0;
  for(let i=0;i<25;i++){
    const kind=kinds[i%5],angle=i*2.3999632297,r=13+(i%5)*5;
    const [px,pz]=safeSpot(initialX+Math.cos(angle)*r,initialZ+Math.sin(angle)*r);
    rows.push({kind,position:new THREE.Vector3(px,safeGround(px,pz)+.9,pz),active:true,respawn:0,phase:i*.8});
    mesh.setColorAt(i,new THREE.Color(kind.color));
  }
  let count=0,lastNpcScan=-Infinity,disposed=false;
  const status=text=>{if(typeof onStatus==='function')try{onStatus(text);}catch{ /* UI status is noncritical */ }};
  function use(){
    if(disposed)return false;
    const kind=kinds.find(k=>(inventory.get(k.id)||0)>0);
    if(!kind){status('No street item collected yet');return false;}
    // Never spend an item if its gameplay effect could not be applied.
    try {
      if(kind.id==='battery')onCharge(45);
      else if(kind.id==='medkit')onHeal(35);
      else onUse(kind.id);
    }catch{return false;}
    inventory.set(kind.id,inventory.get(kind.id)-1);
    status(`${kind.name} USED`);
    return true;
  }
  function drop(position){
    if(disposed||!validPosition(position))return false;
    let now=0;try{now=typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():0;}catch{return false;}
    if(!finite(now)||Math.abs(now)>1e12)return false;
    const row=rows.find(r=>!r.active&&now>=r.respawn);
    if(!row)return false;
    row.position.set(position.x,safeGround(position.x,position.z)+.9,position.z);
    row.active=true;
    return true;
  }
  function grantItem(id,amount=1){
    if(disposed||!kinds.some(k=>k.id===id))return false;
    let n;try{n=Number(amount);}catch{return false;}
    if(!Number.isFinite(n)||n<=0)return false;
    const increment=Math.max(1,Math.floor(n));
    inventory.set(id,Math.min(99,(inventory.get(id)||0)+increment));
    return true;
  }
  function update(now,npcs=[]){
    if(disposed||!finite(now)||Math.abs(now)>1e12)return;
    const candidates=Array.isArray(npcs)?npcs:[];
    const scanNpcs=now-lastNpcScan>=150||now<lastNpcScan;
    if(scanNpcs)lastNpcScan=now;
    for(let i=0;i<rows.length;i++){
      const r=rows[i];
      if(!r.active&&now>=r.respawn&&validPosition(player.position)){
        const x=player.position.x+Math.cos(r.phase+now*.00002)*24;
        const z=player.position.z+Math.sin(r.phase+now*.00002)*24;
        if(finite(x)&&finite(z)){
          r.position.set(x,safeGround(x,z)+.9,z);
          r.active=true;
        }
      }
      if(r.active){
        let collector=null;
        if(scanNpcs)for(const npc of candidates){
          if(!npc||npc.collapse||!validPosition(npc.position)||
             (Array.isArray(npc.inventory)&&npc.inventory.length>=2))continue;
          if(typeof npc.position.distanceTo==='function'&&npc.position.distanceTo(r.position)<1.8){collector=npc;break;}
        }
        if(collector){
          if(!Array.isArray(collector.inventory))collector.inventory=[];
          collector.inventory.push(r.kind.id);
          collector.lastPickup=now;
          r.active=false;r.respawn=now+18000;
          collector.event={type:'picked-up-'+r.kind.id,position:r.position.clone(),time:now};
          collector.state='respond';collector.emotionUntil=now+1300;
        }else if(validPosition(player.position)&&typeof player.position.distanceTo==='function'&&player.position.distanceTo(r.position)<2.5){
          r.active=false;r.respawn=now+18000;
          const held=Math.min(99,(inventory.get(r.kind.id)||0)+1);
          inventory.set(r.kind.id,held);count++;
          status(`PICKED UP ${r.kind.name} ×${held} · PRESS J TO USE`);
        }
      }
      dummy.position.set(r.position.x,r.position.y+Math.sin(now*.004+r.phase)*.18,r.position.z);
      dummy.rotation.set(now*.0007+r.phase,now*.001+r.phase,0);
      dummy.scale.setScalar(r.active?1:0);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    for(const npc of candidates){
      if(!npc||!Array.isArray(npc.inventory)||!npc.inventory.length||now<(npc.nextItemUse||0))continue;
      const item=npc.inventory.shift();npc.nextItemUse=now+3500;
      if(item==='medkit')npc.health=Math.min(100,(finite(npc.health)?npc.health:100)+45);
      else if(item==='battery'){
        npc.health=Math.min(100,(finite(npc.health)?npc.health:100)+10);
        npc.state=npc.faction==='authority'?'respond':'wander';npc.emotionUntil=now+2000;
      }else if(item==='relic'){
        try{onUse(npc);}catch{}npc.state='awe';npc.emotionUntil=now+3200;
      }else if(item==='flare'){
        npc.state=npc.faction==='authority'?'respond':'fear';npc.emotionUntil=now+2400;
        status(`${npc.name||'NPC'} SET OFF A SIGNAL FLARE`);
        try{onUse(npc);}catch{}
      }else if(item==='sidearm'){
        npc.hasWeapon=true;npc.state='respond';npc.emotionUntil=now+1600;
      }
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
  function nearestFor(npc,{max=45,kind=null}={}){
    if(disposed||!validPosition(npc?.position)||typeof npc.position.distanceTo!=='function')return null;
    let best=null,bestDistance=finite(max)?Math.max(1,max):45;
    for(const row of rows){
      if(!row.active||kind&&row.kind.id!==kind)continue;
      const d=npc.position.distanceTo(row.position);
      if(finite(d)&&d<bestDistance){best=row;bestDistance=d;}
    }
    return best?{kind:best.kind.id,name:best.kind.name,position:best.position.clone(),distance:bestDistance}:null;
  }
  function held(){return kinds.filter(k=>(inventory.get(k.id)||0)>0).map(k=>`${k.name} ×${inventory.get(k.id)}`).join(' · ')||'empty';}
  function dispose(){
    if(disposed)return;
    disposed=true;scene.remove(mesh);geo.dispose();mat.dispose();
    rows.length=0;inventory.clear();
  }
  return {update,use,drop,grantItem,nearestFor,held,get count(){return count;},dispose};
}
