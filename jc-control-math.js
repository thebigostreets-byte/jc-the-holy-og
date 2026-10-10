// Frame-rate independent input response shared by desktop, touch and gamepad.
const finiteNumber=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function stickAxis(value,deadzone=.16){
  const axis=clamp(finiteNumber(value),-1,1);
  const zone=clamp(finiteNumber(deadzone,.16),0,.99);
  return Math.abs(axis)<=zone?0:Math.sign(axis)*Math.min(1,(Math.abs(axis)-zone)/(1-zone));
}
// Standard Gamepad API mapping; preserve the controller layout documented in game-full.html.
export const standardPadActions=[[0,'jump'],[1,'cast'],[2,'hypersonic'],[3,'car'],[4,'flight'],[5,'shield'],[8,'wheel'],[9,'pause']];
export const standardPadHolds=[[0,'Space'],[6,'Control'],[7,'Space']];
export function advanceLook(yaw,pitch,x,y,dt){
  const step=clamp(finiteNumber(dt),0,.05);
  const lookX=clamp(finiteNumber(x),-1,1),lookY=clamp(finiteNumber(y),-1,1);
  // Precision near center, action-game turn speed at the rim.
  const yawRate=lookX*(2.6+2.6*Math.abs(lookX));
  const pitchRate=lookY*(1.9+1.5*Math.abs(lookY));
  return {yaw:finiteNumber(yaw)+yawRate*step,pitch:clamp(finiteNumber(pitch)-pitchRate*step,-.72,.72)};
}
export function setFlightForward(target,yaw,pitch){
  const safeYaw=finiteNumber(yaw),safePitch=finiteNumber(pitch);
  const horizontal=Math.cos(safePitch);
  target.set(Math.sin(safeYaw)*horizontal,Math.sin(safePitch),-Math.cos(safeYaw)*horizontal);
  return target;
}
export function response(rate,dt){return 1-Math.exp(-Math.max(0,finiteNumber(rate))*Math.max(0,finiteNumber(dt)));}
export function advancePedal(value,target,dt,rise=14,fall=9){
  const current=clamp(finiteNumber(value),-1,1);
  const desired=clamp(finiteNumber(target),-1,1);
  const rate=Math.abs(desired)>Math.abs(current)?Math.max(0,finiteNumber(rise,14)):Math.max(0,finiteNumber(fall,9));
  const next=current+(desired-current)*response(rate,clamp(finiteNumber(dt),0,.05));
  return Math.abs(next)<.006&&Math.abs(desired)<.001?0:clamp(next,-1,1);
}
export function advanceGait(phase,speed,dt,sprint=false){
  return (finiteNumber(phase)+Math.min(sprint?14:10,Math.max(0,finiteNumber(speed))*(sprint?1.1:1.35))*clamp(finiteNumber(dt),0,.05))%8;
}
export function advanceChain(previous,time){
  const prior=previous&&typeof previous==='object'?previous:{};
  const last=finiteNumber(prior.last,-Infinity),now=finiteNumber(time);
  const count=Number.isFinite(prior.count)&&prior.count>0?Math.min(8,Math.floor(prior.count)):0;
  const next=count>0&&now>=last&&now-last<=12?Math.min(8,count+1):1;
  return {count:next,last:now,points:Math.max(0,finiteNumber(prior.points))+100*next};
}
