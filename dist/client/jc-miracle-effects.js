import * as THREE from './three.module.js';

// All transient miracles share the game's clock and a fixed draw-call budget.
export function createMiracleEffects(scene, mobile=false, clock=()=>performance.now()) {
  const ringGeometry=new THREE.RingGeometry(.65,1,32);
  const beamGeometry=new THREE.CylinderGeometry(1,1,1,8);
  const rings=[],beams=[],sprites=[];
  const maxRings=mobile?18:32,maxBeams=mobile?8:12,maxSprites=mobile?6:10;
  const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  let rain=null,lastRain=0;
  function pool(list,limit,geometry) {
    let slot=list.find(s=>!s.active);
    if(!slot&&list.length<limit){
      const material=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
      const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;scene.add(mesh);
      slot={mesh,active:false,start:0};list.push(slot);
    }
    if(!slot)slot=list.reduce((a,b)=>a.start<b.start?a:b);
    slot.active=true;slot.mesh.visible=true;slot.start=clock();return slot;
  }
  function ring(position,color=0xffe090,radius=20) {
    const slot=pool(rings,maxRings,ringGeometry);
    slot.radius=radius;slot.duration=620;slot.mesh.position.copy(position);slot.mesh.position.y+=.12;
    slot.mesh.rotation.x=-Math.PI/2;slot.mesh.scale.setScalar(1);slot.mesh.material.color.set(color);slot.mesh.material.opacity=.9;
  }
  function beam(from,to,color=0xffe4a4) {
    const length=from.distanceTo(to);if(length<.01)return;
    const slot=pool(beams,maxBeams,beamGeometry);slot.duration=360;
    slot.mesh.position.copy(from).add(to).multiplyScalar(.5);
    slot.mesh.quaternion.setFromUnitVectors(up,direction.copy(to).sub(from).normalize());
    slot.mesh.scale.set(.23,length,.23);slot.mesh.material.color.set(color);slot.mesh.material.opacity=.9;
  }
  function removeSprite(slot){scene.remove(slot.mesh);slot.mesh.material.dispose();slot.cleanup?.();}
  function sprite(mesh,cleanup) {
    if(sprites.length>=maxSprites)removeSprite(sprites.shift());
    const slot={mesh,cleanup,start:clock(),y:mesh.position.y};sprites.push(slot);scene.add(mesh);
  }
  function rainAt(position) {
    if(!rain){
      const count=mobile?64:96,geometry=new THREE.BoxGeometry(.035,1.6,.035);
      const material=new THREE.MeshBasicMaterial({color:0x90c6ed,transparent:true,opacity:.7,depthWrite:false});
      const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
      rain={mesh,offsets:Float32Array.from({length:count*3},(_,i)=>i%3===1?Math.random()*30:(Math.random()-.5)*55),matrix:new THREE.Matrix4(),center:new THREE.Vector3(),until:0};
    }
    rain.center.copy(position);rain.until=clock()+3000;lastRain=clock();rain.mesh.visible=true;
  }
  function update(now) {
    for(const slot of rings){if(!slot.active)continue;const t=Math.max(0,(now-slot.start)/slot.duration);if(t>=1){slot.active=false;slot.mesh.visible=false;continue;}slot.mesh.scale.setScalar(1+(slot.radius-1)*(1-(1-t)**2));slot.mesh.material.opacity=.9*(1-t);}
    for(const slot of beams){if(!slot.active)continue;const t=Math.max(0,(now-slot.start)/slot.duration);if(t>=1){slot.active=false;slot.mesh.visible=false;}else slot.mesh.material.opacity=.9*(1-t);}
    for(let i=sprites.length-1;i>=0;i--){const s=sprites[i],t=Math.max(0,(now-s.start)/1150);if(t>=1){removeSprite(s);sprites.splice(i,1);continue;}s.mesh.position.y=s.y+Math.sin(t*9)*.16;s.mesh.scale.setScalar(3.4+t*2.5);s.mesh.material.opacity=1-t;s.mesh.material.rotation=t;}
    if(rain){rain.mesh.visible=now<rain.until;if(rain.mesh.visible){const dt=Math.min(.05,Math.max(0,(now-lastRain)/1000));for(let i=0;i<rain.mesh.count;i++){const n=i*3;rain.offsets[n+1]=(rain.offsets[n+1]-38*dt+30)%30;rain.matrix.makeTranslation(rain.center.x+rain.offsets[n],rain.center.y+rain.offsets[n+1],rain.center.z+rain.offsets[n+2]);rain.mesh.setMatrixAt(i,rain.matrix);}rain.mesh.instanceMatrix.needsUpdate=true;}lastRain=now;}
  }
  function clear(){for(const slot of [...rings,...beams]){slot.active=false;slot.mesh.visible=false;}while(sprites.length)removeSprite(sprites.pop());if(rain){rain.until=0;rain.mesh.visible=false;}}
  function dispose(){clear();for(const slot of [...rings,...beams]){scene.remove(slot.mesh);slot.mesh.material.dispose();}ringGeometry.dispose();beamGeometry.dispose();if(rain){scene.remove(rain.mesh);rain.mesh.geometry.dispose();rain.mesh.material.dispose();rain.mesh.dispose();}}
  return {ring,beam,sprite,rainAt,update,clear,dispose,stats:()=>({rings:rings.length,beams:beams.length,sprites:sprites.length,rainDrawCalls:rain?1:0})};
}
