import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../three.module.js';
import {buildingSurface,wallUV} from '../physical-building-materials.js';

const photos=Array.from({length:4},()=>new THREE.Texture());
const physical=Array.from({length:6},()=>new THREE.Texture());
const kinds=new Set();
const sharedCasinoTexture=new THREE.Texture();
for(const identity of [
 {name:'Blood Bay',type:'casino'},
 {name:'Blood Pyramid',type:'casino'},
 {name:'666',type:'casino'},
 {name:'Generic Strip Resort',type:'casino'}
]){
 const surface=buildingSurface('NGA14-casino-'+identity.name,50,photos,physical,identity,{casino:sharedCasinoTexture});
 assert.ok(photos.includes(surface.map),'named casino uses a photographic facade instead of the single shared generated casino map');
 assert.notEqual(surface.map,sharedCasinoTexture);
 assert.equal(surface.kind,'casino photographic facade');
}

for(let i=0;i<1000;i++){
 const id=`NGA14-${i}`,surface=buildingSurface(id,5,photos,physical);
 kinds.add(surface.kind);assert.ok(surface.map);assert.ok(surface.scale.every(x=>x>0));
 assert.deepEqual(surface,buildingSurface(id,5,photos,physical),'streaming back to a tile preserves paint and materials');
 assert.ok(photos.includes(buildingSurface(id,80,photos,physical).map),'tall facades retain windows');
 assert.ok(buildingSurface(id,10,photos.slice(0,3),[]).map,'partial photo fallback remains usable');
}
assert.equal(kinds.size,6,'facades and all five wall materials are assigned');
const positions=new THREE.Float32BufferAttribute([0,0,0,6,6,0,0,0,0,0,6,6,0,0,0,Math.SQRT1_2*6,6,-Math.SQRT1_2*6],3);
const normals=new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,0,0,1,0,0,Math.SQRT1_2,0,Math.SQRT1_2,Math.SQRT1_2,0,Math.SQRT1_2],3);
const uv=wallUV(positions,normals,6,6);
assert.ok(Math.abs(uv[2]-1)<.0001);assert.equal(uv[3],1);
assert.ok(Math.abs(Math.abs(uv[6])-1)<.0001);assert.equal(uv[7],1);
assert.ok(Math.abs(uv[10]-1)<.0001,'diagonal walls keep the same metre scale');
const engine=readFileSync(new URL('../map-engine.js',import.meta.url),'utf8');
const gameSource=readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
const material=new THREE.MeshStandardMaterial({name:'NGA14-1_walls',color:'#ddd5c8',map:photos[0]});
material.userData={physicalSurface:'painted stucco',original:{color:material.color.clone(),map:material.map,roughness:.9}};
const mesh=new THREE.Mesh(new THREE.BoxGeometry(),material),ob={children:[mesh]};
const context=vm.createContext({THREE,game:{edits:new Map()},buildingHash:()=>0});
vm.runInContext(engine.slice(engine.indexOf('function setAppearance'),engine.indexOf('function updateEdit')),context);
vm.runInContext(gameSource.slice(gameSource.indexOf('function applyBuildingTheme'),gameSource.indexOf('function restoredMap')),context);
context.setAppearance(ob,{});assert.equal(material.color.getHexString(),'ddd5c8','default paint survives appearance setup');
context.setAppearance(ob,{wallColor:'#789abc'});context.applyBuildingTheme(mesh,'NGA14-1');
assert.equal(material.color.getHexString(),'789abc','entering play preserves user paint');assert.equal(material.map,photos[0]);
context.applyBuildingTheme(mesh,'NGA14-1',true);assert.equal(material.map,photos[0],'redemption keeps the physical facade');assert.equal(material.emissiveIntensity,.1);
context.setAppearance(ob,{surface:'plain'});assert.equal(material.map,null);
context.setAppearance(ob,{});assert.equal(material.map,photos[0]);
console.log('Physical materials passed: repeatable paint, facade heights, metre scale, fallback, user edits, redemption, and surface reset.');
