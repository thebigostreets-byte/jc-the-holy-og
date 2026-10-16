import assert from 'node:assert/strict';
import {createNpcDecisionQueue, createNpcPerformanceScheduler} from '../npc-performance.js';

const scheduler = createNpcPerformanceScheduler({mobile:true});
assert.equal(scheduler.shouldUpdate('nearby', 900, 1000), true);
assert.equal(scheduler.shouldUpdate('nearby', 20, 1010), true, 'NPC moving near gets immediate high-detail update');
assert.equal(scheduler.shouldUpdate('nearby', 20, 1020), false, 'near-tier budget still applies');
assert.equal(scheduler.shouldUpdate('nearby', 20, Number.NaN), false, 'invalid clock cannot poison the scheduler');
assert.equal(scheduler.shouldUpdate('nearby', 20, 1070), true);

const timeout = createNpcDecisionQueue({
  fetcher: () => new Promise(() => {}), concurrency:1, timeoutMs:20, cooldownMs:0,
});
const hung = timeout.request('hung', {message:'unresponsive backend'});
const next = timeout.request('next', {message:'also unresponsive'});
assert.equal(await hung, null, 'hung request resolves on deadline even when abort is ignored');
assert.equal(await next, null, 'later requests also complete');
assert.equal(timeout.activeCount, 0);
assert.equal(timeout.queuedCount, 0);

let calls=0;
const syncThrow = createNpcDecisionQueue({fetcher:()=>{calls++;if(calls===1)throw Error('sync fetch failure');return Promise.resolve({ok:true,json:async()=>({reply:'Recovered'})});},concurrency:1,timeoutMs:100});
const failed=syncThrow.request('first', {message:'first'});
const recovered=syncThrow.request('second', {message:'second'});
assert.equal(await failed, null);
assert.equal((await recovered).reply, 'Recovered', 'sync exception cannot stall following NPC');
assert.equal(syncThrow.activeCount, 0);

const hungJson = createNpcDecisionQueue({fetcher:async()=>({ok:true,json:()=>new Promise(()=>{})}),timeoutMs:20});
assert.equal(await hungJson.request('json', {message:'stuck parse'}), null, 'stuck response JSON also times out');

let finish;
const dedupe = createNpcDecisionQueue({fetcher:()=>new Promise(resolve=>{finish=resolve;}),timeoutMs:100});
const first=dedupe.request('same', {message:'hi'});
assert.strictEqual(dedupe.request('same', {message:'repeat'}),first);
await Promise.resolve();
finish({ok:true,json:async()=>({reply:'One'})});
assert.equal((await first).reply,'One');

const bounded = createNpcDecisionQueue({fetcher:()=>new Promise(()=>{}), concurrency:1, maxQueued:1, timeoutMs:25, cooldownMs:0});
const activeJob=bounded.request('a',{message:'active'});
const queuedJob=bounded.request('b',{message:'queued'});
assert.equal(await bounded.request('c',{message:'rejected'}),null,'queue limit rejects overflow');
assert.equal(bounded.queuedCount,1,'pending work remains bounded');
assert.equal(await activeJob,null);
assert.equal(await queuedJob,null);

let fakeClock=1000;
const rollback=createNpcDecisionQueue({now:()=>fakeClock,cooldownMs:30000,fetcher:async()=>({ok:true,json:async()=>({reply:'ok'})})});
assert.equal((await rollback.request('clock',{message:'first'})).reply,'ok');
fakeClock=500;
assert.equal((await rollback.request('clock',{message:'clock moved backwards'})).reply,'ok','clock rollback cannot freeze requests');
fakeClock=Number.NaN;
assert.equal(await rollback.request('invalid',{message:'invalid time'}),null);

const negativeCooldown=createNpcDecisionQueue({cooldownMs:-10,fetcher:async()=>({ok:true,json:async()=>({reply:'ok'})})});
assert.equal((await negativeCooldown.request('same',{message:'first'})).reply,'ok');
assert.equal((await negativeCooldown.request('same',{message:'second'})).reply,'ok','negative cooldown safely clamps to zero');

console.log('PASS: NPC near-tier responsiveness, invalid clock guard, timeout recovery, sync fetch failure, stalled JSON, request dedupe');
