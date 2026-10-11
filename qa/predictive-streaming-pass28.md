# Pass 28 — Predictive streaming integrity

Baseline: main a421189d76ff75b8754a8f8d79da99b3340fc431.
Original Git blob: 6b75c9a2c758b6478534c0fede53f4437abd79c0.

Focus: malformed player telemetry, invalid prediction horizon, corrupt cache
byte accounting, invalid corridor geometry, detached ArrayBuffers, stale
prefetch completions after clear, and safe prefetch limits.

Local Node 22.16.0: 1048 assertions passed, including 1000 ordinary-input
compatibility comparisons. Original implementation reproduced failures.
The existing predictive-streaming.mjs suite is expected to remain compatible.

Full production build, browser/WebGL, physical mobile and authoritative
Sites source comparison are not verified. Do not deploy from this PR.
