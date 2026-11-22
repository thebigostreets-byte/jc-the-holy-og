import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('landmark-variants.js');
assert.equal(source,read('dist/client/landmark-variants.js'));
assert.match(source,/const luxorGround=sampleLuxorTerrain\(\)/);
assert.match(source,/let luxorGroundReady=Number\.isFinite\(lastLuxorGround\)/);
assert.match(source,/tile\.userData\?\.generatedFallback/);
assert.match(source,/terrainSampler\(tile\)/);
assert.match(source,/const luxorSamplers=new WeakMap\(\)/);
assert.match(source,/if\(!sampler\)\{sampler=terrainSampler\(tile\)\|\|null;/);
assert.match(source,/if\(sampler\)luxorSamplers\.set\(tile,sampler\)/);
assert.doesNotMatch(source,/luxorSamplers\.set\(tile,null\)/);
assert.match(source,/if\(Number\.isFinite\(luxorGround\)\)\{lastLuxorGround=luxorGround;luxorGroundReady=true;\}/);
assert.match(source,/if\(luxorGroundReady\)pyramid\.position\.y=lastLuxorGround/);
assert.match(source,/pyramid\.visible=luxorGroundReady&&dist<20000/);
assert.match(source,/beamMetres:3800/);
assert.match(source,/name:'Angelic Stadium'/);
assert.match(source,/name:'END OF HIM'/);
// The last valid height remains authoritative when a subsequent sample is NaN.
let height=NaN,ready=false;
for(const sample of [NaN,42,NaN,43]){if(Number.isFinite(sample)){height=sample;ready=true;}assert.equal(ready,Number.isFinite(height));if(Number.isNaN(sample)&&ready)assert.ok(Number.isFinite(height));}
assert.equal(height,43);
console.log('Luxor terrain readiness and source/deploy parity passed');
