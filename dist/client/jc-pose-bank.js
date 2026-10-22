// One hundred distinct articulated JC poses (39–138).
// These are procedural 3D joint configurations, not 100 independently drawn WebP sprites.
export const JC_POSE_START = 39;
export const JC_POSE_COUNT = 100;
const stages = ['Ready','Windup','Power','Follow-through','Recover'];
// name, source illustration, left/right shoulder, left/right elbow,
// left/right hip, left/right knee, torso pitch, side lean, head turn, torso twist
const groups = [
  ['Prayer',9,-.65,.65,-1.2,-1.2,-.05,.05,.1,.1,.06,0,0,0],
  ['Blessing',9,-.95,.25,-.65,-.3,-.12,.12,.08,.08,.04,-.07,.1,.08],
  ['Healing',9,-1.25,.8,-.8,-.65,.18,-.18,.25,.25,.08,.02,-.04,.05],
  ['Shield',9,-1.65,-1.45,-.38,-.4,-.3,.2,.28,.16,-.08,0,0,0],
  ['Light Pulse',5,-1.4,1.4,-.25,-.25,-.15,.15,.12,.12,-.05,.03,0,0],
  ['Divine Beam',8,-2.05,-1.65,-.12,-.7,-.18,.15,.15,.24,-.12,0,.12,-.1],
  ['Lightning',8,-2.2,.5,-.22,-.65,-.15,.1,.16,.1,-.07,-.09,-.05,.06],
  ['Telekinesis',9,-1.35,.88,-.65,-.8,.12,-.12,.24,.18,.08,.02,.06,.11],
  ['Exorcism',8,-2.1,1.15,-.6,-.65,.16,-.05,.17,.23,-.2,.12,-.15,.09],
  ['Teleport',7,-1.1,1.1,-.28,-.28,-.34,.34,.38,.38,-.15,0,0,0],
  ['Hover',14,-.72,.72,-.12,-.12,-.2,.12,.28,.24,-.1,0,.02,0],
  ['Takeoff',18,-2.18,-1.95,-.16,-.16,.45,-.3,.6,.45,-.3,0,0,0],
  ['Cruise',17,.35,-.4,-.15,-.15,-.1,-.16,.23,.15,-.35,0,.05,-.05],
  ['Hypersonic',20,.05,-.1,-.28,-.18,-.35,-.35,.1,.1,-.48,0,0,0],
  ['Bank Turn',15,-.15,-1.6,-.35,-.1,.12,-.12,.25,.45,-.28,.28,.2,.3],
  ['Landing',22,-.55,.65,-.15,-.35,.6,-.5,.85,.35,.26,.02,0,0],
  ['Sprinting',31,.45,-.45,-.5,-.5,.55,-.55,.65,.1,-.2,0,0,0],
  ['Dodge',23,1.0,-.95,-.7,-.55,.8,-.75,.65,.7,-.2,.42,-.4,.23],
  ['Rescue',12,-1.55,.5,-.9,-.7,.35,-.2,.75,.65,.25,-.13,.14,-.08],
  ['Sidearm Guard',10,-1.25,-1.02,-1.15,-.8,.2,-.2,.25,.25,-.15,.04,0,.1]
];
const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));
export const JC_POSES = Object.freeze(groups.flatMap((row,g) =>
  stages.map((stage,s) => {
    const [category,frame,al,ar,el,er,ll,lr,kl,kr,pitch,lean,head,twist] = row;
    const power=[.57,.86,1.0,.82,.38][s], bias=[-.17,-.07,0,.10,.19][s];
    // Every stage has a distinguishable, anatomically bounded shoulder,
    // elbow, hip and knee pose. No allocations occur during animation updates.
    const arm=Object.freeze([clamp(al*power+bias,-2.5,2.5),clamp(ar*power-bias,-2.5,2.5)]);
    const elbow=Object.freeze([clamp(el*power-.07*s,-1.7,1.7),clamp(er*power+.05*s,-1.7,1.7)]);
    const leg=Object.freeze([clamp(ll*power+bias*.7,-1.2,1.2),clamp(lr*power-bias*.7,-1.2,1.2)]);
    const knee=Object.freeze([clamp(kl*power+.035*s,0,1.3),clamp(kr*power+.025*s,0,1.3)]);
    return Object.freeze({
      id:JC_POSE_START+g*stages.length+s,
      name:`${category} — ${stage}`,category,stage,frame,
      arm,elbow,leg,knee,body:clamp(pitch*power,-.75,.75),
      lean:clamp(lean+(s-2)*.035,-.65,.65),
      head:clamp(head+bias*.25,-.55,.55),
      twist:clamp(twist+(s-2)*.04,-.55,.55)
    });
  })
));
const actions = Object.freeze({
  'answer-prayer':0,'bless':1,'heal':2,'restore':2,'grace-surge':2,
  'shield':3,'sanctuary':3,'stasis':3,'light-pulse':4,'radiance-nova':4,
  'divine-beam':5,'heavenly-spear':5,'shockwave':5,
  'lightning':6,'chain-light':6,'judgment-storm':6,
  'telekinesis':7,'attract':7,'repel':7,'crumble':7,'rebuild':7,
  'exorcise':8,'cleanse':8,'redemption-wave':8,
  'teleport':9,'phase-step':9,'recall':9,'time-step':9,
  'hover':10,'sky-lift':11,'leap':11,'flight':12,'glide':12,
  'hypersonic':13,'sonic-boom':13,'dash':14,
  'skydive':14,'beam-down':15,'slow-time':15,
  'rain':3,'reveal':1,'sunrise':6,'vortex':7,'singularity':7,
  'sidearm-shot':19,'ruin-lives':19
});
export function getJCPose(index) {
  return Number.isInteger(index) && index>=JC_POSE_START &&
    index<JC_POSE_START+JC_POSE_COUNT ? JC_POSES[index-JC_POSE_START] : null;
}
export function getJCPoseForAction(action,stage=2) {
  if(typeof action!=='string' || !Object.prototype.hasOwnProperty.call(actions,action))return null;
  const phase=Number.isInteger(stage)?((stage%5)+5)%5:2;
  return JC_POSES[actions[action]*5+phase];
}

export function getJCPoseSequenceFrame(index,startedAt,duration,now){
  const pose=getJCPose(index);
  if(!pose)return null;
  const first=pose.id-((pose.id-JC_POSE_START)%5);
  if(!Number.isFinite(startedAt)||!Number.isFinite(now))return first;
  const safeDuration=Number.isFinite(duration)&&duration>0?duration:800;
  const stage=Math.min(4,Math.max(0,Math.floor(((now-startedAt)/safeDuration)*5)));
  return first+stage;
}
