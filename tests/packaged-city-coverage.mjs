import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PACKAGED_CITY_TILE_IDS, PACKAGED_CITY_TILE_COUNT} from '../city-tile-index.js';

const manifest=JSON.parse(await readFile(new URL('../scripts/public-assets.json',import.meta.url),'utf8'));
const tilePattern=/^tiles\/(C\d{2}_R\d{2})\.glb\.gz$/;
const manifestTiles=manifest.map(path=>tilePattern.exec(path)).filter(Boolean).map(match=>match[1]);
const packaged=new Set(manifestTiles);
assert.equal(packaged.size,manifestTiles.length,'duplicate city tile assets in public manifest');
assert.equal(PACKAGED_CITY_TILE_COUNT,PACKAGED_CITY_TILE_IDS.size,'exported city tile count drifted');
assert.deepEqual([...PACKAGED_CITY_TILE_IDS].sort(),[...packaged].sort(),
  'city-tile-index.js must match actual packaged .glb.gz tiles (no ghost or missing tile IDs)');
for(const id of packaged){
  const match=/^C(\d{2})_R(\d{2})$/.exec(id);
  assert.ok(match,'invalid city tile identifier');
  assert.ok(Number(match[1])<35&&Number(match[2])<35,'tile outside 35x35 world');
}
assert.ok(packaged.size>=631,'packaged tile coverage regressed below verified 2026-11-23 baseline');
const expected=35*35;
const missing=expected-packaged.size;
console.log(`PASS: tile index and manifest agree on ${packaged.size}/${expected} sections (${(100*packaged.size/expected).toFixed(1)}%); ${missing} sections not packaged.`);
if(missing)console.log('RELEASE COVERAGE WARNING: complete 35x35 map is not yet packaged; streaming window does not synthesize missing geometry.');
