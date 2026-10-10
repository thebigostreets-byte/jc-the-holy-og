import assert from 'node:assert/strict';
import {createPrefetchCache} from '../predictive-streaming.js';
for (const limit of [1,2,3,4]) {
  let concurrent=0,maxObserved=0;
  const cache=createPrefetchCache(async key=>{
    concurrent++;maxObserved=Math.max(maxObserved,concurrent);
    await Promise.resolve();
    concurrent--;
    return new Uint8Array((key%5)+1);
  },{maxConcurrent:limit,maxBytes:20,maxEntries:5});
  for(let batch=0;batch<1000;batch++){
    await Promise.all(Array.from({length:8},(_,i)=>cache.prefetch(batch*8+i)));
    if(batch%13===0)cache.clear();
    assert.ok(cache.stats().bytes<=20,'byte budget');
    assert.ok(cache.stats().entries<=5,'entry budget');
    assert.equal(cache.stats().pending,0,'no orphaned pending requests');
  }
  assert.ok(maxObserved<=limit,'concurrent fetches stay within budget');
  assert.equal(maxObserved,limit,'available concurrency is utilized');
}
console.log('PASS: 32,000 prefetch attempts across 1/2/3/4-concurrency device profiles.');
