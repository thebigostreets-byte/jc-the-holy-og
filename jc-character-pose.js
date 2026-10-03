export function selectFlightPose({ diving = false, braking = false, rising = false, descending = false, gliding = false, lateral = 0, boosting = false, fast = false } = {}) {
  if (diving) return 19;
  if (braking) return 21;
  if (rising) return 18;
  if (descending) return 22;
  if (gliding) return 17;
  if (lateral < -0.25) return 15;
  if (lateral > 0.25) return 16;
  if (boosting || fast) return 20;
  return 14;
}

export function selectGroundPose(horizontalSpeed, stepPhase, sprinting = false) {
  if (horizontalSpeed <= 1.1) return 0;
  const frames = sprinting ? [31,32,33,34,35,36,37,38] : [23,24,25,26,27,28,29,30];
  return frames[Math.floor(stepPhase) % frames.length];
}
