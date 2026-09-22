# JC THE HOLY OG — Sin City

Browser-first WebGL2 open-world action prototype.

## Current master upgrade

The root build now layers `master-upgrade.js` over the existing playable runtime. It preserves the streamed GLB pipeline and adds:

- JC / Satan faction presentation and separate power naming
- 20-ability deck
- mission contracts with Hope / Corruption city state
- halo vehicle with enter/exit, steering, braking and boost
- skateboard / hoverboard mode
- higher-speed flight burst and dynamic flight camera FOV
- destructible hero structures with debris
- visible NPC population backed by a 10,000-citizen simulation envelope and 25 deep-AI slots
- minimap, target lock, day/night toggle and upgraded HUD
- mobile RIDE / BOARD / CAM controls
- adaptive GLB loading with missing-model fallbacks
- local checkpoint persistence
- adaptive rendering and existing facade/impostor detail cheats

## Controls

WASD move/drive, Shift sprint/fast travel, F flight, X cast, Tab powers, Q burst, E vehicle, K board, C hover/camera, T day/night, I target lock, V slam/destruction.

## Asset streaming

`assets/models/manifest.json` is safe when models are missing. Set an asset to `status: ready` and provide a committed GLB path when it becomes available. Planned/missing models do not block gameplay.

## Vegas data

The editable Vegas archive is retained under `assets/vegas-city/`. The browser game must still use runtime-ready extracted/streamable assets rather than attempting to open the ZIP directly.

## Current limitation

The richer Sites-facing `game-full.html` loader references runtime files that are not committed in this repository. The self-contained root `index.html` is therefore the GitHub-verifiable playable build.
