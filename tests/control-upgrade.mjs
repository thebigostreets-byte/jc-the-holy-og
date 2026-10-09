import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {standardPadActions,standardPadHolds} from '../jc-control-math.js';

assert.deepEqual(standardPadActions,[[0,'jump'],[1,'cast'],[2,'hypersonic'],[3,'car'],[4,'flight'],[5,'shield'],[8,'wheel'],[9,'pause']]);
assert.deepEqual(standardPadHolds,[[0,'Space'],[6,'Control'],[7,'Space']]);

const source=readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
const deployed=readFileSync(new URL('../dist/client/jc-map-game.js',import.meta.url),'utf8');
const controls=readFileSync(new URL('../jc-control-math.js',import.meta.url),'utf8');
const deployedControls=readFileSync(new URL('../dist/client/jc-control-math.js',import.meta.url),'utf8');

assert.equal(deployed,source,'deployed game source must match authored source');
assert.equal(deployedControls,controls,'deployed control math must match authored source');
assert.match(source,/controllerPaused/,'Start pauses gameplay and freezes the world');
assert.match(source,/id==='jump'\)\{if\(!flying\)dash\(\);\}/,'A dash-jumps grounded and rises when held during flight');
assert.match(source,/id==='cast'\)cast\(\)/,'B casts the equipped power');
assert.match(source,/else if\(id==='car'\)toggleCar\(\)/,'Y enters and exits the car');
assert.match(source,/id==='pause'/,'Start button is handled as a pause toggle');
assert.match(source,/jcGamepadPause/,'pause state has a visible overlay');
console.log('PASS: standard gamepad mapping, pause behavior and source/deploy parity.');
