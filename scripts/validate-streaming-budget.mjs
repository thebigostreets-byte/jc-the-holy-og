import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('assets/models/manifest.json', 'utf8'));
const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
const errors = [];

if (assets.length > 256) errors.push(`Manifest has ${assets.length} assets; streamed landmark budget is 256`);
const highPriority = assets.filter(asset => asset?.priority === 'high').length;
if (highPriority > 32) errors.push(`Manifest has ${highPriority} high-priority assets; budget is 32`);

for (const asset of assets) {
  const id = asset?.id || 'unknown asset';
  const loadDistance = Number(asset?.loadDistance ?? manifest.defaults?.loadDistance);
  const unloadDistance = Number(asset?.unloadDistance ?? manifest.defaults?.unloadDistance);
  if (Number.isFinite(loadDistance) && Number.isFinite(unloadDistance) && unloadDistance - loadDistance < 25) {
    errors.push(`Streaming hysteresis is too small for ${id}; require at least 25m`);
  }
  if (asset?.fallback?.type === 'box' && Array.isArray(asset.fallback.size)) {
    const volume = asset.fallback.size.reduce((product, value) => product * Number(value), 1);
    if (!Number.isFinite(volume) || volume > 10_000_000) errors.push(`Fallback volume exceeds budget for ${id}`);
  }
}

if (errors.length) {
  console.error('JC streaming budget validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`JC streaming budget passed: ${assets.length} assets, ${highPriority} high priority.`);
