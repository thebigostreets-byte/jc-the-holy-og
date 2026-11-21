// Frame-rate independent input response shared by desktop, touch and gamepad.
export function stickAxis(value,deadzone=.16){
  if(!Number.isFinite(value))return 0;
  const zone=Number.isFinite(deadzone)?Math.max(0,Math.min(.95,deadzone)):.16;
  const axis=Math.max(-1,Math.min(1,value));
  return Math.abs(axis)<=zone?0:Math.sign(axis)*(Math.abs(axis)-zone)/(1-zone);
}
// Standard Gamepad API mapping; preserve the controller layout documented in game-full.html.
export const standardPadActions=[[0,'jump'],[1,'cast'],[2,'hypersonic'],[3,'car'],[4,'flight'],[5,'shield'],[8,'wheel'],[9,'pause']];
export const standardPadHolds=[[0,'Space'],[6,'Control'],[7,'Space']];
export function advanceLook(yaw,pitch,x,y,dt){
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
  // Clamp malformed touch/gamepad axes before they reach camera angles.
  const lookX=Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0;
  const lookY=Number.isFinite(y)?Math.max(-1,Math.min(1,y)):0;
  const yawRate=lookX*(2.6+2.6*Math.abs(lookX));
  const pitchRate=lookY*(1.9+1.5*Math.abs(lookY));
  return {yaw:yaw+yawRate*step,pitch:Math.max(-.72,Math.min(.72,pitch-pitchRate*step))};
}
export function setFlightForward(target,yaw,pitch){
  const horizontal=Math.cos(pitch);
  target.set(Math.sin(yaw)*horizontal,Math.sin(pitch),-Math.cos(yaw)*horizontal);
  return target;
}
export function response(rate,dt){return 1-Math.exp(-rate*Math.max(0,dt));}
export function advancePedal(value,target,dt,rise=14,fall=9){
  const clampedTarget=Math.max(-1,Math.min(1,target));
  const rate=Math.abs(clampedTarget)>Math.abs(value)?rise:fall;
  const next=value+(clampedTarget-value)*response(rate,Math.min(.05,Math.max(0,dt)));
  return Math.abs(next)<.006&&Math.abs(clampedTarget)<.001?0:Math.max(-1,Math.min(1,next));
}
export function advanceGait(phase,speed,dt,sprint=false){
  return (phase+Math.min(sprint?14:10,Math.max(0,speed)*(sprint?1.1:1.35))*Math.min(.05,Math.max(0,dt)))%8;
}
export function advanceChain(previous,time){const count=previous.count&&time-previous.last<=12?Math.min(8,previous.count+1):1;return {count,last:time,points:previous.points+100*count};}
