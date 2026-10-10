import assert from 'node:assert/strict';
import {createPrefetchCache,predictTravel,corridorPoints} from '../predictive-streaming.js';

function makeLoader(){
  const requests=new Map(),calls=[];
  const load=key=>{calls.push(key);return new Promise((resolve,reject)=>requests.set(key,{resolve,reject}));};
  return {load,calls,requests};
}
async function flush(){await Promise.resolve();await Promise.resolve();}

// Real map-engine configuration: high-end devices can warm three distinct tiles concurrently.
{
  const {load,calls,requests}=makeLoader();
  const cache=createPrefetchCache(load,{maxConcurrent:3,maxBytes:16,maxEntries:2});
  const a=cache.prefetch('a'),b=cache.prefetch('b'),c=cache.prefetch('c');
  await flush();
  assert.deepEqual(calls,['a','b','c'],'three independent warmups begin without serializing');
  assert.equal(await cache.prefetch('d'),false,'fourth concurrent warmup is refused');
  requests.get('a').resolve(new Uint8Array(8));await a;
  const d=cache.prefetch('d');await flush();assert.deepEqual(calls,['a','b','c','d']);
  requests.get('b').resolve(new Uint8Array(8));requests.get('c').resolve(new Uint8Array(8));requests.get('d').resolve(new Uint8Array(8));
  assert.deepEqual(await Promise.all([b,c,d]),[true,true,true]);
  assert.ok(cache.stats().entries<=2);
  assert.ok(cache.stats().bytes<=16);
  assert.deepEqual(cache.stats(),{bytes:16,entries:2,pending:0,hits:0});
  assert.equal((await cache.get('d')).byteLength,8,'prefetched tile is reusable');
  assert.equal(cache.stats().hits,1);
}
// A low-end device stays at one speculative network request, even if callers queue many candidates.
{
  const {load,calls,requests}=makeLoader();
  const cache=createPrefetchCache(load,{maxConcurrent:1});
  const a=cache.prefetch('a');await flush();
  assert.equal(await cache.prefetch('b'),false);
  assert.deepEqual(calls,['a']);
  requests.get('a').resolve(new Uint8Array(4));assert.equal(await a,true);
  assert.equal(cache.stats().entries,1);
}
// Clearing a city stream frees the warmup slot without allowing stale requests to poison its cache.
{
  const {load,calls,requests}=makeLoader();
  const cache=createPrefetchCache(load,{maxConcurrent:1});
  const stale=cache.prefetch('old');await flush();
  cache.clear();
  const fresh=cache.prefetch('new');await flush();
  assert.deepEqual(calls,['old','new']);
  requests.get('old').resolve(new Uint8Array(6));assert.equal(await stale,false);
  assert.equal(cache.stats().entries,0,'stale tile is discarded after stream reset');
  assert.equal(await cache.prefetch('blocked'),false,'old completion cannot free the new active slot');
  requests.get('new').resolve(new Uint8Array(7));assert.equal(await fresh,true);
  assert.deepEqual(cache.stats(),{bytes:7,entries:1,pending:0,hits:0});
}
// A corrupt/missing tile response cannot set the cache size to NaN or break eviction.
{
  const cache=createPrefetchCache(async key=>key==='bad'?undefined:key==='fake'?{byteLength:Infinity}:new Uint8Array(4),{maxBytes:8,maxEntries:2,maxConcurrent:3});
  assert.equal(await cache.prefetch('bad'),false);
  assert.equal(await cache.prefetch('fake'),false);
  assert.deepEqual(cache.stats(),{bytes:0,entries:0,pending:0,hits:0});
  assert.equal(await cache.prefetch('good'),true);
  assert.equal(cache.stats().bytes,4);
  assert.equal((await cache.get('good')).byteLength,4);
  assert.equal(cache.stats().bytes,0);
}
// Preserve existing predictive movement and corridor geometry for valid inputs.
assert.deepEqual(predictTravel({x:10,z:20},null,1000),{x:10,z:20});
assert.deepEqual(corridorPoints({x:0,z:0},{x:1900,z:0},950),[{x:950,z:0},{x:1900,z:0}]);
console.log('PASS: concurrent prefetch, mobile cap, generation reset, byte accounting and existing corridor geometry.');

// Two simultaneous demand loads must not count as a speculative-cache hit.
{
  const {load,requests}=makeLoader();
  const cache=createPrefetchCache(load);
  const a=cache.get('demand'),b=cache.get('demand');
  await flush();
  requests.get('demand').resolve(new Uint8Array(3));
  assert.deepEqual((await Promise.all([a,b])).map(v=>v.byteLength),[3,3]);
  assert.equal(cache.stats().hits,0,'shared demand fetch is not a cache hit');
}
// A real speculative request consumed by demand remains a legitimate cache hit.
{
  const {load,requests}=makeLoader();
  const cache=createPrefetchCache(load);
  const warm=cache.prefetch('warm');
  const demand=cache.get('warm');
  await flush();
  requests.get('warm').resolve(new Uint8Array(3));
  await Promise.all([warm,demand]);
  assert.equal(cache.stats().hits,1,'demand consumed an in-flight speculative request');
}
