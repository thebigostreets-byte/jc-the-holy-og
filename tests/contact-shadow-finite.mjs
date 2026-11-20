import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const source=readFileSync(new URL('../character-contact.js',import.meta.url),'utf8');
const events=[];
class CanvasTexture { dispose(){events.push('texture-disposed')} }
class PlaneGeometry { dispose(){events.push('geometry-disposed')} }
class MeshBasicMaterial { constructor(){this.opacity=1} dispose(){events.push('material-disposed')} }
class Mesh { constructor(geometry,material){this.geometry=geometry;this.material=material;this.rotation={};this.position={set:(...args)=>{this.xyz=args}};this.scale={setScalar:(n)=>{this.size=n}};this.visible=true} }
const THREE={CanvasTexture,PlaneGeometry,MeshBasicMaterial,Mesh};
const factory=source.replace("import * as THREE from './three.module.js';",'const THREE=globalThis.__contactTestThree;');
globalThis.__contactTestThree=THREE;
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
const {createCharacterContact}=await import('data:text/javascript,'+encodeURIComponent(factory));
test('contact shadow handles finite and malformed gameplay physics',()=>{
 const scene={add(s){this.shadow=s},remove(s){assert.equal(s,this.shadow)}};
 const contact=createCharacterContact(scene),s=scene.shadow;
 contact.update({position:{x:4,z:9}},2,10,true);
 assert.equal(s.visible,true);assert.deepEqual(s.xyz,[4,2.08,9]);assert.equal(s.material.opacity,.75);assert.equal(s.size,1.25);
 for(const [player,ground,height] of [[null,2,1],[{position:{x:NaN,z:1}},2,1],[{position:{x:1,z:1}},Infinity,1],[{position:{x:1,z:1}},2,NaN],[{position:{x:1,z:1}},2,Infinity]]){
   contact.update(player,ground,height,true);assert.equal(s.visible,false);
 }
 contact.update({position:{x:1,z:1}},0,-10,true);assert.equal(s.visible,true);assert.equal(s.material.opacity,1);assert.equal(s.size,1);
 contact.update({position:{x:1,z:1}},0,40,true);assert.equal(s.visible,false);
 contact.update({position:{x:1,z:1}},0,0,false);assert.equal(s.visible,false);
 contact.dispose();assert.deepEqual(events,['geometry-disposed','material-disposed','texture-disposed']);
});
