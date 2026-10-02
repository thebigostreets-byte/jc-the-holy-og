# JC The Holy OG

Play: https://jc-the-holy-og.ill5299.chatgpt.site/map?play=1

## Restore and build

The source modules, build scripts and tests are in this repository. Large game assets are restored from the public release using the checked SHA-256 asset manifest; credentials are not needed.

```sh
npm run hydrate
npm run build
npm run verify:assets
```

For local preview, run `npm ci`, then `npm run dev`. The preview serves `dist/client`; use `/map?play=1` to play. NPC dialogue needs the published Worker endpoint and is not simulated by the static local preview.

`npm run hydrate` downloads missing or changed assets with four parallel requests and verifies each checksum before saving. Existing matching files are reused. If the hosted assets no longer match this checkout, the command reports a checksum error rather than overwriting them.

Production publishing uses Sites and the project ID in `.openai/hosting.json`. API credentials stay in hosted secrets, outside source control. The published game and repository must use the same asset manifest.

## Gameplay checks

```sh
node tests/gameplay-regressions.mjs
node tests/flight-state.mjs
node tests/control-upgrade.mjs
node tests/npc-motion.mjs
node tests/performance-guardrails.mjs
node scripts/validate-dialogue.mjs
node scripts/validate-worker.mjs
```

Checks cover flight, teleport selection, blocked casts, cooldowns, bounded effects, NPC movement and dialogue request cancellation. Device FPS and visual quality still require testing on real hardware.

## Accessibility and controls

The in-game HUD honors the operating system's `prefers-reduced-motion` setting. When enabled, decorative HUD transitions and animations are minimized while gameplay feedback, status messages, and controls remain available.

For keyboard play, use the controls shown in the HUD. On touch devices, the left stick moves, the right stick looks and steers flight pitch, and the action buttons can be expanded with **MORE**. Sound settings are available from **SOUND** and persist on the device.
