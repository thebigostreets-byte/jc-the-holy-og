import assert from 'node:assert/strict';
import {identityPalette,resolveBuildingIdentity} from '../building-identities.js';

const landmarks=['Luxor','MGM Grand','Wynn','Bellagio','Flamingo','Cosmopolitan','New York-New York','Excalibur','Resorts World','Treasure Island','Palms','Sphere','Allegiant Stadium','T-Mobile Arena'];
const looks=landmarks.map(name=>[name,identityPalette(name)]);
for(const [name,look] of looks)assert.ok(look, name+' has an authored landmark facade palette');
assert.ok(new Set(looks.map(([,look])=>look.color)).size>=4,'landmark palettes keep casinos visually distinct');
assert.equal(identityPalette('Generic apartment'),null,'generic buildings use seeded material generation instead of landmark palettes');
const fallback=resolveBuildingIdentity('unknown',{longitude:-115.1767,latitude:36.1126},{});
assert.equal(fallback?.name,'Bellagio','missing identity data falls back to the nearest known landmark');
assert.equal(fallback?.type,'casino');
const arena=resolveBuildingIdentity('arena',{longitude:-115.1783,latitude:36.1029},{});
assert.equal(arena?.name,'T-Mobile Arena','arena fallback uses the correct real-world identity');
assert.equal(resolveBuildingIdentity('far-away',{longitude:-115.30,latitude:36.30},{}),null,'unrelated buildings are not mislabeled as landmarks');
console.log('PASS: landmark casino facade palettes remain distinctive from generated generic buildings');
