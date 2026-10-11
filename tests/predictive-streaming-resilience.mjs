import assert from 'node:assert/strict';
import {predictTravel,createPrefetchCache,corridorPoints} from '../predictive-streaming.js';
assert.deepEqual(predictTravel({x:100,z:50},{x:80,z:50},400),{x:142.5,z:50});
assert.deepEqual(predictTravel(null,{x:5,z:6},16),{x:5,z:6});
assert.deepEqual(predictTravel({x:NaN,z:7},{x:5,z:6},16),{x:5,z:7});
for(const point of [
  predictTravel({x:5,z:6},{x:0,z:0},16,Infinity),
  predictTravel({x:1e308,z:0},{x:-1e308,z:0},16)
])assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.z));
assert.deepEqual(corridorPoints(null,{x:1,z:1}),[]);
assert.deepEqual(corridorPoints({x:0,z:0},{x:1000,z:0},NaN),[{x:500,z:0},{x:1000,z:0}]);
const invalid=createPrefetchCache(async()=>({byteLength:8}));
assert.equal(await invalid.prefetch('bad'),false);
assert.equal(invalid.stats().bytes,0);
const raw=new ArrayBuffer(6),cache=createPrefetchCache(async()=>raw);
assert.equal(await cache.prefetch('buffer'),true);
structuredClone(raw,{transfer:[raw]});
await cache.get('buffer');
assert.equal(cache.stats().bytes,0);
const resolvers=new Map(),epochs=createPrefetchCache(key=>new Promise(resolve=>resolvers.set(key,resolve)));
const old=epochs.prefetch('old');await Promise.resolve();epochs.clear();
const fresh=epochs.prefetch('fresh');await Promise.resolve();
resolvers.get('old')(new Uint8Array(5));assert.equal(await old,false);
assert.equal(await epochs.prefetch('third'),false);
resolvers.get('fresh')(new Uint8Array(5));assert.equal(await fresh,true);
assert.equal(epochs.stats().entries,1);
console.log('PASS predictive-streaming-resilience');
