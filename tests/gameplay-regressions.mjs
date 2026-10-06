import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../three.module.js';
import {createMiracleEffects} from '../jc-miracle-effects.js';
import {transitionFlight} from '../jc-flight-state.js';

const scene=new THREE.Scene(),fx=createMiracleEffects(scene,true,()=>0),point=new THREE.Vector3();
for(let i=0;i<200;i++){fx.ring(point,0xffffff,40);fx.beam(point,new THREE.Vector3(10,20,0));}
assert.deepEqual(fx.stats(),{rings:18,beams:8,sprites:0,rainDrawCalls:0},'repeated casts stay inside the mobile effect budget');
fx.rainAt(point);fx.rainAt(point);assert.equal(fx.stats().rainDrawCalls,1,'repeated rain reuses one instanced mesh');
fx.update(200);assert.ok(scene.children.some(m=>m.visible));
fx.update(4000);assert.ok(scene.children.every(m=>!m.visible),'all effects expire even after a delayed frame');
let cleaned=0;for(let i=0;i<20;i++)fx.sprite(new THREE.Sprite(new THREE.SpriteMaterial()),()=>cleaned++);
assert.equal(fx.stats().sprites,6);assert.equal(cleaned,14);
fx.clear();assert.equal(cleaned,20);fx.dispose();assert.equal(scene.children.length,0,'effect resources detach cleanly');

const source=fs.readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
const camera=new THREE.PerspectiveCamera(62,1,.1,1000);camera.position.set(0,20,20);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const aim=vm.createContext({THREE,playing:true,teleportAim:true,teleportTarget:null,teleportMarker:null,terrainY:0,flightHeight:0,flying:false,player:{position:point},ray:new THREE.Raycaster(),game:{camera,scene:new THREE.Scene(),renderer:{domElement:{getBoundingClientRect:()=>({left:0,top:0,width:400,height:400})}}},clearSpot:(x,z)=>[x,z],groundAt:()=>0,clearTeleportMarker(){},feedback(){}});
vm.runInContext(source.slice(source.indexOf('function chooseTeleportPoint('),source.indexOf('function resetInput()')),aim);
aim.chooseTeleportPoint(200,200);assert.ok(aim.teleportTarget instanceof THREE.Vector3);assert.ok(Number.isFinite(aim.teleportTarget.x));assert.equal(aim.teleportAim,false,'one tap locks a valid teleport destination');

const catalog=source.slice(source.indexOf('const abilities = ['),source.indexOf('const signatureAbilityIds'));
const objects=Array.from({length:8},(_,i)=>{const ob=new THREE.Group();ob.userData={buildingId:`test-${i}`,heightMetres:20};ob.position.x=i*10;return ob;});
let targets=[],destroyed=[],beams=0,flight={flying:true,hypersonic:true,height:100};
let systemicWorld=null;
const state=vm.createContext({systemicWorld:null,livingWorld:null,THREE,performance:{now:()=>1000},playing:true,interiorState:false,cityMissions:null,jcAudio:{play(){}},updateSinState(){},wheel:{classList:{contains:()=>false}},grace:100,cooldowns:new Map(),teleportTarget:null,lockedBuilding:null,flying:false,diving:false,dashCooldown:0,pulseCooldown:0,phaseUntil:0,selectedAbility:'heavenly-spear',miraclePose:{},runActive:false,runFinished:false,castingUntil:0,timeScaleUntil:0,graceLabel:{},player:{position:new THREE.Vector3()},desired:new THREE.Vector3(),forward:new THREE.Vector3(0,0,-1),velocity:new THREE.Vector3(),game:{buildings:new Map(objects.map(o=>[o.userData.buildingId,o])),destroy:(ob,mode)=>destroyed.push([ob,mode])},nearbyBuildings:(radius,count)=>targets.slice(0,count),nearbyRuins:()=>null,feedback(){},showPose(){},spawnMiracleSprite(){},npcSystem:{signal(){}},cinematicLook:{impact(){}},beamTo(){beams++;},ringAt(){},refreshFootprints(){},clearTeleportMarker(){},moveSouls(){},moveSafely(){},setFlight(action){flight=transitionFlight(flight,action);}});
vm.runInContext(catalog+'\n'+source.slice(source.indexOf('function cast('),source.indexOf('function renderWheel()')),state);
for(const id of ['heavenly-spear','judgment-storm','telekinesis','crumble','rebuild','lightning','chain-light','divine-beam','skydive','beam-down']){state.cast(id);assert.equal(state.grace,100,`${id}: unsuccessful cast does not spend grace`);assert.equal(state.cooldowns.size,0);}
targets=objects;state.cast('judgment-storm');assert.equal(destroyed.length,3,'storm destroys at most three buildings');assert.equal(beams,3);assert.equal(state.grace,52);state.cast('judgment-storm');assert.equal(destroyed.length,3,'cooldown blocks repeat destruction');
state.grace=100;state.cast('heavenly-spear');assert.equal(destroyed.at(-1)[1],'explode');assert.equal(state.grace,62);
state.grace=100;state.cast('sonic-boom');assert.equal(flight.hypersonic,true,'Sonic Boom preserves boost instead of toggling it off');
assert.ok(source.includes("if (e.code === 'KeyT' && !e.repeat) {cast(devilMode?'portal':'teleport');}"),'keyboard teleport commits a locked destination');
assert.ok(source.includes("hud.querySelector('[data-action=\"teleport\"]').onclick=()=>{cast(devilMode?'portal':'teleport');};"),'mobile teleport follows the active JC/Devil mode');
assert.match(source,/function ensureJCGlow\(\)/,'JC has a persistent glow owner independent of pose art');
assert.match(source,/function syncJCGlowToPose\(\)/,'JC glow silhouette follows the active pose texture');
assert.match(source,/function applyCharacterFrame\(index\)[\s\S]*?ensureJCGlow\(\)/,'every pose application restores JC glow state');
assert.match(source,/applyCharacterFrame\(pose\);\s*updateJCGlow\(now\);/,'the render loop refreshes JC glow after every pose update');
assert.match(source,/boostJCGlow\(/,'miracles can temporarily intensify the persistent JC aura');
console.log('PASS: bounded effects, JC persistent glow, rain instancing, cleanup, teleport selection, rejected casts, storm limits, cooldowns and Sonic Boom state.');

// Every catalog entry executes in a valid world, with enough grace and a fresh cooldown.
let abilityCount=0;
Object.assign(state,{flying:true,diving:false,dashCooldown:0,pulseCooldown:0,spawnPoint:new THREE.Vector3(),teleportTarget:new THREE.Vector3(2,0,2),openSpace:()=>true,blockedAt:()=>false,nearbyRuins:()=>objects[0],setTimeout:fn=>{fn();return 1;},teleport(){},beamDown(){},dash(){},beginDive(){},pulse(){},redeem(){return true;},rainEffect(){},sunriseUntil:0,shieldUntil:0,sanctuaryUntil:0,graceSurgeUntil:0,stasisUntil:0,revealUntil:0,redeemedBuildings:new Set()});
state.cinematicLook.setSunrise=()=>{};state.game.rebuild=()=>{};
state.catalogIds=vm.runInContext('abilities.map(a=>a.id)',state);
for(const id of state.catalogIds){state.grace=100;state.cooldowns.clear();state.teleportTarget=new THREE.Vector3(2,0,2);state.cast(id);assert.ok(state.cooldowns.has(id),`${id}: valid cast enters cooldown`);assert.ok(Number.isFinite(state.grace),`${id}: grace remains finite`);abilityCount++;}
assert.equal(abilityCount,44);
console.log('PASS: all 44 ability handlers execute with valid targets and maintain finite grace.');
