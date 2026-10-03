// Warm the next tile without increasing the number of live city meshes.
export function predictTravel(current,previous,elapsed,lookAhead=.85){
  if(!previous||!Number.isFinite(elapsed)||elapsed<=0)return {...current};
  const dx=current.x-previous.x,dz=current.z-previous.z;
  if(!Number.isFinite(dx)||!Number.isFinite(dz))return {...current};
  const seconds=elapsed/1000,speed=Math.hypot(dx,dz)/seconds;
  const scale=speed>120?120/speed:1;
  return {x:current.x+dx/seconds*scale*lookAhead,z:current.z+dz/seconds*scale*lookAhead};
}

export function createPrefetchCache(load,{maxBytes=8*1024*1024,maxEntries=2}={}){
  const cache=new Map(),pending=new Map();let used=0,generation=0,prefetching=false,hits=0;
  function forget(key){const value=cache.get(key);if(value){used-=value.byteLength;cache.delete(key);}}
  function retain(key,value){
    if(value.byteLength>maxBytes||maxEntries<1)return;
    forget(key);
    while(cache.size>=maxEntries||used+value.byteLength>maxBytes)forget(cache.keys().next().value);
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
    if(wasPending&&epoch===generation){forget(key);hits++;}return value;
  }
  async function prefetch(key){
    if(cache.has(key)||pending.has(key)||prefetching)return false;
    prefetching=true;
    try{await request(key,true);return true;}catch{return false;}finally{prefetching=false;}
  }
  function clear(){generation++;cache.clear();pending.clear();used=0;}
  return {get,prefetch,clear,stats:()=>({bytes:used,entries:cache.size,pending:pending.size,hits})};
}

// Sample the flight corridor at a bounded spacing so the next city tiles can be warmed.
export function corridorPoints(start,end,spacing=950){
  const distance=Math.hypot(end.x-start.x,end.z-start.z);
  const count=Math.min(8,Math.max(1,Math.ceil(distance/Math.max(1,spacing))));
  return Array.from({length:count},(_,index)=>{
    const t=(index+1)/count;
    return {x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t};
  });
}
