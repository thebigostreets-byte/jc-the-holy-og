import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/client/city-environment.js',import.meta.url),'utf8');
assert.match(source,/const farFromSphere=player&&globe\.position\.distanceToSquared\(player\)>600\*600/);
assert.match(source,/if\(farFromSphere&&time-lastFarFrame<100\)return/);
assert.match(source,/if\(farFromSphere\)lastFarFrame=time/);
assert.match(source,/if\(gazeTarget\)\{targetPosition\.copy/);
console.log('Sphere far-animation frame budget checks passed');
