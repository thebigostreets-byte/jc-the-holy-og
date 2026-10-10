import assert from 'node:assert/strict';
import {createPrefetchCache} from '../predictive-streaming.js';
// (1) Malformed speculative payloads cannot be reported as successful warmups.
for(const payload of [undefined,null,{byteLength:NaN},{byteLength:Infinity},{byteLength:-1},{byteLength:2.5}]){
  const cache=createPrefetchCache(async()=>payload);
  assert.equal(await cache.prefetch('invalid'),false,'invalid speculative response must fail');
  assert.equal(cache.stats().entries,0);
}
// (2) In-flight demand cannot count a malformed warmup as a hit.
{
  let resolve;
  const cache=createPrefetchCache(()=>new Promise(r=>resolve=r));
  const prefetch=cache.prefetch('bad');
  const demand=cache.get('bad');
  await Promise.resolve();await Promise.resolve();
  resolve(undefined);
  assert.equal(await prefetch,false);
  assert.equal(await demand,undefined);
  assert.equal(cache.stats().hits,0,'invalid speculative data is not a hit');
}
// (3) Mutation or detachment of a cached buffer must not corrupt budget accounting.
{
  const tile={byteLength:8};
  const cache=createPrefetchCache(async()=>tile,{maxBytes:8,maxEntries:1});
  assert.equal(await cache.prefetch('a'),true);
  assert.equal(cache.stats().bytes,8);
  tile.byteLength=0; // e.g. transferred ArrayBuffer or mutable response metadata
  assert.equal((await cache.get('a')).byteLength,0);
  assert.equal(cache.stats().bytes,0,'tracked allocation size is stable after transfer');
  assert.equal(cache.stats().entries,0);
}
console.log('PASS: invalid warmup failure, invalid warm hit suppression, mutation-safe cache accounting');
