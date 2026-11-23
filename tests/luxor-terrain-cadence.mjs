import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../landmark-variants.js',import.meta.url),'utf8');
const deploy=readFileSync(new URL('../dist/client/landmark-variants.js',import.meta.url),'utf8');
test('Luxor terrain sampling is bounded and source matches deploy',()=>{
 assert.equal(src,deploy);
 assert.match(src,/let luxorTerrainUpdateCounter=0/);
 assert.match(src,/\+\+luxorTerrainUpdateCounter%12===1/);
 assert.match(src,/let lastLuxorGround=sampleLuxorTerrain\(\)/);
 assert.match(src,/if\(Number\.isFinite\(luxorGround\)\)\{lastLuxorGround=luxorGround;luxorGroundReady=true;\}/);
 assert.match(src,/pyramid\.visible=luxorGroundReady&&luxorDistance<20000/);
 assert.match(src,/name:'Angelic Stadium'/);
 assert.match(src,/name:'END OF HIM'/);
 assert.match(src,/beamMetres:3800/);
});
