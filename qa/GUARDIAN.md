# JC Guardian runtime defense core

This module is a **proposed integration**, not a production-enabled crash shield. It is side-effect-free until imported into the real game loop.

## Covered mechanisms
- Reject invalid or out-of-bound positions before applying them.
- Detect sustained slow-frame events using frame-duration measurements.
- Contain **synchronous** subsystem faults using guarded execution, fallback and a cooldown circuit.
- Keep bounded event history without collecting personal dialogue.

## Integration sequence
1. Add a Guardian instance to game initialization and supply a redacted incident reporter.
2. Measure frame durations and call `guardian.frame(durationMs)`; use slow-frame signals to lower decorative quality, not to freeze player controls.
3. Apply `guardian.position(nextPosition, worldBounds)` before teleports and checkpoint restoration. Restore the last known safe position on failure.
4. Wrap only independent, recoverable synchronous NPC/VFX subsystems in `guardian.execute`. Never wrap the entire render loop or mission commits.
5. For fetch/TTS/AI, add AbortController timeouts and idempotency separately; this module does not provide network cancellation.
6. Add explicit memory budgets, GPU resource accounting, real-device visual tests and post-deploy smoke checks before claiming complete coverage.

## Guarantees and limits
This module does **not** guarantee prevention of all 1,000 scenarios, auto-fix source code, fix shaders, catch worker errors, or replace physical device testing. Its tests are deterministic Node assertions and do not verify actual gameplay. All active integrations must be reviewed and tested in a follow-up PR.
