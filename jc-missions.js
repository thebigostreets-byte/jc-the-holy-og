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
function safeCount(value,target){
  return typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.min(target,Math.floor(value)):0;
}
function load(storage){
  try{
    const raw=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');
    if(raw?.version===1&&raw.counts&&typeof raw.counts==='object'&&!Array.isArray(raw.counts)){
      const state=fresh();
      const counts=Object.fromEntries(DEFINITIONS.map(def=>[def.id,safeCount(raw.counts[def.id],def.target)]));
      const visited=Array.isArray(raw.visited)?[...new Set(raw.visited.filter(value=>typeof value==='string'&&value.trim()).map(value=>value.slice(0,60)))].slice(-32):[];
      const startedAt=Number.isFinite(raw.startedAt)&&raw.startedAt>=0?raw.startedAt:state.startedAt;
      const updatedAt=Number.isFinite(raw.updatedAt)&&raw.updatedAt>=0?raw.updatedAt:state.updatedAt;
      return {...state,counts,visited,startedAt,updatedAt};
    }
  }catch{}
  return fresh();
}
export function createMissionTracker(storage=globalThis.localStorage){
  let state=load(storage);
  const listeners=new Set();
  function persist(){state.updatedAt=Date.now();try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch{};listeners.forEach(fn=>fn(getSnapshot()));}
  function getSnapshot(){
    return {version:1,missions:DEFINITIONS.map(def=>({...def,value:state.counts[def.id],complete:state.counts[def.id]>=def.target})),visited:[...state.visited],allComplete:DEFINITIONS.every(def=>state.counts[def.id]>=def.target)};
  }
  function add(id,amount=1){
    const def=DEFINITIONS.find(item=>item.id===id);
    if(!def||typeof amount!=='number'||!Number.isSafeInteger(amount)||amount<=0)return false;
    const before=state.counts[id];state.counts[id]=Math.min(def.target,before+amount);
    if(state.counts[id]!==before)persist();
    return state.counts[id]!==before;
  }
  function visit(key){
    const value=typeof key==='string'?key.trim().slice(0,60):'';if(!value||state.visited.includes(value))return false;
    state.visited.push(value);state.visited=state.visited.slice(-32);
    const changed=add('regions',1);if(!changed)persist();return true;
  }
  function reset(){state=fresh();persist();}
  function onChange(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);}
  function getSnapshotState(){return {...state,counts:{...state.counts},visited:[...state.visited]};}
  return {getSnapshot,add,visit,reset,onChange,getState:getSnapshotState,definitions:DEFINITIONS};
}

export {STORAGE_KEY as JC_MISSION_STORAGE_KEY};
