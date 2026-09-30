import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FLIGHT_CELLS} from '../rear-walk.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const source=readFileSync(resolve(root,'jc-map-game.js'),'utf8');
const walkSource=readFileSync(resolve(root,'rear-walk.js'),'utf8');
const publicAssets=JSON.parse(readFileSync(resolve(root,'scripts/public-assets.json'),'utf8'));
for(let i=0;i<39;i++){
  assert.ok(existsSync(resolve(root,`poses/pose-${i}.webp`)),`pose ${i} image exists`);
  assert.ok(publicAssets.includes(`poses/pose-${i}.webp`),`pose ${i} is included in the build`);
}
for(const [file,pattern] of [
  ['jc-rear-walk-v1.webp',/loadRearWalk\(ready\)/],
  ['jc-rear-run-v2.webp',/jc-rear-run-v2\.webp',4,2,\[31,32,33,34,35,36,37,38\]/],
  ['jc-rear-flight-v2.webp',/jc-rear-flight-v2\.webp',3,3,\[14,15,16,17,18,19,20,21,22\]/]
]){
  const asset=`character-art/${file}`;
  assert.ok(existsSync(resolve(root,asset)),`${file} sprite sheet exists`);
  assert.ok(publicAssets.includes(asset),`${file} is included in the build`);
  assert.match(file==='jc-rear-walk-v1.webp'?walkSource:source,pattern,`${file} is wired into gameplay`);
}
assert.equal(FLIGHT_CELLS.length,9,'all nine distinct flight poses have atlas cells');
assert.match(source,/loadRearWalk\(frames=>/,'the complete rear walk cycle is loaded by the game');
assert.match(walkSource,/\[0,1,3,2,4,6,7,5\]/,'the eight-frame walk cycle visits both leg phases');
assert.match(source,/const walkPoseSet=\[23,24,25,26,27,28,29,30\]/);
assert.match(source,/const runPoseSet=\[31,32,33,34,35,36,37,38\]/);
console.log('PASS: 39 action frames plus complete 8-frame walk/run and 9-pose flight sheets are present and wired into the build.');
