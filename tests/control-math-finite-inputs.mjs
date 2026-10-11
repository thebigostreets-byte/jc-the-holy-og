import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as math from '../jc-control-math.js';
const isFiniteVector = value => Object.values(value).every(Number.isFinite);
const target = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } });

test('stick deadzone handles malformed gamepad values without NaN', () => {
  for (const axis of [NaN, Infinity, -Infinity, undefined]) assert.equal(math.stickAxis(axis), 0);
  for (const zone of [1, 3, Infinity, NaN, -1]) for (const axis of [-1, -.5, 0, .5, 1]) {
    const result = math.stickAxis(axis, zone);
    assert.ok(Number.isFinite(result) && Math.abs(result) <= 1);
    if (axis !== 0) assert.ok(result * axis >= 0);
  }
  assert.equal(math.stickAxis(5), 1);
  assert.equal(math.stickAxis(-5), -1);
  assert.equal(math.stickAxis(.16), 0);
});

test('camera look preserves orientation and rejects bad frames and axes', () => {
  for (const bad of [NaN, Infinity, -Infinity, undefined]) {
    assert.ok(isFiniteVector(math.advanceLook(bad, bad, bad, bad, bad)));
    assert.deepEqual(math.advanceLook(1, .2, bad, bad, bad), { yaw: 1, pitch: .2 });
  }
  const move = math.advanceLook(1, .1, 5, -5, 1);
  assert.equal(move.yaw, 1 + 5.2 * .05);
  assert.equal(move.pitch, .1 + 3.4 * .05);
  assert.ok(math.advanceLook(0, 99, 0, 0, 0).pitch <= .72);
});

test('flight forward remains normalized and finite', () => {
  for (const angle of [NaN, Infinity, -Infinity, 0, 1, 1e12]) {
    const out = target();
    assert.equal(math.setFlightForward(out, angle, angle), out);
    assert.ok(isFiniteVector({ x: out.x, y: out.y, z: out.z }));
    assert.ok(Math.abs(Math.hypot(out.x, out.y, out.z) - 1) < 1e-9);
  }
  const forward = target(); math.setFlightForward(forward, 0, 0);
  assert.deepEqual([forward.x, forward.y, forward.z], [0, 0, -1]);
});

test('response stays finite and bounded for invalid time and rate', () => {
  for (const bad of [NaN, Infinity, -Infinity, undefined, -5]) {
    const result = math.response(bad, bad);
    assert.ok(Number.isFinite(result) && result >= 0 && result <= 1);
  }
  assert.equal(math.response(0, 1), 0);
  assert.ok(Math.abs(math.response(14, .05) - (1 - Math.exp(-.7))) < 1e-12);
});

test('pedal input cannot become NaN or escape [-1,1]', () => {
  for (const bad of [NaN, Infinity, -Infinity, undefined]) {
    for (const result of [math.advancePedal(bad, bad, bad), math.advancePedal(bad, 1, .05, bad, bad)]) {
      assert.ok(Number.isFinite(result) && result >= -1 && result <= 1);
    }
  }
  assert.equal(math.advancePedal(0, 0, .05), 0);
  assert.ok(math.advancePedal(0, 1, .05) > 0);
  assert.ok(math.advancePedal(1, 0, .05) < 1);
});

test('gait cycle wraps corrupted phase and rejects invalid speed', () => {
  for (const bad of [NaN, Infinity, -Infinity, undefined, -5]) {
    const phase = math.advanceGait(bad, bad, bad);
    assert.ok(Number.isFinite(phase) && phase >= 0 && phase < 8);
  }
  assert.equal(math.advanceGait(-1, 0, 0), 7);
  assert.equal(math.advanceGait(8, 0, 0), 0);
  assert.ok(math.advanceGait(7.9, 10, .05, true) < 8);
});

test('score chain rejects clock rollback, corrupted saves and overflow', () => {
  assert.deepEqual(math.advanceChain(null, 10), { count: 1, last: 10, points: 100 });
  assert.deepEqual(math.advanceChain({ count: 3, last: 10, points: 200 }, 9), { count: 1, last: 9, points: 300 });
  assert.deepEqual(math.advanceChain({ count: 3, last: 10, points: 200 }, 11), { count: 4, last: 11, points: 600 });
  const corrupt = math.advanceChain({ count: NaN, last: Infinity, points: Infinity }, NaN);
  assert.deepEqual(corrupt, { count: 1, last: 0, points: 100 });
  assert.equal(math.advanceChain({ count: 8, last: 10, points: Number.MAX_SAFE_INTEGER }, 11).points, Number.MAX_SAFE_INTEGER);
});

test('existing controller mappings and ordinary finite values are preserved', () => {
  assert.deepEqual(math.standardPadActions, [[0,'jump'],[1,'cast'],[2,'hypersonic'],[3,'car'],[4,'flight'],[5,'shield'],[8,'wheel'],[9,'pause']]);
  assert.deepEqual(math.standardPadHolds, [[0,'Space'],[6,'Control'],[7,'Space']]);
  assert.ok(Math.abs(math.stickAxis(.5) - (.5 - .16) / .84) < 1e-12);
  assert.ok(Math.abs(math.advancePedal(0, 1, .02) - (1 - Math.exp(-14 * .02))) < 1e-12);
});
