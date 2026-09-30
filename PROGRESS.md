## 2026-09-30 function and repository audit

- Peaceful miracles produce awe rather than fear; dangerous miracles trigger civilians fleeing and authorities responding. NPCs retain the latest event for dialogue context.
- NPC movement now samples terrain under its feet, slides along obstructions and replans blocked routes during active reactions. Blocked characters use stationary poses.
- Slow Time and Stasis affect NPC movement and debris physics. Opening the power wheel or chat pauses debris. Player movement remains independent.
- Every one of the 43 cast handlers is exercised with a valid target in the behavioral regression harness; conversation cancellation, quota reporting, movement, flight, camera, and effect cleanup checks pass.
- GitHub reproduction uses complete text source plus a checksum manifest and asset hydration command. The local preview points at the production client directory. This closes the previously missing source module gap without committing credentials.
- Real-device FPS and browser visual verification remain unmeasured.

## 2026-09-30 gameplay repair

- Fixed DROP ending flight before ground contact, hover resetting airborne altitude, and Sonic Boom toggling boost off.
- Fixed teleport selection null state and mobile/keyboard destination confirmation.
- Failed targeted casts keep grace and cooldowns; REBUILD finds collapsed buildings.
- Added a shared transient-effect manager with mobile caps: 18 rings, 8 beams, 6 sprites; rain uses one instanced draw call. Effects expire by elapsed time and clear on restart/editor exit.
- New powers use existing verified art assets instead of requesting missing image URLs.
- Behavior tests cover teleport selection, failed casts, cooldowns, capped destruction, effect cleanup, and flight state. Existing controls, camera, poses, NPC, mobile asset, and Worker checks passed. iPhone FPS remains unmeasured.

# JC durable checkpoint

## September 28: runtime and load pressure

- Started from the deployed v156 source `a8494c29f66fe892083189dbcec2ef58dd755ef3`.
- Miracle textures now load on first use, are resized to 512 px, and use an eight-texture LRU cap. Startup no longer waits on all 39 miracle images. Shared gameplay textures are bounded to 512 px; map GLB textures to 1024 desktop / 512 mobile.
- GLB attribute decoding now copies contiguous accessor blocks instead of running a DataView call per vertex component. On local `C15_R14` (3.59 MB, 3,074 accessors, 632,020 components), the decoder measured 2.7 ms versus 17.6 ms for the former component loop (6.4× for accessor decoding alone). Full tile parsing/texture decode still has separate costs.
- JC caches terrain height queries on an 8 m grid with a 512-entry LRU, and checks nearby collision cells instead of scanning all loaded buildings for fallback height or clear landing tests. Destroyed buildings leave the collision grid.
- Tile streaming evicts obsolete tiles as replacements arrive, limiting a nine-tile region to at most ten loaded tiles during replacement. The building chooser builds its large option list only when focused.
- Distant building impostors use 8 × 192 px atlases on desktop and 4 × 128 px on mobile, reducing color and depth target allocation. Frame adaptation now lowers detail below ~45 FPS and raises it only above ~57 FPS.
- Regression coverage: real 616-building / 1,223-mesh mobile startup fixture, GLB packed/strided decoding, bounded height cache, destruction collision removal, near tile-edge collision, camera/gait, building atlas, lightweight gameplay, dialogue and worker checks.
- Browser WebGL visual playtest is still unavailable in this environment; source checks and fixture tests do not prove that every device runs glitch-free. Recheck on target phone/desktop after deployment.

## September 28: walking and fixed rear camera

- Recovered v155 source (9298d7bccabdd2b81ac1778ab900b954b8372b8b) after workspace maintenance removed unfinished edits.
- Runtime atlas is WebP with alpha to stay within the host's expanded deployment size limit; the original PNG remains in source.
- Inspected old walk frames 23–30: same leg remained forward throughout. Replaced locomotion with transparent rear-view sheet at character-art/jc-rear-walk-v1.png, recovered from the generated image already saved in the conversation.
- Built-in image generation prompt: realistic man with shoulder-length brown hair, white hoodie/joggers/high-top shoes; transparent 4×2 atlas; fixed full back view; eight sequential left-contact, passing, right-contact and passing phases; opposing arm swing; no extra limbs, floor or labels. Runtime crops and aligns cells in rear-walk.js. Original sheet preserved.
- Walk and sprint use this rear-facing cycle at bounded cadences. Sprint currently accelerates the walking cycle; it is not a newly authored distinct running animation. Idle uses a close-foot rear frame. Flight/miracle art remains unchanged and lacks matching rear views.
- Camera stays 9 units behind heading, 5.3 units above player origin, FOV 62. No velocity look-ahead, vertical orbit, follow lag or flight zoom changes. Horizontal drag/right stick steers heading. Walls may shorten camera distance.
- Disabled editor OrbitControls updates during play so editor damping cannot alter the fixed gameplay camera.
- Build, gait/camera regression checks at 20–120 FPS, and lightweight rendering/movement/chat/power smoke checks passed. Artwork inspected; live WebGL visual playtest remains unverified because the available browser could not initialize WebGL. Do not claim a fully rigged or photorealistic character.

Production baseline before the walking update: v155, source 9298d7bccabdd2b81ac1778ab900b954b8372b8b.

## Current request

Use image-based directional views for JC and Strip buildings. User accepts a 2D multi-angle method; do not describe it as a volumetric character or claim photoreal gameplay without visual proof.

## Buildings

- building-impostors.js captures eight compass views and one roof view from each eligible building's current geometry/materials.
- Full geometry remains near the camera, during intermediate overhead flight angles, in the editor, after material/transform changes, and during destruction.
- Budget: six 128px-per-view atlases on mobile; twelve 256px-per-view atlases on desktop. One capture per frame.
- Existing generated facade images are reused. These are not newly photographed or measured landmark facades.
- buildingViews=off in the URL disables the cache for comparison.
- window.studio.buildingViews.stats() exposes capture readiness and approximate color-texture memory.

## Still unfinished

- JC is image-based; current animation images are not nine matched directional views for every action.
- Realistic rigged JC generation was not submitted: connected Fal account rejected upload due to balance_exhausted (403). Do not retry or switch accounts to bypass this.
- Local browser download failed (truncated archive from CDN). Do not claim visual verification based solely on unit tests or deployment success.
- NPC backend: previous session found OpenAI keys exhausted and no Groq key. No working AI dialogue claim until a provider succeeds live.

## Work preservation

Keep changes in the Sites source repository. Scratch can be pruned; recover the checkout through Sites. Never embed credentials in this file or source.

## 2026-09-28 — rear pose and photographic facade pass
- Added rear running sheet (8 frames) and rear flight sheet (9 states); separate run frames are no longer overwritten by walking. Existing pose assets retained. Flight source rectangles account for generated nonuniform row spacing.
- Shared four photographic facade textures across loaded source building geometry; nine-angle distant impostors retain near geometry/collision/destruction. Generated facade appearance is not a surveyed facade reconstruction.
- Start with one Strip tile; stream neighbors after initial readiness. Removed disposable WebGL preflight context; actual renderer initialization decides graphics support. City fetches retry once with bounded timeouts; optional textures time out to existing fallback.
- Fixed rear camera and wall protection verified by existing rear-camera test. Control, GLB fixture (616 buildings/1,223 meshes), impostor, lightweight gameplay and Worker tests passed.
- Full GPU visual verification remains unavailable in the test browser; WebGL-unavailable fallback remains necessary. No zero-error or full-city photorealism certification.
