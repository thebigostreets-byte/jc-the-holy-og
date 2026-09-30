import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../three.module.js';
import {cloneBuildingMaterial} from '../map-materials.js';
import {decodeGlbAttribute} from '../ground-sampling.js';
const texture=new THREE.Texture();let serialized=0;texture.toJSON=()=>{serialized++;throw Error('Image serialization during material clone');};
const material=new THREE.MeshStandardMaterial({map:texture});
material.userData={original:{map:texture,color:new THREE.Color('#ffddbb'),roughness:.7}};
for(let i=0;i<650;i++){
 const copy=cloneBuildingMaterial(material);
 assert.equal(copy.map,texture);assert.equal(copy.userData.original.map,texture);
 assert.notEqual(copy.userData.original.color,material.userData.original.color);
 copy.color.set('#ff0000');assert.notEqual(copy.color.getHex(),material.color.getHex());copy.dispose();
}
assert.equal(serialized,0);
const source=await fs.readFile(new URL('../map-engine.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('async function parseGLB'),source.indexOf('function setAppearance'));
const bounds=JSON.parse(await fs.readFile(new URL('../city-manifest.json',import.meta.url),'utf8')).manifest.boundsEPSG32611;
let yields=0;
const context=vm.createContext({THREE,TextDecoder,DataView,Float32Array,Uint32Array,Uint16Array,Uint8Array,Map,Promise,decodeGlbAttribute,
 origin:[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2],
 setTimeout:(fn,ms)=>{yields++;return setTimeout(fn,ms);},statusText:()=>{},
 bytes:async()=>new Uint8Array(),pathRelative:(_,p)=>p,textureFrom:async()=>new THREE.Texture(),
 facadePromise:Promise.resolve([new THREE.Texture(),new THREE.Texture(),new THREE.Texture()]),facadeIndex:()=>0});
vm.runInContext(fn,context);
const raw=new Uint8Array(gunzipSync(await fs.readFile(new URL('../tiles/C15_R14.glb.gz',import.meta.url))));
const group=await context.parseGLB(raw,'tiles/C15_R14.glb');
assert.equal(group.children.filter(o=>o.userData.buildingId).length,616);
let meshes=0;group.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.boundingSphere.radius>=0);assert.ok(o.geometry.attributes.position.count>0);}});
assert.equal(meshes,1223);assert.ok(yields>=25);
// A material change on the first building must leave the next building untouched.
const a=group.children[0].children[0],b=group.children[1].children[0];assert.notEqual(a.material,b.material);
const other=b.material.map;a.material=cloneBuildingMaterial(a.material);a.material.map=new THREE.Texture();assert.equal(b.material.map,other);
console.log(JSON.stringify({materialCopies:650,imageSerializations:serialized,buildings:616,meshes,cooperativeYields:yields,materialIsolation:'pass'}));
