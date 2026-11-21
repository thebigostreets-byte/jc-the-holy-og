import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../map-engine.js',import.meta.url),'utf8');
const start=source.indexOf('const e=g.asset?.extras;');
const end=source.indexOf('group.position.set(e.originEasting',start);
assert.ok(start>=0&&end>start,'geographic tile-origin guard exists');
const guard=source.slice(start,end);
const base=[648949.782,3983561.814];
function check(name,e){const context={g:{asset:{extras:e}},name,base};vm.runInNewContext(guard,context);}
const valid={originEasting:base[0]+15000,originNorthing:base[1]+14000};
check('tiles/C15_R14.glb',valid);
check('tiles/C15_R14.glb',{originEasting:valid.originEasting+500,originNorthing:valid.originNorthing+500});
for(const [name,e] of [
 ['tiles/C15_R14.glb',{originEasting:base[0]+25000,originNorthing:valid.originNorthing}],
 ['tiles/C15_R14.glb',{originEasting:valid.originEasting,originNorthing:base[1]+30000}],
 ['tiles/C15_R14.glb',{originEasting:NaN,originNorthing:valid.originNorthing}],
 ['tiles/C35_R14.glb',valid],
 ['tiles/C15_R14.glb',null]
])assert.throws(()=>check(name,e),/origin|section/);
assert.ok(readFileSync(new URL('../dist/client/map-engine.js',import.meta.url),'utf8').includes(guard),'deploy copy retains geographic guard');
console.log('PASS: valid tile origins accepted; displaced and malformed tile origins rejected');
