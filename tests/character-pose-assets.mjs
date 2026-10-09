import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const assets=new Set(JSON.parse(await readFile('scripts/public-assets.json','utf8')));
const source=await readFile('jc-map-game.js','utf8');
assert.ok(source.includes("image.src=`./poses/pose-${safeIndex}.webp`"),'character frames load from existing pose images');
assert.ok(source.includes('requestCharacterFrame(safeIndex)'),'poses load on demand');
assert.ok(!source.includes('./character-art/'),'game must not request missing character-art images');
for(let i=0;i<39;i++)assert.ok(assets.has(`poses/pose-${i}.webp`),`pose-${i}.webp is published`);
console.log('Character pose checks passed: existing frames are published and loaded on demand.');
