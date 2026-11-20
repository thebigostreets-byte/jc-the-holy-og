import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/client/city-environment.js',import.meta.url),'utf8');
assert.match(source,/const farFromSphere=player&&globe\.position\.distanceToSquared\(player\)>600\*600/);
assert.match(source,/let lastFarFrame=-Infinity/);
assert.match(source,/if\(farFromSphere&&Number\.isFinite\(time\)&&time>=lastFarFrame&&time-lastFarFrame<100\)return/);
assert.match(source,/if\(farFromSphere\)lastFarFrame=Number\.isFinite\(time\)\?time:-Infinity/);
assert.match(source,/if\(gazeTarget\)\{targetPosition\.copy/);
// Exercise the exact throttling predicate with initial, boundary, reset, and near cases.
let last=-Infinity;
function tick(time,far){
  if(far&&Number.isFinite(time)&&time>=last&&time-last<100)return false;
  if(far)last=Number.isFinite(time)?time:-Infinity;
  return true;
}
assert.equal(tick(0,true),true,'first distant frame must render');
assert.equal(tick(16,true),false,'far frame under 100ms must be skipped');
assert.equal(tick(100,true),true,'100ms boundary must render');
assert.equal(tick(116,false),true,'near transition must render immediately');
assert.equal(tick(120,true),false,'returning far respects last far update');
assert.equal(tick(1,true),true,'clock reset must not stall animation');
assert.equal(tick(NaN,true),true,'nonfinite clock must not freeze animation');
assert.equal(tick(2,true),true,'recover after nonfinite clock');
console.log('Sphere distant-animation timing regression checks passed');
