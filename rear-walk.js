export const FLIGHT_CELLS=[[0,0,512,390],[512,0,512,355],[1024,0,512,390],[0,390,512,300],[512,355,512,350],[1024,395,512,275],[0,705,512,319],[512,705,512,319],[1024,675,512,349]];
// Rear-facing contact sequence. Normalize cell placement to prevent torso jitter.
export function loadRearWalk(ready){return loadPoseSheet('./character-art/jc-rear-walk-v1.webp',4,2,[0,1,3,2,4,6,7,5],ready);}
export function loadPoseSheet(url,columns,rows,order,ready,regions){
  const image=new Image();
  image.onload=()=>{
    const frames=[];
    for(const cell of order){
      const rect=regions?.[cell]||[(cell%columns)*image.width/columns,Math.floor(cell/columns)*image.height/rows,image.width/columns,image.height/rows];
      const tile=document.createElement('canvas');tile.width=Math.ceil(rect[2]);tile.height=Math.ceil(rect[3]);
      const ctx=tile.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(image,...rect,0,0,tile.width,tile.height);
      const pixels=ctx.getImageData(0,0,tile.width,tile.height).data;
      let x0=tile.width,y0=tile.height,x1=0,y1=0;
      for(let y=0;y<tile.height;y++)for(let x=0;x<tile.width;x++)if(pixels[(y*tile.width+x)*4+3]>40){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
      if(x1<x0||y1<y0)return;
      const frame=document.createElement('canvas');frame.width=256;frame.height=384;
      const scale=Math.min(240/(x1-x0+1),360/(y1-y0+1)),w=(x1-x0+1)*scale,h=(y1-y0+1)*scale;
      frame.getContext('2d').drawImage(tile,x0,y0,x1-x0+1,y1-y0+1,(256-w)/2,372-h,w,h);
      frame.complete=true;frame.naturalWidth=256;frames.push(frame);
    }
    ready(frames);
  };
  image.src=url;
}
