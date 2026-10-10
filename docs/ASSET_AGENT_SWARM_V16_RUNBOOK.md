# JC Asset Agent Swarm v16 — branch integration

This branch introduces a **read/write scoped** 10-role asset swarm contract. Download the executable local CLI and tests from the accompanying `JC-Asset-Agent-Swarm-v16.zip` deliverable.

Roles: coordinator, geometry, vehicles, characters, buildings, textures, reflections, animation, performance, QA.

**Safety and quality:** Each agent may read the workspace but may only write to its own assigned directory. All CLI writes are audited with SHA-256. Changes are staged on a feature branch; no automatic deployment or main-branch merge. The CLI does not run LLM agents by itself; external agent runners must invoke it. It is not a hardened security sandbox for arbitrary shell commands.

**Asset pipeline:** The downloadable package includes the v15 ImageGen bridge's reusable source and recipe files, so the textures role can invoke the established material pipeline. Full 53-model processing, photorealism certification, live reflections, and JC deployment remain separate tasks.

**Tests:** `python -m unittest discover -s tests -v` (6/6 passed locally).
