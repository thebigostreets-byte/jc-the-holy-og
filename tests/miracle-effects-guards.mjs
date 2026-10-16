import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../jc-miracle-effects.js',import.meta.url),'utf8');
const deployable=fs.readFileSync(new URL('../dist/client/jc-miracle-effects.js',import.meta.url),'utf8');
assert.equal(source,deployable,'source and deployable miracle effects must match');

class Vector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  normalize(){return this.multiplyScalar(1/(Math.hypot(this.x,this.y,this.z)||1));}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
}
class Geometry {dispose(){this.disposed=true;}}
class Material {constructor(){this.color={set(){}};this.opacity=1;}dispose(){this.disposed=true;}}
class Mesh {
  constructor(geometry,material){this.geometry=geometry;this.material=material;this.position=new Vector3();this.rotation={x:0};this.scale={set(){},setScalar(){}};this.quaternion={setFromUnitVectors(){}};this.visible=true;}
}
class InstancedMesh extends Mesh {
  constructor(geometry,material,count){super(geometry,material);this.count=count;this.instanceMatrix={setUsage(){},needsUpdate:false};}
  setMatrixAt(){}dispose(){}
}
class Matrix4 {makeTranslation(){return this;}}
class Scene {constructor(){this.children=[];}add(m){this.children.push(m);}remove(m){this.children=this.children.filter(x=>x!==m);}}
const THREE={RingGeometry:Geometry,CylinderGeometry:Geometry,BoxGeometry:Geometry,MeshBasicMaterial:Material,Mesh,InstancedMesh,Matrix4,Vector3,DynamicDrawUsage:1,DoubleSide:2,AdditiveBlending:3};
const transformed=source.replace("import * as THREE from './three.module.js';",'').replace('export function createMiracleEffects','function createMiracleEffects')+'\nthis.createMiracleEffects=createMiracleEffects;';
const context={THREE,Math,Number,Float32Array,performance:{now:()=>0}};
vm.runInNewContext(transformed,context,{filename:'jc-miracle-effects.js'});
const create=context.createMiracleEffects;
let checks=0;
function check(actual,expected,message){assert.equal(actual,expected,message);checks++;}
const scene=new Scene(),point=new Vector3(),bad=new Vector3(NaN,0,0);
let time=0;const fx=create(scene,true,()=>time);
check(fx.ring(bad),false,'ring rejects invalid center');
check(fx.ring(new Vector3(1e308,0,0)),false,'ring rejects out-of-range center');
check(fx.ring(point,0xffffff,NaN),false,'ring rejects invalid radius');
check(fx.ring(point,0xffffff,0),false,'ring rejects zero radius');
check(fx.ring(point,0xffffff,Infinity),false,'ring rejects infinite radius');
check(scene.children.length,0,'invalid rings do not allocate');
check(fx.ring(point,0xffffff,10000),true,'large finite radius is clamped');
check(fx.stats().rings,1,'ring pool remains bounded');
check(fx.ring(new Vector3(665000,0,4000000)),true,'valid UTM-scale Las Vegas coordinates remain accepted');
check(fx.beam(point,bad),false,'beam rejects invalid destination');
check(fx.beam(bad,point),false,'beam rejects invalid origin');
check(fx.beam(point,new Vector3(1e308,0,0)),false,'beam rejects out-of-range endpoint');
check(fx.beam(point,point),false,'beam rejects zero length');
check(fx.stats().beams,0,'invalid beams do not allocate');
check(fx.beam(point,new Vector3(10,20,30)),true,'valid beam still casts');
check(fx.sprite(null),false,'sprite rejects missing mesh');
check(fx.sprite({position:bad,material:new Material(),scale:{}}),false,'sprite rejects nonfinite coordinates');
check(fx.sprite({position:point,material:new Material(),scale:{}}),false,'sprite rejects missing scale API');
check(fx.sprite({position:point,material:{},scale:{setScalar(){}}}),false,'sprite rejects missing material disposal API');
check(fx.sprite(new Mesh(new Geometry(),new Material()),'not a function'),false,'sprite rejects noncallable cleanup');
check(fx.stats().sprites,0,'invalid sprites do not enter pool');
check(fx.sprite(new Mesh(new Geometry(),new Material())),true,'valid sprite still casts');
check(fx.rainAt(bad),false,'rain rejects invalid center');
check(fx.rainAt(new Vector3(1e308,0,0)),false,'rain rejects out-of-range center');
check(fx.stats().rainDrawCalls,0,'invalid rain does not allocate');
check(fx.rainAt(point),true,'valid rain still casts');
check(fx.rainAt(point),true,'rain can be recast');
check(fx.stats().rainDrawCalls,1,'rain uses one instanced mesh');
const visibleBefore=scene.children.filter(m=>m.visible).length;
fx.update(NaN);fx.update(Infinity);
check(scene.children.filter(m=>m.visible).length,visibleBefore,'nonfinite frame timestamps are ignored');
fx.update(5000);
check(scene.children.every(m=>!m.visible),true,'effects expire after delayed frame');
fx.dispose();check(scene.children.length,0,'dispose detaches all meshes');
fx.dispose();check(scene.children.length,0,'double dispose is safe');
check(fx.ring(point),false,'ring disabled after disposal');
check(fx.beam(point,new Vector3(10,0,0)),false,'beam disabled after disposal');
check(fx.rainAt(point),false,'rain disabled after disposal');
check(fx.sprite(new Mesh(new Geometry(),new Material())),false,'sprite disabled after disposal');
check(scene.children.length,0,'post-disposal casts allocate nothing');
const second=new Scene(),fallback=create(second,true,()=>NaN);
check(fallback.ring(point),true,'invalid clock uses finite fallback for ring');
check(fallback.rainAt(point),true,'invalid clock uses finite fallback for rain');
fallback.update(4000);
check(second.children.every(m=>!m.visible),true,'fallback-clock effects expire');
fallback.dispose();
const throwScene=new Scene(),throwClock=create(throwScene,true,()=>{throw new Error('broken clock');});
check(throwClock.ring(point),true,'throwing clock uses finite fallback');
check(throwClock.rainAt(point),true,'throwing clock still casts rain');
throwClock.update(4000);check(throwScene.children.every(m=>!m.visible),true,'throwing clock effects expire');
throwClock.dispose();
const cleanupScene=new Scene(),cleanupFx=create(cleanupScene,true,()=>0);
let cleanupCalls=0;
check(cleanupFx.sprite(new Mesh(new Geometry(),new Material()),()=>{cleanupCalls++;throw new Error('cleanup failure');}),true,'throwing cleanup sprite can be registered');
check(cleanupFx.sprite(new Mesh(new Geometry(),{dispose(){throw new Error('material failure');}})),true,'throwing material dispose sprite can be registered');
cleanupFx.update(2000);
check(cleanupCalls,1,'failing sprite cleanup attempted once');
check(cleanupFx.stats().sprites,0,'cleanup failures do not leave stale sprites');
cleanupFx.dispose();check(cleanupScene.children.length,0,'cleanup failures do not leak scene children');
console.log(`PASS: ${checks} behavior checks plus source/deployable parity; no WebGL device verification.`);
