# Pass 27: Control math finite-input resilience

Baseline: main a421189d76ff75b8754a8f8d79da99b3340fc431.
Seven original failure cases reproduced locally: invalid stick deadzone, camera axis, flight angle, smoothing rate, pedal input, gait phase, and score combo clock rollback.
Local Node.js 22.16.0: 8 regression subtests passed; 48,000 ordinary finite-input compatibility comparisons passed.
Source and dist/client are byte-identical.
No claim of full build, browser/device, remote CI, Site parity, merge, or deployment.
Release gate: focused + full CI, browser/mobile controls, source parity and review before merge.
