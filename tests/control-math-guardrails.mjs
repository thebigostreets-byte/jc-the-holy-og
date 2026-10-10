import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stickAxis,advanceLook,setFlightForward,response,advancePedal,advanceGait,advanceChain,standardPadActions,standardPadHolds} from '../jc-control-math.js';
assert.equal(readFileSync(new URL('../jc-control-math.js',import.meta.url),'utf8'),readFileSync(new URL('../dist/client/jc-control-math.js',import.meta.url),'utf8'));
assert.deepEqual(standardPadActions,[[0,'jump'],[1,'cast'],[2,'hypersonic'],[3,'car'],[4,'flight'],[5,'shield'],[8,'wheel'],[9,'pause']]);
assert.deepEqual(standardPadHolds,[[0,'Space'],[6,'Control'],[7,'Space']]);
// Invalid or oversized controller inputs cannot introduce NaNs or exceed normalized range.
for(const input of [NaN,Infinity,-Infinity,undefined,null,4,-9]){
  const result=stickAxis(input);assert.ok(Number.isFinite(result)&&Math.abs(result)<=1);
}
for(const deadzone of [-2,1,2,NaN,Infinity]) assert.ok(Number.isFinite(stickAxis(.9,deadzone)));
assert.ok(Math.abs(stickAxis(.5,.2)-.375)<1e-12);assert.equal(stickAxis(-1),-1);
// Delayed frames and invalid touch samples cannot poison the camera state.
assert.deepEqual(advanceLook(0,0,NaN,Infinity,Infinity),{yaw:0,pitch:0});
assert.deepEqual(advanceLook(NaN,Infinity,0,0,NaN),{yaw:0,pitch:0});
assert.equal(advanceLook(0,0,1,0,1).yaw,5.2*.05);
assert.equal(advanceLook(0,0,9,0,.05).yaw,5.2*.05);
assert.equal(advanceLook(0,.71,0,-1,.05).pitch,.72);
// Corrupt orientation is reset to the canonical forward direction.
const vec={set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}};
assert.equal(setFlightForward(vec,NaN,Infinity),vec);
assert.deepEqual([vec.x,vec.y,vec.z],[0,0,-1]);
setFlightForward(vec,Math.PI/2,0);assert.ok(Math.abs(vec.x-1)<1e-12&&Math.abs(vec.z)<1e-12);
// Interpolation cannot explode with malformed frame time, rate or pedal state.
for(const value of [NaN,Infinity,-Infinity,undefined]){
  assert.equal(response(value,.016),0);
  assert.equal(response(10,value),0);
  assert.ok(Number.isFinite(advancePedal(value,1,.016)));
  assert.ok(Number.isFinite(advancePedal(0,value,.016)));
  assert.ok(Number.isFinite(advancePedal(0,1,value)));
}
assert.ok(Math.abs(response(10,.1)-(1-Math.exp(-1)))<1e-12);
assert.equal(advancePedal(0,0,.016),0);
// Gait phase remains within the 8-frame sprite cycle under bad telemetry.
for(const phase of [NaN,-5,Infinity,10000])for(const speed of [NaN,Infinity,-5,13]){
  const next=advanceGait(phase,speed,.016,true);
  assert.ok(Number.isFinite(next)&&next>=0&&next<8);
}
assert.equal(advanceGait(3,0,.016),3);
let phase=0,seen=new Set();for(let i=0;i<180;i++){phase=advanceGait(phase,7,1/60);seen.add(Math.floor(phase));}assert.equal(seen.size,8);
// Clock rollback resets combo rather than awarding phantom combo multipliers.
assert.deepEqual(advanceChain({count:3,last:10,points:1000},9),{count:1,last:9,points:1100});
assert.deepEqual(advanceChain({count:3,last:10,points:1000},11),{count:4,last:11,points:1400});
assert.deepEqual(advanceChain({count:NaN,last:Infinity,points:NaN},NaN),{count:1,last:0,points:100});
console.log('PASS: control math finite guards, camera, flight vector, pedal, gait, combo and source/dist parity');
