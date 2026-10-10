import assert from 'node:assert/strict';
import {createMissionTracker,JC_MISSION_STORAGE_KEY} from '../jc-missions.js';

function storage(){
  const map=new Map();
  return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
}
const s=storage(),m=createMissionTracker(s);
assert.equal(m.getSnapshot().missions.length,5);
assert.equal(m.getSnapshot().allComplete,false);
m.add('lights',3);m.add('lights',99);
assert.equal(m.getSnapshot().missions.find(x=>x.id==='lights').value,8);
m.add('prayers',3);m.add('buildings',5);m.add('people',4);
m.visit('strip');m.visit('airport');m.visit('downtown');m.visit('psalms');
assert.equal(m.getSnapshot().allComplete,true);
const reloaded=createMissionTracker(s);
assert.equal(reloaded.getSnapshot().allComplete,true);
assert.equal(reloaded.getSnapshot().visited.length,4);
reloaded.reset();
assert.equal(reloaded.getSnapshot().allComplete,false);

let changes=0;
const stop=reloaded.onChange(()=>changes++);
for(const invalid of [NaN,Infinity,-Infinity,-1,0,0.5,'3',null,{},Number.MAX_SAFE_INTEGER+1]){
  assert.equal(reloaded.add('lights',invalid),false,`invalid increment ${String(invalid)} rejected`);
}
assert.equal(reloaded.add('missing',1),false);
assert.equal(changes,0,'rejected events do not trigger saves or notifications');
assert.equal(reloaded.getSnapshot().missions.find(x=>x.id==='lights').value,0);
assert.equal(reloaded.add('lights',2),true);
assert.equal(reloaded.add('lights',2),true);
assert.equal(reloaded.add('lights',20),true);
assert.equal(reloaded.add('lights',1),false,'completed objective does not trigger duplicate updates');
assert.equal(changes,3);
stop();

const damaged=storage();
damaged.setItem(JC_MISSION_STORAGE_KEY,JSON.stringify({version:1,counts:{lights:-4,prayers:'3',buildings:Infinity,people:999,regions:NaN},visited:['strip','strip',null,42,'','downtown'],startedAt:'broken',updatedAt:-1}));
const repaired=createMissionTracker(damaged);
assert.deepEqual(repaired.getSnapshot().missions.map(x=>x.value),[0,0,0,4,0]);
assert.deepEqual(repaired.getSnapshot().visited,['strip','downtown']);
assert.equal(repaired.getSnapshot().allComplete,false);
assert.ok(Number.isFinite(repaired.getState().startedAt));
assert.ok(Number.isFinite(repaired.getState().updatedAt));
assert.equal(repaired.visit(null),false);
assert.equal(repaired.visit('strip'),false);
assert.equal(repaired.visit(' airport '),true);
assert.deepEqual(repaired.getSnapshot().visited,['strip','downtown','airport']);

console.log('PASS: campaign mission persistence, completion, invalid event rejection, and corrupted-save recovery');
