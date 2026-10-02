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
function load(storage){
  try{
    const raw=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');
    if(raw?.version===1&&raw.counts)return {...fresh(),...raw,counts:{...fresh().counts,...raw.counts},visited:Array.isArray(raw.visited)?raw.visited.slice(0,32):[]};
  }catch{}
  return fresh();
}
export function createMissionTracker(storage=globalThis.localStorage){
  let state=load(storage);
  const listeners=new Set();
  function persist(){state.updatedAt=Date.now();try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch{};listeners.forEach(fn=>fn(getSnapshot()));}
  function getSnapshot(){
    return {version:1,missions:DEFINITIONS.map(def=>({...def,value:Math.min(def.target,state.counts[def.id]||0),complete:(state.counts[def.id]||0)>=def.target})),visited:[...state.visited],allComplete:DEFINITIONS.every(def=>(state.counts[def.id]||0)>=def.target)};
  }
  function add(id,amount=1){
    const def=DEFINITIONS.find(item=>item.id===id);if(!def)return false;
    const before=state.counts[id]||0;state.counts[id]=Math.min(def.target,before+Math.max(0,amount));
    if(state.counts[id]!==before)persist();
    return state.counts[id]!==before;
  }
  function visit(key){
    const value=String(key||'').slice(0,60);if(!value||state.visited.includes(value))return false;
    state.visited.push(value);state.visited=state.visited.slice(-32);
    const changed=add('regions',1);if(!changed)persist();return true;
  }
  function reset(){state=fresh();persist();}
  function onChange(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);}
  function getSnapshotState(){return {...state,counts:{...state.counts},visited:[...state.visited]};}
  return {getSnapshot,add,visit,reset,onChange,getState:getSnapshotState,definitions:DEFINITIONS};
}

export {STORAGE_KEY as JC_MISSION_STORAGE_KEY};
