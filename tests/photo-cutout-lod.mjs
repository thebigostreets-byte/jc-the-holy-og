import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {photoCutoutAsset,isPhotoCutoutView} from '../photo-cutout-rules.js';
import {fictionalLandmarkName} from '../building-identities.js';

assert.ok(photoCutoutAsset('Blood Bay').endsWith('blood-bay-v1.webp'));
assert.ok(photoCutoutAsset('Mandalay Bay').endsWith('blood-bay-v1.webp'));
assert.ok(photoCutoutAsset('Obsidian Pyramid').endsWith('obsidian-pyramid-v1.webp'));
assert.ok(photoCutoutAsset('Luxor').endsWith('obsidian-pyramid-v1.webp'));
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
console.log('Photo cutout checks passed: alpha assets, fictional landmark routing, far-view gate, and preserved near/source geometry.');
