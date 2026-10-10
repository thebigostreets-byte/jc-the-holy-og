// Warm the next tile without increasing the number of live city meshes.
export function predictTravel(current,previous,elapsed,lookAhead=.85){
  if(!current||!Number.isFinite(current.x)||!Number.isFinite(current.z))return previous&&Number.isFinite(previous.x)&&Number.isFinite(previous.z)?{x:previous.x,z:previous.z}:null;
  if(!previous||!Number.isFinite(previous.x)||!Number.isFinite(previous.z)||!Number.isFinite(elapsed)||elapsed<=0)return {...current};
  if(!Number.isFinite(lookAhead)||lookAhead<=0)return {...current};
  const dx=current.x-previous.x,dz=current.z-previous.z;
  const seconds=elapsed/1000,speed=Math.hypot(dx,dz)/seconds;
  if(!Number.isFinite(speed))return {...current};
  const scale=speed>120?120/speed:1;
  const horizon=Math.min(30,lookAhead);
  return {x:current.x+dx/seconds*scale*horizon,z:current.z+dz/seconds*scale*horizon};
}

export function createPrefetchCache(load,{maxBytes=8*1024*1024,maxEntries=2,maxConcurrent=1}={}){
  if(typeof load!=='function')throw new TypeError('City tile loader must be a function');
  const byteLimit=Number.isFinite(maxBytes)?Math.max(0,Math.floor(maxBytes)):8*1024*1024;
  const entryLimit=Number.isFinite(maxEntries)?Math.max(0,Math.floor(maxEntries)):2;
  const concurrentLimit=Number.isFinite(maxConcurrent)?Math.max(1,Math.min(8,Math.floor(maxConcurrent))):1;
  const cache=new Map(),pending=new Map();let used=0,generation=0,activePrefetches=0,hits=0;
  function forget(key){const value=cache.get(key);if(value){used-=value.byteLength;cache.delete(key);}}
  function retain(key,value){
    if(!value||!Number.isFinite(value.byteLength)||value.byteLength<0||value.byteLength>byteLimit||entryLimit<1)return;
    forget(key);
    while(cache.size>=entryLimit||used+value.byteLength>byteLimit)forget(cache.keys().next().value);
    cache.set(key,value);used+=value.byteLength;
  }
  function request(key,warm){
    if(pending.has(key))return pending.get(key);
    const epoch=generation;
    const promise=Promise.resolve().then(()=>load(key)).then(value=>{if(warm&&epoch===generation)retain(key,value);return value;}).finally(()=>{if(pending.get(key)===promise)pending.delete(key);});
    pending.set(key,promise);return promise;
  }
  async function get(key){
    if(cache.has(key)){const value=cache.get(key);forget(key);hits++;return value;}
    const epoch=generation,wasPending=pending.has(key),value=await request(key,false);
    if(epoch!==generation)throw new Error('City tile request invalidated by cache reset');
    if(wasPending){forget(key);hits++;}return value;
  }
  async function prefetch(key){
    if(cache.has(key)||pending.has(key)||activePrefetches>=concurrentLimit)return false;
    const epoch=generation;
    activePrefetches++;
    try{await request(key,true);return epoch===generation;}catch{return false;}finally{if(epoch===generation)activePrefetches--;}
  }
  function clear(){generation++;cache.clear();pending.clear();used=0;activePrefetches=0;}
  return {get,prefetch,clear,stats:()=>({bytes:used,entries:cache.size,pending:pending.size,hits})};
}

// Sample the flight corridor at a bounded spacing so the next city tiles can be warmed.
export function corridorPoints(start,end,spacing=950){
  if(!start||!end||![start.x,start.z,end.x,end.z].every(Number.isFinite))return [];
  const distance=Math.hypot(end.x-start.x,end.z-start.z);
  if(!Number.isFinite(distance))return [];
  const safeSpacing=Number.isFinite(spacing)&&spacing>0?spacing:950;
  const count=Math.min(8,Math.max(1,Math.ceil(distance/Math.max(1,safeSpacing))));
  return Array.from({length:count},(_,index)=>{
    const t=(index+1)/count;
    return {x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t};
  });
}
