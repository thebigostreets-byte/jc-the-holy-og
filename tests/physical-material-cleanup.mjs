import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../physical-building-materials.js',import.meta.url),'utf8');
const fn=src.slice(src.indexOf('export function loadPhysicalMaterials()'),src.indexOf('export function buildingHash(')).replace('export function','function');
const images=[],textures=[];let index=0;
class Img{constructor(){images.push(this)}set src(v){}}
class Tex{constructor(){this.disposed=false;textures.push(this)}dispose(){this.disposed=true}}
const context={Image:Img,THREE:{CanvasTexture:Tex},document:{createElement(){return {getContext(){return {drawImage(){if(++index===3)throw Error('atlas conversion failed')}}}}}},setTimeout:()=>1,clearTimeout(){},Error,Promise};
vm.createContext(context);vm.runInContext('let pending;'+fn+';globalThis.load=loadPhysicalMaterials;',context);
const task=context.load();images[0].onload();await assert.rejects(task,/atlas conversion failed/);
assert.equal(textures.length,2);
assert.ok(textures.every(t=>t.disposed),'partial atlas textures must be disposed');
console.log('PASS: partial atlas failure releases allocated textures');
