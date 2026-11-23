import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../landmark-variants.js',import.meta.url),'utf8');
const dist=readFileSync(new URL('../dist/client/landmark-variants.js',import.meta.url),'utf8');
assert.equal(source,dist,'source and deployed landmark runtime must match');
const start=source.indexOf(' const luxorSamplers=new WeakMap();');
const end=source.indexOf(' // Retain the last genuine height',start);
assert.ok(start>=0&&end>start,'real Luxor sampling implementation exists');
const snippet=source.slice(start,end);
const makeSampler=tile=>{
 const position=tile.children[0]?.children[0]?.geometry?.getAttribute('position');
 return position?()=>position.height:null;
};
const context={
 game:{loaded:new Map()},
 pyramid:{position:{x:0,z:0}},
 terrainSampler:makeSampler,
 NaN,Number,WeakMap
};
const sample=vm.runInNewContext(snippet+'\nsampleLuxorTerrain',context);
const tile={userData:{},children:[{name:'ground_inferred',children:[]}]};
context.game.loaded.set('luxor',tile);
assert.ok(Number.isNaN(sample()),'unhydrated terrain is not sea level');
const attributeA={height:44},attributeB={height:91};
const mesh={isMesh:true,geometry:{getAttribute:()=>attributeA}};
tile.children[0].children.push(mesh);
assert.equal(sample(),44,'terrain hydration recovers');
mesh.geometry={getAttribute:()=>attributeB};
assert.equal(sample(),91,'replaced geometry invalidates cached sampler');
tile.userData.generatedFallback=true;
assert.ok(Number.isNaN(sample()),'fallback is never treated as real terrain');
tile.userData.generatedFallback=false;
context.game.loaded.clear();
assert.ok(Number.isNaN(sample()),'evicted terrain does not fabricate elevation');
context.game.loaded.set('luxor',tile);
assert.equal(sample(),91,'reloaded terrain is sampled again');
console.log('Luxor terrain hydration, geometry replacement, fallback, eviction and source/dist parity passed');
