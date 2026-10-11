import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crater-system.js',import.meta.url),'utf8');
const deployed=readFileSync(new URL('../dist/client/crater-system.js',import.meta.url),'utf8');
let checks=0;
function check(condition,message){assert.ok(condition,message);checks++}
check(source===deployed,'source and deployable modules must match');
class Vec3 {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 fromBufferAttribute(attr,i){this.x=attr.getX(i);this.y=attr.getY(i);this.z=attr.getZ(i);return this;}
 applyMatrix4(){return this;}
}
class Attr {
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;}
 getX(i){return this.array[i*this.itemSize]}
 getY(i){return this.array[i*this.itemSize+1]}
 getZ(i){return this.array[i*this.itemSize+2]}
}
class Geometry {
 constructor(){this.attrs={};this.index=null;this.disposed=false;}
 setAttribute(k,v){this.attrs[k]=v;return this;}
 getAttribute(k){return this.attrs[k]}
 computeVertexNormals(){}
 computeBoundingSphere(){}
 computeBoundingBox(){}
 dispose(){this.disposed=true}
}
class Box3 {
 setFromObject(mesh){this.min=mesh.bounds.min;this.max=mesh.bounds.max;return this;}
}
const THREE={Vector3:Vec3,Float32BufferAttribute:Attr,BufferAttribute:Attr,BufferGeometry:Geometry,Box3};
const handlers=new Map();
const win={addEventListener(k,f){handlers.set(k,f)},removeEventListener(k){handlers.delete(k)}};
let time=1000;
const ctx=vm.createContext({THREE,window:win,performance:{now:()=>time},Number,Math,Array,Float32Array});
vm.runInContext(source.replace(/^import .*\n/m,'').replace(/export /g,''),ctx);
const base=new Geometry().setAttribute('position',new Attr(new Float32Array([0,0,0,100,0,0,0,0,100]),3));
const identity={clone(){return {invert(){return this}}}};
const c={x:0,z:0,radius:1000,depth:3.2};
const limited=ctx.carveGeometry(base,identity,[c],10);
check(limited.getAttribute('position').count/3<=10,'bounded tessellation never exceeds ten triangles');
check(limited.getAttribute('position').count/3>1,'nearby triangle is subdivided');
const unlimited=ctx.carveGeometry(base,identity,[c],18000);
check(unlimited.getAttribute('position').count>limited.getAttribute('position').count,'larger budget preserves detail');
const zeroBudget=ctx.carveGeometry(base,identity,[c],1);
check(zeroBudget.getAttribute('position').count===3,'budget below base count leaves original triangle intact');
function material(){return {vertexColors:false,disposed:false,clone(){return material()},dispose(){this.disposed=true}}}
const sharedMaterial=material();
const bounds=(x)=>({min:{x,z:0},max:{x:x+2,z:2}});
const mesh1={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:sharedMaterial,userData:{},matrixWorld:identity,bounds:bounds(0)};
const mesh2={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:sharedMaterial,userData:{},matrixWorld:identity,bounds:bounds(2000)};
let active=[mesh1,mesh2];
const scene={updateMatrixWorld(){},traverse(fn){for(const mesh of active)fn(mesh)}};
const system=ctx.createCraterSystem({scene},true);
const record=system.strike({x:0,z:0});
check(!!record,'valid crater accepted');
check(mesh1.geometry!==base,'impact mesh receives a generated geometry');
check(mesh1.material!==sharedMaterial,'impact mesh receives an isolated material');
check(!base.disposed,'shared original geometry remains undisposed');
check(mesh2.geometry===base,'unaffected mesh retains shared geometry');
check(mesh2.material===sharedMaterial,'unaffected mesh retains shared material');
check(sharedMaterial.vertexColors===false,'shared material settings remain unchanged');
check(mesh1.material.vertexColors===true,'crater material enables vertex shading');
check(mesh1.geometry.getAttribute('position').count/3<=6000,'mobile crater budget enforced');
const activeGeometry=mesh1.geometry,activeMaterial=mesh1.material;
time=20000;system.update(time);
check(system.records.length===0,'expired crater record cleared');
check(mesh1.geometry===base,'expiration restores exact original geometry');
check(mesh1.material===sharedMaterial,'expiration restores exact original material');
check(activeGeometry.disposed,'expiration disposes temporary geometry');
check(activeMaterial.disposed,'expiration disposes temporary material');
check(mesh1.userData.jcCraterBase===undefined,'expiration releases original geometry reference');
check(mesh1.userData.jcCraterMaterial===undefined,'expiration releases original material reference');
check(!base.disposed,'expiration does not dispose shared geometry');
check(!sharedMaterial.disposed,'expiration does not dispose shared material');
check(handlers.size===2,'two streaming event handlers installed');
// Streamed-out tiles must not retain temporary geometry/material references.
time=20001;
system.strike({x:0,z:0});
const detachedGeometry=mesh1.geometry,detachedMaterial=mesh1.material;
active=[mesh2];
handlers.get('jc-tiles-loaded')();
check(mesh1.geometry===base,'streaming event restores detached tile geometry');
check(mesh1.material===sharedMaterial,'streaming event restores detached tile material');
check(detachedGeometry.disposed,'streamed-out geometry is disposed');
check(detachedMaterial.disposed,'streamed-out material is disposed');
// Also verify disposal works without a streaming event.
active=[mesh1,mesh2];
system.strike({x:0,z:0});
const detachedAtDispose=mesh1.geometry;
active=[mesh2];
system.dispose();
check(mesh1.geometry===base,'dispose restores tracked tile no longer in scene');
check(detachedAtDispose.disposed,'dispose frees detached tile geometry');
check(handlers.size===0,'dispose removes event handlers');
check(!base.disposed,'dispose does not destroy shared geometry');
console.log(`PASS: ${checks} crater resource-budget assertions`);
