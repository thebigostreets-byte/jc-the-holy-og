// Memoize terrain probes on an 8 m grid and bound retained results.
export function cachedGroundSample(x,z,cache,raycast,fallback,{cellSize=8,maxEntries=512}={}){
  const gx=Math.round(x/cellSize),gz=Math.round(z/cellSize),key=`${gx}:${gz}`;
  if(cache.has(key)){const height=cache.get(key);cache.delete(key);cache.set(key,height);return height;}
  const sx=gx*cellSize,sz=gz*cellSize,result=raycast(sx,sz);
  const height=Number.isFinite(result)?result:fallback(sx,sz);
  cache.set(key,height);
  if(cache.size>maxEntries)cache.delete(cache.keys().next().value);
  return height;
}

export function decodeGlbAttribute(raw,offset,count,itemSize,ArrayType,componentBytes,stride,getter){
  const packed=itemSize*componentBytes;
  if(stride===packed&&offset%componentBytes===0){
    const bytes=raw.slice(offset,offset+count*packed);
    return new ArrayType(bytes.buffer,bytes.byteOffset,count*itemSize);
  }
  const view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength),out=new ArrayType(count*itemSize);
  for(let row=0;row<count;row++)for(let column=0;column<itemSize;column++)out[row*itemSize+column]=view[getter](offset+row*stride+column*componentBytes,true);
  return out;
}
