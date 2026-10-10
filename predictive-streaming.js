// Warm the next tile without increasing the number of live city meshes.
export function predictTravel(current,previous,elapsed,lookAhead=.85){
  const valid=point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.z);
  // Missing player position must never throw or inject NaNs into tile selection.
  if(!valid(current))return valid(previous)?{x:previous.x,z:previous.z}:{x:0,z:0};
  if(!valid(previous)||!Number.isFinite(elapsed)||elapsed<=0)return {...current};
  // Negative, infinite or excessive lookahead must not request tiles behind/outside the city.
  const horizon=Number.isFinite(lookAhead)?Math.max(0,Math.min(2,lookAhead)):.85;
  const dx=current.x-previous.x,dz=current.z-previous.z;
  if(!Number.isFinite(dx)||!Number.isFinite(dz))return {...current};
  const seconds=elapsed/1000,speed=Math.hypot(dx,dz)/seconds;
  const scale=speed>120?120/speed:1;
  const x=current.x+dx/seconds*scale*horizon,z=current.z+dz/seconds*scale*horizon;
  // Very large but finite coordinates can overflow intermediate velocity math.
  return Number.isFinite(x)&&Number.isFinite(z)?{x,z}:{...current};
}

export function createPrefetchCache(load,{maxBytes=8*1024*1024,maxEntries=2,maxConcurrent=1}={}){
  const byteBudget=Number.isFinite(maxBytes)?Math.max(0,Math.floor(maxBytes)):8*1024*1024;
  const entryBudget=Number.isFinite(maxEntries)?Math.max(0,Math.floor(maxEntries)):2;
  // The map engine requests three warmups on capable devices, one on low-end phones.
  const concurrencyBudget=Number.isFinite(maxConcurrent)?Math.max(1,Math.min(4,Math.floor(maxConcurrent))):1;
  const cache=new Map(),sizes=new Map(),pending=new Map(),warmPending=new Set();let used=0,generation=0,prefetching=0,hits=0;
  // A malformed or uncacheable tile must not be reported as a warmup or cache hit.
  const validTile=value=>Number.isSafeInteger(value?.byteLength)&&value.byteLength>0&&value.byteLength<=byteBudget&&entryBudget>=1;
  function forget(key){if(cache.has(key)){used-=sizes.get(key)??0;sizes.delete(key);cache.delete(key);}}
  function retain(key,value){
    // Malformed or absent tile responses must not corrupt the byte accounting.
    const size=value?.byteLength;
    if(!Number.isSafeInteger(size)||size<=0||size>byteBudget||entryBudget<1)return;
    forget(key);
    while(cache.size>=entryBudget||used+size>byteBudget)forget(cache.keys().next().value);
    cache.set(key,value);sizes.set(key,size);used+=size;
  }
  function request(key,warm){
    if(pending.has(key))return pending.get(key);
    const epoch=generation;
    if(warm)warmPending.add(key);
    const promise=Promise.resolve().then(()=>load(key)).then(value=>{if(warm&&epoch===generation)retain(key,value);return value;}).finally(()=>{if(pending.get(key)===promise){pending.delete(key);warmPending.delete(key);}});
    pending.set(key,promise);return promise;
  }
  async function get(key){
    // A stream reset can occur while a tile is downloading (teleport/map reload).
    // Never return data from an older generation to the current renderer.
    for(let attempt=0;attempt<3;attempt++){
      if(cache.has(key)){
        const value=cache.get(key);forget(key);
        if(validTile(value)){hits++;return value;}
      }
      const epoch=generation,wasPending=warmPending.delete(key);
      let value;
      try{value=await request(key,false);}
      catch(error){if(epoch!==generation)continue;throw error;}
      if(epoch!==generation)continue;
      if(wasPending&&validTile(value)){forget(key);hits++;}
      return value;
    }
    throw new Error('City tile demand invalidated by repeated stream resets');
  }
  async function prefetch(key){
    // Skip malformed resource IDs and speculative downloads that cannot be cached.
    if(key==null||(typeof key==='string'&&!key.trim()))return false;
    if(byteBudget<1||entryBudget<1)return false;
    // Detached or invalid cached buffers must not block a fresh speculative warmup.
    if(cache.has(key)&&!validTile(cache.get(key)))forget(key);
    if(cache.has(key)||pending.has(key)||prefetching>=concurrencyBudget)return false;
    const epoch=generation;
    prefetching++;
    try{const value=await request(key,true);return epoch===generation&&validTile(value);}catch{return false;}
    finally{if(epoch===generation)prefetching--;}
  }
  function clear(){generation++;cache.clear();sizes.clear();pending.clear();warmPending.clear();used=0;prefetching=0;}
  return {get,prefetch,clear,stats:()=>({bytes:used,entries:cache.size,pending:pending.size,hits})};
}

// Sample the flight corridor at a bounded spacing so the next city tiles can be warmed.
export function corridorPoints(start,end,spacing=950){
  // Invalid stream positions should produce no speculative tile requests.
  if(!start||!end||![start.x,start.z,end.x,end.z].every(Number.isFinite))return [];
  const distance=Math.hypot(end.x-start.x,end.z-start.z);
  // Standing still must not schedule the current tile as a flight-corridor prefetch.
  if(!Number.isFinite(distance)||distance===0)return [];
  const step=Number.isFinite(spacing)&&spacing>0?spacing:950;
  const count=Math.min(8,Math.max(1,Math.ceil(distance/Math.max(1,step))));
  return Array.from({length:count},(_,index)=>{
    const t=(index+1)/count;
    return {x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t};
  });
}
