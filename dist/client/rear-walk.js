import {cleanPoseImage} from './pose-cleanup.js';

export const FLIGHT_CELLS=[[0,0,512,390],[512,0,512,355],[1024,0,512,390],[0,390,512,300],[512,355,512,350],[1024,395,512,275],[0,705,512,319],[512,705,512,319],[1024,675,512,349]];
// Rear-facing contact sequence. Every extracted frame uses the same full-body
// canvas and baseline so feet stay visible and the character does not jump in size.
export function loadRearWalk(ready){return loadPoseSheet('./character-art/jc-rear-walk-v1.webp',4,2,[0,1,3,2,4,6,7,5],ready);}
export function loadPoseSheet(url,columns,rows,order,ready,regions){
  const image=new Image();
  image.onload=()=>{
    const frames=[];
    for(const cell of order){
      const rect=regions?.[cell]||[(cell%columns)*image.width/columns,Math.floor(cell/columns)*image.height/rows,image.width/columns,image.height/rows];
      const tile=document.createElement('canvas');tile.width=Math.ceil(rect[2]);tile.height=Math.ceil(rect[3]);
      const ctx=tile.getContext('2d',{willReadFrequently:true});
      // Strictly crop one atlas cell before cleaning; never draw neighboring cells
      // into the frame, even if their transparent padding is irregular.
      ctx.drawImage(image,rect[0],rect[1],rect[2],rect[3],0,0,tile.width,tile.height);
      const frame=cleanPoseImage(tile);
      if(!frame.poseHasPixels){console.warn('Empty character pose cell',url,cell);return;}
      frames.push(frame);
    }
    ready(frames);
  };
  image.onerror=()=>console.warn('Character pose sheet failed to load',url);
  image.src=url;
}
