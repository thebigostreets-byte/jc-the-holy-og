import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [materials,identities,gameplay,world,mapEngine,dialogue]=await Promise.all([
 readFile(new URL('../physical-building-materials.js',import.meta.url),'utf8'),
 readFile(new URL('../building-identities.js',import.meta.url),'utf8'),
 readFile(new URL('../jc-map-game.js',import.meta.url),'utf8'),
 readFile(new URL('../explorable-world.js',import.meta.url),'utf8'),
 readFile(new URL('../map-engine.js',import.meta.url),'utf8'),
 readFile(new URL('../npc-dialogue.js',import.meta.url),'utf8')
]);
assert.match(materials,/roughness=\.93/,'ordinary façades stay matte');
assert.match(materials,/metalness=0/,'ordinary façades stay non-metallic');
assert.match(materials,/identity\.type==='casino'/,'reflective material treatment is casino-gated');
assert.match(materials,/export function buildingSurface/);
for(const name of ['Bellagio','Luxor','MGM Grand','Wynn','Flamingo'])assert.ok(identities.includes(name),name+' has a distinct landmark identity');
assert.match(mapEngine,/emissiveIntensity=casino\?\(e\.glow\|\|0\):0/,'only casino buildings receive editable glow');
assert.match(mapEngine,/\$\('glow'\)\.disabled=e\.identity\?\.type!=='casino'/,'the editor disables glow for non-casino buildings');

assert.match(gameplay,/case 'answer-prayer'/);
assert.match(gameplay,/npcSystem\?\.answerPrayer/);
assert.match(gameplay,/createExplorableWorld/);
assert.match(gameplay,/explorableWorld\.enter\(/);
assert.match(gameplay,/explorableWorld\.exit\(\)/);
assert.match(world,/Little Church of the West/);
assert.match(world,/military:nellis/);
assert.match(world,/GROOM LAKE · AREA 51 GAME ZONE/);
assert.match(world,/fictional underground mission route/);
assert.match(dialogue,/witnessMemories/,'witnessed events are supplied to NPC dialogue');
assert.match(dialogue,/observedPlayer/,'current player appearance and flight state reach NPC dialogue');
assert.match(dialogue,/Personally witnessed/,'NPC dialogue is told not to invent events it did not witness');

console.log('Sin City venue interiors, prayers, world route labels, casino identity and casino-only glow contracts passed.');
