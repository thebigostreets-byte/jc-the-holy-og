import assert from 'node:assert/strict';
import {createMissionTracker} from '../jc-missions.js';

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
console.log('PASS: campaign mission persistence and completion');
