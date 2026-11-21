import assert from 'node:assert/strict';
import {predictTravel,createPrefetchCache,corridorPoints} from '../predictive-streaming.js';
assert.deepEqual(predictTravel({x:100,z:50},{x:80,z:50},400),{x:142.5,z:50});
assert.deepEqual(predictTravel({x:50,z:100},{x:50,z:120},400),{x:50,z:57.5});
const jump=predictTravel({x:10000,z:0},{x:0,z:0},1);assert.ok(jump.x<=10102,'teleport samples cannot produce unlimited prefetch distance');
assert.deepEqual(predictTravel({x:1,z:2},null,0),{x:1,z:2});
let calls=0;
const cache=createPrefetchCache(async key=>{calls++;return new Uint8Array(key==='large'?20:4);},{maxBytes:8,maxEntries:2});
await cache.prefetch('a');await cache.prefetch('b');assert.equal(cache.stats().bytes,8);
await cache.prefetch('c');assert.equal(cache.stats().entries,2);assert.equal(cache.stats().bytes,8);
const before=calls;await cache.get('c');assert.equal(calls,before,'demand consumes prefetched bytes without another download');assert.equal(cache.stats().bytes,4);
await cache.prefetch('large');assert.equal(cache.stats().bytes,4,'oversized tiles are not retained');
let finish,fetches=0;
const shared=createPrefetchCache(()=>{fetches++;return new Promise(resolve=>finish=resolve);});
const warm=shared.prefetch('next');await Promise.resolve();const demand=shared.get('next');
assert.equal(await shared.prefetch('other'),false,'only one speculative download runs at a time');
finish(new Uint8Array(5));await warm;await demand;assert.equal(fetches,1,'prefetch and demand share a pending request');assert.equal(shared.stats().bytes,0,'demand releases the warm byte buffer');
const late=shared.prefetch('stale');await Promise.resolve();shared.clear();finish(new Uint8Array(5));await late;assert.equal(shared.stats().bytes,0,'folder changes cannot retain stale prefetch results');
let attempts=0;const retry=createPrefetchCache(()=>{if(++attempts===1)throw Error('offline');return new Uint8Array(3);});assert.equal(await retry.prefetch('x'),false);assert.equal((await retry.get('x')).length,3,'failed speculative loads never block demand retries');

let releaseOld,releaseNew,staleCalls=0;
const switching=createPrefetchCache(key=>{staleCalls++;return new Promise(resolve=>{if(key==='old')releaseOld=resolve;else if(key==='new')releaseNew=resolve;});});
const oldWarm=switching.prefetch('old');await Promise.resolve();
switching.clear();
const newWarm=switching.prefetch('new');await Promise.resolve();
assert.equal(staleCalls,2,'new folder can prefetch while stale request is pending');
releaseOld(new Uint8Array(4));await oldWarm;
assert.equal(await switching.prefetch('third'),false,'old completion must not release the current prefetch slot');
releaseNew(new Uint8Array(4));await newWarm;
assert.equal(switching.stats().entries,1,'only current-generation bytes are retained');
console.log('PASS: travel prediction, memory ceilings, eviction, deduplication, request limits, stale-result rejection and retry.');

assert.deepEqual(corridorPoints({x:0,z:0},{x:0,z:0}),[],'stationary flight should not warm duplicate tiles');
assert.deepEqual(corridorPoints({x:0,z:0},{x:1900,z:0}),[{x:950,z:0},{x:1900,z:0}]);
assert.deepEqual(corridorPoints({x:0,z:0},{x:100,z:0},0),[{x:100,z:0}]);
assert.deepEqual(corridorPoints({x:0,z:0},{x:100,z:0},Infinity),[{x:100,z:0}]);
assert.deepEqual(corridorPoints({x:Infinity,z:0},{x:100,z:0}),[]);
assert.deepEqual(corridorPoints(null,{x:100,z:0}),[]);
assert.equal(corridorPoints({x:0,z:0},{x:100000,z:0}).length,8,'prefetch corridor remains bounded');

// A failed or partial speculative tile must not crash the loading path.
const invalid=createPrefetchCache(async key=>key==='missing'?null:key==='bad'?{byteLength:Infinity}:new Uint8Array(3));
assert.equal(await invalid.prefetch('missing'),true);
assert.equal(await invalid.prefetch('bad'),true);
assert.equal(invalid.stats().entries,0,'invalid payloads cannot be retained');
assert.equal((await invalid.get('ok')).length,3,'demand still works after invalid speculative responses');
const disabled=createPrefetchCache(async()=>new Uint8Array(2),{maxBytes:0,maxEntries:2});
assert.equal(await disabled.prefetch('no-space'),true);
assert.equal(disabled.stats().entries,0,'zero cache budget must not loop forever');
const malformed=createPrefetchCache(async()=>({byteLength:-1}));
assert.equal(await malformed.prefetch('negative'),true);
assert.equal(malformed.stats().entries,0,'negative byte counts must not enter cache');

assert.deepEqual(predictTravel({x:1,z:2},{x:Infinity,z:2},100),{x:1,z:2},'invalid previous motion sample cannot poison tile prediction');
assert.deepEqual(predictTravel({x:1,z:2},{x:0,z:2},100,Infinity),{x:9.5,z:2},'invalid lookahead falls back to safe default');
assert.deepEqual(predictTravel({x:1,z:2},{x:0,z:2},100,-100),{x:1,z:2},'negative lookahead cannot prefetch backwards');
assert.deepEqual(predictTravel({x:1,z:2},{x:0,z:2},100,1000),{x:21,z:2},'excessive lookahead is capped at two seconds');
