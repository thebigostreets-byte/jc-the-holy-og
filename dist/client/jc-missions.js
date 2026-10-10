const STORAGE_KEY='jc-mission-campaign-v1';

const DEFINITIONS=Object.freeze([
  {id:'lights',label:'Restore the Strip lights',target:8,unit:'lights'},
  {id:'prayers',label:'Answer prayers',target:3,unit:'prayers'},
  {id:'buildings',label:'Restore buildings',target:5,unit:'buildings'},
  {id:'people',label:'Meet people',target:4,unit:'people'},
  {id:'regions',label:'Reach different Vegas districts',target:4,unit:'districts'}
].map(def=>Object.freeze(def)));

const validTime=value=>Number.isFinite(value)&&value>0?value:Date.now();
const normalizeKey=value=>typeof value==='string'||typeof value==='number'&&Number.isFinite(value)?String(value).trim().slice(0,60):'';
function normalizeVisits(value){
  if(!Array.isArray(value))return [];
  const seen=new Set(),result=[];
  for(const item of value){const key=normalizeKey(item);if(!key||seen.has(key))continue;seen.add(key);result.push(key);}
  return result.slice(-32);
}
function normalizeCount(value,target){
  const number=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
  return Number.isFinite(number)?Math.min(target,Math.max(0,Math.floor(number))):0;
}
function fresh(){
  const now=Date.now();
  return {version:1,counts:Object.fromEntries(DEFINITIONS.map(m=>[m.id,0])),visited:[],startedAt:now,updatedAt:now};
}
function load(storage){
  try{
    const raw=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');
    if(raw?.version!==1||!raw.counts||typeof raw.counts!=='object'||Array.isArray(raw.counts))return fresh();
    const state=fresh();
    for(const def of DEFINITIONS)state.counts[def.id]=normalizeCount(raw.counts[def.id],def.target);
    state.visited=normalizeVisits(raw.visited);
    state.startedAt=validTime(raw.startedAt);
    state.updatedAt=validTime(raw.updatedAt);
    return state;
  }catch{return fresh();}
}
export function createMissionTracker(storage=globalThis.localStorage){
  let state=load(storage);
  const listeners=new Set();
  function getSnapshot(){
    return {version:1,missions:DEFINITIONS.map(def=>({...def,value:state.counts[def.id],complete:state.counts[def.id]>=def.target})),visited:[...state.visited],allComplete:DEFINITIONS.every(def=>state.counts[def.id]>=def.target)};
  }
  function persist(){
    state.updatedAt=Date.now();
    try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
    for(const fn of [...listeners]){
      try{fn(getSnapshot());}catch(error){console.warn('JC mission subscriber failed',error);}
    }
  }
  function add(id,amount=1){
    const def=DEFINITIONS.find(item=>item.id===id);if(!def)return false;
    const numeric=typeof amount==='number'?amount:NaN;
    if(!Number.isFinite(numeric)||numeric<1)return false;
    const before=state.counts[id];
    state.counts[id]=Math.min(def.target,before+Math.floor(numeric));
    if(state.counts[id]!==before)persist();
    return state.counts[id]!==before;
  }
  function visit(key){
    const value=normalizeKey(key);if(!value||state.visited.includes(value))return false;
    state.visited.push(value);state.visited=state.visited.slice(-32);
    if(!add('regions',1))persist();
    return true;
  }
  function reset(){state=fresh();persist();}
  function onChange(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);}
  function getSnapshotState(){return {...state,counts:{...state.counts},visited:[...state.visited]};}
  return {getSnapshot,add,visit,reset,onChange,getState:getSnapshotState,definitions:DEFINITIONS};
}

export {STORAGE_KEY as JC_MISSION_STORAGE_KEY};
