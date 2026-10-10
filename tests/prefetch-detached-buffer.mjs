import assert from 'node:assert/strict';
import {createPrefetchCache} from '../predictive-streaming.js';

// A prefetched binary buffer can be transferred to a worker before gameplay
// consumes it. A detached buffer is not a usable city tile and must be reloaded.
{
  let loads=0;
  const first=new Uint8Array([1,2,3,4]);
  const cache=createPrefetchCache(async()=>++loads===1?first:new Uint8Array([5,6,7,8]),{maxBytes:16,maxEntries:2});
  assert.equal(await cache.prefetch('tile'),true);
  assert.deepEqual(cache.stats(),{bytes:4,entries:1,pending:0,hits:0});
  structuredClone(first.buffer,{transfer:[first.buffer]});
  assert.equal(first.byteLength,0,'buffer was detached');
  const result=await cache.get('tile');
  assert.equal(result.byteLength,4,'gameplay receives a fresh valid tile');
  assert.equal(loads,2,'invalid cached tile is fetched again');
  assert.deepEqual(cache.stats(),{bytes:0,entries:0,pending:0,hits:0},'detached entry is not a cache hit');
}
// Valid cached data remains a fast path with no second network request.
{
  let loads=0;
  const cache=createPrefetchCache(async()=>{loads++;return new Uint8Array([9,8,7]);});
  assert.equal(await cache.prefetch('valid'),true);
  assert.equal((await cache.get('valid')).byteLength,3);
  assert.equal(loads,1);
  assert.equal(cache.stats().hits,1);
}
console.log('PASS: detached prefetched tile is discarded and reloaded; valid hit unaffected');
