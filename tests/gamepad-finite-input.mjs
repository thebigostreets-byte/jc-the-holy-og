import assert from 'node:assert/strict';
import {stickAxis,advanceLook} from '../jc-control-math.js';

// Broken/oversized browser Gamepad API values must not poison player movement.
assert.equal(stickAxis(NaN),0);
assert.equal(stickAxis(Infinity),0);
assert.equal(stickAxis(-Infinity),0);
assert.equal(stickAxis(.16),0);
assert.equal(stickAxis(1),1);
assert.equal(stickAxis(-1),-1);
assert.equal(stickAxis(8),1);
assert.equal(stickAxis(-8),-1);
assert.equal(stickAxis(.5,1),0);
assert.equal(stickAxis(.5,NaN),(.5-.16)/.84);
// Nonfinite or oversized look input cannot turn the camera into NaN/Infinity.
assert.deepEqual(advanceLook(0,0,NaN,Infinity,1),{yaw:0,pitch:0});
assert.deepEqual(advanceLook(0,0,1,1,NaN),{yaw:0,pitch:0});
assert.ok(Number.isFinite(advanceLook(0,0,100,-100,1).yaw));
console.log('13 gameplay input assertions passed');
