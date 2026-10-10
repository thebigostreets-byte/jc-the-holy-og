import assert from 'node:assert/strict';
import {predictTravel,corridorPoints} from '../predictive-streaming.js';
// 1. Missing/malformed player positions do not throw and never return invalid positions.
assert.deepEqual(predictTravel(null,{x:7,z:9},16),{x:7,z:9});
assert.deepEqual(predictTravel(undefined,undefined,16),{x:0,z:0});
assert.deepEqual(predictTravel({x:NaN,z:1},{x:2,z:3},16),{x:2,z:3});
assert.deepEqual(predictTravel({x:1,z:2},{x:Infinity,z:0},16),{x:1,z:2});
// 2. Bad lookahead never sends streaming backward or into an unbounded corridor.
const current={x:10,z:0},previous={x:0,z:0};
assert.deepEqual(predictTravel(current,previous,1000,-100),current);
assert.deepEqual(predictTravel(current,previous,1000,Infinity),predictTravel(current,previous,1000,.85));
assert.deepEqual(predictTravel(current,previous,1000,999),predictTravel(current,previous,1000,2));
// 3. Intermediate overflow cannot propagate Infinity/NaN into the tile index.
assert.deepEqual(predictTravel({x:1e308,z:1e308},{x:-1e308,z:-1e308},1),{x:1e308,z:1e308});
assert.deepEqual(predictTravel({x:1e308,z:1e308},{x:0,z:0},Number.MIN_VALUE),{x:1e308,z:1e308});
// 4. Invalid corridor endpoints and spacing are handled safely.
assert.deepEqual(corridorPoints(null,{x:10,z:0}),[]);
assert.deepEqual(corridorPoints({x:0,z:0},{x:NaN,z:0}),[]);
assert.deepEqual(corridorPoints({x:1e308,z:0},{x:-1e308,z:0}),[]);
assert.deepEqual(corridorPoints({x:0,z:0},{x:1900,z:0},NaN),[{x:950,z:0},{x:1900,z:0}]);
assert.deepEqual(corridorPoints({x:0,z:0},{x:1900,z:0},-10),[{x:950,z:0},{x:1900,z:0}]);
// Existing geometry behavior remains unchanged for realistic travel.
assert.deepEqual(predictTravel({x:10,z:20},null,1000),{x:10,z:20});
assert.deepEqual(corridorPoints({x:0,z:0},{x:1900,z:0},950),[{x:950,z:0},{x:1900,z:0}]);
for(let i=0;i<100000;i++){
  const x=Math.sin(i)*15000,z=Math.cos(i)*15000;
  const out=predictTravel({x,z},{x:x-2,z:z+3},16,i%13===0?NaN:i%17===0?Infinity:0.85);
  assert.ok(Number.isFinite(out.x)&&Number.isFinite(out.z));
  const pts=corridorPoints({x,z},out,950);
  assert.ok(pts.length<=8&&pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
}
console.log('PASS: four geometry guards, existing behavior, 100,000 predictive-streaming stress iterations.');
