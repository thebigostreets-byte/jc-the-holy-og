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
// Broken/grouped streamed meshes must not crash the entire impact pass.
const groupedMatA=material(),groupedMatB=material();
const grouped={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:[groupedMatA,groupedMatB],userData:{},matrixWorld:identity,bounds:bounds(0)};
const throwingMat=material();throwingMat.clone=()=>{throw Error('clone failed')};
const throwingMesh={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:throwingMat,userData:{},matrixWorld:identity,bounds:bounds(0)};
const corrupt=new Geometry().setAttribute('position',base.getAttribute('position'));
Object.defineProperty(corrupt,'index',{get(){throw Error('invalid streamed index')}});
const corruptMesh={isMesh:true,parent:{name:'ground_inferred'},geometry:corrupt,material:material(),userData:{},matrixWorld:identity,bounds:bounds(0)};
const goodMat=material();
const goodMesh={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:goodMat,userData:{},matrixWorld:identity,bounds:bounds(0)};
active=[grouped,throwingMesh,corruptMesh,goodMesh];
let sceneWalks=0,matrixUpdates=0;
scene.traverse=fn=>{sceneWalks++;for(const mesh of active)fn(mesh)};
scene.updateMatrixWorld=()=>{matrixUpdates++};
const second=ctx.createCraterSystem({scene},true);
time=30000;
check(second.strike({x:0,z:0})!==null,'valid impact survives corrupt neighboring meshes');
check(grouped.geometry===base,'grouped multi-material mesh remains intact');
check(grouped.material[0]===groupedMatA&&grouped.material[1]===groupedMatB,'grouped materials are not overwritten');
check(!groupedMatA.disposed&&!groupedMatB.disposed,'grouped materials are not disposed');
check(!grouped.userData.jcCraterBase,'grouped mesh is not tracked as carved');
check(throwingMesh.material===throwingMat,'failed clone leaves original material intact');
check(throwingMesh.geometry===base,'failed clone leaves original geometry intact');
check(!throwingMesh.userData.jcCraterBase,'failed clone does not leave tracked state');
check(corruptMesh.geometry===corrupt,'bad streamed geometry is isolated');
check(!corruptMesh.userData.jcCraterBase,'bad streamed geometry does not leave tracked state');
check(goodMesh.geometry!==base,'later healthy mesh still receives crater');
check(goodMesh.material!==goodMat,'later healthy mesh gets independent material');
const transient=goodMesh.geometry;
const walksBefore=sceneWalks,matricesBefore=matrixUpdates;
time=50000;second.update(time);
check(second.records.length===0,'second impact expires');
check(goodMesh.geometry===base,'expiry restores healthy mesh original geometry');
check(transient.disposed,'expiry frees healthy mesh temporary geometry');
check(sceneWalks===walksBefore,'empty-crater expiry skips full scene traversal');
check(matrixUpdates===matricesBefore,'empty-crater expiry skips world-matrix update');
handlers.get('jc-tiles-loaded')();
check(sceneWalks===walksBefore,'empty-crater tile event skips scene traversal');
second.dispose();
check(handlers.size===0,'second system disposal clears listeners');
// Regression: a streaming tile may reuse the Mesh while rebinding shared assets.
const reboundBase=new Geometry().setAttribute('position',base.getAttribute('position'));
const reboundMat=material();
const rebound={isMesh:true,parent:{name:'ground_inferred'},geometry:reboundBase,material:reboundMat,userData:{},matrixWorld:identity,bounds:bounds(0)};
active=[rebound];
const reboundSystem=ctx.createCraterSystem({scene},true);
time=60000;
check(reboundSystem.strike({x:0,z:0})!==null,'rebound impact accepted');
const obsoleteGeo=rebound.geometry,obsoleteMat=rebound.material;
const freshBase=new Geometry().setAttribute('position',base.getAttribute('position'));
const freshMat=material();
rebound.geometry=freshBase;rebound.material=freshMat;
handlers.get('jc-tiles-loaded')();
check(obsoleteGeo.disposed&&obsoleteMat.disposed,'old crater-owned resources released after tile rebind');
check(!freshBase.disposed&&!freshMat.disposed,'new shared tile assets not disposed');
check(rebound.userData.jcCraterBase===freshBase,'rebound geometry adopted as base');
check(rebound.userData.jcCraterMaterial===freshMat,'rebound material adopted as base');
check(rebound.geometry!==freshBase&&rebound.material!==freshMat,'rebound tile is re-carved');
reboundSystem.dispose();
check(rebound.geometry===freshBase&&rebound.material===freshMat,'rebound resources restored on disposal');
// Regression: public crater records can be corrupted by HUD/debug integrations.
const integrity=ctx.createCraterSystem({scene},true);
time=70000;
check(integrity.strike({x:0,z:0})!==null,'valid impact before corruption');
integrity.records.push(null,{id:100,x:NaN,z:0,radius:12,depth:3,expires:90000});
handlers.get('jc-roads-loaded')();
check(integrity.records.length===1,'invalid records removed before tile processing');
check(rebound.userData.jcCraterBase===freshBase,'healthy terrain remains carved after record cleanup');
for(let i=0;i<9;i++)integrity.records.push({id:100+i,x:0,z:0,radius:12,depth:3,expires:90000});
handlers.get('jc-tiles-loaded')();
check(integrity.records.length===4,'external record injection respects mobile cap');
check(integrity.records[0].id===105,'newest valid records retained');
// Regression: a broken clock cannot create immortal impact records.
const recordCount=integrity.records.length;
for(const badTime of [NaN,Infinity,-1,Number.MAX_SAFE_INTEGER]){
 time=badTime;
 check(integrity.strike({x:0,z:0})===null,'invalid clock reading rejects impact');
 check(integrity.records.length===recordCount,'invalid clock reading does not enqueue impact');
}
time=95000;integrity.update(time);
check(integrity.records.length===0,'valid impacts still expire after corrupt clock readings');
integrity.dispose();
check(handlers.size===0,'record-integrity system unregisters listeners');
// Regression: public impact IDs must remain unique even after external injection.
const duplicateSystem=ctx.createCraterSystem({scene:{updateMatrixWorld(){},traverse(){} }},true);
const newest={id:42,x:1,z:1,radius:12,depth:3,expires:110000};
duplicateSystem.records.push({id:42,x:0,z:0,radius:12,depth:3,expires:110000},newest);
duplicateSystem.update(96000);
check(duplicateSystem.records.length===1&&duplicateSystem.records[0]===newest,'duplicate public crater IDs keep newest valid entry');
check(duplicateSystem.strike({x:0,z:0}).id===43,'next impact ID advances beyond external record IDs');
duplicateSystem.dispose();
// Regression: changes to existing crater geometry invalidate the mesh cache.
const mutableMesh={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:material(),userData:{},matrixWorld:identity,bounds:bounds(0)};
const mutableScene={updateMatrixWorld(){},traverse(fn){fn(mutableMesh)}};
const mutableSystem=ctx.createCraterSystem({scene:mutableScene},true);
time=97000;mutableSystem.strike({x:0,z:0});
const oldMutableGeo=mutableMesh.geometry,oldMutableKey=mutableMesh.userData.craterKey;
mutableSystem.records[0].x=1;
handlers.get('jc-tiles-loaded')();
check(mutableMesh.geometry!==oldMutableGeo&&oldMutableGeo.disposed,'changed crater coordinates trigger tile-event recarve');
check(mutableMesh.userData.craterKey!==oldMutableKey,'crater cache key includes mutable shape');
const nextMutableGeo=mutableMesh.geometry;
mutableSystem.records[0].depth=1.8;
mutableSystem.update(97500);
check(mutableMesh.geometry!==nextMutableGeo,'valid crater edit triggers recarve on update');
const thirdMutableGeo=mutableMesh.geometry;
mutableSystem.records.push({id:90,x:1,z:1,radius:12,depth:2,expires:110000});
mutableSystem.update(97600);
check(mutableMesh.geometry!==thirdMutableGeo,'externally appended valid crater applies on update');
mutableSystem.dispose();
// Regression: reject malformed terrain indices and world-space positions.
const badVertex=new Geometry().setAttribute('position',new Attr(new Float32Array([NaN,0,0,100,0,0,0,0,100]),3));
assert.throws(()=>ctx.carveGeometry(badVertex,identity,[],10),/Nonfinite crater vertex position/);checks++;
const badIndex=new Geometry().setAttribute('position',base.getAttribute('position'));
badIndex.index={count:3,getX(i){return i===1?99:i}};
assert.throws(()=>ctx.carveGeometry(badIndex,identity,[],10),/Invalid crater vertex index/);checks++;
// Regression: optional UV/color corruption must not reach the GPU as NaN.
const badTint=new Geometry().setAttribute('position',base.getAttribute('position'));
badTint.setAttribute('uv',new Attr(new Float32Array([NaN,Infinity,.4,.5,.6,.7]),2));
badTint.setAttribute('color',new Attr(new Float32Array([Infinity,NaN,.25,.2,.4,.6,.7,.8,.9]),3));
const sanitized=ctx.carveGeometry(badTint,identity,[],10);
check(Array.from(sanitized.getAttribute('uv').array).every(Number.isFinite),'invalid UVs use finite fallback');
check(Array.from(sanitized.getAttribute('color').array).every(Number.isFinite),'invalid color channels use finite fallback');
check(sanitized.getAttribute('color').getZ(0)===.25,'valid tint channel preserved');
// Regression: shutdown remains safe if streamed scene traversal fails.
const shutdownMesh={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:material(),userData:{},matrixWorld:identity,bounds:bounds(0)};
let brokenScene=false;
const shutdownScene={updateMatrixWorld(){},traverse(fn){if(brokenScene)throw Error('broken scene graph');fn(shutdownMesh)}};
const shutdownSystem=ctx.createCraterSystem({scene:shutdownScene},true);
time=98000;shutdownSystem.strike({x:0,z:0});
const shutdownBase=shutdownMesh.userData.jcCraterBase,shutdownCarved=shutdownMesh.geometry;
brokenScene=true;
assert.doesNotThrow(()=>shutdownSystem.dispose());checks++;
check(shutdownMesh.geometry===shutdownBase&&shutdownCarved.disposed,'shutdown restores and frees owned geometry despite scene failure');
check(handlers.size===0,'shutdown releases listeners after traversal failure');
console.log(`PASS: ${checks} crater resource-budget assertions`);
