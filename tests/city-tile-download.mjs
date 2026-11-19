import assert from 'node:assert/strict';
import {cachePackagedCityTiles,isTileStorageQuotaError} from '../city-tile-download.js';

const tiles=Array.from({length:7},(_,i)=>({uri:'tiles/C00_R0' + i + '.glb'}));
function memoryCache({quotaAt=Infinity}={}) {
  const store=new Map();
  let writes=0;
  return {store,
    async match(url){return store.get(url);},
    async put(url,response){if(++writes>=quotaAt){const e=new Error('Storage full');e.name='QuotaExceededError';throw e;}store.set(url,response);},
  };
}
const baseUrl='https://example.invalid/jc-the-holy-og/map.html';
const cache=memoryCache();
let requests=[];
let progress=[];
const fetchResponse=async url=>{
  requests.push(url);
  if(url.includes('C00_R02'))return {ok:false,status:404};
  return {ok:true,status:200};
};
const result=await cachePackagedCityTiles(tiles,{cache,baseUrl,fetchResponse,onProgress:s=>progress.push(s)});
assert.deepEqual({...result},{done:7,total:7,cached:6,alreadyCached:0,downloaded:6,failed:1,stopped:null});
assert.equal(requests.length,7,'a single 404 does not halt the rest');
assert.ok(progress.at(-1).done===7);
const retry=await cachePackagedCityTiles(tiles,{cache,baseUrl,fetchResponse:async url=>{requests.push(url);return {ok:true};}});
assert.equal(retry.downloaded,1,'resume downloads only missing tile');
assert.equal(retry.alreadyCached,6);
assert.equal(requests.length,8);
const full=await cachePackagedCityTiles(tiles,{cache,baseUrl,fetchResponse:()=>{throw Error('should not fetch')}});
assert.equal(full.downloaded,0);
assert.equal(full.cached,7);

const limited=memoryCache({quotaAt:3});
const quota=await cachePackagedCityTiles(tiles,{cache:limited,baseUrl,fetchResponse:async()=>({ok:true})});
assert.deepEqual([quota.stopped,quota.done,quota.cached,quota.failed],['storage',3,2,1]);
assert.equal(limited.store.size,2,'earlier cache entries survive quota error');
assert.ok(isTileStorageQuotaError({name:'QuotaExceededError'}));

const failing=await cachePackagedCityTiles(tiles,{cache:memoryCache(),baseUrl,fetchResponse:async()=>{throw Error('offline');},maxConsecutiveFailures:3});
assert.deepEqual([failing.stopped,failing.done,failing.failed],['network',3,3]);

const cancelled=new AbortController();
const aborting=cachePackagedCityTiles(tiles,{cache:memoryCache(),baseUrl,signal:cancelled.signal,
  fetchResponse:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}))});
cancelled.abort();
const aborted=await aborting;
assert.equal(aborted.stopped,'cancelled');
assert.equal(aborted.cached,0);

const timeout=await cachePackagedCityTiles(tiles.slice(0,1),{cache:memoryCache(),baseUrl,timeoutMs:10,maxConsecutiveFailures:1,
  fetchResponse:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true}))});
assert.deepEqual([timeout.stopped,timeout.done,timeout.failed],['network',1,1]);
const unsupported=await cachePackagedCityTiles([{uri:'https://evil.example/attack'}],{cache:memoryCache(),baseUrl,fetchResponse:()=>{throw Error('should not fetch');}});
assert.equal(unsupported.failed,1);
console.log('PASS: city downloads resume, skip cached, handle missing files, quota, network failures, cancellation, timeout, and invalid paths.');
