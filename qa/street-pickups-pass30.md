# Pass 30: street pickup integrity

Base: main a421189d76ff75b8754a8f8d79da99b3340fc431

Target: street-pickups.js and dist/client/street-pickups.js.

Verified locally using Node.js 22.16.0: 58 assertions passed using a simulated Three.js scene. JavaScript syntax passed. Tested source blob: 8b88f8a08450bb644e3a781015a61db4e8d42137.

Fixes: initial spawn placement fallback, missing terrain elevation, invalid update timestamps, malformed NPC input, NPC inventory/health recovery, finite inventory grants, 99-item cap, transactional item use, safe drop coordinates, and idempotent cleanup.

Important: deployment copy synchronization, full production build, and browser/mobile gameplay testing remain required before merge. No live Sites source has been confirmed.
