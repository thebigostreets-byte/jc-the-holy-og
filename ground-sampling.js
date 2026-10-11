// Memoize terrain probes on an 8 m grid and bound retained results.
export function cachedGroundSample(x,z,cache,raycast,fallback,{cellSize=8,maxEntries=512}={}){
  // Invalid positions must never poison the cache or reach the raycaster.
  if(!Number.isFinite(x)||!Number.isFinite(z))return 0;
  const cell=Number.isFinite(cellSize)&&cellSize>0?cellSize:8;
  const limit=Number.isFinite(maxEntries)?Math.min(4096,Math.max(0,Math.floor(maxEntries))):512;
  const gx=Math.round(x/cell),gz=Math.round(z/cell);
  if(!Number.isFinite(gx)||!Number.isFinite(gz))return 0;
  const key=`${gx}:${gz}`;
  if(limit>0&&cache.has(key)){
    const height=cache.get(key);
    cache.delete(key);
    if(Number.isFinite(height)){
      cache.set(key,height);
      // A reused cache can arrive over budget; enforce the cap on hits too.
      while(cache.size>limit)cache.delete(cache.keys().next().value);
      return height;
    }
  }
  const sx=gx*cell,sz=gz*cell;
  if(!Number.isFinite(sx)||!Number.isFinite(sz))return 0;
  let result;
  try{result=raycast(sx,sz);}catch{result=NaN;}
  if(!Number.isFinite(result)){
    try{result=fallback(sx,sz);}catch{result=NaN;}
  }
  const height=Number.isFinite(result)?result:0;
  if(limit>0&&Number.isFinite(result)){
    cache.set(key,height);
    while(cache.size>limit)cache.delete(cache.keys().next().value);
  }
  return height;
}

export function decodeGlbAttribute(raw,offset,count,itemSize,ArrayType,componentBytes,stride,getter){
  if(!(raw instanceof Uint8Array)||!Number.isSafeInteger(offset)||offset<0||
     !Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(itemSize)||itemSize<1||
     !Number.isSafeInteger(componentBytes)||componentBytes<1||
     !Number.isSafeInteger(stride)||stride<itemSize*componentBytes||
     !ArrayType||ArrayType.BYTES_PER_ELEMENT!==componentBytes){
    throw new RangeError('Invalid GLB attribute layout.');
  }
  const packed=itemSize*componentBytes,elementCount=count*itemSize;
  const end=count===0?offset:offset+(count-1)*stride+packed;
  if(!Number.isSafeInteger(elementCount)||!Number.isSafeInteger(end)||end>raw.byteLength){
    throw new RangeError('GLB attribute extends beyond tile data.');
  }
  if(stride===packed&&offset%componentBytes===0){
    // Uint8Array.prototype.slice copies even when raw is a Node Buffer.
    const bytes=Uint8Array.prototype.slice.call(raw,offset,end);
    return new ArrayType(bytes.buffer,bytes.byteOffset,elementCount);
  }
  const view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength),out=new ArrayType(elementCount);
  if(typeof view[getter]!=='function')throw new TypeError('Unsupported GLB attribute getter.');
  for(let row=0;row<count;row++)for(let column=0;column<itemSize;column++)out[row*itemSize+column]=view[getter](offset+row*stride+column*componentBytes,true);
  return out;
}
