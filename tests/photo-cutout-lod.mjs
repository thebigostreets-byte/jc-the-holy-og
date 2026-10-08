import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../three.module.js';
import {photoCutoutAsset,isPhotoCutoutView} from '../photo-cutout-rules.js';
import {fictionalLandmarkName} from '../building-identities.js';
import {createPhotoCutoutLod} from '../photo-cutout-lod.js';

assert.match(photoCutoutAsset('Blood Bay'),/blood-bay-v1\.webp$/);
assert.match(photoCutoutAsset('Mandalay Bay'),/blood-bay-v1\.webp$/);
assert.match(photoCutoutAsset('Obsidian Pyramid'),/obsidian-pyramid-v1\.webp$/);
assert.match(photoCutoutAsset('Luxor'),/obsidian-pyramid-v1\.webp$/);
assert.equal(photoCutoutAsset('Generic Strip hotel'),null);
assert.equal(isPhotoCutoutView(Math.sin(Math.PI/4),Math.cos(Math.PI/4),900,70),true);
assert.equal(isPhotoCutoutView(Math.sin(Math.PI),Math.cos(Math.PI),900,70),false,'other view angles keep the original mesh');
assert.equal(isPhotoCutoutView(Math.sin(Math.PI/4),Math.cos(Math.PI/4),300,70),false,'near views keep the original mesh');
assert.equal(fictionalLandmarkName('Luxor'),'Obsidian Pyramid');
assert.equal(fictionalLandmarkName('Mandalay Bay'),'Blood Bay');
assert.equal(fictionalLandmarkName('MGM Grand'),'666');
assert.equal(fictionalLandmarkName('Palms'),'Psalms');

const assets=JSON.parse(await readFile('scripts/public-assets.json','utf8'));
for(const path of ['photo-cutout-lod.js','photo-cutout-rules.js','assets/building-cutouts/manifest.json','assets/building-cutouts/blood-bay-v1.webp','assets/building-cutouts/obsidian-pyramid-v1.webp'])assert.ok(assets.includes(path),path+' is published');
const manifest=JSON.parse(await readFile('assets/building-cutouts/manifest.json','utf8'));
assert.equal(manifest.validation.alpha_channel,'verified');
for(const path of ['assets/building-cutouts/blood-bay-v1.webp','assets/building-cutouts/obsidian-pyramid-v1.webp']){
  const data=await readFile(path);
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.equal(data.toString('ascii',12,16),'VP8X');
  assert.ok(data[20]&0x10,'WebP extended header records a true alpha channel');
}
const engine=await readFile('map-engine.js','utf8');
assert.ok(engine.includes('createPhotoCutoutLod'));
assert.ok(engine.includes('photoCutouts?.update'));
const lod=await readFile('photo-cutout-lod.js','utf8');
assert.ok(lod.includes('alphaTest: 0.025'));
assert.ok(lod.includes('ob.visible = false')&&lod.includes('record.ob.visible = true'));

const originalLoader=THREE.TextureLoader.prototype.loadAsync;
THREE.TextureLoader.prototype.loadAsync=async function(){const texture=new THREE.Texture();texture.image={width:384,height:256};return texture;};
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
const ob=new THREE.Group();ob.userData={buildingId:'NGA14-123',heightMetres:70,identity:{name:'Blood Bay',type:'casino'}};
const mesh=new THREE.Mesh(new THREE.BoxGeometry(80,70,50),new THREE.MeshStandardMaterial());mesh.position.y=35;ob.add(mesh);scene.add(ob);
scene.updateMatrixWorld(true);camera.position.set(707,35,707);
const buildings=new Map([[ob.userData.buildingId,ob]]),chunks=new Set(),edits=new Map();
const cutouts=createPhotoCutoutLod({scene,camera,buildings,chunks,edits});
cutouts.update(0,.016,true);await Promise.resolve();await Promise.resolve();await Promise.resolve();
cutouts.update(1200,.016,true);
assert.equal(ob.visible,false,'far matching view uses the masked image cutout');
assert.equal(cutouts.stats().visible,1);
cutouts.update(1320,.016,true);
assert.equal(ob.visible,false,'the cutout stays active between scans without hiding its own source record');
camera.position.set(10,35,10);cutouts.update(1440,.016,true);
assert.equal(ob.visible,true,'near view restores the source model');
assert.equal(cutouts.stats().visible,0);
cutouts.dispose();THREE.TextureLoader.prototype.loadAsync=originalLoader;
console.log('Photo cutout LOD passed: true alpha assets, fictional landmark routing, far-view gate, and preserved near/source geometry.');
