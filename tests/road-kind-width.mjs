import assert from 'node:assert/strict';
import {roadWidth} from '../city-roads.js';

const known={FREEWAY:13,INTERSTATE:13,'MAJOR STREET':18,COLLECTOR:12,'COUNTY HIGHWAY':12,RAMP:7,LOCAL:8,ALLEY:4,'PRIVATE STREET':7};
for(const [kind,width] of Object.entries(known))assert.equal(roadWidth(kind),width,`mapped width for ${kind}`);
for(const kind of ['UNKNOWN','__proto__','constructor','toString',null,undefined,{},42,NaN]){
  assert.equal(roadWidth(kind),7,`unknown category must use finite fallback: ${String(kind)}`);
}
console.log('PASS: mapped road widths and unknown-category fallback');
