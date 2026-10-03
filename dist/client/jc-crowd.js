import * as THREE from './three.module.js';

function chooseOpen(x,z,isSafe) {
  if(isSafe(x,z,.9))return [x,z];
  for(let radius=3;radius<=18;radius+=3)for(let n=0;n<8;n++){
    const angle=n*Math.PI/4,px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius;
    if(isSafe(px,pz,.9))return [px,pz];
  }
  return [x,z];
}

const SHIRT_COLORS=[0x24364b,0x48596b,0x4f3e48,0x3d594c,0x66513f,0x363b58,0x6a3f43,0x566139,0x315962,0x6b5e67,0x2e2f35,0x7a6648,0x394e68,0x704c5d,0x3f654f,0x5b4d3e];
const SKIN_COLORS=[0xf0c8ae,0xe2b08d,0xd49a77,0xc38462,0xaf7256,0x986047,0x7e4d39,0x673e31,0x543229,0x3f2822];
const HAIR_COLORS=[0x171514,0x2a211d,0x3c2c24,0x51392d,0x6b4b35,0x8a6746,0xb09670,0x25262c,0x4a4341,0x1e2024];
const PANTS_COLORS=[0x171d26,0x28313a,0x312d31,0x3a3833,0x1f3138,0x403846,0x494137,0x20252d,0x2f3c42,0x3e3230];
const SHOE_COLORS=[0x15171b,0x2b2927,0x3b342e,0x242a30,0x49423b];

function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function profile(index){
  let seed=hash('jc-3d-crowd:'+index),next=()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
  return {
    shirt:SHIRT_COLORS[Math.floor(next()*SHIRT_COLORS.length)],
    skin:SKIN_COLORS[Math.floor(next()*SKIN_COLORS.length)],
    hair:HAIR_COLORS[Math.floor(next()*HAIR_COLORS.length)],
    pants:PANTS_COLORS[Math.floor(next()*PANTS_COLORS.length)],
    shoes:SHOE_COLORS[Math.floor(next()*SHOE_COLORS.length)],
    height:.92+next()*.17,width:.88+next()*.24,
    hairStyle:Math.floor(next()*5),stride:.86+next()*.28
  };
}
function material(roughness=.86){return new THREE.MeshStandardMaterial({color:0xffffff,roughness,metalness:0});}

export function createAmbientCrowd({scene,player,groundAt,isSafe,count=500,mobile=false}={}) {
  const size=Math.max(0,Math.min(700,Math.round(count)));
  const root=new THREE.Group();root.name='JC ambient full 3D population';root.visible=false;scene.add(root);
  if(!size)return {count:0,signal(){},update(){},setVisible(){},dispose(){scene.remove(root);}};

  const torsoGeometry=new THREE.CylinderGeometry(.22,.31,.94,8,1);
  const headGeometry=new THREE.SphereGeometry(.16,8,6);
  const hairGeometry=new THREE.SphereGeometry(.165,8,6);
  const armGeometry=new THREE.CylinderGeometry(.052,.067,.66,6,1);
  const legGeometry=new THREE.CylinderGeometry(.062,.082,.74,6,1);
  const shoeGeometry=new THREE.BoxGeometry(.14,.09,.28);
  const meshes={
    torso:new THREE.InstancedMesh(torsoGeometry,material(.9),size),
    head:new THREE.InstancedMesh(headGeometry,material(.72),size),
    hair:new THREE.InstancedMesh(hairGeometry,material(.96),size),
    leftArm:new THREE.InstancedMesh(armGeometry,material(.9),size),
    rightArm:new THREE.InstancedMesh(armGeometry,material(.9),size),
    leftLeg:new THREE.InstancedMesh(legGeometry,material(.94),size),
    rightLeg:new THREE.InstancedMesh(legGeometry,material(.94),size),
    leftShoe:new THREE.InstancedMesh(shoeGeometry,material(.75),size),
    rightShoe:new THREE.InstancedMesh(shoeGeometry,material(.75),size)
  };
  for(const mesh of Object.values(meshes)){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=!mobile;mesh.receiveShadow=true;root.add(mesh);}

  const dummy=new THREE.Object3D(),color=new THREE.Color(),agents=[];
  function chooseTarget(agent,centerX=agent.x,centerZ=agent.z,range=24){
    const [x,z]=chooseOpen(centerX+(Math.random()-.5)*range*2,centerZ+(Math.random()-.5)*range*2,isSafe);
    agent.targetX=x;agent.targetZ=z;agent.nextWander=performance.now()+1500+Math.random()*3500;
  }
  function setState(agent,state,until){agent.state=state;agent.emotionUntil=until;}
  function place(agent,x,z,now=0){
    const spot=chooseOpen(x,z,isSafe);
    agent.x=spot[0];agent.z=spot[1];agent.y=groundAt(agent.x,agent.z);agent.movedSinceGround=0;agent.groundCheckAt=now+800+Math.random()*600;
    chooseTarget(agent,agent.x,agent.z,24);
  }
  function setPart(mesh,index,agent,lx,ly,lz,sx,sy,sz,rx=0,rz=0){
    const sin=Math.sin(agent.yaw),cos=Math.cos(agent.yaw);
    dummy.position.set(agent.x+lx*cos+lz*sin,agent.y+ly,agent.z-lx*sin+lz*cos);
    dummy.rotation.set(rx,agent.yaw,rz);
    dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
  }
  for(let i=0;i<size;i++){
    const angle=Math.random()*Math.PI*2,radius=45+Math.random()*(mobile?420:760);
    const [x,z]=chooseOpen(player.position.x+Math.cos(angle)*radius,player.position.z+Math.sin(angle)*radius,isSafe);
    const identity=(i*73+Math.floor(i/256)*41)%256,p=profile(identity);
    const agent={index:i,identity,x,z,y:0,targetX:x,targetZ:z,speed:.65+Math.random()*1.15,yaw:Math.random()*Math.PI*2,state:'wander',emotionUntil:0,nextWander:0,groundCheckAt:0,movedSinceGround:0,p,gait:Math.random()*Math.PI*2,moving:false};
    place(agent,x,z,performance.now());agents.push(agent);
    meshes.torso.setColorAt(i,color.setHex(p.shirt));meshes.head.setColorAt(i,color.setHex(p.skin));meshes.hair.setColorAt(i,color.setHex(p.hair));
    meshes.leftArm.setColorAt(i,color.setHex(p.shirt));meshes.rightArm.setColorAt(i,color.setHex(p.shirt));
    meshes.leftLeg.setColorAt(i,color.setHex(p.pants));meshes.rightLeg.setColorAt(i,color.setHex(p.pants));
    meshes.leftShoe.setColorAt(i,color.setHex(p.shoes));meshes.rightShoe.setColorAt(i,color.setHex(p.shoes));
  }
  for(const mesh of Object.values(meshes))if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;

  let lastUpdate=0;
  function signal(type,position,radius=95){
    const now=performance.now(),peaceful=['heal','shield','cleanse','sunrise','sanctuary','restore','grace-surge','rain','rebuild','bless','redemption-wave','flight','hypersonic','hover','glide','sky-lift','leap','teleport','beam-down','recall','phase-step'].includes(type);
    for(const agent of agents){
      const dx=agent.x-position.x,dz=agent.z-position.z;
      if(dx*dx+dz*dz>radius*radius)continue;
      setState(agent,peaceful?'awe':'fear',now+4500);
      if(peaceful)chooseTarget(agent,position.x,position.z,Math.min(18,radius*.35));
      else{
        const length=Math.hypot(dx,dz)||1;
        const [x,z]=chooseOpen(agent.x+dx/length*(18+Math.random()*12),agent.z+dz/length*(18+Math.random()*12),isSafe);
        agent.targetX=x;agent.targetZ=z;agent.nextWander=now+3500;
      }
    }
  }
  function update(dt,now=performance.now()){
    if(!root.visible||now-lastUpdate<(mobile?150:90))return;
    const step=Math.min(.35,Math.max(.04,(now-lastUpdate)/1000));lastUpdate=now;
    for(const agent of agents){
      const playerDistance=Math.hypot(agent.x-player.position.x,agent.z-player.position.z);
      if(playerDistance>(mobile?850:1350))place(agent,player.position.x+(Math.random()-.5)*(mobile?700:1200),player.position.z+(Math.random()-.5)*(mobile?700:1200),now);
      if(now>=agent.emotionUntil&&agent.state!=='wander')setState(agent,'wander',0);
      if(now>=agent.nextWander||Math.hypot(agent.targetX-agent.x,agent.targetZ-agent.z)<1.8)chooseTarget(agent);
      const dx=agent.targetX-agent.x,dz=agent.targetZ-agent.z,len=Math.hypot(dx,dz);
      agent.moving=len>.15;
      if(agent.moving){
        const distance=Math.min(len,agent.speed*step),nx=agent.x+dx/len*distance,nz=agent.z+dz/len*distance;
        if(isSafe(nx,nz,.75)){agent.x=nx;agent.z=nz;agent.yaw=Math.atan2(dx,dz);agent.movedSinceGround+=distance;agent.gait+=distance*4.3*agent.p.stride;}
        else chooseTarget(agent,agent.x,agent.z,20);
      }
      if(agent.movedSinceGround>16||now>=agent.groundCheckAt){agent.y=groundAt(agent.x,agent.z);agent.movedSinceGround=0;agent.groundCheckAt=now+850+Math.random()*500;}
      const p=agent.p,h=p.height,w=p.width,swing=agent.moving?Math.sin(agent.gait)*.54:0,bob=agent.moving?Math.abs(Math.sin(agent.gait))*0.018:0;
      setPart(meshes.torso,agent.index,agent,0,.99*h+bob,0,w,h,1);
      setPart(meshes.head,agent.index,agent,0,1.62*h+bob,.01,w,h,1);
      const hairY=(1.70+(p.hairStyle===2?.045:p.hairStyle===4?.075:0))*h+bob;
      const hairScaleY=p.hairStyle===0?.46:p.hairStyle===1?.72:p.hairStyle===2?.88:p.hairStyle===3?.58:.98;
      setPart(meshes.hair,agent.index,agent,0,hairY,-.015,w*1.03,hairScaleY*h,1.02);
      setPart(meshes.leftArm,agent.index,agent,-.31*w,1.02*h+bob,0,1,h,1,swing);
      setPart(meshes.rightArm,agent.index,agent,.31*w,1.02*h+bob,0,1,h,1,-swing);
      setPart(meshes.leftLeg,agent.index,agent,-.105*w,.39*h+bob,0,1,h,1,-swing*.82);
      setPart(meshes.rightLeg,agent.index,agent,.105*w,.39*h+bob,0,1,h,1,swing*.82);
      const footPhase=Math.sin(agent.gait),leftZ=agent.moving?footPhase*.12:0,rightZ=-leftZ;
      setPart(meshes.leftShoe,agent.index,agent,-.105*w,.06*h,leftZ,w,h,1);
      setPart(meshes.rightShoe,agent.index,agent,.105*w,.06*h,rightZ,w,h,1);
    }
    for(const mesh of Object.values(meshes))mesh.instanceMatrix.needsUpdate=true;
  }
  return {
    count:size,agents,signal,update,
    setVisible(value){root.visible=!!value;},
    stats(){return {count:size,frightened:agents.filter(agent=>agent.state==='fear'&&agent.emotionUntil>performance.now()).length,uniqueLooks:Math.min(size,256),rendering:'full-3d',drawCalls:Object.keys(meshes).length};},
    dispose(){scene.remove(root);for(const mesh of Object.values(meshes)){mesh.geometry.dispose();mesh.material.dispose();}}
  };
}
