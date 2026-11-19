import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LANDMARK_SPECS,localLandmarkPoint} from '../landmark-variants.js';
import {fictionalLandmarkName,identityPalette,resolveBuildingIdentity} from '../building-identities.js';
import {photoCutoutAsset} from '../photo-cutout-rules.js';
const specs=Object.values(LANDMARK_SPECS);
assert.equal(specs.length,4,'four separate landmarks are specified');
assert.equal(new Set(specs.map(x=>x.name)).size,4,'no duplicate identity');
assert.equal(LANDMARK_SPECS.luxor.baseMetres,183);
assert.ok(LANDMARK_SPECS.luxor.beamMetres>=3500,'sky beam stretches kilometres into the air');
assert.deepEqual(LANDMARK_SPECS.angelic.footprintMetres,[300,245]);
assert.deepEqual(LANDMARK_SPECS.speedway.footprintMetres,[1150,780]);
for(const spec of specs){
 const p=localLandmarkPoint(spec,[650000,3990000]);
 assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z),'projected coordinates are finite');
}
assert.equal(fictionalLandmarkName('MGM Grand'),'666','normal mode name is preserved');
assert.equal(fictionalLandmarkName('Allegiant Stadium'),'Angelic Stadium');
assert.equal(fictionalLandmarkName('Obsidian Pyramid'),'Luxor');
assert.equal(resolveBuildingIdentity('stadium',{longitude:-115.183952,latitude:36.090794},{}).name,'Angelic Stadium');
assert.equal(resolveBuildingIdentity('pyramid',{longitude:-115.1761,latitude:36.0955},{}).name,'Luxor');
assert.equal(identityPalette('Luxor').color,'#f8f7f0');
assert.equal(identityPalette('Angelic Stadium').color,'#fff8e7');
assert.equal(photoCutoutAsset('Luxor'),null,'night/day black pyramid photos are disabled until white inpainting ships');
for(const f of ['landmark-variants.js','map-engine.js','building-identities.js','physical-building-materials.js','photo-cutout-rules.js']){
 assert.equal(await readFile(f,'utf8'),await readFile('dist/client/'+f,'utf8'),f+' deployable mirror is current');
}
const assets=JSON.parse(await readFile('scripts/public-assets.json','utf8'));
assert.ok(assets.includes('landmark-variants.js'));
assert.ok(assets.includes('assets/building-cutouts/end-of-him-distant.webp'));
const art=await readFile('assets/building-cutouts/end-of-him-distant.webp');
assert.equal(art.toString('ascii',0,4),'RIFF');assert.equal(art.toString('ascii',8,12),'WEBP');
const atlas=await readFile('dist/client/assets/building-cutouts/end-of-him-distant.webp');
assert.deepEqual(atlas,art,'Hell art is included in published client');
console.log('PASS: Angelic Stadium naming/footprint, white Luxor/sky beam, END OF HIM art paths, old black cutout blocked, source/deploy mirrors.');
