import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../jc-map-game.js', import.meta.url), 'utf8');
const deployed = readFileSync(new URL('../dist/client/jc-map-game.js', import.meta.url), 'utf8');
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
function faceStep(current, inputX, inputZ, cameraYaw, dt) {
  const target = Math.hypot(inputX, inputZ) > .12 ? Math.atan2(inputX, -inputZ) : cameraYaw;
  const delta = wrap(target - current);
  return current + Math.max(-dt * 12, Math.min(dt * 12, delta));
}

test('gameplay source and published client mirror remain byte identical', () => {
  assert.equal(source, deployed);
});

test('avatar facing follows desired movement independently of camera heading', () => {
  assert.match(source, /const faceX=desired\.x,faceZ=desired\.z/);
  assert.match(source, /Math\.atan2\(faceX,-faceZ\)/);
  assert.match(source, /portrait\.rotation\.y=Math\.PI\+facingYaw/);
  assert.match(source, /forward\.set\(Math\.sin\(yaw\), 0, -Math\.cos\(yaw\)\)/);
  assert.match(source, /right\.set\(Math\.cos\(yaw\), 0, Math\.sin\(yaw\)\)/);
});

test('reverse stick turns JC a full half-circle without changing camera yaw', () => {
  let facing = 0;
  for (let i = 0; i < 30; i++) facing = faceStep(facing, 0, 1, 0, 1/60);
  assert.ok(Math.abs(Math.abs(wrap(facing)) - Math.PI) < .001);
});

test('diagonal and sideways stick directions can face any compass direction', () => {
  for (const [x, z] of [[1,0],[-1,0],[1,1],[-1,-1],[0,-1]]) {
    let facing = 0;
    for (let i = 0; i < 45; i++) facing = faceStep(facing,x,z,0,1/60);
    assert.ok(Math.abs(wrap(facing-Math.atan2(x,-z)))<.001, `direction ${x},${z}`);
  }
});

test('turning takes the shortest angular path and stays frame-rate bounded', () => {
  const current = Math.PI - .02;
  const target = -Math.PI + .02;
  const next = faceStep(current,Math.sin(target),-Math.cos(target),0,1/60);
  assert.ok(wrap(next-current)>0);
  assert.ok(Math.abs(wrap(next-current)) <= 12/60 + 1e-9);
});

test('idle follows camera orientation without forcing a movement vector', () => {
  let facing = 0;
  for (let i = 0; i < 30; i++) facing = faceStep(facing,0,0,Math.PI/2,1/60);
  assert.ok(Math.abs(wrap(facing-Math.PI/2))<.001);
});
