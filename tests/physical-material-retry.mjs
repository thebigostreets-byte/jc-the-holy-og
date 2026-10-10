import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../physical-building-materials.js',import.meta.url),'utf8');
const start=source.indexOf('export function loadPhysicalMaterials()');
const end=source.indexOf('export function buildingHash(',start);
assert(start>=0&&end>start,'physical-material loader must be present');
const loader=source.slice(start,end).replace('export function','function');
const images=[],timers=new Map();let nextTimer=0,canvases=0;
class FakeImage{constructor(){images.push(this);}set src(value){this.url=value;}}
class FakeTexture{constructor(canvas){this.canvas=canvas;}}
const ctx={Image:FakeImage,document:{createElement:()=>{canvases++;return {getContext:()=>({drawImage(){}})};}},
 THREE:{CanvasTexture:FakeTexture,SRGBColorSpace:'srgb',NoColorSpace:'none',RepeatWrapping:'repeat'},
 setTimeout:(fn)=>{const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout:(id)=>timers.delete(id),Error,Promise};
vm.createContext(ctx);
vm.runInContext(`let pending;${loader}\nglobalThis.loadPhysicalMaterials=loadPhysicalMaterials;`,ctx);
const load=()=>ctx.loadPhysicalMaterials();
const first=load();assert.equal(images.length,1);images[0].onerror();await assert.rejects(first,/Materials unavailable/);
const second=load();assert.notEqual(second,first);assert.equal(images.length,2,'failed material load is retryable');
images[1].onload();const textures=await second;assert.equal(textures.length,6);
assert.equal(await load(),textures,'successful material load stays cached');assert.equal(images.length,2);
const lateImages=[],lateTimers=new Map();let lateNext=0,lateCanvases=0;
class LateImage{constructor(){lateImages.push(this);}set src(v){this.url=v;}}
const lateCtx={Image:LateImage,document:{createElement:()=>{lateCanvases++;return {getContext:()=>({drawImage(){}})};}},
 THREE:ctx.THREE,setTimeout:fn=>{const id=++lateNext;lateTimers.set(id,fn);return id;},clearTimeout:id=>lateTimers.delete(id),Error,Promise};
vm.createContext(lateCtx);vm.runInContext(`let pending;${loader}\nglobalThis.loadPhysicalMaterials=loadPhysicalMaterials;`,lateCtx);
const timeoutPromise=lateCtx.loadPhysicalMaterials();const expired=lateImages[0];
for(const timer of [...lateTimers.values()])timer();await assert.rejects(timeoutPromise,/timed out/);
expired.onload();expired.onerror();assert.equal(lateCanvases,0,'late image load must not allocate textures after timeout');
const recovery=lateCtx.loadPhysicalMaterials();assert.equal(lateImages.length,2,'timeout allows a fresh retry');
lateImages[1].onload();assert.equal((await recovery).length,6);
console.log('PASS: physical materials retry, cache success, suppress late events');
