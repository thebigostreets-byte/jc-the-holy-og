import assert from 'node:assert/strict';
import * as THREE from '../three.module.js';
import {buildingViewIndex,createBuildingImpostors} from '../building-impostors.js';

for(let i=0;i<8;i++){const a=i*Math.PI/4;assert.equal(buildingViewIndex(Math.sin(a),.15,Math.cos(a)),i);}
assert.equal(buildingViewIndex(0,3,1),8);
assert.equal(buildingViewIndex(0,1,1),-1);
assert.equal(buildingViewIndex(Math.sin(Math.PI/8+.02),0,Math.cos(Math.PI/8+.02),0),0,'angle hysteresis');

function setup(mobile=false){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,50,1200);
  const parent=new THREE.Group();parent.userData.jcThemeApplied=true;scene.add(parent);
  const buildings=new Map(),chunks=new Map();
  for(let i=0;i<16;i++){
    const ob=new THREE.Group();ob.userData={buildingId:String(i),heightMetres:60};
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(20,60,20),new THREE.MeshStandardMaterial({color:0x999999}));
    mesh.position.y=30;ob.add(mesh);parent.add(ob);buildings.set(String(i),ob);
  }
  scene.updateMatrixWorld(true);
  const state={target:null,viewport:new THREE.Vector4(0,0,100,100),scissor:new THREE.Vector4(1,2,90,90),test:false,color:new THREE.Color(0x123456),alpha:1,renders:0,throw:false};
  const renderer={toneMapping:THREE.ACESFilmicToneMapping,autoClear:false,
    getRenderTarget:()=>state.target,setRenderTarget:t=>state.target=t,
    getClearColor:c=>c.copy(state.color),getClearAlpha:()=>state.alpha,setClearColor:(c,a)=>{state.color.set(c);state.alpha=a;},
    getViewport:v=>v.copy(state.viewport),setViewport:(...v)=>v[0]?.isVector4?state.viewport.copy(v[0]):state.viewport.set(...v),
    getScissor:v=>v.copy(state.scissor),setScissor:(...v)=>v[0]?.isVector4?state.scissor.copy(v[0]):state.scissor.set(...v),
    getScissorTest:()=>state.test,setScissorTest:b=>state.test=b,
    render:()=>{if(state.throw)throw Error('simulated GPU failure');state.renders++;}};
  const api=createBuildingImpostors({scene,camera,renderer,buildings,chunks},{mobile});
  return {api,scene,camera,renderer,buildings,chunks,state};
}
for(const mobile of [false,true]){
  const t=setup(mobile),limit=mobile?4:8;
  for(let f=0;f<limit*9+2;f++)t.api.update(f*200,.016,true);
  assert.equal(t.api.stats().ready,limit);assert.equal(t.state.renders,limit*9);
  assert.equal(t.api.stats().visible,limit);assert.equal(t.api.stats().viewsPerBuilding,9);
  assert.deepEqual(t.state.viewport.toArray(),[0,0,100,100]);assert.deepEqual(t.state.scissor.toArray(),[1,2,90,90]);
  assert.equal(t.state.target,null);assert.equal(t.state.test,false);assert.equal(t.renderer.autoClear,false);
  assert.equal(t.state.color.getHex(),0x123456);assert.equal(t.renderer.toneMapping,THREE.ACESFilmicToneMapping);
  const base=(limit*9+2)*200;
  t.camera.position.set(0,40,20);t.api.update(base,.016,true);
  assert.equal(t.api.stats().visible,0,'near camera restores geometry');
  t.camera.position.set(0,50,1200);t.api.update(base+10,.016,true);
  const destroyed=t.buildings.get('0');destroyed.children[0].visible=false;t.chunks.set('0',[]);t.api.update(base+20,.016,true);
  assert.equal(destroyed.visible,true);assert.equal(destroyed.children[0].visible,false,'destruction is not undone');
  const edited=t.buildings.get('1');edited.children[0].material.color.set(0xff0000);t.api.update(base+2000,.016,true);
  assert.equal(edited.visible,true,'edited building immediately returns to mesh');
  t.api.update(base+2010,.016,false);assert.equal(t.api.stats().visible,0,'editor always uses mesh');
  t.api.dispose();assert.equal(t.api.stats().buildings,0);
}
const busy=setup();busy.api.update(0,.03,true);assert.equal(busy.state.renders,0,'over-budget frames defer building captures');busy.api.update(100,.016,true);assert.equal(busy.state.renders,1,'building captures resume when the frame budget recovers');busy.api.dispose();
const failure=setup();failure.state.throw=true;
const warn=console.warn;console.warn=()=>{};failure.api.update(0,.016,true);console.warn=warn;
assert.equal(failure.api.stats().failed,true);assert.equal(failure.state.target,null);
assert.ok([...failure.buildings.values()].every(ob=>ob.visible));failure.api.dispose();
console.log('Building views passed 9 directions, budgets, near/editor fallback, destruction, edits, and render-state recovery. Visual GPU verification remains separate.');
