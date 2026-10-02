import assert from 'node:assert/strict';
import {createNpcContactStore,NPC_CONTACT_STORAGE_KEY} from '../npc-contacts.js';

const values=new Map();
const storage={
  getItem(key){return values.has(key)?values.get(key):null;},
  setItem(key,value){values.set(key,value);}
};
const store=createNpcContactStore(storage);
const npc={id:'civilian:civilian-01:Mara',name:'Mara',faction:'civilian',avatar:'civilian-01',position:{x:12,y:1.5,z:-4}};
assert.equal(store.size,0);
assert.equal(store.has(npc.id),false);
assert.equal(store.setTracked(npc.id),false,'cannot track an unsaved contact');
assert.ok(store.add(npc));
assert.equal(store.size,1);
assert.equal(store.has(npc),true);
assert.equal(store.setTracked(npc.id),true);
assert.equal(store.getTrackedId(),npc.id);
const restored=createNpcContactStore(storage);
assert.equal(restored.size,1,'saved contacts survive store recreation');
assert.equal(restored.getTrackedId(),npc.id,'tracked contact survives store recreation');
assert.deepEqual(restored.getAll()[0].position,npc.position);
assert.equal(restored.toggle(npc).saved,false,'toggle removes an existing contact');
assert.equal(restored.size,0);
assert.equal(restored.getTrackedId(),null,'removing the tracked contact clears tracking');
assert.equal(JSON.parse(values.get(NPC_CONTACT_STORAGE_KEY)).contacts.length,0);
console.log('PASS: NPC contacts persist, validate tracking, toggle save state and clear removed targets.');
