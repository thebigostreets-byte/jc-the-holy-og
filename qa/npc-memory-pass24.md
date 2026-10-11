# JC The Holy OG — Pass 24 NPC memory integrity

Base: `main` at `a421189d76ff75b8754a8f8d79da99b3340fc431` (2026-10-11).
Scope: `npc-memory.js` and byte-identical `dist/client/npc-memory.js` only. No gameplay/asset schema changes; storage key remains `jc-npc-memory-v1`.

Eight original behavioral failures were reproduced against the exact original source (`git hash-object` `d1d2a928036e39a3cf448795c3abdc7939e50555`) and corrected:

1. Invalid memory text with hostile `toString` crashed event capture.
2. Rejected memory entries still created empty NPC records.
3. Clock rollback incorrectly deduplicated distinct events.
4. Infinite event timestamps serialized as `null`.
5. A summary limit of zero returned the full history.
6. Restored player-state strings were unbounded.
7. Clearing an empty ID unexpectedly erased all NPCs.
8. Blocked browser localStorage getters prevented store initialization.

Additional guards reject malformed persisted record shapes and invalid IDs, preserve the 40-NPC/18-entry/220-character limits, and retain read/write failure tolerance.

Local Node 22: original NPC memory test passed; 30 new resilience assertions passed; eight baseline failures reproduced and corrected; JavaScript syntax and source/dist parity passed.

Release gates: complete game build, full regression suite, browser/mobile persistence and memory checks, authoritative Sites-source parity. Do not merge/deploy before these pass.
