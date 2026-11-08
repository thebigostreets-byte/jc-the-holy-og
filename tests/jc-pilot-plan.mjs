import assert from 'node:assert/strict';
import {makeJcPilotPlan} from '../scripts/jc-pilot-plan.mjs';
import {PILOT_CUTOUTS,pilotCutoutAsset,canPromoteNewCutout} from '../jc-pilot-assets.js';
import {photoCutoutAsset,isPhotoCutoutView} from '../photo-cutout-rules.js';
const plan=makeJcPilotPlan();
assert.equal(plan.slots.length,20);
assert.equal(plan.jobs.length,40);
assert.equal(new Set(plan.slots.map(s=>s.parameter_id)).size,20);
assert.equal(new Set(plan.jobs.map(j=>j.job_id)).size,40);
assert.deepEqual(Object.fromEntries(['facade','collider','tile','vehicle','vfx'].map(f=>[f,plan.slots.filter(s=>s.family===f).length])),{facade:12,collider:4,tile:2,vehicle:1,vfx:1});
assert.ok(plan.slots.every(s=>s.source_ref===null&&s.verified_coordinate_epsg32611===null));
assert.ok(plan.jobs.every(j=>j.status==='blocked'&&!j.qa_passed&&j.output_path===null));
for(const slot of plan.slots){
 const n=Number(slot.parameter_id.slice(1));
 assert.deepEqual(plan.jobs.filter(j=>j.parameter_id===slot.parameter_id).map(j=>j.job_id),
   ['J'+String(2*n-1).padStart(6,'0'),'J'+String(2*n).padStart(6,'0')]);
}
assert.equal(PILOT_CUTOUTS.length,2);
assert.ok(photoCutoutAsset('Mandalay Bay').endsWith('blood-bay-v1.webp'));
assert.ok(pilotCutoutAsset({name:'Luxor'},true).endsWith('obsidian-pyramid-night-v1.webp'));
assert.equal(photoCutoutAsset('Generic Strip hotel'),null);
assert.equal(isPhotoCutoutView(Math.sin(Math.PI/4),Math.cos(Math.PI/4),900,70),true);
assert.ok(PILOT_CUTOUTS.every(a=>!canPromoteNewCutout(a)));
assert.equal(canPromoteNewCutout({alphaVerified:true,foregroundReview:'passed',webglReview:'passed',rightsReview:'passed',placementReview:'passed'}),true);
assert.equal(canPromoteNewCutout({alphaVerified:true,foregroundReview:'pending',webglReview:'passed',rightsReview:'passed',placementReview:'passed'}),false);
console.log('JC pilot validated: 20 slots, 40 blocked jobs, cutout routing and QA gates.');
