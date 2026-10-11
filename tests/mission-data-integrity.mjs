import assert from 'node:assert/strict';
import {createMissionTracker,JC_MISSION_STORAGE_KEY} from '../jc-missions.js';
let checks=0;
const check=(actual,expected,msg)=>{assert.deepEqual(actual,expected,msg);checks++;};
const map=new Map();
const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
map.set(JC_MISSION_STORAGE_KEY,JSON.stringify({version:1,counts:{lights:2.75,prayers:1.2,people:3.9,buildings:5,regions:1},visited:[' strip ','strip',null,17,{},'  ','airport','airport','downtown']}));
const m=createMissionTracker(storage);
check(m.getSnapshot().missions.map(x=>x.value),[2,1,5,3,1],'saved fractional progress rounded down to event counts');
check(m.add('lights',0.5),false,'fractional progress rejected');
check(m.add('lights',Number.MAX_VALUE),false,'unsafe integer rejected');
check(m.add('lights',2),true,'integer progress accepted');
check(m.getSnapshot().missions[0].value,4,'progress remains an integer');
check(m.getSnapshot().visited,['strip','airport','downtown'],'saved visited IDs sanitized and deduplicated');
check(m.visit({id:'faux'}),false,'object region rejected');
check(m.visit(1),false,'numeric region rejected');
check(m.visit('   '),false,'blank region rejected');
check(m.visit(' strip '),false,'trimmed duplicate rejected');
check(m.visit('  henderson  '),true,'valid region trimmed and recorded');
check(m.getSnapshot().visited,['strip','airport','downtown','henderson'],'only valid unique regions recorded');
const again=createMissionTracker(storage);
check(again.getSnapshot().visited,['strip','airport','downtown','henderson'],'cleaned visited list survives reload');
const long='a'.repeat(100);
check(again.visit(long),true,'long region accepted with capped ID');
check(again.getSnapshot().visited.at(-1).length,60,'region key length bounded');
check(again.visit('a'.repeat(60)),false,'capped ID deduplicated');
let seed=0x5299;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}
const targets={lights:8,prayers:3,buildings:5,people:4,regions:4};
for(let i=0;i<1000;i++){
  const counts=Object.fromEntries(Object.keys(targets).map(id=>[id,random()*40-10]));
  const visited=Array.from({length:60},(_,n)=>n%7===0?{invalid:n}:n%11===0?null:` district-${n%17} `);
  map.set(JC_MISSION_STORAGE_KEY,JSON.stringify({version:1,counts,visited}));
  const sample=createMissionTracker(storage).getSnapshot();
  for(const mission of sample.missions){
    assert.ok(Number.isInteger(mission.value)&&mission.value>=0&&mission.value<=targets[mission.id]);
    checks++;
  }
  assert.ok(sample.visited.length<=32&&sample.visited.every(v=>typeof v==='string'&&v===v.trim()&&v.length>0&&v.length<=60));checks++;
  assert.equal(new Set(sample.visited).size,sample.visited.length);checks++;
}
console.log(`${checks} mission data integrity assertions passed`);
