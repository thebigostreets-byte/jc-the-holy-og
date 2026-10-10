// Frame-rate independent input response shared by desktop, touch and gamepad.
const finite = (value, fallback=0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function stickAxis(value,deadzone=.16){
  const axis=clamp(finite(value),-1,1);
  const zone=clamp(finite(deadzone,.16),0,1);
  return zone>=1||Math.abs(axis)<=zone?0:Math.sign(axis)*Math.min(1,(Math.abs(axis)-zone)/(1-zone));
}
// Standard Gamepad API mapping; preserve the controller layout documented in game-full.html.
export const standardPadActions=[[0,'jump'],[1,'cast'],[2,'hypersonic'],[3,'car'],[4,'flight'],[5,'shield'],[8,'wheel'],[9,'pause']];
export const standardPadHolds=[[0,'Space'],[6,'Control'],[7,'Space']];
export function advanceLook(yaw,pitch,x,y,dt){
  const step=clamp(finite(dt),0,.05);
  const lookX=clamp(finite(x),-1,1),lookY=clamp(finite(y),-1,1);
  // Precision near center, action-game turn speed at the rim.
  const yawRate=lookX*(2.6+2.6*Math.abs(lookX));
  const pitchRate=lookY*(1.9+1.5*Math.abs(lookY));
  return {yaw:finite(yaw)+yawRate*step,pitch:clamp(finite(pitch)-pitchRate*step,-.72,.72)};
}
export function setFlightForward(target,yaw,pitch){
  const safeYaw=finite(yaw),safePitch=finite(pitch);
  const horizontal=Math.cos(safePitch);
  target.set(Math.sin(safeYaw)*horizontal,Math.sin(safePitch),-Math.cos(safeYaw)*horizontal);
  return target;
}
export function response(rate,dt){
  return 1-Math.exp(-Math.max(0,finite(rate))*Math.max(0,finite(dt)));
}
export function advancePedal(value,target,dt,rise=14,fall=9){
  const current=clamp(finite(value),-1,1),clampedTarget=clamp(finite(target),-1,1);
  const rate=Math.abs(clampedTarget)>Math.abs(current)?Math.max(0,finite(rise,14)):Math.max(0,finite(fall,9));
  const next=current+(clampedTarget-current)*response(rate,clamp(finite(dt),0,.05));
  return Math.abs(next)<.006&&Math.abs(clampedTarget)<.001?0:clamp(next,-1,1);
}
export function advanceGait(phase,speed,dt,sprint=false){
  const current=((finite(phase)%8)+8)%8;
  const stride=Math.min(sprint?14:10,Math.max(0,finite(speed))*(sprint?1.1:1.35));
  return (current+stride*clamp(finite(dt),0,.05))%8;
}
export function advanceChain(previous,time){
  const now=finite(time),last=finite(previous?.last,-Infinity);
  const oldCount=clamp(Math.trunc(finite(previous?.count)),0,8);
  const count=oldCount>0&&now>=last&&now-last<=12?Math.min(8,oldCount+1):1;
  return {count,last:now,points:Math.max(0,finite(previous?.points))+100*count};
}
