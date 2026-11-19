// JC pose categories: 0–13 gestures, 14–22 flight, 23–30 walk,
// 31–38 sprint. Both selectors are total functions over hostile input.
export function selectFlightPose({ diving=false, braking=false, rising=false,
 descending=false, gliding=false, lateral=0, boosting=false, fast=false }={}){
  if(diving)return 19;
  if(braking)return 21;
  if(rising)return 18;
  if(descending)return 22;
  if(gliding)return 17;
  if(boosting||fast)return 20; // fast diagonal movement is hypersonic, not strafe
  const strafe=Number.isFinite(lateral)?lateral:0;
  if(strafe<-.25)return 15;
  if(strafe>.25)return 16;
  return 14;
}
export function selectGroundPose(horizontalSpeed,stepPhase,sprinting=false){
  const speed=Number.isFinite(horizontalSpeed)?horizontalSpeed:0;
  if(speed<=1.1)return 0;
  const phase=Number.isFinite(stepPhase)?Math.floor(stepPhase):0;
  const frame=((phase%8)+8)%8;
  return (sprinting?31:23)+frame;
}
