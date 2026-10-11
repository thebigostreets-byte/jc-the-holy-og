const STORAGE_KEY='jc-mission-campaign-v1';

const DEFINITIONS=[
  {id:'lights',label:'Restore the Strip lights',target:8,unit:'lights'},
  {id:'prayers',label:'Answer prayers',target:3,unit:'prayers'},
  {id:'buildings',label:'Restore buildings',target:5,unit:'buildings'},
  {id:'people',label:'Meet people',target:4,unit:'people'},
  {id:'regions',label:'Reach different Vegas districts',target:4,unit:'districts'}
];

function fresh(){
  return {version:1,counts:Object.fromEntries(DEFINITIONS.map(m=>[m.id,0])),visited:[],startedAt:Date.now(),updatedAt:Date.now()};
}
function clampCount(value,target){
  return Number.isFinite(value)?Math.min(target,Math.max(0,Math.floor(value))):0;
}
function normalizeVisitKey(key){
  return typeof key==='string'?key.trim().slice(0,60):'';
}
function cleanVisited(visited){
  if(!Array.isArray(visited))return [];
  const seen=new Set(),result=[];
  for(const item of visited.slice(-256)){
    const key=normalizeVisitKey(item);
    if(key&&!seen.has(key)){seen.add(key);result.push(key);}
  }
  return result.slice(-32);
}
function load(storage){
  try{
    const saved=storage?.getItem(STORAGE_KEY);
    if(typeof saved==='string'&&saved.length>65536)return fresh();
    const raw=JSON.parse(saved||'null');
    if(raw?.version===1&&raw.counts&&typeof raw.counts==='object'){
      const base=fresh();
      const now=base.updatedAt;
      const validTime=value=>Number.isSafeInteger(value)&&value>=0&&value<=now;
      const startedAt=validTime(raw.startedAt)?raw.startedAt:base.startedAt;
      const updatedAt=validTime(raw.updatedAt)&&raw.updatedAt>=startedAt?raw.updatedAt:Math.max(startedAt,now);
      return {...base,startedAt,updatedAt,counts:Object.fromEntries(DEFINITIONS.map(def=>[def.id,clampCount(raw.counts[def.id],def.target)])),visited:cleanVisited(raw.visited)};
    }
  }catch{}
  return fresh();
}
function readDefaultStorage(){
  try{return globalThis.localStorage;}catch{return null;}
}
export function createMissionTracker(storage=readDefaultStorage()){
  let state=load(storage);
  const listeners=new Set();
  function persist(){state.updatedAt=Math.max(state.updatedAt,Date.now());try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch{};listeners.forEach(fn=>{try{fn(getSnapshot());}catch{}});}
  function getSnapshot(){
    return {version:1,missions:DEFINITIONS.map(def=>({...def,value:Math.min(def.target,state.counts[def.id]||0),complete:(state.counts[def.id]||0)>=def.target})),visited:[...state.visited],allComplete:DEFINITIONS.every(def=>(state.counts[def.id]||0)>=def.target)};
  }
  function add(id,amount=1){
    const def=DEFINITIONS.find(item=>item.id===id);if(!def||!Number.isSafeInteger(amount)||amount<=0)return false;
    const before=state.counts[id]||0;state.counts[id]=Math.min(def.target,before+amount);
    if(state.counts[id]!==before)persist();
    return state.counts[id]!==before;
  }
  function visit(key){
    const value=normalizeVisitKey(key);if(!value||state.visited.includes(value))return false;
    state.visited.push(value);state.visited=state.visited.slice(-32);
    const changed=add('regions',1);if(!changed)persist();return true;
  }
  function reset(){state=fresh();persist();}
  function onChange(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);}
  function getSnapshotState(){return {...state,counts:{...state.counts},visited:[...state.visited]};}
  return {getSnapshot,add,visit,reset,onChange,getState:getSnapshotState,definitions:DEFINITIONS.map(def=>({...def}))};
}

export {STORAGE_KEY as JC_MISSION_STORAGE_KEY};
