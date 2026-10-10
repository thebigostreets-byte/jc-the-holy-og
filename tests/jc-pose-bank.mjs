import assert from 'node:assert/strict';
import {JC_POSE_START,JC_POSE_COUNT,JC_POSES,getJCPose,getJCPoseForAction} from '../jc-pose-bank.js';
assert.equal(JC_POSE_START,39);
assert.equal(JC_POSE_COUNT,100);
assert.equal(JC_POSES.length,100);
assert.equal(new Set(JC_POSES.map(p=>p.id)).size,100);
assert.equal(new Set(JC_POSES.map(p=>p.name)).size,100);
assert.equal(new Set(JC_POSES.map(p=>p.category)).size,20);
assert.equal(new Set(JC_POSES.map(p=>p.stage)).size,5);
const signatures=new Set();
for(let index=0;index<100;index++){
  const pose=JC_POSES[index];
  assert.equal(pose.id,39+index);
  assert.equal(getJCPose(pose.id),pose);
  assert.equal(Object.isFrozen(pose),true);
  assert.ok(pose.frame>=0&&pose.frame<=38);
  for(const key of ['arm','elbow','leg','knee']){
    assert.equal(pose[key].length,2);
    assert.equal(Object.isFrozen(pose[key]),true);
    assert.ok(pose[key].every(Number.isFinite));
  }
  for(const key of ['body','lean','head','twist'])assert.ok(Number.isFinite(pose[key]));
  const sign=JSON.stringify([pose.arm,pose.elbow,pose.leg,pose.knee,pose.body,pose.lean,pose.head,pose.twist]);
  assert.equal(signatures.has(sign),false,`duplicate articulated configuration ${pose.name}`);
  signatures.add(sign);
}
for(const id of [-3,0,38,139,Infinity,NaN,39.5,'39',null])assert.equal(getJCPose(id),null);
for(const action of ['heal','light-pulse','lightning','telekinesis','exorcise','shield','bless','answer-prayer','hypersonic','ruin-lives','divine-beam']){
  for(let stage=0;stage<5;stage++) assert.ok(getJCPoseForAction(action,stage));
}
assert.equal(getJCPoseForAction('missing'),null);
assert.equal(getJCPoseForAction('__proto__'),null);
assert.equal(getJCPoseForAction(null),null);
assert.equal(getJCPoseForAction('heal',999).id,getJCPoseForAction('heal',4).id);
console.log('PASS: 100 distinct articulated poses, stable indexes, bounded joints and action mapping');
