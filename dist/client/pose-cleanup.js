// Keep one connected character silhouette; exported for deterministic asset checks.
export function isolatePose(data, width, height) {
  const count=width*height, labels=new Int32Array(count), queue=new Int32Array(count);
  let label=0, largest=0, largestSize=0;
  for(let start=0;start<count;start++) {
    if(labels[start] || data[start*4+3]<8) continue;
    label++; let head=0,tail=1;queue[0]=start;labels[start]=label;
    while(head<tail) {
      const p=queue[head++],x=p%width,y=Math.floor(p/width);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        const nx=x+dx,ny=y+dy;
        if(nx<0||nx>=width||ny<0||ny>=height)continue;
        const q=ny*width+nx;
        if(!labels[q]&&data[q*4+3]>=8){labels[q]=label;queue[tail++]=q;}
      }
    }
    if(tail>largestSize){largestSize=tail;largest=label;}
  }
  let removed=0;
  for(let p=0;p<count;p++)if(!largest||labels[p]!==largest){if(data[p*4+3])removed++;data[p*4+3]=0;}
  return {removed,kept:largestSize,components:label};
}
export function cleanPoseImage(image) {
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height);
  isolatePose(pixels.data,canvas.width,canvas.height);context.putImageData(pixels,0,0);
  return canvas;
}
