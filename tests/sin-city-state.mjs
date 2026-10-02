import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {classifyBuilding} from '../physical-building-materials.js';

const bellagio=classifyBuilding({longitude:-115.1767,latitude:36.1126,heightMetres:42});
assert.equal(bellagio.type,'casino');
assert.match(bellagio.name,/Bellagio/);

const stripNonCasino=classifyBuilding({longitude:-115.157,latitude:36.105,heightMetres:12});
assert.equal(stripNonCasino.type,'commercial');

const neighborhoodHome=classifyBuilding({longitude:-115.09,latitude:36.06,heightMetres:7});
assert.equal(neighborhoodHome.type,'residential');

const lowRiseBusiness=classifyBuilding({longitude:-115.09,latitude:36.06,heightMetres:14});
assert.equal(lowRiseBusiness.type,'low-rise-commercial');

const gameplay=await readFile(new URL('../jc-map-game.js',import.meta.url),'utf8');
assert.match(gameplay,/jcSinState/);
assert.match(gameplay,/JC_SIN_STATE/);
assert.match(gameplay,/KeyQ[^\n]+answerPrayer/);
assert.match(gameplay,/data-action="enter"/);
assert.match(gameplay,/function enterInterior\(/);
assert.match(gameplay,/function exitInterior\(/);

const mapEngine=await readFile(new URL('../map-engine.js',import.meta.url),'utf8');
assert.match(mapEngine,/emissiveIntensity=0/);
assert.match(mapEngine,/identity\?\.type==='casino'/);

console.log('Sin City state, prayer, interior and building-classification contracts passed.');
