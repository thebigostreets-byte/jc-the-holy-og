# JC Asset Agent Swarm v16

Read/write agent workflow for the JC The Holy OG 3D asset pipeline. This is a **branch-isolated, reviewable orchestration layer**, not a claim that 10 autonomous LLMs are running continuously.

## Agents and write scopes
- coordinator: `tasks/**`, `reports/**`
- geometry: `assets/geometry/**`
- vehicles: `assets/vehicles/**`
- characters: `assets/characters/**`
- buildings: `assets/buildings/**`
- textures: `assets/materials/**`
- reflections: `runtime/reflections/**`
- animation: `assets/animations/**`
- performance: `runtime/performance/**`
- qa: `reports/**` (read-only for all other asset paths)

All agents may **read** files inside the workspace. Writes are restricted to their assigned paths and recorded in a JSONL audit trail. No agent writes directly to main. QA must pass before a merge.

## Quick start
```bash
python tools/asset_swarm.py init --root ./jc-swarm-workspace
python tools/asset_swarm.py status --root ./jc-swarm-workspace
python tools/asset_swarm.py write --root ./jc-swarm-workspace --agent textures --path assets/materials/sample.json --text '{"roughness":0.45}'
python tools/asset_swarm.py read --root ./jc-swarm-workspace --agent qa --path assets/materials/sample.json
python tools/asset_swarm.py audit --root ./jc-swarm-workspace
```

The CLI is the authorization boundary for cooperative agents. For production security, run untrusted agents in separate OS/container sandboxes with filesystem ACLs, since an agent with arbitrary shell access can bypass a Python-only policy.

## Required production gates
Real vehicle and character geometry, reference-matched Vegas landmarks, PBR calibration, real-time reflection capture, lighting, skeletal animation, natural vegetation, collision integrity, target FPS, and in-game visual approval. A passing code test is not photorealism certification.
