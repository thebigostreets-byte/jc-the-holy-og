// Predict only finite, bounded positions. Invalid inputs must never poison tile selection.
const DEFAULT_LOOK_AHEAD=.85;
const DEFAULT_SPACING=950;
const DEFAULT_BYTES=8*1024*1024;
const DEFAULT_ENTRIES=2;

function finitePosition(current,previous){
  return {
    x:Number.isFinite(current?.x)?current.x:(Number.isFinite(previous?.x)?previous.x:0),
    z:Number.isFinite(current?.z)?current.z:(Number.isFinite(previous?.z)?previous.z:0),
  };
}

// Warm the next tile without increasing the number of live city meshes.
export function predictTravel(current,previous,elapsed,lookAhead=DEFAULT_LOOK_AHEAD){
  const position=finitePosition(current,previous);
  if(!Number.isFinite(current?.x)||!Number.isFinite(current?.z)
      ||!Number.isFinite(previous?.x)||!Number.isFinite(previous?.z)
      ||!Number.isFinite(elapsed)||elapsed<=0)return position;
  const dx=current.x-previous.x,dz=current.z-previous.z;
  if(!Number.isFinite(dx)||!Number.isFinite(dz))return position;
  const seconds=elapsed/1000,speed=Math.hypot(dx,dz)/seconds;
  if(!Number.isFinite(seconds)||seconds<=0||!Number.isFinite(speed))return position;
  const horizon=Number.isFinite(lookAhead)?Math.max(0,Math.min(2,lookAhead)):DEFAULT_LOOK_AHEAD;
  const scale=speed>120?120/speed:1;
  const x=current.x+dx/seconds*scale*horizon,z=current.z+dz/seconds*scale*horizon;
  return Number.isFinite(x)&&Number.isFinite(z)?{x,z}:position;
}

export function createPrefetchCache(load,{maxBytes=DEFAULT_BYTES,maxEntries=DEFAULT_ENTRIES}={}){
  if(typeof load!=='function')throw new TypeError('Tile loader must be a function');
  const byteLimit=Number.isFinite(maxBytes)?Math.max(0,Math.floor(maxBytes)):DEFAULT_BYTES;
  const entryLimit=Number.isFinite(maxEntries)?Math.max(0,Math.floor(maxEntries)):DEFAULT_ENTRIES;
  const cache=new Map(),pending=new Map();
  let used=0,generation=0,warmingEpoch=null,hits=0;
  function forget(key){
    if(!cache.has(key))return;
    const entry=cache.get(key);
    used-=entry.bytes;
    cache.delete(key);
  }
  function binaryBytes(value){
    if(value instanceof ArrayBuffer||ArrayBuffer.isView(value))return value.byteLength;
    return -1;
  }
  function retain(key,value){
    const bytes=binaryBytes(value);
    if(!Number.isSafeInteger(bytes)||bytes<0||bytes>byteLimit||entryLimit<1)return false;
    forget(key);
    while(cache.size>=entryLimit||used+bytes>byteLimit){
      if(cache.size===0)return false;
      forget(cache.keys().next().value);
    }
    cache.set(key,{value,bytes});used+=bytes;
    return true;
  }
  function request(key,warm){
    if(pending.has(key))return pending.get(key);
    const epoch=generation;
    const promise=Promise.resolve().then(()=>load(key)).then(value=>{
      if(warm&&epoch===generation)retain(key,value);
      return value;
    }).finally(()=>{if(pending.get(key)===promise)pending.delete(key);});
    pending.set(key,promise);return promise;
  }
  async function get(key){
    if(cache.has(key)){
      const value=cache.get(key).value;
      forget(key);hits++;return value;
    }
    const epoch=generation,wasPending=pending.has(key),value=await request(key,false);
    if(wasPending&&epoch===generation){forget(key);hits++;}
    return value;
  }
  async function prefetch(key){
    if(cache.has(key)||pending.has(key)||warmingEpoch===generation)return false;
    const epoch=generation;
    warmingEpoch=epoch;
    try{
      const value=await request(key,true);
      return epoch===generation&&binaryBytes(value)>=0;
    }catch{return false;}
    finally{if(warmingEpoch===epoch)warmingEpoch=null;}
  }
  function clear(){generation++;cache.clear();pending.clear();used=0;warmingEpoch=null;}
  return {get,prefetch,clear,stats:()=>({bytes:used,entries:cache.size,pending:pending.size,hits})};
}

// Sample the flight corridor at a bounded spacing so the next city tiles can be warmed.
export function corridorPoints(start,end,spacing=DEFAULT_SPACING){
  if(!Number.isFinite(start?.x)||!Number.isFinite(start?.z)
      ||!Number.isFinite(end?.x)||!Number.isFinite(end?.z))return [];
  const dx=end.x-start.x,dz=end.z-start.z;
  const distance=Math.hypot(dx,dz);
  if(!Number.isFinite(distance))return [];
  const step=Number.isFinite(spacing)&&spacing>0?spacing:DEFAULT_SPACING;
  const count=Math.min(8,Math.max(1,Math.ceil(distance/Math.max(1,step))));
  const points=[];
  for(let index=0;index<count;index++){
    const t=(index+1)/count;
    const x=start.x+dx*t,z=start.z+dz*t;
    if(!Number.isFinite(x)||!Number.isFinite(z))return [];
    points.push({x,z});
  }
  return points;
}
