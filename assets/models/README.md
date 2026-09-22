# JC GLB Streaming Assets

This directory is intentionally safe when models are missing.

## Add a model

1. Commit the GLB somewhere under `assets/models/`.
2. Edit `manifest.json`.
3. Set the matching asset to:
   - `"status": "ready"`
   - `"src": "/assets/models/your-file.glb"`
4. Set `position`, `rotation` (radians), and `scale`.
5. Keep a fallback so the city still renders if the GLB fails.

The WebGL2 runtime loads ready models only when JC is nearby and unloads them when he moves away. Missing files do not stop gameplay.
