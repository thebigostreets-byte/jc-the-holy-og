// Memoize terrain probes on an 8 m grid and bound retained results.
export function cachedGroundSample(x,z,cache,raycast,fallback,{cellSize=8,maxEntries=512}={}){
  const step=Number.isFinite(cellSize)&&cellSize>0?cellSize:8;
  const limit=Number.isSafeInteger(maxEntries)&&maxEntries>0?maxEntries:512;
  if(!Number.isFinite(x)||!Number.isFinite(z))return NaN;
  const gx=Math.round(x/step),gz=Math.round(z/step);
  if(!Number.isSafeInteger(gx)||!Number.isSafeInteger(gz))return NaN;
  const key=`${gx}:${gz}`;
  if(cache.has(key)){
    const height=cache.get(key);
    cache.delete(key);
    if(Number.isFinite(height)){cache.set(key,height);return height;}
  }
  const sx=gx*step,sz=gz*step;
  let result;
  try{result=raycast(sx,sz);}catch{result=NaN;}
  const height=Number.isFinite(result)?result:fallback(sx,sz);
  // Missing terrain must be probed again after its tile streams in.
  if(!Number.isFinite(height))return height;
  cache.set(key,height);
  while(cache.size>limit)cache.delete(cache.keys().next().value);
  return height;
}

export function decodeGlbAttribute(raw,offset,count,itemSize,ArrayType,componentBytes,stride,getter){
  const packed=itemSize*componentBytes;
  const length=count*itemSize;
  if(!(raw instanceof Uint8Array)||!Number.isSafeInteger(offset)||offset<0||
     !Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(itemSize)||itemSize<1||
     !Number.isSafeInteger(componentBytes)||componentBytes<1||!Number.isSafeInteger(packed)||
     !Number.isSafeInteger(length)||!Number.isSafeInteger(stride)||stride<packed){
    throw new RangeError('Invalid GLB accessor metadata');
  }
  const end=count?offset+(count-1)*stride+packed:offset;
  if(!Number.isSafeInteger(end)||end>raw.byteLength)throw new RangeError('GLB accessor exceeds binary data');
  if(stride===packed&&offset%componentBytes===0){
    // Buffer.slice() can alias its input; always own compact decoded storage.
    const bytes=Uint8Array.prototype.slice.call(raw,offset,offset+count*packed);
    return new ArrayType(bytes.buffer,bytes.byteOffset,length);
  }
  const view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength),out=new ArrayType(length);
  if(typeof view[getter]!=='function')throw new RangeError('Unsupported GLB accessor component');
  for(let row=0;row<count;row++)for(let column=0;column<itemSize;column++)out[row*itemSize+column]=view[getter](offset+row*stride+column*componentBytes,true);
  return out;
}
