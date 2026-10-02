// Normalize every character pose to the same portrait canvas and ground anchor.
export const POSE_FRAME_WIDTH=256;
export const POSE_FRAME_HEIGHT=384;
export const POSE_FRAME_BOTTOM_PADDING=10;
const ALPHA_THRESHOLD=8;

export function isolatePose(data,width,height,{componentGap}={}) {
  const count=width*height,labels=new Int32Array(count),queue=new Int32Array(count),components=[];
  let label=0;
  for(let start=0;start<count;start++) {
    if(labels[start]||data[start*4+3]<ALPHA_THRESHOLD)continue;
    label++;
    let head=0,tail=1,minX=width,minY=height,maxX=0,maxY=0;
    queue[0]=start;labels[start]=label;
    while(head<tail) {
      const p=queue[head++],x=p%width,y=Math.floor(p/width);
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        if(dx===0&&dy===0)continue;
        const nx=x+dx,ny=y+dy;
        if(nx<0||nx>=width||ny<0||ny>=height)continue;
        const q=ny*width+nx;
        if(!labels[q]&&data[q*4+3]>=ALPHA_THRESHOLD){labels[q]=label;queue[tail++]=q;}
      }
    }
    components.push({label,size:tail,minX,minY,maxX,maxY});
  }
  if(!components.length)return {removed:0,kept:0,components:0,keptComponents:0};
  const main=components.reduce((best,c)=>c.size>best.size?c:best,components[0]);
  // Keep nearby disconnected pieces such as shoes, hands, and hair. Reject remote
  // fragments from other poses accidentally included in a source crop.
  const gap=componentGap??Math.max(6,Math.round(Math.min(width,height)*.07));
  const retained=new Set(components.filter(c=>{
    if(c.label===main.label)return true;
    const dx=Math.max(0,c.minX-main.maxX,main.minX-c.maxX);
    const dy=Math.max(0,c.minY-main.maxY,main.minY-c.maxY);
    return Math.hypot(dx,dy)<=gap;
  }).map(c=>c.label));
  let removed=0,kept=0;
  for(let p=0;p<count;p++) {
    const alpha=data[p*4+3];
    if(alpha<ALPHA_THRESHOLD)continue; // preserve antialiased edge pixels
    if(!retained.has(labels[p])){data[p*4+3]=0;removed++;}
    else kept++;
  }
  return {removed,kept,components:label,keptComponents:retained.size};
}

export function cleanPoseImage(image) {
  const sourceWidth=image.naturalWidth||image.width,sourceHeight=image.naturalHeight||image.height;
  const source=document.createElement('canvas');source.width=sourceWidth;source.height=sourceHeight;
  const context=source.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,sourceWidth,sourceHeight);
  isolatePose(pixels.data,sourceWidth,sourceHeight);
  context.putImageData(pixels,0,0);

  let x0=sourceWidth,y0=sourceHeight,x1=-1,y1=-1;
  for(let y=0;y<sourceHeight;y++)for(let x=0;x<sourceWidth;x++) {
    if(pixels.data[(y*sourceWidth+x)*4+3]<ALPHA_THRESHOLD)continue;
    x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
  }
  const frame=document.createElement('canvas');
  frame.width=POSE_FRAME_WIDTH;frame.height=POSE_FRAME_HEIGHT;
  frame.poseHasPixels=x1>=x0&&y1>=y0;
  if(!frame.poseHasPixels)return frame;

  // A tiny source-space gutter preserves antialiased edges and the bottom of shoes.
  const gutter=Math.max(2,Math.round(Math.min(sourceWidth,sourceHeight)*.006));
  x0=Math.max(0,x0-gutter);y0=Math.max(0,y0-gutter);
  x1=Math.min(sourceWidth-1,x1+gutter);y1=Math.min(sourceHeight-1,y1+gutter);
  const cropWidth=x1-x0+1,cropHeight=y1-y0+1;
  const sidePadding=16,topPadding=12,bottomPadding=POSE_FRAME_BOTTOM_PADDING;
  const scale=Math.min(
    (POSE_FRAME_WIDTH-sidePadding*2)/cropWidth,
    (POSE_FRAME_HEIGHT-topPadding-bottomPadding)/cropHeight
  );
  const drawWidth=cropWidth*scale,drawHeight=cropHeight*scale;
  const drawX=(POSE_FRAME_WIDTH-drawWidth)/2;
  const drawY=POSE_FRAME_HEIGHT-bottomPadding-drawHeight;
  frame.getContext('2d').drawImage(source,x0,y0,cropWidth,cropHeight,drawX,drawY,drawWidth,drawHeight);
  return frame;
}
