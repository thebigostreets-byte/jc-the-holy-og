import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fictionalLandmarkName,resolveBuildingIdentity,identityPalette} from '../building-identities.js';
assert.equal(fictionalLandmarkName('Allegiant Stadium'),'Angelic Stadium');
assert.equal(fictionalLandmarkName('Allegiant Stadium - south entrance'),'Angelic Stadium');
assert.equal(resolveBuildingIdentity('stadium-test',{longitude:-115.183952,latitude:36.090794}).name,'Angelic Stadium');
assert.equal(identityPalette('Angelic Stadium').color,'#f3eee0');
assert.equal(readFileSync(new URL('../building-identities.js',import.meta.url),'utf8'),readFileSync(new URL('../dist/client/building-identities.js',import.meta.url),'utf8'));
console.log('PASS: Angelic Stadium naming, location fallback, palette and deploy parity');
