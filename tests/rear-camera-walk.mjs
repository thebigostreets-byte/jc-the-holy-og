import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../three.module.js';
import {advanceGait} from '../jc-control-math.js';

// Each half-stride must be displayed, including under sprint and low frame rate.
for(const hz of [20,30,60,120])for(const sprint of [false,true]){
  let phase=0;const seen=new Set();
  for(let i=0;i<hz*3;i++){
    const next=advanceGait(phase,sprint?13:7,1/hz,sprint);
    assert.ok((Math.floor(next)-Math.floor(phase)+8)%8<=1,'cannot skip a foot pose');
    phase=next;seen.add(Math.floor(phase));
  }
  assert.equal(seen.size,8,'both left and right steps must play');
}
assert.equal(advanceGait(3,0,.016),3,'stopped character does not step');
const source=readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
const cameraCode=source.slice(source.indexOf('function cameraFocus()'),source.indexOf('function teleport(distance'));
const player={position:new THREE.Vector3(15,20,30)};
const camera=new THREE.PerspectiveCamera();
const context=vm.createContext({THREE,player,yaw:0,viewPitch:0,blockedAt:()=>false,game:{camera}});
vm.runInContext(cameraCode,context);
for(const yaw of [0,.7,Math.PI,-2.1]){
  context.yaw=yaw;context.snapCameraBehindPlayer();
  const offset=camera.position.clone().sub(player.position);
  assert.ok(Math.abs(offset.x+Math.sin(yaw)*9)<1e-8);
  assert.ok(Math.abs(offset.z-Math.cos(yaw)*9)<1e-8);
  assert.ok(Math.abs(offset.y-5.3)<1e-8);
  const forward=camera.getWorldDirection(new THREE.Vector3());
  assert.ok(forward.dot(context.cameraFocus().sub(camera.position).normalize())>.99999);
}
context.yaw=0;context.blockedAt=(x,y,z)=>z>34;
context.snapCameraBehindPlayer();assert.ok(camera.position.z<34,'wall protection remains active');
context.blockedAt=()=>false;context.yaw=0;context.viewPitch=.4;context.snapCameraBehindPlayer();
assert.ok(camera.position.y<player.position.y+5.3,'look-up aim raises the view direction while retaining rear camera');
assert.ok(camera.position.z>player.position.z,'pitched camera remains behind JC');
assert.ok(source.includes('advanceLook(yaw,viewPitch,lookX,lookY,dt)'),'camera pitch is bounded by the tested look controller');
assert.ok(source.includes('game.camera.position.copy(cameraBoom(9))'),'no follow lag or speed-dependent distance');
console.log('PASS: both stride halves at 20–120 FPS, fixed rear offset and aiming, wall avoidance.');
