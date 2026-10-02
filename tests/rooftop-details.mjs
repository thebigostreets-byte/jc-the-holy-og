import assert from 'node:assert/strict';
import {buildRooftopPlan} from '../rooftop-details.js';

const buildings=[
  {id:'tower-a',min:{x:0,y:0,z:0},max:{x:80,y:120,z:60}},
  {id:'hotel-b',min:{x:100,y:0,z:100},max:{x:140,y:80,z:132}},
  {id:'small-shed',min:{x:200,y:0,z:200},max:{x:205,y:4,z:205}},
  {id:'narrow',min:{x:300,y:0,z:300},max:{x:304,y:30,z:330}}
];
const first=buildRooftopPlan(buildings);
const second=buildRooftopPlan(buildings);
assert.deepEqual(first,second,'roof equipment placement must be deterministic');
assert.ok(first.housings.length>=2,'eligible roofs receive HVAC housings');
assert.equal(first.grilles.length,first.housings.length,'each HVAC unit has a top grille');
assert.ok(first.vents.length>=1,'some roofs receive exhaust vents');
assert.ok(first.antennas.length>=1,'some tall buildings receive antenna masts');
for(const item of [...first.housings,...first.grilles,...first.vents,...first.antennas]) {
  assert.ok(Number.isFinite(item.x)&&Number.isFinite(item.y)&&Number.isFinite(item.z));
  assert.ok(item.sx>0&&item.sy>0&&item.sz>0);
}
assert.ok(!first.housings.some(item=>item.x>=200&&item.x<=205),'tiny shed should be skipped');
console.log('PASS: deterministic rooftop equipment planning and small-building filtering');
