import assert from 'node:assert/strict';
import {createPrefetchCache} from '../predictive-streaming.js';
// Invalid resource IDs should not become network requests.
{
 const called=[];
 const cache=createPrefetchCache(async key=>{called.push(key);return new Uint8Array(4);});
 for(const key of [undefined,null,'','   '])assert.equal(await cache.prefetch(key),false);
 assert.deepEqual(called,[]);
 assert.equal(cache.stats().pending,0);
}
// A disabled speculative cache should not download unusable tiles.
for(const config of [{maxBytes:0},{maxEntries:0},{maxBytes:-1},{maxEntries:-1}]){
 let calls=0;
 const cache=createPrefetchCache(async()=>{calls++;return new Uint8Array([5]);},config);
 assert.equal(await cache.prefetch('unneeded-tile'),false);
 assert.equal(calls,0);
 assert.equal((await cache.get('required-tile'))[0],5);
 assert.equal(calls,1);
}
console.log('PASS: invalid speculative keys and disabled budgets avoid downloads');
