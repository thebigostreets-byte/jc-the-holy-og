import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const assets=JSON.parse(readFileSync(new URL('../scripts/public-assets.json',import.meta.url),'utf8'));
const lock=JSON.parse(readFileSync(new URL('../scripts/game-assets-lock.json',import.meta.url),'utf8'));
const safe=p=>typeof p==='string'&&/^[a-zA-Z0-9_.\/-]+$/.test(p)&&!p.startsWith('/')&&!p.split('/').includes('..')&&!p.split('/').includes('.')&&!p.includes('//');

test('deploy manifest contains only unique safe relative paths',()=>{
 assert.ok(Array.isArray(assets)&&assets.length>0);
 assert.equal(new Set(assets).size,assets.length,'duplicate deploy assets can overwrite or waste build work');
 for(const asset of assets)assert.ok(safe(asset),`unsafe deploy asset: ${asset}`);
});
test('hydration lock contains unique safe paths and valid digests',()=>{
 assert.ok(Array.isArray(lock.assets)&&lock.assets.length>0);
 const paths=lock.assets.map(a=>a.path);
 assert.equal(new Set(paths).size,paths.length,'duplicate lock paths can race during parallel hydration');
 for(const asset of lock.assets){
  assert.ok(safe(asset.path),`unsafe hydration asset: ${asset.path}`);
  assert.match(asset.sha256,/^[a-f0-9]{64}$/i,`invalid SHA-256: ${asset.path}`);
  assert.ok(Number.isSafeInteger(asset.bytes)&&asset.bytes>=0,`invalid asset size: ${asset.path}`);
 }
});
test('critical runtime modules are included in the deploy manifest',()=>{
 const deployed=new Set(assets);
 for(const file of ['map.html','map-engine.js','predictive-streaming.js','landmark-variants.js']){
  assert.ok(deployed.has(file),`runtime module missing from Pages manifest: ${file}`);
  assert.ok(readFileSync(new URL('../'+file,import.meta.url)).length>0,`empty runtime module: ${file}`);
 }
});
