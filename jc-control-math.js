// Frame-rate independent input response shared by desktop, touch and gamepad.
export function stickAxis(value,deadzone=.16){if(!Number.isFinite(value))return 0;const dz=Number.isFinite(deadzone)?Math.max(0,Math.min(.99,deadzone)):.16;return Math.abs(value)<=dz?0:Math.sign(value)*Math.min(1,(Math.abs(value)-dz)/(1-dz));}
// Standard Gamepad API mapping; preserve the controller layout documented in game-full.html.
export const standardPadActions=[[0,'jump'],[1,'cast'],[2,'hypersonic'],[3,'car'],[4,'flight'],[5,'shield'],[8,'wheel'],[9,'pause']];
export const standardPadHolds=[[0,'Space'],[6,'Control'],[7,'Space']];
export function advanceLook(yaw,pitch,x,y,dt){
  yaw=Number.isFinite(yaw)?yaw:0;pitch=Number.isFinite(pitch)?pitch:0;
  x=Number.isFinite(x)?x:0;y=Number.isFinite(y)?y:0;
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
  // Precision near center, action-game turn speed at the rim.
  const yawRate=x*(2.6+2.6*Math.abs(x));
  const pitchRate=y*(1.9+1.5*Math.abs(y));
  return {yaw:yaw+yawRate*step,pitch:Math.max(-.72,Math.min(.72,pitch-pitchRate*step))};
}
export function setFlightForward(target,yaw,pitch){
  yaw=Number.isFinite(yaw)?yaw:0;pitch=Number.isFinite(pitch)?pitch:0;
  const horizontal=Math.cos(pitch);
  target.set(Math.sin(yaw)*horizontal,Math.sin(pitch),-Math.cos(yaw)*horizontal);
  return target;
}
export function response(rate,dt){const safeRate=Number.isFinite(rate)?Math.max(0,rate):0;const safeDt=Number.isFinite(dt)?Math.max(0,dt):0;return 1-Math.exp(-safeRate*safeDt);}
export function advancePedal(value,target,dt,rise=14,fall=9){
  value=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;
  const clampedTarget=Number.isFinite(target)?Math.max(-1,Math.min(1,target)):0;
  const rate=Math.abs(clampedTarget)>Math.abs(value)?rise:fall;
  const next=value+(clampedTarget-value)*response(rate,Number.isFinite(dt)?Math.min(.05,Math.max(0,dt)):0);
  return Math.abs(next)<.006&&Math.abs(clampedTarget)<.001?0:Math.max(-1,Math.min(1,next));
}
export function advanceGait(phase,speed,dt,sprint=false){
  const safePhase=Number.isFinite(phase)?((phase%8)+8)%8:0;
  const safeSpeed=Number.isFinite(speed)?Math.max(0,speed):0;
  const safeDt=Number.isFinite(dt)?Math.min(.05,Math.max(0,dt)):0;
  return (safePhase+Math.min(sprint?14:10,safeSpeed*(sprint?1.1:1.35))*safeDt)%8;
}
export function advanceChain(previous,time){const count=previous.count&&time-previous.last<=12?Math.min(8,previous.count+1):1;return {count,last:time,points:previous.points+100*count};}
