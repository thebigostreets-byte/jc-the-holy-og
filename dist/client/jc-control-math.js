// Frame-rate independent input response shared by desktop, touch and gamepad.
export function stickAxis(value,deadzone=.16){return Math.abs(value)<=deadzone?0:Math.sign(value)*Math.min(1,(Math.abs(value)-deadzone)/(1-deadzone));}
export function advanceLook(yaw,pitch,x,y,dt){
  const step=Math.max(0,dt);
  return {yaw:yaw+x*1.8*step,pitch:Math.max(-.62,Math.min(.62,pitch-y*1.35*step))};
}
export function setFlightForward(target,yaw,pitch){
  const horizontal=Math.cos(pitch);
  target.set(Math.sin(yaw)*horizontal,Math.sin(pitch),-Math.cos(yaw)*horizontal);
  return target;
}
export function response(rate,dt){return 1-Math.exp(-rate*Math.max(0,dt));}
export function advanceGait(phase,speed,dt,sprint=false){
  return (phase+Math.min(sprint?14:10,Math.max(0,speed)*(sprint?1.1:1.35))*Math.min(.05,Math.max(0,dt)))%8;
}
export function advanceChain(previous,time){const count=previous.count&&time-previous.last<=12?Math.min(8,previous.count+1):1;return {count,last:time,points:previous.points+100*count};}
