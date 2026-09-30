import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transitionFlight,shouldTouchDown} from '../jc-flight-state.js';

let flight=transitionFlight({},'takeoff');
assert.deepEqual([flight.flying,flight.height,flight.hypersonic,flight.glide,flight.diving,flight.descending],[true,6,false,false,false,0]);
flight=transitionFlight({...flight,glide:true},'boost');
assert.deepEqual([flight.flying,flight.height,flight.hypersonic,flight.glide,flight.diving],[true,18,true,false,false]);
flight=transitionFlight(flight,'boost');
assert.equal(flight.hypersonic,false,'boost toggles back to cruise');
flight=transitionFlight(flight,'glide');
assert.equal(flight.glide,true);
flight=transitionFlight(flight,'leap');
assert.deepEqual([flight.glide,flight.diving,flight.descending,flight.height],[false,false,0,32]);
flight=transitionFlight(flight,'dive');
assert.deepEqual([flight.diving,flight.glide,flight.hypersonic,flight.descending],[true,false,false,2]);
flight=transitionFlight(flight,'impact');
assert.deepEqual([flight.flying,flight.diving,flight.height,flight.descending],[false,false,0,0]);
flight=transitionFlight(transitionFlight({},'takeoff'),'land');
assert.deepEqual([flight.flying,flight.hypersonic,flight.glide,flight.diving,flight.descending],[false,false,false,false,1]);
flight=transitionFlight(transitionFlight({},'takeoff'),'touchdown');
assert.deepEqual([flight.flying,flight.height,flight.descending],[false,0,0]);
flight=transitionFlight({...flight,height:12,glide:true,hypersonic:true,diving:true},'recall');
assert.deepEqual([flight.flying,flight.hypersonic,flight.glide,flight.diving,flight.height,flight.descending],[false,false,false,false,0,0]);

const source=readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
assert.match(source,/case 'flight':if\(flying\)beamDown\(\);else setFlight\('takeoff'\)/);
assert.match(source,/if\(riseHeld\)desired\.y\+=1;if\(dropHeld\)desired\.y-=1/,'opposite vertical inputs cancel cleanly');
assert.match(source,/flightHeight=THREE\.MathUtils\.clamp\(flightHeight\+velocity\.y\*dt,0,250\)/,'flight altitude follows smoothed vertical velocity');
assert.match(source,/else if\(shouldTouchDown\(flying,previousHeight,flightHeight,velocity.y\)\)/,'touchdown requires actual ground contact');
assert.match(source,/if\(!flightAbilities\.has\(id\)\)showPose/,'flight casts do not pin a stale ability pose over live flight poses');
console.log('PASS: flight mode transitions, clean takeoff/landing, glide/dive/boost switching, touchdown, recall reset and live pose priority');

assert.equal(shouldTouchDown(true,120,119,-20),false,'descending at altitude stays in flight');
assert.equal(shouldTouchDown(true,1,0,-20),true,'ground contact lands');
assert.equal(transitionFlight({...flight,flying:true,height:120},'hover').height,120,'hover preserves airborne altitude');
assert.equal(transitionFlight({...flight,flying:true,hypersonic:true,height:120},'surge').hypersonic,true,'Sonic Boom never toggles boost off');
