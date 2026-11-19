import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requestNpcDialogue} from '../npc-dialogue.js';
assert.equal(readFileSync(new URL('../npc-dialogue.js',import.meta.url),'utf8'),readFileSync(new URL('../dist/client/npc-dialogue.js',import.meta.url),'utf8'));
const oldFetch=globalThis.fetch;
let calls=0;
globalThis.fetch=async (_url,{signal})=>{
 calls++;
 return new Promise((_resolve,reject)=>{
  if(signal.aborted)return reject(signal.reason);
  signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
 });
};
try{
 const pre=new AbortController();pre.abort();
 await assert.rejects(requestNpcDialogue({name:'Test'},[],{signal:pre.signal}),error=>error.name==='AbortError');
 assert.equal(calls,0,'pre-cancelled dialogue must not fetch');
 const during=new AbortController();
 const pending=requestNpcDialogue({name:'Test'},[],{signal:during.signal});
 during.abort();
 await assert.rejects(pending,error=>error.name==='AbortError');
 assert.equal(calls,1,'in-flight cancellation must terminate existing fetch');
 console.log('PASS: NPC dialogue cancellation does not start requests or masquerade as timeout');
}finally{globalThis.fetch=oldFetch;}
