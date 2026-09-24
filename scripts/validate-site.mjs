import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'index.html',
  'master-upgrade.js',
  'assets/models/manifest.json',
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

const ids = new Set();
for (const asset of manifest.assets || []) {
  if (!asset?.id) errors.push('Manifest asset is missing id');
  else if (ids.has(asset.id)) errors.push(`Duplicate manifest asset id: ${asset.id}`);
  else ids.add(asset.id);
  if (asset?.status === 'ready' && !asset?.src) errors.push(`Ready asset has no src: ${asset.id}`);
  const loadDistance = Number(asset?.loadDistance ?? manifest.defaults?.loadDistance);
  const unloadDistance = Number(asset?.unloadDistance ?? manifest.defaults?.unloadDistance);
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
