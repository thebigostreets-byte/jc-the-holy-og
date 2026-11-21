import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectFlightPose,selectGroundPose} from '../jc-character-pose.js';
assert.equal(selectFlightPose({descending:true}),22);
for(const speed of [2,8,20])for(const phase of [-17,-1,0,1,7,8,NaN,Infinity])for(const sprint of [false,true]){
 const pose=selectGroundPose(speed,phase,sprint);
 assert.ok(Number.isInteger(pose));
 assert.ok(sprint?pose>=31&&pose<=38:pose>=23&&pose<=30);
}
assert.equal(selectGroundPose(NaN,4),0);
const source=readFileSync(new URL('../jc-character3d.js',import.meta.url),'utf8');
assert.match(source,/poses\[22\]\.arm=\[/);
for(const file of ['jc-character-pose.js','jc-character3d.js'])assert.equal(readFileSync(new URL('../'+file,import.meta.url),'utf8'),readFileSync(new URL('../dist/client/'+file,import.meta.url),'utf8'));
console.log('PASS: descending pose authored, gait indices safe, deployment files synced');
