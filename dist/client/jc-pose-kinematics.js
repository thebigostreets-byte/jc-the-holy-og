// Canonical 139-pose JC joint library. Index 0–38 matches photographic frames;
// 39–138 are 20 families x 5 articulated phases from the JC pose bank.
import {JC_POSE_START,JC_POSES} from './jc-pose-bank.js';
export const JC_BASE_POSES=39;
export const JC_TOTAL_POSES=JC_BASE_POSES+JC_POSES.length;
const limit=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(v)?v:0));
const freezePair=a=>Object.freeze(a.map(v=>Number.isFinite(v)?v:0));
function makePose(id,{name,kind='gesture',arm=[-.16,.16],elbow=[-.08,-.08],leg=[0,0],knee=[0,0],pitch=0,lean=0,head=0,twist=0,phase=null,frame=id}={}){
  const result={
    id,frame,name:name||('JC pose '+id),kind,phase,
    arm:freezePair(arm.map(v=>limit(v,-2.5,2.5))),
    elbow:freezePair(elbow.map(v=>limit(v,-1.7,1.7))),
    leg:freezePair(leg.map(v=>limit(v,-1.2,1.2))),
    knee:freezePair(knee.map(v=>limit(v,0,1.3))),
    pitch:limit(pitch,-.75,.75),lean:limit(lean,-.65,.65),
    head:limit(head,-.55,.55),twist:limit(twist,-.55,.55)
  };
  // Hip, knee and boot geometry lengths in jc-character3d.js. Grounded
  // postures compensate vertical displacement so at least one shoe stays near
  // the ground, rather than planting both legs at an invalid identical height.
  const footY=result.leg.map((hip,i)=>
    1.42-.74*Math.cos(hip)-.57*Math.cos(hip+result.knee[i])-.105);
  const grounded=!['flight','flying'].includes(kind);
  result.rootY=grounded?limit(-Math.min(...footY),-.19,.1):0;
  result.ankle=freezePair(result.leg.map((hip,i)=>limit(-(hip+result.knee[i])*.44,-.7,.7)));
  return Object.freeze(result);
}
const gestureArms=[
  [-.12,.12],[-.35,.31],[-1.08,-.82],[1.12,1.12],[-.55,-.45],
  [1.85,-1.85],[-1.55,1.55],[-.8,-.8],[2.25,2.25],[-.45,.8],
  [1.35,-1.2],[.72,.72],[-1.2,1.2],[2.38,2.38]
];
const gestureNames=[
  'Idle','Ready','Hands forward','Welcome','Listen','Light pulse',
  'Miracle reach','Teleport charge','Divine beam','Healing','Push',
  'Protect','Rescue','Prayer raised'
];
const base=[];
for(let id=0;id<14;id++){
 const arm=gestureArms[id];
 base.push(makePose(id,{name:gestureNames[id],arm,kind:'gesture',
  elbow:id===5?[-.55,-.55]:id===9?[-.6,-.45]:[-.06,-.06],
  pitch:id===8?-.12:id===12?.06:0,
  lean:[0,0,.03,-.02,0,.04,-.04,0,.03,0,0,0,.04,.06][id],
  leg:id===12?[.12,-.1]:[0,0],
  knee:id===12?[.18,.1]:[0,0]}));
}
const flight=[
  {name:'Hover',arm:[1.05,-1.05],leg:[-.1,-.1],knee:[.26,.26]},
  {name:'Strafe left',arm:[-.1,-1.3],leg:[.2,-.12],knee:[.22,.12],lean:-.22,twist:-.1},
  {name:'Strafe right',arm:[1.3,.1],leg:[-.12,.2],knee:[.12,.22],lean:.22,twist:.1},
  {name:'Glide',arm:[.65,-.65],leg:[-.12,-.12],pitch:-.21},
  {name:'Ascend',arm:[-2.1,-2.1],leg:[.23,-.23],knee:[.36,.16],pitch:.12},
  {name:'Dive',arm:[1.6,1.6],leg:[-.3,-.3],pitch:-.48,knee:[.06,.06]},
  {name:'Hypersonic',arm:[.15,-.15],leg:[-.23,-.23],pitch:-.42,knee:[.08,.08]},
  {name:'Air brake',arm:[.95,.95],elbow:[-.85,-.85],leg:[.26,-.22],pitch:.18},
  {name:'Descend',arm:[.2,.2],leg:[.35,.35],knee:[.44,.44],pitch:.2}
];
for(let i=0;i<flight.length;i++)base.push(makePose(14+i,{...flight[i],kind:'flight',pitch:flight[i].pitch||0}));
const GROUND_CYCLE=8;
for(const [run,begin] of [[false,23],[true,31]]){
 for(let phase=0;phase<GROUND_CYCLE;phase++){
  const a=phase*Math.PI/4,sine=Math.sin(a),cosine=Math.cos(a);
  const drive=run?.80:.53;
  base.push(makePose(begin+phase,{
    name:(run?'Sprint':'Walk')+' '+(phase+1)+'/8',
    kind:run?'run':'walk',phase,
    arm:[-sine*(run?.71:.43),sine*(run?.71:.43)],
    elbow:[-.16-Math.max(0,-sine)*.12,-.16-Math.max(0,sine)*.12],
    leg:[sine*drive,-sine*drive],
    knee:[Math.max(0,-sine)*(run?.95:.68),Math.max(0,sine)*(run?.95:.68)],
    pitch:run?-.16:-.045,
    lean:cosine*(run?.018:.012),
    twist:sine*(run?.07:.045),
    head:-sine*.016
  }));
 }
}
if(base.length!==39)throw Error('JC base pose catalog must contain 39 poses');
const extended=JC_POSES.map(extra=>makePose(extra.id,{
  ...extra,kind:extra.category==='Hover'||extra.category==='Takeoff'||
    extra.category==='Cruise'||extra.category==='Hypersonic'||extra.category==='Bank Turn'?'flight':'gesture',
  name:extra.name,frame:extra.frame,pitch:extra.body
}));
export const JC_JOINT_POSES=Object.freeze([...base,...extended]);
if(JC_JOINT_POSES.length!==JC_TOTAL_POSES||
  JC_JOINT_POSES.some((pose,index)=>pose.id!==index))
  throw Error('JC pose indices must be contiguous and complete');
export function jcJointPose(index=0){
  return Number.isInteger(index)&&index>=0&&index<JC_TOTAL_POSES?
    JC_JOINT_POSES[index]:JC_JOINT_POSES[0];
}
