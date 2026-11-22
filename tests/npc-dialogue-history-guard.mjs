import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requestNpcDialogue} from '../npc-dialogue.js';
const source=readFileSync(new URL('../npc-dialogue.js',import.meta.url),'utf8');
assert.equal(source,readFileSync(new URL('../dist/client/npc-dialogue.js',import.meta.url),'utf8'));
const originalFetch=globalThis.fetch;
let sent;
globalThis.fetch=async (_url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({reply:'Stay safe.'})};};
try{
 const npc={id:'test-npc',name:'Alex',faction:'civilian',witnessMemory:{entries:[null,{text:'Saw JC fly'},{text:42}]}};
 const result=await requestNpcDialogue(npc,null,{message:'hello'});
 assert.equal(result.reply,'Stay safe.');
 assert.deepEqual(sent.history,[]);
 assert.deepEqual(sent.npc.witnessMemories,['Saw JC fly']);
 await requestNpcDialogue(npc,[{role:'user',content:'hi'}],{message:'hello'});
 assert.equal(sent.history.length,1);
 console.log('PASS: NPC dialogue tolerates missing history and malformed witness entries');
}finally{globalThis.fetch=originalFetch;}
