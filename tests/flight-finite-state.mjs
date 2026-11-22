import assert from 'node:assert/strict';
import {transitionFlight,shouldTouchDown} from '../jc-flight-state.js';

for (const action of ['takeoff','boost','surge','hover','leap','glide','sky-lift','dive','land','touchdown','recall','impact','unknown']) {
  for (const height of [NaN,Infinity,-Infinity,-50,undefined]) {
    const result=transitionFlight({height,descending:NaN},action);
    assert.ok(Number.isFinite(result.height), action+' finite height');
    assert.ok(result.height>=0, action+' nonnegative height');
    assert.ok(Number.isFinite(result.descending), action+' finite descent');
  }
}
assert.equal(transitionFlight(null,'takeoff').height,6);
assert.equal(transitionFlight({height:10},'takeoff').height,10);
assert.equal(transitionFlight({height:10},'leap').height,24);
assert.equal(transitionFlight({height:10},'sky-lift').height,38);
assert.equal(transitionFlight({height:10,flying:true},'dive').diving,true);
assert.equal(transitionFlight({height:10},'dive').diving,false);
assert.equal(transitionFlight({height:10},'touchdown').height,0);
assert.equal(shouldTouchDown(true,10,0,-1),true);
assert.equal(shouldTouchDown(true,NaN,0,-1),false);
assert.equal(shouldTouchDown(true,10,0,NaN),false);
assert.equal(shouldTouchDown(true,10,Infinity,-1),false);
console.log('flight finite-state regression passed');
