import assert from 'node:assert/strict';
import {createPrefetchCache} from '../predictive-streaming.js';

const deferred = [];
const cache = createPrefetchCache(key => new Promise((resolve,reject) => deferred.push({key,resolve,reject})));
const oldDemand = cache.get('vegas-tile');
await Promise.resolve();
assert.equal(deferred.length,1);
cache.clear();
deferred[0].resolve(new Uint8Array([1]));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(deferred.length,2,'after clearing the stream, demand must retry against the current generation');
deferred[1].resolve(new Uint8Array([2]));
assert.deepEqual([...await oldDemand],[2],'must not deliver stale tile data from before clear');
assert.equal(cache.stats().hits,0,'reset must not manufacture cache hits');
console.log('PASS: stale demand from cleared stream refetches current generation');

// A network failure from a previous map generation must not break a fresh tile load.
{
  const calls=[];
  const next=createPrefetchCache(key=>new Promise((resolve,reject)=>calls.push({key,resolve,reject})));
  const result=next.get('reset-tile');
  await Promise.resolve();
  next.clear();
  calls[0].reject(new Error('old connection closed'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,2,'stale network rejection triggers a fresh generation load');
  calls[1].resolve(new Uint8Array([9]));
  assert.deepEqual([...await result],[9]);
}
// Repeated resets must fail in bounded time, not loop indefinitely.
{
  const calls=[];
  const next=createPrefetchCache(key=>new Promise(resolve=>calls.push(resolve)));
  const result=next.get('always-reset');
  for(let i=0;i<3;i++){
    await new Promise(resolve=>setImmediate(resolve));
    next.clear();
    calls[i](new Uint8Array([i]));
  }
  await assert.rejects(result,/repeated stream resets/);
  assert.equal(calls.length,3);
}
console.log('PASS: stale network failure recovery and bounded repeated resets');
