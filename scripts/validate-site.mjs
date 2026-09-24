import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'index.html',
  'master-upgrade.js',
  'assets/models/manifest.json',
  'assets/facades/hotel.jpg',
  'assets/facades/holy.jpg',
  'assets/facades/demonic.jpg',
  'assets/facades/neon.jpg',
  'webgl1.html',
  'game.html',
  'real-city-climb-demo.html'
];

const errors = [];
for (const file of requiredFiles) {
  try { await access(file); }
  catch { errors.push(`Missing required file: ${file}`); }
}

const index = await readFile('index.html', 'utf8');
const master = await readFile('master-upgrade.js', 'utf8');
const manifest = JSON.parse(await readFile('assets/models/manifest.json', 'utf8'));

if (!index.includes("getContext('webgl2'")) errors.push('index.html must explicitly request WebGL2');
if (!index.includes('src="./master-upgrade.js')) errors.push('index.html must load master-upgrade.js relatively');
if (index.includes("'/assets/") || index.includes('"/assets/')) errors.push('index.html contains root-relative /assets paths that break GitHub Pages subpaths');
if (!index.includes('state.paused||state.inVehicle||state.board')) errors.push('base runtime must isolate player movement while driving');
if (!index.includes('maxConcurrentAssetLoads')) errors.push('GLB streaming concurrency guard is missing');
if (!master.includes('sharedInput.moveY') || !master.includes('sharedInput.moveX')) errors.push('mobile/controller shared vehicle input is missing');
if (!master.includes("version:'2026.09.23-master-v7'")) errors.push('master runtime version marker is stale');

for (const facade of ['hotel.jpg','holy.jpg','demonic.jpg','neon.jpg']) {
  if (!index.includes(`./assets/facades/${facade}`)) errors.push(`index.html must reference ${facade} relatively`);
}

if (!(Number.isInteger(manifest.version) && manifest.version >= 1)) errors.push('Manifest version must be a positive integer');
if (manifest.coordinateSystem !== 'local-game-meters') errors.push('Manifest coordinateSystem must remain local-game-meters');
const defaults = manifest.defaults || {};
const defaultLoadDistance = Number(defaults.loadDistance);
const defaultUnloadDistance = Number(defaults.unloadDistance);
const defaultRetryMs = Number(defaults.retryMs);
if (!(Number(defaults.maxConcurrentLoads) >= 1 && Number(defaults.maxConcurrentLoads) <= 8)) errors.push('Manifest maxConcurrentLoads must be between 1 and 8');
if (!(Number.isFinite(defaultRetryMs) && defaultRetryMs >= 1000 && defaultRetryMs <= 300000)) errors.push('Manifest retryMs must be finite and between 1000ms and 300000ms');
if (!(Number.isFinite(defaultLoadDistance) && defaultLoadDistance > 0 && defaultLoadDistance <= 10000)) errors.push('Manifest default loadDistance must be finite and between 0 and 10000m');
if (!(Number.isFinite(defaultUnloadDistance) && defaultUnloadDistance > defaultLoadDistance && defaultUnloadDistance <= 20000)) errors.push('Manifest default unloadDistance must be finite, exceed loadDistance, and be at most 20000m');
if (!['box'].includes(defaults.fallback)) errors.push('Manifest default fallback must be a supported type');
if (!Array.isArray(manifest.assets)) errors.push('Manifest assets must be an array');

const finiteVec = (value, length) => Array.isArray(value) && value.length === length && value.every(Number.isFinite);
const ids = new Set();
const names = new Set();
const sources = new Set();
for (const asset of manifest.assets || []) {
  if (!asset?.id || typeof asset.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(asset.id)) errors.push('Manifest asset has an invalid id');
  else if (ids.has(asset.id)) errors.push(`Duplicate manifest asset id: ${asset.id}`);
  else ids.add(asset.id);

  if (!asset?.name || typeof asset.name !== 'string' || !asset.name.trim()) errors.push(`Manifest asset has no usable name: ${asset?.id || 'unknown asset'}`);
  else if (names.has(asset.name.trim().toLowerCase())) errors.push(`Duplicate manifest asset name: ${asset.name}`);
  else names.add(asset.name.trim().toLowerCase());

  if (!['planned', 'ready'].includes(asset?.status)) errors.push(`Invalid asset status for ${asset?.id || 'unknown asset'}`);
  if (asset?.status === 'ready' && !asset?.src) errors.push(`Ready asset has no src: ${asset.id}`);
  if (asset?.status === 'planned' && asset?.src) errors.push(`Planned asset must not advertise a loadable src: ${asset.id}`);
  if (asset?.src && (!asset.src.toLowerCase().endsWith('.glb') || /^(?:\/|\\)/.test(asset.src) || asset.src.includes('..'))) errors.push(`Unsafe/non-GLB asset src: ${asset.id}`);
  if (asset?.src && sources.has(asset.src)) errors.push(`Duplicate manifest asset src: ${asset.src}`);
  if (asset?.src) sources.add(asset.src);
  if (!finiteVec(asset?.position, 3)) errors.push(`Invalid position vector for ${asset?.id || 'unknown asset'}`);
  if (!finiteVec(asset?.rotation, 3)) errors.push(`Invalid rotation vector for ${asset?.id || 'unknown asset'}`);
  if (!finiteVec(asset?.scale, 3) || asset.scale.some(v => v <= 0 || v > 1000)) errors.push(`Invalid scale vector for ${asset?.id || 'unknown asset'}`);
  if (!['low','normal','high'].includes(asset?.priority)) errors.push(`Invalid streaming priority for ${asset?.id || 'unknown asset'}`);
  if (asset?.fallback?.type !== 'box') errors.push(`Unsupported fallback type for ${asset?.id || 'unknown asset'}`);
  if (asset?.fallback?.type === 'box' && (!finiteVec(asset.fallback.size, 3) || asset.fallback.size.some(v => v <= 0))) errors.push(`Invalid fallback box for ${asset?.id || 'unknown asset'}`);

  const loadDistance = Number(asset?.loadDistance ?? defaults.loadDistance);
  const unloadDistance = Number(asset?.unloadDistance ?? defaults.unloadDistance);
  if (!(Number.isFinite(loadDistance) && Number.isFinite(unloadDistance) && loadDistance > 0 && loadDistance <= 10000 && unloadDistance > loadDistance && unloadDistance <= 20000)) errors.push(`Invalid stream distances for ${asset?.id || 'unknown asset'}`);

  if (asset?.status === 'ready' && asset?.src) {
    try { await access(asset.src); }
    catch { errors.push(`Ready asset file is missing: ${asset.id} -> ${asset.src}`); }
  }
}

for (const file of ['webgl1.html','game.html','real-city-climb-demo.html']) {
  const body = await readFile(file, 'utf8');
  if (!body.includes('./index.html')) errors.push(`${file} must redirect relatively to ./index.html`);
}

if (errors.length) {
  console.error('JC site validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`JC site validation passed: ${requiredFiles.length} required files, ${ids.size} manifest assets, ${sources.size} streamed sources.`);
