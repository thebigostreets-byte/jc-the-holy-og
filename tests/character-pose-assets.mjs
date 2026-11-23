import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const assets=new Set(JSON.parse(await readFile('scripts/public-assets.json','utf8')));
const source=await readFile('jc-map-game.js','utf8');
assert.ok(source.includes("image.src=`./poses/pose-${safeIndex}.webp`"),'character frames load from existing pose images');
assert.ok(source.includes('requestCharacterFrame(safeIndex)'),'poses load on demand');
assert.ok(!source.includes('./character-art/'),'game must not request missing character-art images');
for(let i=0;i<39;i++)assert.ok(assets.has(`poses/pose-${i}.webp`),`pose-${i}.webp is published`);
const rig=await readFile('jc-character3d.js','utf8');
const deployedRig=await readFile('dist/client/jc-character3d.js','utf8');
assert.equal(rig,deployedRig,'character rig source and deployment must match');
assert.match(rig,/side>0\?1\.12:-1\.12/,'flight shoulders must extend outward symmetrically');
assert.match(rig,/arm\.rotation\.z=THREE\.MathUtils\.lerp/,'flight shoulder movement must blend');
assert.match(rig,/elbow\.rotation\.x=THREE\.MathUtils\.lerp/,'flight elbow movement must blend');
console.log('Character pose checks passed: published frames, live rig pose smoothing and source/deploy parity.');
