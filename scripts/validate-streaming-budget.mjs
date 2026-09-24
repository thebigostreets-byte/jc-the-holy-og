import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('assets/models/manifest.json', 'utf8'));
const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
const errors = [];
const defaults = manifest.defaults ?? {};
const maxConcurrentLoads = Number(defaults.maxConcurrentLoads);
const retryMs = Number(defaults.retryMs);
const ids = new Set();
const allowedPriorities = new Set(['low', 'normal', 'high']);
const allowedStatuses = new Set(['planned', 'ready']);

if (assets.length > 256) errors.push(`Manifest has ${assets.length} assets; streamed landmark budget is 256`);
const highPriority = assets.filter(asset => asset?.priority === 'high').length;
if (highPriority > 32) errors.push(`Manifest has ${highPriority} high-priority assets; budget is 32`);
if (!Number.isInteger(maxConcurrentLoads) || maxConcurrentLoads < 1 || maxConcurrentLoads > 8) {
  errors.push('Default maxConcurrentLoads must be an integer from 1 through 8');
}
if (!Number.isFinite(retryMs) || retryMs < 1000 || retryMs > 300000) {
  errors.push('Default retryMs must stay between 1s and 5m');
}

const finiteVector3 = value => Array.isArray(value) && value.length === 3 && value.every(component => Number.isFinite(Number(component)));

for (const asset of assets) {
  const id = typeof asset?.id === 'string' ? asset.id.trim() : '';
  const label = id || 'unknown asset';
  if (!id) errors.push('Every streamed asset requires a non-empty id');
  else if (ids.has(id)) errors.push(`Duplicate streamed asset id: ${id}`);
  else ids.add(id);

  if (!allowedPriorities.has(asset?.priority)) errors.push(`Invalid priority for ${label}`);
  if (!allowedStatuses.has(asset?.status)) errors.push(`Invalid status for ${label}`);
  if (asset?.status === 'ready' && (typeof asset?.src !== 'string' || !asset.src.trim())) errors.push(`Ready asset ${label} requires a source path`);
  if (asset?.status === 'planned' && asset?.src != null) errors.push(`Planned asset ${label} must not advertise a source path`);

  if (!finiteVector3(asset?.position)) errors.push(`Invalid position transform for ${label}`);
  if (!finiteVector3(asset?.rotation)) errors.push(`Invalid rotation transform for ${label}`);
  if (!finiteVector3(asset?.scale) || asset.scale.some(value => Number(value) <= 0 || Number(value) > 100)) errors.push(`Invalid scale transform for ${label}`);

  const loadDistance = Number(asset?.loadDistance ?? defaults.loadDistance);
  const unloadDistance = Number(asset?.unloadDistance ?? defaults.unloadDistance);
  if (Number.isFinite(loadDistance) && Number.isFinite(unloadDistance) && unloadDistance - loadDistance < 25) {
    errors.push(`Streaming hysteresis is too small for ${label}; require at least 25m`);
  }
  if (asset?.fallback?.type === 'box' && Array.isArray(asset.fallback.size)) {
    const dimensions = asset.fallback.size.map(Number);
    if (dimensions.length !== 3 || dimensions.some(value => !Number.isFinite(value) || value <= 0 || value > 1000)) {
      errors.push(`Fallback dimensions are invalid for ${label}`);
      continue;
    }
    const volume = dimensions.reduce((product, value) => product * value, 1);
    if (!Number.isFinite(volume) || volume > 10_000_000) errors.push(`Fallback volume exceeds budget for ${label}`);
  }
}

if (errors.length) {
  console.error('JC streaming budget validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`JC streaming budget passed: ${assets.length} assets, ${highPriority} high priority, ${maxConcurrentLoads} concurrent loads.`);
