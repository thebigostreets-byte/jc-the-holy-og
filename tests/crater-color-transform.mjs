import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../crater-system.js',import.meta.url),'utf8');
const deployed=readFileSync(new URL('../dist/client/crater-system.js',import.meta.url),'utf8');
let checks=0;
function check(value,message){assert.ok(value,message);checks++}
check(source===deployed,'source and deployable crater modules match');
class Vector3 {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z} fromBufferAttribute(a,i){this.x=a.getX(i);this.y=a.getY(i);this.z=a.getZ(i);return this} applyMatrix4(){return this}}
class Attr {constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize} getX(i){return this.array[i*this.itemSize]} getY(i){return this.array[i*this.itemSize+1]} getZ(i){return this.array[i*this.itemSize+2]} getW(i){return this.array[i*this.itemSize+3]}}
class Geometry {constructor(){this.attrs={};this.index=null;this.disposed=false} setAttribute(k,v){this.attrs[k]=v;return this} getAttribute(k){return this.attrs[k]} computeVertexNormals(){} computeBoundingSphere(){} computeBoundingBox(){} dispose(){this.disposed=true}}
class Box3 {setFromObject(mesh){this.min=mesh.bounds.min;this.max=mesh.bounds.max;return this}}
const THREE={Vector3,Float32BufferAttribute:Attr,BufferAttribute:Attr,BufferGeometry:Geometry,Box3};
const handlers=new Map();
const window={addEventListener(k,fn){handlers.set(k,fn)},removeEventListener(k){handlers.delete(k)}};
const ctx=vm.createContext({THREE,window,performance:{now:()=>1000},Number,Math,Array,Float32Array});
vm.runInContext(source.replace(/^import .*\n/m,'').replace(/export /g,''),ctx);
const base=new Geometry().setAttribute('position',new Attr(new Float32Array([0,0,0,100,0,0,0,0,100]),3));
const identity={clone(){return {invert(){return this}}}};
const c={x:0,z:0,radius:1,depth:3.2};
const rgb=new Geometry().setAttribute('position',base.getAttribute('position'))
 .setAttribute('color',new Attr(new Float32Array([.25,.5,.75, .25,.5,.75, .25,.5,.75]),3));
const carvedRGB=ctx.carveGeometry(rgb,identity,[c],1).getAttribute('color');
check(carvedRGB.itemSize===3,'RGB color format preserved');
check(Math.abs(carvedRGB.getX(0)-.08)<1e-5,'existing red tint darkened, not replaced');
check(Math.abs(carvedRGB.getY(0)-.16)<1e-5,'existing green tint darkened, not replaced');
check(Math.abs(carvedRGB.getZ(0)-.24)<1e-5,'existing blue tint darkened, not replaced');
check(Math.abs(carvedRGB.getX(1)-.25)<1e-5,'unaffected vertex color preserved');
const rgba=new Geometry().setAttribute('position',base.getAttribute('position'))
 .setAttribute('color',new Attr(new Float32Array([.25,.5,.75,.2, .25,.5,.75,.4, .25,.5,.75,.6]),4));
const carvedRGBA=ctx.carveGeometry(rgba,identity,[c],1).getAttribute('color');
check(carvedRGBA.itemSize===4,'RGBA format preserved');
check(Math.abs(carvedRGBA.getW(0)-.2)<1e-5,'impacted vertex alpha preserved');
check(Math.abs(carvedRGBA.getW(2)-.6)<1e-5,'unaffected vertex alpha preserved');
const singular={elements:Array(16).fill(0),determinant(){return 0},clone(){return {invert(){return this}}}};
const nonfinite={elements:Array(16).fill(1).map((v,i)=>i===4?NaN:v),determinant(){return 1},clone(){return {invert(){return this}}}};
assert.throws(()=>ctx.carveGeometry(base,singular,[c],1),/Invalid crater mesh world transform/);checks++;
assert.throws(()=>ctx.carveGeometry(base,nonfinite,[c],1),/Invalid crater mesh world transform/);checks++;
const mat=()=>({vertexColors:false,clone(){return mat()},dispose(){}});
const bounds={min:{x:0,z:0},max:{x:2,z:2}};
const bad={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:mat(),userData:{},matrixWorld:singular,bounds};
const good={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:mat(),userData:{},matrixWorld:identity,bounds};
const scene={updateMatrixWorld(){},traverse(fn){for(const mesh of [bad,good])fn(mesh)}};
const system=ctx.createCraterSystem({scene},true);
check(system.strike({x:0,z:0})!==null,'impact accepted despite singular neighbor');
check(bad.geometry===base,'singular tile not corrupted');
check(!bad.userData.jcCraterBase,'singular tile not tracked');
check(good.geometry!==base,'healthy neighboring tile still deforms');
system.dispose();
check(good.geometry===base,'healthy tile restored on shutdown');
check(handlers.size===0,'tile listeners removed on shutdown');
// Grouped geometry with one material still uses draw-range groups. Do not
// silently discard those groups while creating nonindexed crater triangles.
const groupedBase=new Geometry().setAttribute('position',base.getAttribute('position'));
groupedBase.groups=[{start:0,count:3,materialIndex:0}];
const groupedMaterial=mat();
const grouped={isMesh:true,parent:{name:'ground_inferred'},geometry:groupedBase,material:groupedMaterial,userData:{},matrixWorld:identity,bounds};
const healthyGroupedNeighbor={isMesh:true,parent:{name:'ground_inferred'},geometry:base,material:mat(),userData:{},matrixWorld:identity,bounds};
const groupedScene={updateMatrixWorld(){},traverse(fn){for(const mesh of [grouped,healthyGroupedNeighbor])fn(mesh)}};
const groupedSystem=ctx.createCraterSystem({scene:groupedScene},true);
check(groupedSystem.strike({x:0,z:0})!==null,'grouped-terrain impact accepted');
check(grouped.geometry===groupedBase,'grouped single-material geometry not rewritten');
check(grouped.material===groupedMaterial,'grouped terrain original material preserved');
check(!grouped.userData.jcCraterBase,'grouped terrain not tracked as deformed');
check(healthyGroupedNeighbor.geometry!==base,'healthy ungrouped neighbor still receives impact');
groupedSystem.dispose();
check(healthyGroupedNeighbor.geometry===base,'ungrouped neighbor restored after grouped impact');
console.log(`PASS: ${checks} crater color and transform assertions`);
