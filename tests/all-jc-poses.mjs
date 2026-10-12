import assert from 'node:assert/strict';
import * as THREE from '../three.module.js';
import {JC_JOINT_POSES,JC_BASE_POSES,JC_TOTAL_POSES,jcJointPose} from '../jc-pose-kinematics.js';
import {JC_POSE_START,JC_POSE_COUNT,JC_POSES,getJCPose,getJCPoseSequenceFrame} from '../jc-pose-bank.js';
import {createCharacter3D} from '../jc-character3d.js';
import {selectGroundPose,selectFlightPose} from '../jc-character-pose.js';
import {readFileSync} from 'node:fs';

assert.equal(JC_BASE_POSES,39);
assert.equal(JC_POSE_START,39);
assert.equal(JC_POSE_COUNT,100);
assert.equal(JC_TOTAL_POSES,139);
assert.equal(JC_JOINT_POSES.length,139);
const names=new Set(),geometry=new Set();
for(let id=0;id<139;id++){
 const pose=jcJointPose(id);
 assert.equal(pose.id,id);
 assert.ok(Object.isFrozen(pose));
 assert.ok(!names.has(pose.name),'no duplicate pose names: '+pose.name);
 names.add(pose.name);
 assert.ok(Number.isFinite(pose.rootY)&&pose.rootY>=-.19&&pose.rootY<=.1);
 for(const key of ['arm','elbow','leg','knee','ankle']){
  assert.equal(pose[key].length,2);
  assert.ok(Object.isFrozen(pose[key]));
  assert.ok(pose[key].every(Number.isFinite),id+' '+key);
 }
 for(const key of ['pitch','lean','head','twist'])assert.ok(Number.isFinite(pose[key]),id+' '+key);
 const signature=JSON.stringify([pose.arm,pose.elbow,pose.leg,pose.knee,pose.pitch,pose.lean,pose.twist]);
 assert.ok(!geometry.has(signature),'no duplicated articulated joint configurations: '+id);
 geometry.add(signature);
 if(id<39)assert.equal(pose.frame,id);
 else assert.ok(JC_POSES[id-39]?.frame>=0&&JC_POSES[id-39].frame<=38);
}
assert.equal(jcJointPose(-1).id,0);
assert.equal(jcJointPose(139).id,0);
assert.equal(jcJointPose(NaN).id,0);
assert.equal(jcJointPose('39').id,0);
assert.equal(jcJointPose(Infinity).id,0);
assert.notEqual(jcJointPose(25).leg[0],jcJointPose(29).leg[0]);
assert.notEqual(jcJointPose(25).leg[1],jcJointPose(29).leg[1]);
assert.ok(jcJointPose(25).knee[1]>.3,'right knee lifts on one half-step');
assert.ok(jcJointPose(29).knee[0]>.3,'left knee lifts on alternate half-step');
for(let phase=0;phase<8;phase++){
 const w=jcJointPose(23+phase),r=jcJointPose(31+phase);
 assert.equal(selectGroundPose(4,phase,false),w.id);
 assert.equal(selectGroundPose(16,phase,true),r.id);
 assert.ok(Math.abs(r.leg[0])>=Math.abs(w.leg[0])-1e-9);
}
for(const input of [[NaN,NaN],[Infinity,Infinity],[-3,-3],[-Infinity,-Infinity]]){
 const [speed,phase]=input;
 const result=selectGroundPose(speed,phase,false);
 assert.ok(result>=0&&result<=38);
}
assert.equal(selectFlightPose({boosting:true,lateral:1}),20);
assert.equal(selectFlightPose({fast:true,lateral:-1}),20);
assert.equal(selectFlightPose({diving:true,boosting:true}),19);
assert.equal(selectFlightPose({lateral:NaN}),14);
assert.equal(selectFlightPose({lateral:-1}),15);
assert.equal(selectFlightPose({lateral:1}),16);

const player=createCharacter3D({faction:'angel',player:true});
assert.ok(player.scale.x>1.2,'articulated JC matches full-height artwork');
const leftArm=player.getObjectByName('JC left arm'),rightArm=player.getObjectByName('JC right arm');
const leftLeg=player.getObjectByName('JC left leg'),rightLeg=player.getObjectByName('JC right leg');
const leftKnee=player.getObjectByName('JC left knee'),rightKnee=player.getObjectByName('JC right knee');
const leftShoe=player.getObjectByName('JC left shoe'),rightShoe=player.getObjectByName('JC right shoe');
assert.ok([leftArm,rightArm,leftLeg,rightLeg,leftKnee,rightKnee,leftShoe,rightShoe].every(Boolean),'no arm, leg, knee or shoe is missing');
assert.notEqual(leftLeg,rightLeg);
assert.ok(!player.getObjectByName('Halo'),'JC player no longer uses NPC-style angel wings');
let now=300;
for(let id=0;id<139;id++){
 const pose=jcJointPose(id);
 player.userData.character.setPose(id,0,8,now,false);
 now+=250; // snap after a transition gap
 assert.equal(player.userData.lastPose,id);
 assert.ok(Math.abs(leftLeg.rotation.x-pose.leg[0])<1e-6,'left leg pose '+id);
 assert.ok(Math.abs(rightLeg.rotation.x-pose.leg[1])<1e-6,'right leg pose '+id);
 assert.ok(Math.abs(leftKnee.rotation.x-pose.knee[0])<1e-6,'left knee pose '+id);
 assert.ok(Math.abs(rightKnee.rotation.x-pose.knee[1])<1e-6,'right knee pose '+id);
 assert.ok(Math.abs(leftArm.rotation.x-pose.arm[0])<1e-6,'left arm pose '+id);
 assert.ok(Math.abs(rightArm.rotation.x-pose.arm[1])<1e-6,'right arm pose '+id);
 assert.ok([leftShoe,rightShoe].every(s=>Number.isFinite(s.rotation.x)));
}
const start=player.userData.lastUpdated;
player.userData.character.setPose(39,0,5,start+16,false);
assert.ok(Math.abs(leftLeg.rotation.x-jcJointPose(39).leg[0])<=.8,'limb interpolation remains bounded');
player.userData.character.setPose(0,0,0,start+260,false);
assert.equal(player.userData.lastPose,0);
assert.ok(Math.abs(leftLeg.rotation.x)<1e-6&&Math.abs(rightLeg.rotation.x)<1e-6,'idle returns both legs to neutral');
for(let g=0;g<20;g++){
 const base=39+g*5;
 for(let p=0;p<5;p++){
  assert.equal(getJCPoseSequenceFrame(base,1000,1000,1000+p*200+10),base+p);
 }
}
const game=readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
assert.match(game,/poseFootOffset/,'feet are placed against the world ground');
assert.match(game,/poseDisplayHeight/,'sprites use pose-specific silhouette fitting');
assert.match(game,/failedCharacterFrames/,'failed artwork requests cannot spin forever');
assert.match(game,/window\.JC_POSE_BANK\.all\(\)/,'pose lab previews every pose');
assert.match(game,/if\(!characterFrames\[poseIndex\]&&!devilMode\)/,'late default texture cannot overwrite selected pose');
console.log('PASS: all 139 JC pose records, 139 rig transitions, 39 legacy frames, 100 action poses, two planted legs and bounded joints.');
