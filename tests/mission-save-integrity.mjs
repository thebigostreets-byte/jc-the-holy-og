import assert from 'node:assert/strict';
import {createMissionTracker} from '../jc-missions.js';
const saved={version:1,counts:{lights:Infinity,prayers:-1,buildings:2},visited:['strip','strip']};
const storage={getItem:()=>JSON.stringify(saved),setItem:()=>{}};
const tracker=createMissionTracker(storage);
assert.deepEqual(tracker.getSnapshot().missions.map(m=>m.value),[0,0,2,0,0]);
assert.deepEqual(tracker.getSnapshot().visited,['strip']);
assert.equal(tracker.add('lights',Infinity),false);
console.log('PASS: mission save integrity');
