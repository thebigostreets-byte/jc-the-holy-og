import assert from 'node:assert/strict';
import {createMissionTracker,JC_MISSION_STORAGE_KEY} from '../jc-missions.js';
let checks=0;
function equal(actual,expected,label){assert.deepEqual(actual,expected,label);checks++;}
const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new DOMException('Storage access denied','SecurityError');}});
  const tracker=createMissionTracker();
  equal(tracker.add('lights',1),true,'mission updates work without browser storage');
  equal(tracker.getSnapshot().missions[0].value,1,'in-memory progress retained');
  equal(tracker.visit(' strip '),true,'district tracking works without browser storage');
}finally{
  if(original)Object.defineProperty(globalThis,'localStorage',original);
  else delete globalThis.localStorage;
}
const enormous=JSON.stringify({version:1,counts:{lights:8},visited:[],padding:'x'.repeat(70000)});
let parses=0;
const originalParse=JSON.parse;
try{
  JSON.parse=function(text,...rest){parses++;return originalParse.call(this,text,...rest);};
  const storage={getItem:key=>key===JC_MISSION_STORAGE_KEY?enormous:null,setItem(){}};
  const tracker=createMissionTracker(storage);
  equal(tracker.getSnapshot().missions[0].value,0,'oversized save discarded');
  equal(parses,0,'oversized save never parsed');
}finally{JSON.parse=originalParse;}
console.log(`${checks} mission storage fault assertions passed`);
