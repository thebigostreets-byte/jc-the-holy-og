import * as THREE from './three.module.js';
import {getNpcCutoutAtlas,createInstancedCutoutMaterial,npcCutoutProfileIndex,NPC_CUTOUT_ANGLES,quantizeNpcCutoutDirection} from './npc-cutouts.js';

function chooseOpen(x,z,isSafe) {
  if(isSafe(x,z,.9))return [x,z];
  for(let radius=3;radius<=18;radius+=3)for(let n=0;n<8;n++){
    const angle=n*Math.PI/4,px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius;
    if(isSafe(px,pz,.9))return [px,pz];
  }
  return [x,z];
}

const CALM_COLORS=[0x425366,0x5b4c43,0x59614f,0x51445d,0x6a6258,0x344b54];
const SKIN_COLORS=[0xc78f70,0x9b684f,0xe4b89d,0x8d5f4a,0xd7a783,0x704a3b];

export function createAmbientCrowd({scene,player,camera=null,groundAt,isSafe,count=500,mobile=false}={}) {
  const size=Math.max(0,Math.min(700,Math.round(count)));
  const root=new THREE.Group();root.name='JC ambient cardboard-cutout population';root.visible=false;scene.add(root);
  if(!size)return {count:0,signal(){},update(){},setVisible(){},dispose(){scene.remove(root);}};
  const atlas=getNpcCutoutAtlas({mobile}),geometry=new THREE.PlaneGeometry(1.13,2.66),frames=new Float32Array(size);
  geometry.setAttribute('instanceFrame',new THREE.InstancedBufferAttribute(frames,1));
  const material=createInstancedCutoutMaterial(atlas),people=new THREE.InstancedMesh(geometry,material,size);
  people.instanceMatrix.setUsage(THREE.DynamicDrawUsage);people.frustumCulled=false;people.name='500-person multi-angle cutout crowd';root.add(people);
  const dummy=new THREE.Object3D(),cameraPosition=new THREE.Vector3(),agents=[];
  function chooseTarget(agent,centerX=agent.x,centerZ=agent.z,range=24){const [x,z]=chooseOpen(centerX+(Math.random()-.5)*range*2,centerZ+(Math.random()-.5)*range*2,isSafe);agent.targetX=x;agent.targetZ=z;agent.nextWander=performance.now()+1500+Math.random()*3500;}
  function setState(agent,state,until){agent.state=state;agent.emotionUntil=until;}
  function place(agent,x,z,now=0){const spot=chooseOpen(x,z,isSafe);agent.x=spot[0];agent.z=spot[1];agent.y=groundAt(agent.x,agent.z);agent.movedSinceGround=0;agent.groundCheckAt=now+800+Math.random()*600;chooseTarget(agent,agent.x,agent.z,24);}
  for(let i=0;i<size;i++){const angle=Math.random()*Math.PI*2,radius=45+Math.random()*(mobile?420:760);const [x,z]=chooseOpen(player.position.x+Math.cos(angle)*radius,player.position.z+Math.sin(angle)*radius,isSafe);const ordinal=(i*73+Math.floor(i/128)*29)%128;const agent={index:i,x,z,y:0,targetX:x,targetZ:z,speed:.65+Math.random()*1.15,yaw:Math.random()*Math.PI*2,state:'wander',emotionUntil:0,nextWander:0,groundCheckAt:0,movedSinceGround:0,identityIndex:npcCutoutProfileIndex('civilian',ordinal),scale:.91+((i*37)%23)/100};place(agent,x,z,performance.now());agents.push(agent);}
  let lastUpdate=0;
  function signal(type,position,radius=95){const now=performance.now(),peaceful=['heal','shield','cleanse','sunrise','sanctuary','restore','grace-surge','rain','rebuild','bless','redemption-wave','flight','hypersonic','hover','glide','sky-lift','leap','teleport','beam-down','recall','phase-step'].includes(type);for(const agent of agents){const dx=agent.x-position.x,dz=agent.z-position.z;if(dx*dx+dz*dz>radius*radius)continue;setState(agent,peaceful?'awe':'fear',now+4500);if(peaceful)chooseTarget(agent,position.x,position.z,Math.min(18,radius*.35));else{const length=Math.hypot(dx,dz)||1;const [x,z]=chooseOpen(agent.x+dx/length*(18+Math.random()*12),agent.z+dz/length*(18+Math.random()*12),isSafe);agent.targetX=x;agent.targetZ=z;agent.nextWander=now+3500;}}}
  function update(dt,now=performance.now()){if(!root.visible||now-lastUpdate<(mobile?180:100))return;const step=Math.min(.35,Math.max(.04,(now-lastUpdate)/1000));lastUpdate=now;if(camera?.getWorldPosition)camera.getWorldPosition(cameraPosition);else cameraPosition.copy(player.position).add(new THREE.Vector3(0,2,8));for(const agent of agents){const playerDistance=Math.hypot(agent.x-player.position.x,agent.z-player.position.z);if(playerDistance>(mobile?850:1350))place(agent,player.position.x+(Math.random()-.5)*(mobile?700:1200),player.position.z+(Math.random()-.5)*(mobile?700:1200),now);if(now>=agent.emotionUntil&&agent.state!=='wander')setState(agent,'wander',0);if(now>=agent.nextWander||Math.hypot(agent.targetX-agent.x,agent.targetZ-agent.z)<1.8)chooseTarget(agent);const dx=agent.targetX-agent.x,dz=agent.targetZ-agent.z,len=Math.hypot(dx,dz);if(len>.15){const distance=Math.min(len,agent.speed*step),nx=agent.x+dx/len*distance,nz=agent.z+dz/len*distance;if(isSafe(nx,nz,.75)){agent.x=nx;agent.z=nz;agent.yaw=Math.atan2(dx,dz);agent.movedSinceGround+=distance;}else chooseTarget(agent,agent.x,agent.z,20);}if(agent.movedSinceGround>16||now>=agent.groundCheckAt){agent.y=groundAt(agent.x,agent.z);agent.movedSinceGround=0;agent.groundCheckAt=now+850+Math.random()*500;}const faceYaw=Math.atan2(cameraPosition.x-agent.x,cameraPosition.z-agent.z),direction=quantizeNpcCutoutDirection(faceYaw-agent.yaw);frames[agent.index]=agent.identityIndex*NPC_CUTOUT_ANGLES+direction;const bob=len>.15?Math.sin(now*.006+agent.index)*.012:0;dummy.position.set(agent.x,agent.y+1.33*agent.scale+bob,agent.z);dummy.rotation.set(0,faceYaw,0);dummy.scale.set(agent.scale,agent.scale,agent.scale);dummy.updateMatrix();people.setMatrixAt(agent.index,dummy.matrix);}people.instanceMatrix.needsUpdate=true;geometry.getAttribute('instanceFrame').needsUpdate=true;}
  return {count:size,agents,signal,update,setVisible(value){root.visible=!!value;},stats(){return {count:size,frightened:agents.filter(agent=>agent.state==='fear'&&agent.emotionUntil>performance.now()).length,uniqueLooks:Math.min(size,128),angles:NPC_CUTOUT_ANGLES,drawCalls:1};},dispose(){scene.remove(root);geometry.dispose();material.dispose();}};
}
