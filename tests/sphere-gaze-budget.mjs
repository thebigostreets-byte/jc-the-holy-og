import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/client/city-environment.js',import.meta.url),'utf8');
assert.match(source,/playerD>600\*600/,'Sphere should use squared distance for far-away LOD');
assert.match(source,/distant\?7000:1800/,'Distant gaze refresh should be less frequent');
assert.match(source,/distant\?\[\]:\(game\.npcs\?\.npcs\|\|\[\]\)/,'Distant Sphere should skip NPC gaze scans');
assert.match(source,/globe\.position\.distanceToSquared\(npc\.position\)/,'Nearby Sphere should retain NPC tracking');
console.log('Sphere distance-aware gaze budget checks passed');
