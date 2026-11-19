import assert from 'node:assert/strict';
import * as THREE from '../three.module.js';
import {createTrafficSystem} from '../jc-traffic.js';

const scene=new THREE.Scene();
const traffic=createTrafficSystem({
  scene,
  network:{routes:[{kind:'arterial',points:[[0,0],[2000,0]]}]},
  groundAt:()=>0,
  count:1
});
assert.equal(traffic.count,1);
traffic.setVisible(true);
const car=traffic.cars[0];
car.distance=1000;
car.direction=1;
car.speed=0;
const player={position:new THREE.Vector3(3000,0,3000)};
let impacts=0;
const npc={position:new THREE.Vector3(1000,100,-2.7)};
traffic.update(.016,100,player,[npc],()=>{},()=>impacts++);
assert.equal(impacts,0,'overpass civilian must not be hit by traffic below');
assert.equal(npc.trafficCooldownUntil,undefined,'noncolliding civilian must not receive cooldown');
npc.position.y=.72;
traffic.update(.016,200,player,[npc],()=>{},()=>impacts++);
assert.equal(impacts,1,'civilian at vehicle height must receive collision');
assert.equal(npc.trafficCooldownUntil,4200,'real collision must start cooldown');
traffic.update(.016,300,player,[npc],()=>{},()=>impacts++);
assert.equal(impacts,1,'cooldown must suppress repeat impacts');
traffic.dispose();
console.log('PASS: civilian traffic collisions require horizontal and vertical overlap and respect cooldown');
