import assert from 'node:assert/strict';
import {createPrefetchCache} from '../predictive-streaming.js';

// A transferred cached buffer must not block speculative warming of a new copy.
{
  let loads=0;
  const first=new Uint8Array([1,2,3,4]);
  const cache=createPrefetchCache(async()=>++loads===1?first:new Uint8Array([5,6,7,8]),{maxBytes:16,maxEntries:1});
  assert.equal(await cache.prefetch('tile'),true);
  structuredClone(first.buffer,{transfer:[first.buffer]});
  assert.equal(first.byteLength,0);
  assert.equal(await cache.prefetch('tile'),true,'stale cached tile should not block rewarm');
  assert.equal(loads,2);
  assert.deepEqual(cache.stats(),{bytes:4,entries:1,pending:0,hits:0});
  assert.equal((await cache.get('tile')).byteLength,4);
  assert.equal(cache.stats().hits,1,'replacement tile can be consumed as a valid hit');
}
// A valid cache entry must not be fetched twice.
{
  let loads=0;
  const cache=createPrefetchCache(async()=>{loads++;return new Uint8Array([9]);});
  assert.equal(await cache.prefetch('good'),true);
  assert.equal(await cache.prefetch('good'),false);
  assert.equal(loads,1);
}
console.log('PASS: invalid detached tile can be rewarmed; valid tile not refetched');
