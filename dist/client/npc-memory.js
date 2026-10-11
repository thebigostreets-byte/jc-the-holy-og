const STORAGE_KEY='jc-npc-memory-v1';
const MAX_NPCS=40,MAX_ENTRIES=18,MAX_TEXT=220;
const clone=value=>JSON.parse(JSON.stringify(value));
const safeText=value=>typeof value==='string'?value:(typeof value==='number'&&Number.isFinite(value)?String(value):'');
const bounded=(value,length)=>safeText(value).slice(0,length);
const now=()=>Date.now();
function cleanTime(value){
  const parsed=typeof value==='number'?value:(typeof value==='string'&&value.trim()?Number(value):NaN);
  return Number.isFinite(parsed)&&parsed>0?parsed:now();
}
function cleanEntry(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const text=bounded(value.text,MAX_TEXT).trim();
  if(!text)return null;
  return {key:bounded(value.key,120),kind:bounded(value.kind,32)||'event',text,at:cleanTime(value.at)};
}
function cleanRecord(value,id){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const key=bounded(id,180);
  if(!key)return null;
  return {id:key,name:bounded(value.name,80),faction:bounded(value.faction,24)||'civilian',appearance:bounded(value.appearance,180),lastPlayerState:bounded(value.lastPlayerState,80),entries:(Array.isArray(value.entries)?value.entries.slice(-MAX_ENTRIES):[]).map(cleanEntry).filter(Boolean)};
}
export function createNpcMemoryStore(storage){
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  let records=new Map();
  try{
    const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');
    if(saved?.version===1&&saved.records&&typeof saved.records==='object'&&!Array.isArray(saved.records)){
      records=new Map(Object.entries(saved.records).slice(-MAX_NPCS).map(([id,value])=>[bounded(id,180),cleanRecord(value,id)]).filter(([id,value])=>!!id&&!!value));
    }
  }catch{}
  function persist(){
    try{storage?.setItem(STORAGE_KEY,JSON.stringify({version:1,records:Object.fromEntries(records)}));}catch{}
  }
  function getOrCreate(npc){
    const id=bounded(npc?.id,180);
    if(!id)return null;
    let record=records.get(id);
    if(!record)record={id,name:bounded(npc.name,80)||'Unknown',faction:bounded(npc.faction,24)||'civilian',appearance:'',lastPlayerState:'',entries:[]};
    record.name=bounded(npc.name,80)||record.name||'Unknown';
    record.faction=bounded(npc.faction,24)||record.faction||'civilian';
    records.delete(id);records.set(id,record);
    while(records.size>MAX_NPCS)records.delete(records.keys().next().value);
    return record;
  }
  function remember(npc,value,{once=false,dedupeMs=12000}={}){
    const entry=cleanEntry(value);
    if(!entry)return null;
    const record=getOrCreate(npc);
    if(!record)return null;
    const previous=record.entries.at(-1);
    if(entry.key&&once&&record.entries.some(item=>item.key===entry.key))return clone(record);
    const windowMs=Number.isFinite(dedupeMs)?Math.max(0,dedupeMs):12000;
    if(entry.key&&previous?.key===entry.key&&entry.at>=previous.at&&entry.at-previous.at<windowMs){previous.at=entry.at;persist();return clone(record);}
    record.entries.push(entry);record.entries=record.entries.slice(-MAX_ENTRIES);persist();
    return clone(record);
  }
  function observe(npc,{appearance='',state='',at=now()}={}){
    const record=getOrCreate(npc);
    if(!record)return null;
    const look=bounded(appearance,180),label=bounded(state,80);
    if(look&&!record.appearance){
      record.appearance=look;
      remember(npc,{key:'jc:appearance',kind:'appearance',text:`I saw JC's ${look}.`,at},{once:true});
    }
    if(label&&label!==record.lastPlayerState){
      remember(npc,{key:'jc:state:'+label,kind:'movement',text:label==='grounded'?'I saw JC standing on the ground.':label==='hovering'?'I saw JC hovering above the street.':label==='descending'?'I saw JC descend toward the street.':label==='hypersonic'?'I saw JC accelerate into hypersonic flight.':'I saw JC flying above the street.',at},{dedupeMs:30000});
      record.lastPlayerState=label;persist();
    }
    return clone(record);
  }
  function get(id){const record=records.get(bounded(id,180));return record?clone(record):null;}
  function summary(id,limit=5){
    const count=Number.isFinite(limit)?Math.max(0,Math.min(8,Math.trunc(limit))):5;
    if(count===0)return [];
    return (records.get(bounded(id,180))?.entries||[]).slice(-count).map(item=>item.text);
  }
  function clear(id){
    if(arguments.length===0)records.clear();
    else {const key=bounded(id,180);if(!key)return;records.delete(key);}
    persist();
  }
  return {remember,observe,get,summary,clear,get size(){return records.size;}};
}
export {STORAGE_KEY as NPC_MEMORY_STORAGE_KEY};
