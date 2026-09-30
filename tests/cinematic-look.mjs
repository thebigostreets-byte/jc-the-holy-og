import assert from 'node:assert/strict';
import * as THREE from '../three.module.js';
import {createCinematicLook} from '../cinematic-look.js';
// Exercise actual scene objects and the pass pipeline without a WebGL context.
THREE.TextureLoader.prototype.load=function(url,onLoad){assert.equal(url,'./assets/jc-storm-sky.webp');onLoad(new THREE.Texture());};
let target=null,calls=0,fail=false;
const renderer={getDrawingBufferSize:v=>v.set(800,600),setRenderTarget:t=>{target=t;},render:()=>{calls++;if(fail&&target)throw Error('target unavailable');}};
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
const look=createCinematicLook({renderer,scene,camera},true),count=scene.children.length;
look.render();assert.equal(calls,4);assert.equal(target,null);
const sky=scene.background;assert(sky.isTexture);look.setSunrise(true);assert(scene.background.isColor);look.setSunrise(false);assert.equal(scene.background,sky);
const p=new THREE.Vector3(0,20,0),v=new THREE.Vector3(0,0,-72);
for(let i=0;i<300;i++){if(i%10===0)look.impact(p);look.update(1/60,i*17,p,v,true,true,true);}
assert.equal(scene.children.length,count,'effects must not allocate more objects');
const points=scene.children.find(o=>o.isPoints);assert.equal(points.geometry.attributes.position.count,96);
assert([...points.geometry.attributes.position.array].every(Number.isFinite));
look.update(0,6000,p,v,false,false,false);assert.equal(points.visible,false);assert(scene.children.filter(o=>o.isMesh).every(o=>!o.visible));
fail=true;look.render();assert.equal(target,null);const before=calls;look.render();assert.equal(calls,before+1,'failure falls back to direct rendering');
console.log('PASS: bounded effects, mobile pool, sunrise restore, editor hiding, four-pass rendering, safe fallback');
