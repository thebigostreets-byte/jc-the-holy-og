import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const materials=await readFile(new URL('../physical-building-materials.js',import.meta.url),'utf8');
assert.match(materials,/\['Bellagio',\s*-115\.1767,\s*36\.1126/);
assert.match(materials,/type:'casino'/);
assert.match(materials,/type:'residential'/);
assert.match(materials,/type:'low-rise-commercial'/);
assert.match(materials,/roughness=\.93/);
assert.match(materials,/metalness=0/);
assert.match(materials,/centralCasinoStructure/);

const gameplay=await readFile(new URL('../jc-map-game.js',import.meta.url),'utf8');
assert.match(gameplay,/jcSinState/);
assert.match(gameplay,/JC_SIN_STATE/);
assert.match(gameplay,/jc-sin-city-balance/);
assert.match(gameplay,/KeyQ[^\n]+answerPrayer/);
assert.match(gameplay,/data-action="enter"/);
assert.match(gameplay,/function enterInterior\(/);
assert.match(gameplay,/function exitInterior\(/);
assert.match(gameplay,/updateSinState\(-6\*broken/);

const mapEngine=await readFile(new URL('../map-engine.js',import.meta.url),'utf8');
assert.match(mapEngine,/emissiveIntensity=0/);
assert.match(mapEngine,/identity\?\.type==='casino'/);
assert.match(mapEngine,/glow'\)\.disabled=e\.identity\?\.type!=='casino'/);

const dialogue=await readFile(new URL('../npc-dialogue.js',import.meta.url),'utf8');
assert.match(dialogue,/prayer:npc\.prayer\?\.text/);
assert.match(dialogue,/prayerAnswered/);

console.log('Sin City state, prayer, interior and building-classification source contracts passed.');
