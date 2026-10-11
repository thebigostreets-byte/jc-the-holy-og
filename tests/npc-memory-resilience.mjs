import assert from 'node:assert/strict';
import {createNpcMemoryStore,NPC_MEMORY_STORAGE_KEY} from '../npc-memory.js';
let assertions=0;
const check=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);assertions++;};
const storage=(saved)=>{const map=new Map(saved?[[NPC_MEMORY_STORAGE_KEY,JSON.stringify(saved)]]:[]);return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
const npc={id:'npc:a',name:'A'},entry=(key,at,text='Event')=>({key,text,at});
{
 const store=createNpcMemoryStore(storage()),bad={toString(){throw Error('unexpected coercion');}};
 check(store.remember(npc,entry('invalid',100,bad)),null,'malformed text ignored');
 check(store.size,0,'rejected events cannot create phantom NPCs');
 check(store.remember({id:bad},entry('valid',100)),null,'malformed NPC id ignored');
 check(store.size,0,'malformed id cannot create NPC');
 store.remember(npc,entry('valid',100));
 check(store.summary(npc.id,0),[],'zero summary limit is empty');
 check(store.summary(npc.id,NaN),['Event'],'invalid summary limit uses default');
 const copy=store.get(npc.id);copy.entries[0].text='changed';
 check(store.get(npc.id).entries[0].text,'Event','memory copies cannot mutate source');
 store.clear('');check(store.size,1,'empty id cannot clear all records');
 store.clear();check(store.size,0,'clear() explicitly clears all');
}
{
 const store=createNpcMemoryStore(storage());
 store.remember(npc,entry('same',5000));store.remember(npc,entry('same',4000));
 check(store.get(npc.id).entries.length,2,'clock rollback preserves distinct events');
 store.remember(npc,entry('same',4001));
 check(store.get(npc.id).entries.length,2,'forward duplicate still coalesces');
 store.remember(npc,entry('same',4002),{dedupeMs:-1});
 check(store.get(npc.id).entries.length,3,'negative dedupe window cannot suppress events');
 store.remember(npc,entry('bad',Infinity));
 check(Number.isFinite(store.get(npc.id).entries.at(-1).at),true,'infinite timestamp repaired');
 store.remember(npc,entry('bad2',-1));
 check(store.get(npc.id).entries.at(-1).at>0,true,'negative timestamp repaired');
}
{
 const saved={version:1,records:{'npc:good':{name:'Good',lastPlayerState:'x'.repeat(900),entries:[null,{},entry('good',10,'Saved event')]},'npc:bad':[], '':{entries:[]}}};
 const store=createNpcMemoryStore(storage(saved));
 check(store.size,1,'invalid saved records discarded');
 check(store.get('npc:good').lastPlayerState.length,80,'saved player state bounded');
 check(store.summary('npc:good'),['Saved event'],'valid saved history retained');
 const bad={toString(){throw Error('unexpected coercion');}};
 store.observe(npc,{appearance:bad,state:bad});
 check(store.get(npc.id).entries.length,0,'invalid observation ignored');
 store.observe(npc,{appearance:'white robe',state:'hovering',at:20});
 check(store.get(npc.id).entries.length,2,'valid observation still works');
}
{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked');}});
  const store=createNpcMemoryStore();store.remember(npc,entry('offline',100));
  check(store.get(npc.id).entries.length,1,'blocked localStorage does not prevent in-memory recall');
 }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
}
{
 const store=createNpcMemoryStore({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});
 store.remember(npc,entry('quota',100));check(store.size,1,'storage failures isolated');
}
{
 const store=createNpcMemoryStore(storage());
 for(let i=0;i<45;i++)store.remember({id:'npc:'+i},entry('e',i+1));
 check(store.size,40,'NPC memory stays within budget');
 check(store.get('npc:0'),null,'oldest record evicted');
 check(store.get('npc:44').entries.length,1,'newest record retained');
}
console.log('PASS: '+assertions+' NPC memory resilience assertions');
