import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { abilityWheelPage, minimapPoint, compassHeading } from '../jc-hud-model.js';

let checks = 0;
function eq(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }
const abilities = Array.from({length: 20}, (_, i) => ({group:'miracle', id:i}));
// Normal gamepad / touch wheel behavior must remain unchanged.
eq(abilityWheelPage(abilities, 'miracle', 1).items.map(a=>a.id), [8,9,10,11,12,13,14,15], 'normal page');
eq(abilityWheelPage(abilities, 'miracle', -1).items.map(a=>a.id), [16,17,18,19], 'wrap backward');
eq(abilityWheelPage(abilities, 'miracle', 2, 4).items.map(a=>a.id), [8,9,10,11], 'custom page size');
for (const bad of [0, -1, NaN, Infinity, undefined]) {
 const result = abilityWheelPage(abilities, 'miracle', NaN, bad);
 eq(result.items.map(a=>a.id), [0,1,2,3,4,5,6,7], `invalid page size ${bad}`);
 eq([result.page, result.pageCount], [0,3], `valid pagination ${bad}`);
}
eq(abilityWheelPage(null, 'miracle'), {items:[],page:0,pageCount:1}, 'null catalog');
eq(abilityWheelPage([null, ...abilities], 'miracle', Infinity).items.map(a=>a.id), [0,1,2,3,4,5,6,7], 'null entry and invalid page');
// Invalid map settings or positions must never propagate NaN to the HUD canvas.
eq(minimapPoint({x:10,z:20},{x:0,z:0},100,200), {x:110,y:120}, 'normal minimap');
for (const halfRange of [0, -5, NaN, Infinity]) {
 eq(minimapPoint({x:10,z:20},{x:0,z:0},halfRange,200), {x:100,y:100}, `invalid map range ${halfRange}`);
}
eq(minimapPoint({x:NaN,z:20},{x:0,z:0},100,200), {x:100,y:100}, 'invalid map position');
eq(minimapPoint(null,{x:0,z:0},100,200), {x:100,y:100}, 'missing position');
eq(minimapPoint({x:10,z:20},{x:0,z:0},100,Infinity), {x:0,y:0}, 'invalid map size');
// Compass remains finite for sensor glitches and extreme but finite yaw.
eq(compassHeading(Math.PI/2), 90, 'east');
eq(compassHeading(-Math.PI/2), 270, 'west');
eq(compassHeading(2*Math.PI), 0, 'full circle');
for (const yaw of [NaN, Infinity, -Infinity]) eq(compassHeading(yaw), 0, `invalid yaw ${yaw}`);
for (const yaw of [1e308, -1e308]) {
 const heading=compassHeading(yaw);
 assert.ok(Number.isInteger(heading) && heading>=0 && heading<360, `huge finite yaw ${yaw}`); checks++;
}
// Even finite world coordinates can overflow subtraction or scaling.
for (const position of [{x:1e308,z:0}, {x:0,z:-1e308}]) {
 const result = minimapPoint(position,{x:-1e308,z:1e308},1,200);
 eq(result, {x:100,y:100}, 'finite coordinate subtraction overflow must not reach HUD canvas');
}
eq(minimapPoint({x:1,z:1},{x:0,z:0},1e-308,200), {x:100,y:100}, 'finite input scale overflow must not reach HUD canvas');
eq(readFileSync(new URL('../jc-hud-model.js',import.meta.url),'utf8'),readFileSync(new URL('../dist/client/jc-hud-model.js',import.meta.url),'utf8'),'source/deploy parity');
console.log(`PASS: ${checks} HUD input resilience assertions`);
