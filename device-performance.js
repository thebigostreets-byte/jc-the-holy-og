// Dynamically trades render resolution for frame stability on slower phones and computers.
export function createAdaptiveRenderBudget(renderer,{basePixelRatio=1,minPixelRatio=.45,downshiftThresholdMs=30,upshiftThresholdMs=18,now=()=>performance.now()}={}){
 if(!renderer||typeof renderer.setPixelRatio!=='function')throw new TypeError('A WebGL renderer is required.');
 const base=Math.max(.35,Number.isFinite(basePixelRatio)?basePixelRatio:1),minimum=Math.min(base,Math.max(.35,Number.isFinite(minPixelRatio)?minPixelRatio:.45));
 // Keep hysteresis stable even with malformed thresholds.
 const downshift=Number.isFinite(downshiftThresholdMs)?Math.max(1,downshiftThresholdMs):30;
 const upshift=Math.min(Number.isFinite(upshiftThresholdMs)?Math.max(0,upshiftThresholdMs):18,Math.max(0,downshift-1));
 let ratio=base,averageFrameMs=16,lastAdjustment=-Infinity,fastSince=null,lastTimestamp=-Infinity;
 const stats=()=>({pixelRatio:ratio,basePixelRatio:base,minPixelRatio:minimum,averageFrameMs});
 function update(timestamp,frameMs=16){
  if(timestamp===undefined){try{timestamp=now();}catch{return stats();}}
  if(!Number.isFinite(timestamp)||!Number.isFinite(frameMs)||frameMs<=0)return stats();
  if(timestamp<lastTimestamp){lastAdjustment=-Infinity;fastSince=null;}
  lastTimestamp=timestamp;
  averageFrameMs=averageFrameMs*.85+Math.min(250,frameMs)*.15;
  if(timestamp-lastAdjustment<1200)return stats();
  let next=ratio;
  if(averageFrameMs>=downshift&&ratio>minimum){next=Math.max(minimum,ratio-.07);fastSince=null;}
  else if(averageFrameMs<=upshift&&ratio<base){if(fastSince===null)fastSince=timestamp;if(timestamp-fastSince>=6000){next=Math.min(base,ratio+.025);fastSince=timestamp;}}
  else fastSince=null;
  if(Math.abs(next-ratio)>=.001){try{renderer.setPixelRatio(next);ratio=next;}catch{fastSince=null;lastAdjustment=timestamp;return stats();}lastAdjustment=timestamp;}
  return stats();
 }
 return {update,stats};
}
