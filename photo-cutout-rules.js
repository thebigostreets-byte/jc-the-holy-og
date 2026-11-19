import {pilotCutoutAsset} from './jc-pilot-assets.js';
const VIEW_ANGLE=Math.PI/4;
const VIEW_TOLERANCE=Math.PI/5;

export function photoCutoutAsset(identityOrName='',night=false){
  return pilotCutoutAsset(identityOrName,night);
}
export function isPhotoCutoutView(dx,dz,distance,height,sector=VIEW_ANGLE){
  if(![dx,dz,distance,height].every(Number.isFinite)||distance<Math.max(420,height*6))return false;
  const angle=Math.atan2(dx,dz);
  const delta=Math.atan2(Math.sin(angle-sector),Math.cos(angle-sector));
  return Math.abs(delta)<=VIEW_TOLERANCE;
}
export function rankPhotoCutoutTargets(candidates=[]){
  return [...candidates].sort((a,b)=>Number(!!b.inView)-Number(!!a.inView)||a.distance-b.distance);
}
