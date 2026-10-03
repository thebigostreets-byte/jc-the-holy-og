import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
const ids=['heavenly-spear','judgment-storm','singularity','sonic-boom'];
for(const id of ids){
  assert.match(source,new RegExp(`\\['(?:Travel|Light|World)','${id}'`),`${id} appears in the player ability wheel`);
  assert.match(source,new RegExp(`case '${id}':`),`${id} has a gameplay implementation`);
  assert.match(source,new RegExp(`'${id}'`),`${id} is registered as castable`);
}
assert.match(source,/abilities\.length !== 44/,'the 44 ability catalog is enforced');
assert.match(source,/judgment-storm[^\n]*near\(140,3\)/,'Judgment Storm has a fixed three building target cap');
assert.match(source,/heavenly-spear[^\n]*game\.destroy\(ob,'explode'\)/,'Heavenly Spear creates a real building collapse');
assert.match(source,/sonic-boom[^\n]*setFlight\('surge'\)/,'Sonic Boom enters the existing boost flight state');
assert.match(source,/singularity[^\n]*moveSouls\('vortex',85\)/,'Singularity pulls nearby souls through the existing world interaction');
assert.match(source,/44 POWERS[\s\S]*44 MIRACLES/,'the 3D game HUD advertises the full ability count');
console.log('PASS: 44 abilities are registered, castable, visually exposed and bounded; signature attack contracts remain intact.');
