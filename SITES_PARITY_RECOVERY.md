# JC The Holy OG — Sites parity recovery (2026-11-18)

## Scope and provenance
This branch is a non-production recovery branch based on the existing November 8–9 Phase 2 pilot, PR #38 (commit e53647b30ffb2455fe3e8f1ab06bc26a7853ce75). It preserves the pilot source files rather than recreating the game from chat descriptions.

Authoritative Sites projects referenced in prior work:
- Original: appgprj_6a8a9fc9aca081918d4dd6b12bf40002
- Separate Latest Build: appgprj_6af0e1b839408191b8837adf1cc8bbd2
- Previously recorded original public URL: https://jc-the-holy-og.ill5299.chatgpt.site
- GitHub source: https://github.com/thebigostreets-byte/jc-the-holy-og

**Not a complete Sites export.** The latest Sites project's source and assets have not been obtained, so this branch cannot claim parity with the Latest Build.

## Existing recoverable code
- This branch carries PR #38's non-destructive 20-asset Strip pilot and cutout registry.
- PR #38 is a draft and requires full hydrated build, alpha/foreground validation, actual desktop and mobile rendering review, and flight review before release.
- Other changes remain isolated in open PRs, including #32 (100 JC poses), #35 (mobile HUD), #34 (NPC/save-state protection), #31 (graphics recovery), and #30 (flight safeguards). Do not assume those branches are integrated.

## Latest Sites requirements recorded in development conversations (unverified implementation)
- Consistent street-level detail across Las Vegas, with correct road textures and mapped buildings; avoid distant flight imagery used as blurry ground material.
- Reliable world streaming, predictive prefetch, LOD and fully functioning city downloads.
- JC front/back pose coverage, stable third-person camera, flight acceleration/braking, altitude control, landing and controller/touch bindings.
- Satan sprites and meaningful supernatural abilities with causal gameplay consequences.
- Angelic Stadium, nighttime lighting and specific road corridor from Flamingo/Palos Verdes to Flamingo/Maryland Parkway.
- Older phones must remain playable, without silently deleting working game content.

## Safe parity workflow
1. Obtain original Sites source or reconstruct individual files only from verifiable source assets and commits.
2. Compare each recovered source file to this branch and main; integrate only grounded changes.
3. Run npm ci, hydrate, build, asset verification and all game/regression tests.
4. Verify genuine browser gameplay on desktop and mobile, especially flight, roads and building cutouts.
5. Review staged changes; do not merge PR #38 or push to gh-pages until the above acceptance gates pass.
6. Deploy via the existing workflow in main after release approval.

No tests or visual certification are claimed by this document.
