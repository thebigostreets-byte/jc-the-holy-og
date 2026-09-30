import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../three.module.js';
import {createNpcSystem} from '../jc-npcs.js';

const scene=new THREE.Scene(),player={position:new THREE.Vector3()};
const system=createNpcSystem({scene,player,groundAt:(x,z)=>x*.1,isSafe:()=>true,count:8});
const civilian=system.npcs.find(n=>n.faction==='civilian'),authority=system.npcs.find(n=>n.faction==='authority');
system.signal('heal',player.position,100);assert.equal(civilian.state,'awe');assert.equal(authority.state,'awe');
system.signal('judgment-storm',player.position,100);assert.equal(civilian.state,'fear');assert.equal(authority.state,'respond');
const when=performance.now()+10000;system.update(.016,when);assert.equal(civilian.memory.type,'judgment-storm','NPC remembers an event after its immediate reaction expires');
assert.ok(Math.abs(civilian.position.y-(civilian.position.x*.1+1.55))<1e-8,'NPC feet follow the terrain along the route');

const source=fs.readFileSync(new URL('../jc-npcs.js',import.meta.url),'utf8');
const start=source.indexOf('  function update(dt,now=performance.now())'),end=source.indexOf('\n  return {npcs',start);
const npc={...civilian,sprite:{position:new THREE.Vector3(),rotation:{},userData:{character:{setPose(){}}}},position:new THREE.Vector3(0,1.55,0),target:new THREE.Vector3(10,1.55,0),event:{type:'danger'},emotionUntil:10000,nextWander:10000,blockedSince:null,gait:0,stepDistance:0};
let searches=0;
const blocked=vm.createContext({THREE,Math,performance:{now:()=>0},player,npcs:[npc],isSafe:()=>false,groundAt:()=>0,chooseOpen:(x,z)=>{searches++;return [x,z];},report(){},setDestination(){}});
vm.runInContext(source.slice(start,end),blocked);blocked.update(.016,0);blocked.update(.016,400);
assert.equal(searches,1,'NPC blocked during an active event replans its destination');assert.equal(npc.moving,false,'blocked NPC does not animate running in place');
system.dispose();assert.equal(scene.children.length,0);
console.log('PASS: peaceful and dangerous reactions, event memory, terrain contact, blocked-route recovery and stationary animation.');
