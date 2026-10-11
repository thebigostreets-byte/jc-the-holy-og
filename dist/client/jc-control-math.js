// Frame-rate independent input response shared by desktop, touch and gamepad.
// Treat malformed device and saved-state values as neutral, never as NaN motion.
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const unit = value => Math.max(-1, Math.min(1, finite(value)));
const elapsed = value => Math.max(0, Math.min(.05, finite(value)));

export function stickAxis(value, deadzone = .16) {
  const axis = unit(value);
  // An invalid deadzone must not divide by zero or reverse stick direction.
  const threshold = Math.max(0, Math.min(.95, finite(deadzone, .16)));
  return Math.abs(axis) <= threshold ? 0 : Math.sign(axis) * (Math.abs(axis) - threshold) / (1 - threshold);
}
// Standard Gamepad API mapping; preserve the controller layout documented in game-full.html.
export const standardPadActions=[[0,'jump'],[1,'cast'],[2,'hypersonic'],[3,'car'],[4,'flight'],[5,'shield'],[8,'wheel'],[9,'pause']];
export const standardPadHolds=[[0,'Space'],[6,'Control'],[7,'Space']];

export function advanceLook(yaw, pitch, x, y, dt) {
  const step = elapsed(dt);
  const lookX = unit(x), lookY = unit(y);
  // Precision near center, action-game turn speed at the rim.
  const yawRate = lookX * (2.6 + 2.6 * Math.abs(lookX));
  const pitchRate = lookY * (1.9 + 1.5 * Math.abs(lookY));
  return {
    yaw: finite(yaw) + yawRate * step,
    pitch: Math.max(-.72, Math.min(.72, finite(pitch) - pitchRate * step))
  };
}

export function setFlightForward(target, yaw, pitch) {
  // Preserve the existing target identity and forward convention.
  const safeYaw = finite(yaw);
  const safePitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, finite(pitch)));
  const horizontal = Math.cos(safePitch);
  target.set(Math.sin(safeYaw) * horizontal, Math.sin(safePitch), -Math.cos(safeYaw) * horizontal);
  return target;
}

export function response(rate, dt) {
  return 1 - Math.exp(-Math.max(0, finite(rate)) * Math.max(0, finite(dt)));
}

export function advancePedal(value, target, dt, rise = 14, fall = 9) {
  const current = unit(value), clampedTarget = unit(target);
  const rising = Math.abs(clampedTarget) > Math.abs(current);
  const rate = Math.max(0, finite(rising ? rise : fall, rising ? 14 : 9));
  const next = current + (clampedTarget - current) * response(rate, elapsed(dt));
  return Math.abs(next) < .006 && Math.abs(clampedTarget) < .001 ? 0 : unit(next);
}

export function advanceGait(phase, speed, dt, sprint = false) {
  const cycle = ((finite(phase) % 8) + 8) % 8;
  const velocity = Math.max(0, finite(speed));
  return (cycle + Math.min(sprint ? 14 : 10, velocity * (sprint ? 1.1 : 1.35)) * elapsed(dt)) % 8;
}

export function advanceChain(previous, time) {
  const previousCount = Math.max(0, Math.min(8, Math.floor(finite(previous?.count))));
  const previousLast = finite(previous?.last, -Infinity);
  const timestamp = finite(time);
  const interval = timestamp - previousLast;
  const count = previousCount > 0 && interval >= 0 && interval <= 12 ? Math.min(8, previousCount + 1) : 1;
  const points = Math.max(0, finite(previous?.points));
  return { count, last: timestamp, points: Math.min(Number.MAX_SAFE_INTEGER, points + 100 * count) };
}
