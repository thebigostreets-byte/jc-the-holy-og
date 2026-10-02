const STORAGE_KEY='jc-npc-memory-v1';
const MAX_NPCS=40,MAX_ENTRIES=18,MAX_TEXT=220;
const clone=value=>JSON.parse(JSON.stringify(value));
function cleanEntry(value){
  if(!value||typeof value!=='object')return null;
  const text=String(value.text||'').trim().slice(0,MAX_TEXT);
  if(!text)return null;
  return {key:String(value.key||'').slice(0,120),kind:String(value.kind||'event').slice(0,32),text,at:Number(value.at)||Date.now()};
}
function cleanRecord(value,id){
  if(!value||typeof value!=='object')return null;
  return {id,name:String(value.name||'').slice(0,80),faction:String(value.faction||'civilian').slice(0,24),appearance:String(value.appearance||'').slice(0,180),lastPlayerState:String(value.lastPlayerState||''),entries:(Array.isArray(value.entries)?value.entries:[]).map(cleanEntry).filter(Boolean).slice(-MAX_ENTRIES)};
}
export function createNpcMemoryStore(storage=globalThis.localStorage){
  let records=new Map();
  try{
    const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');
    if(saved?.version===1&&saved.records&&typeof saved.records==='object'){
      records=new Map(Object.entries(saved.records).map(([id,value])=>[id,cleanRecord(value,id)]).filter(([,value])=>!!value).slice(-MAX_NPCS));
    }
  }catch{}
  function persist(){
    try{storage?.setItem(STORAGE_KEY,JSON.stringify({version:1,records:Object.fromEntries(records)}));}catch{}
  }
  function getOrCreate(npc){
    const id=String(npc?.id||'').slice(0,180);
    if(!id)return null;
    let record=records.get(id);
    if(!record)record={id,name:String(npc.name||'Unknown').slice(0,80),faction:String(npc.faction||'civilian').slice(0,24),appearance:'',lastPlayerState:'',entries:[]};
    record.name=String(npc.name||record.name||'Unknown').slice(0,80);
    record.faction=String(npc.faction||record.faction||'civilian').slice(0,24);
    records.delete(id);records.set(id,record);
    while(records.size>MAX_NPCS)records.delete(records.keys().next().value);
    return record;
  }
  function remember(npc,value,{once=false,dedupeMs=12000}={}){
    const record=getOrCreate(npc),entry=cleanEntry(value);
    if(!record||!entry)return null;
    const previous=record.entries.at(-1);
    if(entry.key&&once&&record.entries.some(item=>item.key===entry.key))return clone(record);
    if(entry.key&&previous?.key===entry.key&&entry.at-previous.at<dedupeMs){previous.at=entry.at;persist();return clone(record);}
    record.entries.push(entry);record.entries=record.entries.slice(-MAX_ENTRIES);persist();
    return clone(record);
  }
  function observe(npc,{appearance='',state='',at=Date.now()}={}){
    const record=getOrCreate(npc);
    if(!record)return null;
    if(appearance&&!record.appearance){
      record.appearance=String(appearance).slice(0,180);
      remember(npc,{key:'jc:appearance',kind:'appearance',text:`I saw JC's ${record.appearance}.`,at},{once:true});
    }
    if(state&&state!==record.lastPlayerState){
      const label=String(state).slice(0,80);
      remember(npc,{key:'jc:state:'+label,kind:'movement',text:label==='grounded'?'I saw JC standing on the ground.':label==='hovering'?'I saw JC hovering above the street.':label==='descending'?'I saw JC descend toward the street.':label==='hypersonic'?'I saw JC accelerate into hypersonic flight.':'I saw JC flying above the street.',at},{dedupeMs:30000});
      record.lastPlayerState=label;persist();
    }
    return clone(record);
  }
  function get(id){const record=records.get(String(id||''));return record?clone(record):null;}
  function summary(id,limit=5){return (records.get(String(id||''))?.entries||[]).slice(-Math.max(0,Math.min(8,limit))).map(item=>item.text);}
  function clear(id){if(id)records.delete(String(id));else records.clear();persist();}
  return {remember,observe,get,summary,clear,get size(){return records.size;}};
}
export {STORAGE_KEY as NPC_MEMORY_STORAGE_KEY};
