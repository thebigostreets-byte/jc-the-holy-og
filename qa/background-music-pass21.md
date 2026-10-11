# JC The Holy OG — background music lifecycle pass 21

Base: main at a421189d76ff75b8754a8f8d79da99b3340fc431.

Scope: background music panel only; no gameplay audio, mission, pose, or streaming changes.

Local verification: 31 mock-DOM assertions passed under Node.js 22.16.0. Full browser and mobile checks are outstanding.

Changes: avoid unrelated autoplay, prevent duplicate panels, lazily create uploaded-media object URLs, revoke URLs on track changes, preserve playback on canceled uploads, catch media errors, provide idempotent disposal, and recover detached panels.

Release gates: source/deployment parity, complete regression suite, production build, browser and mobile playback tests, authoritative Sites source verification.
