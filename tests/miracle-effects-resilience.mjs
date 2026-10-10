import assert from 'node:assert/strict';
import fs from 'node:fs';

// Self-contained Three.js stand-ins exercise the actual runtime module without
// requiring the separately hydrated vendor bundle on a CI checkout.
class Vector3 {
  constructor(x=0,y=0,z=0){this.set(x,y,z);}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){return this.set(v.x,v.y,v.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this;}
  normalize(){return this.multiplyScalar(1/(Math.hypot(this.x,this.y,this.z)||1));}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
}
class Geometry {constructor(){this.disposals=0;}dispose(){this.disposals++;}}
class Material {
  constructor(){this.opacity=1;this.disposals=0;this.color={set(value){this.value=value;}};}
  dispose(){this.disposals++;}
}
class Mesh {
  constructor(geometry,material){this.geometry=geometry;this.material=material;this.position=new Vector3();this.rotation={x:0};this.scale={x:1,y:1,z:1,setScalar(n){this.x=this.y=this.z=n;},set(x,y,z){this.x=x;this.y=y;this.z=z;}};this.quaternion={setFromUnitVectors(){}};this.visible=true;}
}
class InstancedMesh extends Mesh {
  constructor(g,m,count){super(g,m);this.count=count;this.instanceMatrix={setUsage(){},needsUpdate:false};this.matrices=[];this.disposals=0;}
  setMatrixAt(i,m){this.matrices[i]=m.coords.slice();}
  dispose(){this.disposals++;}
}
class Matrix4 {makeTranslation(x,y,z){this.coords=[x,y,z];return this;}}
const THREE={RingGeometry:Geometry,CylinderGeometry:Geometry,BoxGeometry:Geometry,MeshBasicMaterial:Material,Mesh,InstancedMesh,Matrix4,Vector3,DoubleSide:2,AdditiveBlending:3,DynamicDrawUsage:4};
const source=fs.readFileSync(new URL('../jc-miracle-effects.js',import.meta.url),'utf8');
const dist=fs.readFileSync(new URL('../dist/client/jc-miracle-effects.js',import.meta.url),'utf8');
assert.equal(source,dist,'deployed module must exactly match source');
globalThis.__JC_TEST_THREE__=THREE;
const moduleSource=source.replace("import * as THREE from './three.module.js';",'const THREE = globalThis.__JC_TEST_THREE__;');
const {createMiracleEffects}=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
const scene={children:[],add(x){this.children.push(x);},remove(x){const i=this.children.indexOf(x);if(i>=0)this.children.splice(i,1);}};
let now=100;
const fx=createMiracleEffects(scene,true,()=>now);
const point=new Vector3(1,2,3),target=new Vector3(4,6,3);
assert.equal(fx.ring({x:NaN,y:0,z:0}),false,'reject nonfinite ring positions');
assert.equal(fx.beam(point,{x:Infinity,y:0,z:0}),false,'reject nonfinite beam destinations');
assert.equal(fx.rainAt({x:0,y:0,z:NaN}),false,'reject nonfinite rain centers');
assert.deepEqual(fx.stats(),{rings:0,beams:0,sprites:0,rainDrawCalls:0},'bad effects allocate nothing');
assert.equal(fx.ring(point,0xffffff,Infinity),true,'bad ring radius uses bounded fallback');
assert.equal(scene.children[0].scale.x,1);
assert.equal(fx.beam(point,target,0xffe4a4,{width:1.35,duration:180}),true);
const beam=scene.children[1];
assert.equal(beam.scale.x,1.35,'beam width from gameplay options is honored');
assert.equal(beam.scale.z,1.35);
fx.update(279);assert.equal(beam.visible,true);
fx.update(280);assert.equal(beam.visible,false,'custom duration expires exactly on time');
fx.beam(point,target,0xffffff,{width:-3,duration:Infinity});
assert.equal(beam.scale.x,.23,'malformed width falls back safely');
fx.update(400);assert.equal(beam.visible,true,'invalid duration falls back to 360ms');
fx.update(NaN);assert.equal(beam.visible,true,'invalid update time is ignored');
fx.update(0);assert.equal(beam.visible,true,'clock rollback does not instantly expire beam');
fx.update(361);assert.equal(beam.visible,false,'rollback rebases beam expiration');
now=Infinity;fx.ring(point);fx.update(100);assert.equal(scene.children[0].visible,true,'invalid clock does not corrupt ring start');
now=120;fx.rainAt(point);const rain=scene.children.at(-1);
assert.equal(rain.count,64,'mobile rain uses limited instances');
fx.update(150);assert.equal(rain.instanceMatrix.needsUpdate,true,'rain instance positions update');
fx.update(50);assert.equal(rain.visible,true,'rain survives clock rollback');
fx.update(3050);assert.equal(rain.visible,false,'rain still expires after rollback');
for(let i=0;i<200;i++){fx.ring(point);fx.beam(point,target);}
assert.equal(fx.stats().rings,18,'ring pool remains bounded after repeated casts');
assert.equal(fx.stats().beams,8,'beam pool remains bounded after repeated casts');
let cleaned=0;
const priorWarn=console.warn;console.warn=()=>{};
for(let i=0;i<10;i++){
  const sprite=new Mesh(null,new Material());sprite.position.y=2;
  assert.equal(fx.sprite(sprite,()=>{cleaned++;if(i===0)throw Error('expected cleanup failure');}),true);
}
assert.equal(fx.stats().sprites,6,'sprite pool stays bounded on mobile');
assert.equal(cleaned,4,'evicted sprite callbacks run despite a throwing callback');
fx.clear();console.warn=priorWarn;assert.equal(cleaned,10,'all remaining sprite callbacks run');
fx.dispose();fx.dispose();
assert.equal(scene.children.length,0,'disposal detaches all meshes');
assert.equal(fx.ring(point),false,'no new rings after disposal');
assert.equal(fx.beam(point,target),false,'no new beams after disposal');
assert.equal(fx.rainAt(point),false,'no rain allocation after disposal');
assert.equal(fx.sprite(new Mesh(null,new Material())),false,'no sprites after disposal');
fx.update(99999);fx.clear();
assert.equal(scene.children.length,0,'post-disposal calls are safe');
console.log('PASS: 10 miracle effect safety contracts, source/dist parity, mobile budgets and lifecycle checks.');
