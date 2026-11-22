import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stickAxis} from '../jc-control-math.js';
import {stickAxis as distStickAxis} from '../dist/client/jc-control-math.js';

const source=readFileSync(new URL('../jc-control-math.js',import.meta.url),'utf8');
const dist=readFileSync(new URL('../dist/client/jc-control-math.js',import.meta.url),'utf8');
assert.equal(source,dist,'source and deployed client control math must remain identical');
for(const fn of [stickAxis,distStickAxis]){
  for(const v of [NaN,Infinity,-Infinity,undefined]) assert.equal(fn(v),0,'invalid controller input must be neutral');
  for(const dz of [1,2,-1,NaN,Infinity]) for(const v of [-2,-1,-.5,0,.5,1,2]){
    const out=fn(v,dz);
    assert.ok(Number.isFinite(out) && Math.abs(out)<=1,'axis output must be finite and bounded');
  }
  assert.equal(fn(0),0);
  assert.equal(fn(.16),0);
  assert.equal(fn(-.16),0);
  assert.equal(fn(1),1);
  assert.equal(fn(-1),-1);
  assert.ok(fn(.5)>.35 && fn(.5)<.45,'normal precision should remain stable');
  assert.equal(fn(2),1,'oversized input must clamp');
}
console.log('gamepad stick deadzone safety and source/dist parity: PASS');
