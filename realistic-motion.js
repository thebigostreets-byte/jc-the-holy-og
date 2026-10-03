// Limit changes in velocity by acceleration, while keeping response independent of FPS.
export function accelerateVelocity(velocity,desired,speed,rate,acceleration,dt){
 const step=Math.max(0,Math.min(.05,dt)),blend=1-Math.exp(-rate*step);
 let dx=(desired.x*speed-velocity.x)*blend,dy=(desired.y*speed-velocity.y)*blend,dz=(desired.z*speed-velocity.z)*blend;
 const length=Math.hypot(dx,dy,dz),limit=Math.max(0,acceleration)*step,scale=length>limit&&length>0?limit/length:1;
 velocity.x+=dx*scale;velocity.y+=dy*scale;velocity.z+=dz*scale;
 return velocity;
}
