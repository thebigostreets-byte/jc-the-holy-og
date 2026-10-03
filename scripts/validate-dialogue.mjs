import assert from 'node:assert/strict';
import {requestNpcDialogue} from '../npc-dialogue.js';
const originalFetch = globalThis.fetch;
let sent;
try {
  globalThis.fetch = async (url,options) => {sent={url,options,body:JSON.parse(options.body)};return Response.json({reply:'The lights came back after your miracle.'});};
  const npc={name:'Mara',faction:'civilian',state:'awe',event:{type:'lightning'}};
  const dialogue=await requestNpcDialogue(npc,[],{message:'What happened?'});
  assert.match(dialogue.reply,/lights came back/);
  assert.equal(sent.url,'/api/npc-chat');
  assert.equal(sent.options.mode,'same-origin');
  assert.equal(sent.body.npc.recentEvent,'lightning');
  globalThis.fetch = async () => Response.json({error:'Add API credit.',code:'api_credit_exhausted'},{status:503});
  await assert.rejects(requestNpcDialogue(npc,[],{message:'Hello'}),error => error.code==='api_credit_exhausted' && error.message==='Add API credit.');
  globalThis.fetch = async (url,{signal}) => new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
  const controller = new AbortController(), request = requestNpcDialogue(npc,[],{message:'Hello',signal:controller.signal});
  controller.abort();
  await assert.rejects(request,error => error.name==='AbortError');
} finally {globalThis.fetch=originalFetch;}
console.log('Dialogue client passed event context, same-origin requests, quota reporting, and close cancellation.');
