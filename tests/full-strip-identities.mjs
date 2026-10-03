import assert from 'node:assert/strict';
import {identityPalette} from '../building-identities.js';

const landmarks=['Luxor','MGM Grand','Wynn','Bellagio','Flamingo','Cosmopolitan'];
const looks=landmarks.map(name=>[name,identityPalette(name)]);
for(const [name,look] of looks)assert.ok(look, name+' has an authored landmark facade palette');
assert.ok(new Set(looks.map(([,look])=>look.color)).size>=4,'landmark palettes keep casinos visually distinct');
assert.equal(identityPalette('Generic apartment'),null,'generic buildings use seeded material generation instead of landmark palettes');
console.log('PASS: landmark casino facade palettes remain distinctive from generated generic buildings');
