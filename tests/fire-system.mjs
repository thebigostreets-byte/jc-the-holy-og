import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../fire-system.js',import.meta.url),'utf8');
const dist=readFileSync(new URL('../dist/client/fire-system.js',import.meta.url),'utf8');
assert.equal(source,dist,'deployed fire module matches the tested source');

let disposedMaterials=0,disposedTextures=0;
class Vector3 {
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(p){return this.set(p.x,p.y,p.z);}
 distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z);}
}
class SpriteMaterial {
 constructor(options={}){this.options=options;this.rotation=0;}
 clone(){return new SpriteMaterial(this.options);}
 dispose(){disposedMaterials++;}
}
class Sprite {
 constructor(material){this.material=material;this.visible=true;this.scale={set(){}};this.position=new Vector3();}
}
class CanvasTexture {dispose(){disposedTextures++;}}
globalThis.__fireTestTHREE={Vector3,SpriteMaterial,Sprite,CanvasTexture,AdditiveBlending:1};
globalThis.document={createElement(){return {getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){},beginPath(){},moveTo(){},quadraticCurveTo(){},closePath(){},fill(){}};}};}};
const testModule=source.replace("import * as THREE from './three.module.js';",'const THREE=globalThis.__fireTestTHREE;');
assert.notEqual(testModule,source,'test must replace only the Three.js import');
const {createFireSystem}=await import('data:text/javascript;base64,'+Buffer.from(testModule).toString('base64'));
function makeScene(){return {children:[],add(x){this.children.push(x);},remove(x){this.children.splice(this.children.indexOf(x),1);}};}
let now=1000;
const scene=makeScene(),fire=createFireSystem(scene,{capacity:2,clock:()=>now});
assert.equal(scene.children.length,2);
assert.equal(fire.ignite('bad',{x:NaN,y:0,z:0}),false,'non-finite coordinates cannot enter the scene');
assert.equal(fire.ignite('bad',{x:0,y:0,z:0},NaN),false,'invalid durations cannot create immortal fires');
assert.equal(fire.ignite('bad',{x:0,y:0,z:0},-1),false);
assert.equal(fire.ignite('a',{x:0,y:0,z:0},500),true);
assert.equal(fire.ignite('b',{x:5,y:0,z:20},500),true);
fire.update(1100);
assert.notEqual(scene.children[0].material,scene.children[1].material,'each flame has independent sprite rotation');
assert.notEqual(scene.children[0].material.rotation,scene.children[1].material.rotation,'flames animate independently');
assert.equal(fire.extinguish({x:NaN,y:0,z:0}),0,'invalid extinguish centers are ignored');
assert.equal(fire.extinguish({x:0,y:0,z:0},Infinity),0,'unbounded extinguish radii are ignored');
assert.equal(fire.extinguish({x:0,y:0,z:0},1),1,'valid localized extinguish works');
assert.equal(scene.children[1].visible,true);
fire.update(1600);assert.equal(scene.children[1].visible,false,'flames expire using the supplied clock');
assert.equal(fire.ignite('c',{x:0,y:0,z:0},120000),true);
fire.update(61001);assert.equal(scene.children[0].visible,false,'fire lifetime is capped at one minute');
fire.dispose();fire.dispose();assert.equal(scene.children.length,0,'dispose is idempotent');
assert.equal(fire.ignite('after',{x:0,y:0,z:0}),false,'disposed systems reject new fires');
assert.equal(fire.extinguish({x:0,y:0,z:0}),0);
fire.update();
const tiny=makeScene(),limited=createFireSystem(tiny,{capacity:0,clock:()=>100});
assert.equal(tiny.children.length,1,'zero capacity cannot create an empty pool crash');
limited.dispose();
const huge=makeScene(),bounded=createFireSystem(huge,{capacity:1e9,clock:()=>100});
assert.equal(huge.children.length,64,'malformed capacity cannot exhaust low-end device memory');
bounded.dispose();
assert.equal(disposedTextures,3,'each system releases its texture exactly once');
assert.equal(disposedMaterials,2+1+64+3,'all cloned materials and templates are disposed');
console.log('PASS: fire lifecycle, finite guards, capped budgets, independent animations, localized extinguish, source/dist parity, and idempotent cleanup');
