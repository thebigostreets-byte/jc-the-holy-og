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

const defaults = manifest.defaults || {};
if (!(Number(defaults.maxConcurrentLoads) >= 1 && Number(defaults.maxConcurrentLoads) <= 8)) errors.push('Manifest maxConcurrentLoads must be between 1 and 8');
if (!(Number(defaults.retryMs) >= 1000)) errors.push('Manifest retryMs must be at least 1000ms');

const finiteVec = (value, length) => Array.isArray(value) && value.length === length && value.every(Number.isFinite);
const ids = new Set();
for (const asset of manifest.assets || []) {
  if (!asset?.id) errors.push('Manifest asset is missing id');
  else if (ids.has(asset.id)) errors.push(`Duplicate manifest asset id: ${asset.id}`);
  else ids.add(asset.id);

  if (!['planned', 'ready'].includes(asset?.status)) errors.push(`Invalid asset status for ${asset?.id || 'unknown asset'}`);
  if (asset?.status === 'ready' && !asset?.src) errors.push(`Ready asset has no src: ${asset.id}`);
  if (asset?.src && (/^(?:\/|\\)/.test(asset.src) || asset.src.includes('..'))) errors.push(`Unsafe/non-portable asset src: ${asset.id}`);
  if (!finiteVec(asset?.position, 3)) errors.push(`Invalid position vector for ${asset?.id || 'unknown asset'}`);
  if (!finiteVec(asset?.rotation, 3)) errors.push(`Invalid rotation vector for ${asset?.id || 'unknown asset'}`);
  if (!finiteVec(asset?.scale, 3) || asset.scale.some(v => v <= 0)) errors.push(`Invalid scale vector for ${asset?.id || 'unknown asset'}`);
  if (asset?.fallback?.type === 'box' && (!finiteVec(asset.fallback.size, 3) || asset.fallback.size.some(v => v <= 0))) errors.push(`Invalid fallback box for ${asset?.id || 'unknown asset'}`);

  const loadDistance = Number(asset?.loadDistance ?? defaults.loadDistance);
  const unloadDistance = Number(asset?.unloadDistance ?? defaults.unloadDistance);
  if (!(loadDistance > 0 && unloadDistance > loadDistance)) errors.push(`Invalid stream distances for ${asset?.id || 'unknown asset'}`);
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

console.log(`JC site validation passed: ${requiredFiles.length} required files, ${ids.size} manifest assets.`);
