import assert from 'node:assert/strict';
import {createMissionTracker,JC_MISSION_STORAGE_KEY} from '../jc-missions.js';

let assertions=0;
function equal(actual,expected,label){assert.deepEqual(actual,expected,label);assertions++;}
function fromSave(value){
  const values=new Map([[JC_MISSION_STORAGE_KEY,JSON.stringify(value)]]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  return {tracker:createMissionTracker(storage),values};
}
const contaminated={version:1,counts:{lights:2},visited:['strip'],startedAt:-100,updatedAt:'yesterday',debugBlob:'x'.repeat(2000),isAdmin:true};
const {tracker,values}=fromSave(contaminated);
const loaded=tracker.getState();
equal(Object.keys(loaded).sort(),['counts','startedAt','updatedAt','version','visited'].sort(),'unknown saved fields never enter mission state');
equal(Number.isSafeInteger(loaded.startedAt)&&loaded.startedAt>0&&loaded.startedAt<=Date.now(),true,'invalid start time recovered');
equal(Number.isSafeInteger(loaded.updatedAt)&&loaded.updatedAt>=loaded.startedAt&&loaded.updatedAt<=Date.now(),true,'invalid update time recovered');
equal(tracker.add('lights',1),true,'normal progress survives state sanitization');
const persisted=JSON.parse(values.get(JC_MISSION_STORAGE_KEY));
equal(Object.hasOwn(persisted,'debugBlob'),false,'unknown payload not written back');
equal(Object.hasOwn(persisted,'isAdmin'),false,'unknown boolean not written back');
equal(persisted.counts.lights,3,'valid progress persists');
const future=Date.now()+86400000;
const valid={version:1,counts:{lights:1},visited:['strip'],startedAt:1000,updatedAt:2000};
const restored=fromSave(valid).tracker.getState();
equal(restored.startedAt,1000,'valid historical start retained');
equal(restored.updatedAt,2000,'valid historical update retained');
const badFuture=fromSave({...valid,startedAt:future,updatedAt:future+1000}).tracker.getState();
equal(badFuture.startedAt<=Date.now(),true,'future start time recovered');
equal(badFuture.updatedAt<=Date.now(),true,'future update time recovered');
const reversed=fromSave({...valid,startedAt:2000,updatedAt:1000}).tracker.getState();
equal(reversed.updatedAt>=reversed.startedAt,true,'reversed save timestamps normalized');
const clockTracker=fromSave(valid).tracker;
const priorUpdated=clockTracker.getState().updatedAt;
const realNow=Date.now;
try{
  Date.now=()=>500;
  equal(clockTracker.add('lights',1),true,'mission advances during clock rollback');
  equal(clockTracker.getState().updatedAt>=priorUpdated,true,'clock rollback cannot decrease update timestamp');
}finally{Date.now=realNow;}
console.log(`${assertions} mission state hygiene assertions passed`);
