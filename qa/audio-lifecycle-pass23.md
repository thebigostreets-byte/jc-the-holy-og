# JC The Holy OG — Pass 23 Audio Lifecycle
Base: main a421189d76ff75b8754a8f8d79da99b3340fc431 (2026-10-11).
Scope: jc-audio.js and matching dist/client copy. This does not alter background-music.js.
Distinct runtime changes: (1) bounded 32 active sound-effect voices; (2) release effect voices on ended; (3) stop and disconnect ambient voices on disposal; (4) close WebAudio context and release gain nodes on disposal; (5) remove gesture listeners on disposal; (6) recover from partial AudioContext initialization; (7) isolate effect-node creation failures and clean partial nodes; (8) recover from synchronous resume and settings-update failures; (9) prevent disposed instances from restarting.
Evidence: Node 22 local test tests/audio-lifecycle.mjs: 40 assertions passed. Source syntax passed; Git blob for source is cfd512a0ba5a9055a1c99f5c12c26a520626044a. Focused CI must pass on PR.
Release gates: full regression/build, browser audio, real mobile performance, and authoritative Sites source parity. No merge or deploy until those pass.
