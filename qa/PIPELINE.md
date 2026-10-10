# JC 1,000-risk rapid QA pipeline

The [risk register](risk-register.csv) maps IDs 0001–1000 to the 20-category adversarial failure inventory. **UNASSESSED is not a failing test**. A row is VERIFIED only after an observed result has a traceable test/log/video or issue reference.

## Daily execution
1. Triager assigns P0–P3 using impact and reproducibility. Link the corresponding issue and test evidence.
2. Work on **P0 before P1**. Batch related issues by system to avoid merge conflicts.
3. Every pull request runs the fast Node regression suites in parallel plus register integrity.
4. On Monday (09:17 UTC) and manual dispatch, restore checksum-pinned assets, build, and verify assets. Large assets are intentionally NOT restored on every pull request.
5. Fixes require reproduction, code change, regression test, green CI, and manual device validation where relevant.
6. Deployment is **not automated**: use Sites publishing with the same asset manifest after a human approves release. Verify actual live game startup, movement, flight, an NPC interaction, mission progress, and mobile touch controls before calling the release healthy.

## Stop/go gates
- P0: crash, data loss, security issue, or game won't launch — blocks release.
- P1: core movement, mission, streaming or ability failure — blocks public release.
- P2/P3: track explicitly; may ship only with approved exceptions.
- Build success and unit tests do not establish visual quality, device FPS, backend AI correctness or live-host success.

## Efficiency
- Keep independent suites parallel; do not run 1,000 full browser tests for each code change.
- Promote each reproduced risk into the smallest deterministic automated regression.
- Run full device, visual, stress and world-streaming checks before release.
- Do not mark untouched risks fixed or verified.
