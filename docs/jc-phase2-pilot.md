# JC Phase 2 — Las Vegas Strip pilot

This is a non-destructive pilot for the existing JC game. **Do not merge or deploy without manual review.** No live version is changed by this branch.

## Integration
- `photo-cutout-rules.js` now gets the same two existing aliases from `jc-pilot-assets.js`. Paths and behavior remain the same.
- New cutouts require rights, mask/foreground, placement, WebGL and alpha reviews; metadata does not prove the images contain no sky/road/valet.
- 3D mesh, colliders, player controls, NPCs, and near-distance gameplay stay in the existing engine.
- `scripts/jc-pilot-plan.mjs` selects 20 distinct slots from the 50,000-slot design: 12 facades, 4 colliders, 2 tiles, 1 vehicle, 1 VFX. It outputs 40 preview/final jobs, all initially **blocked**.
- Target: startup Strip tile `C15_R14`, with exact building IDs and coordinates still unassigned. Existing landmark cutouts are test fixtures; the manifest does **not** assert that they occupy this tile.

## Validate
```sh
node scripts/jc-pilot-plan.mjs > /tmp/jc-pilot-plan.json
node tests/jc-pilot-plan.mjs
npm run hydrate
npm run build
node tests/photo-cutout-lod.mjs
node tests/deployable-client-sync.mjs
```
Before promotion, inspect the pilot in WebGL on desktop and mobile, and confirm flight across tile boundaries with source geometry retained. A metadata review is not a pixel inspection.
