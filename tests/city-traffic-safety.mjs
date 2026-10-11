import assert from 'node:assert/strict';
import * as THREE from '../three.module.js';
import {createCityTraffic,advanceTrafficCar} from '../city-traffic.js';

const car={pts:[[0,0],[20,0],[20,0],[40,0]],seg:1,t:0,speed:8,length:0};
assert.equal(advanceTrafficCar(car,.08),true,'zero-length road segment is skipped');
assert.equal(car.seg,2);
assert.ok(car.t>0&&Number.isFinite(car.length));
assert.equal(advanceTrafficCar(car,Number.NaN),false);
const frozen={pts:[[0,0],[0,0]],seg:0,t:0,speed:4,length:0};
assert.equal(advanceTrafficCar(frozen,.08),false,'all-zero roads cannot divide by zero');

const events=new Map();
globalThis.window={
  addEventListener(name,fn){events.set(name,fn);},
  removeEventListener(name,fn){if(events.get(name)===fn)events.delete(name);},
  emit(name,detail){events.get(name)?.({detail});}
};
const scene=new THREE.Scene(),loaded=new Set(['tile-1']);
const game={scene,origin:[0,0],loaded,roads:{sample:()=>0}};
const traffic=createCityTraffic(game);
window.emit('jc-roads-loaded',{tile:'tile-1',records:null});
assert.equal(traffic.stats().vehicles,0,'malformed road payload ignored');
window.emit('jc-roads-loaded',{tile:'tile-1',records:[{kind:'LOCAL',points:[[0,0],[NaN,0]]}]});
assert.equal(traffic.stats().vehicles,0,'invalid coordinates rejected');
window.emit('jc-roads-loaded',{tile:'tile-1',records:[{kind:'MAJOR STREET',points:[[0,0],[100,0],[200,0]]}]});
assert.equal(traffic.stats().vehicles,2,'valid roads spawn bounded instanced traffic');
traffic.update(NaN);
traffic.update(-1);
traffic.update(.06);
const group=scene.children[0],body=group.children[0],lamps=group.children[2];
const matrixA=new THREE.Matrix4(),matrixB=new THREE.Matrix4();
body.getMatrixAt(0,matrixA);
lamps.getMatrixAt(0,matrixA);
lamps.getMatrixAt(1,matrixB);
assert.notEqual(matrixA.elements[12],matrixB.elements[12],'left and right headlights occupy separate positions');
body.getMatrixAt(0,matrixA);
const x=matrixA.elements[12],z=matrixA.elements[14];
assert.ok(traffic.vehicleAt(x,z,3),'nearby vehicle lookup succeeds');
assert.ok(traffic.vehicleAt(x+35,z,40),'large-radius lookup checks all intersecting spatial cells');
assert.equal(traffic.vehicleAt(NaN,z,3),null,'invalid spatial query ignored');
assert.equal(traffic.vehicleAt(x,z,-3),null,'negative radius ignored');
const before=x;traffic.update(1e9);body.getMatrixAt(0,matrixB);
assert.ok(Math.abs(matrixB.elements[12]-before)<2,'large frame delta cannot teleport a car');
loaded.delete('tile-1');traffic.update(.06);
assert.equal(traffic.stats().vehicles,0,'unloaded tile releases vehicle instances');
traffic.dispose();traffic.dispose();
window.emit('jc-roads-loaded',{tile:'tile-1',records:[{kind:'MAJOR STREET',points:[[0,0],[100,0]]}]});
assert.equal(traffic.stats().vehicles,0,'disposed system cannot recreate traffic');
assert.equal(scene.children.length,0,'all traffic meshes detached after disposal');
console.log('PASS: traffic segment recovery, input validation, frame clamp, headlights, spatial queries, tile unloading and disposal.');
