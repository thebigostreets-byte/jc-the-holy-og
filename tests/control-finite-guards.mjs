import assert from 'node:assert/strict';
import {stickAxis,advanceLook,setFlightForward,response,advancePedal,advanceGait,advanceChain} from '../jc-control-math.js';
const finite=x=>assert.ok(Number.isFinite(x));
for(const v of [NaN,Infinity,-Infinity,undefined]){finite(stickAxis(v));finite(advanceGait(v,v,v));}
for(const d of [NaN,Infinity,-Infinity,1,2])finite(stickAxis(.4,d));
const look=advanceLook(NaN,Infinity,NaN,-Infinity,NaN);finite(look.yaw);finite(look.pitch);
for(const args of [[NaN,.1],[Infinity,.2],[4,NaN],[-2,1]]){const r=response(...args);finite(r);assert.ok(r>=0&&r<=1);}
for(const args of [[NaN,1,NaN],[Infinity,-Infinity,Infinity],[0,1,.03,NaN,NaN]])finite(advancePedal(...args));
const chain=advanceChain({count:3,last:100,points:300},90);assert.deepEqual(chain,{count:1,last:90,points:400});
for(const args of [[.2,.3],[NaN,Infinity]]){const target={set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}};setFlightForward(target,...args);[target.x,target.y,target.z].forEach(finite);assert.ok(Math.abs(Math.hypot(target.x,target.y,target.z)-1)<1e-10);}
console.log('PASS: finite control guards');
