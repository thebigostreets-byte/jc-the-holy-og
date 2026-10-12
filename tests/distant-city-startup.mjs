import assert from 'node:assert/strict';
import * as THREE from '../three.module.js';
import {createDistantCity,tilePlacement} from '../distant-city.js';

const original=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
try {
 const bounds=[0,0,35000,35000];
 const sections=[
  {id:'C15_R14',bounds:[15000,14000,16000,15000]},
  {id:'C20_R20',bounds:[20000,20000,21000,21000]}
 ];
 const loaded=new Map();
 let revision=0;
 const scene=new THREE.Scene();
 const game={scene,sections,origin:[0,0],cityBounds:bounds,loaded,tileRevision:()=>revision};
 const atlas=createDistantCity(game);
 const root=scene.children.find(o=>o.name==='Georeferenced Las Vegas satellite preview');
 assert.ok(root,'satellite city preview attaches');
 const tiles=root.children.find(o=>o.isInstancedMesh);
 assert.ok(tiles,'tiles use InstancedMesh to bound draw calls');
 assert.equal(tiles.count,2);
 const attr=tiles.geometry.getAttribute('cityCell');
 assert.ok(attr,'per-instance city atlas coordinates are present before first update');
 assert.equal(attr.count,2);
 const p=tilePlacement(sections[0],[0,0],bounds);
 assert.ok(Math.abs(attr.getX(0)-p.u)<1e-6);
 assert.ok(Math.abs(attr.getY(0)-p.v)<1e-6);
 const highDetail=root.children.find(o=>o.isMesh&&!o.isInstancedMesh);
 assert.ok(highDetail?.visible,'unloaded satellite detail is visible');
 loaded.set('C15_R14',{});
 revision=1;atlas.update();
 assert.equal(highDetail.visible,false,'loaded real buildings replace preview');
 const mat=tiles.material;
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <uv_vertex>',fragmentShader:'#include <map_fragment>'};
 mat.onBeforeCompile(shader);
 assert.ok(shader.uniforms.cityNightMix,'day/night mix uniform installed');
 assert.match(shader.vertexShader,/attribute vec2 cityCell/);
 assert.match(shader.vertexShader,/vMapUv=cityCell\+vMapUv\/35\.0/);
 assert.match(shader.fragmentShader,/float lum=/);
 assert.ok(shader.fragmentShader.includes('\nfloat lum='),'GLSL fragments use valid newlines, not literal backslash-n');
 atlas.dispose();
 assert.equal(scene.children.includes(root),false,'city preview disposes correctly');
 console.log('PASS: satellite atlas attributes, startup update, first-frame GLSL, loaded detail switches and disposal.');
}finally {THREE.TextureLoader.prototype.load=original;}
