import assert from 'node:assert/strict';
import {corridorPoints} from '../predictive-streaming.js';
assert.deepEqual(corridorPoints({x:420,z:900},{x:420,z:900}),[], 'stationary player has no flight corridor to prefetch');
assert.deepEqual(corridorPoints({x:0,z:0},{x:1900,z:0}),[{x:950,z:0},{x:1900,z:0}], 'moving corridor still warms two points');
console.log('PASS: stationary corridor omits redundant tile prefetch');
