import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'index.html',
  'map.html',
  'map-startup.js',
  'city-manifest.json',
  'map-engine.js',
  'jc-map-game.js',
  'three.module.js',
  'predictive-streaming.js',
  'physical-building-materials.js',
  'photorealism-pbr.js',
  'photo-facades.js',
  'dist/client/map-engine.js'
];

const errors = [];
for (const file of requiredFiles) {
  try { await access(file); }
  catch { errors.push(`Missing required game file: ${file}`); }
}

const [index, map, engine, distEngine, materials, pbr, facades, manifestText] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('map.html', 'utf8'),
  readFile('map-engine.js', 'utf8'),
  readFile('dist/client/map-engine.js', 'utf8'),
  readFile('physical-building-materials.js', 'utf8'),
  readFile('photorealism-pbr.js', 'utf8'),
  readFile('photo-facades.js', 'utf8'),
  readFile('city-manifest.json', 'utf8')
]);

let cityManifest;
try { cityManifest = JSON.parse(manifestText); }
catch { errors.push('city-manifest.json must contain valid JSON'); cityManifest = {}; }

if (!index.includes('./map.html?play=1')) errors.push('index.html must open the relative 3D map route');
if (/\b(?:src|href)=[\"']\/(?:assets|tiles)\//.test(index)) errors.push('index.html contains root-relative game asset paths');
if (!map.includes('<canvas id="scene"')) errors.push('map.html must expose the 3D scene canvas');
for (const script of ['map-startup.js', 'map-engine.js', 'jc-map-game.js']) {
  if (!map.includes('./' + script)) errors.push(`map.html must load ./${script} relatively`);
}

if (!engine.includes("getContext('webgl2'")) errors.push('3D renderer must prefer a WebGL2 context');
if (!engine.includes("getContext('webgl'")) errors.push('3D renderer must retain a WebGL1 fallback');
if (!engine.includes('new THREE.WebGLRenderer({canvas,context')) errors.push('Three.js renderer must use the selected WebGL context');
if (!engine.includes('setPixelRatio(')) errors.push('Renderer must keep the mobile-aware pixel ratio cap');
if (!engine.includes('createPrefetchCache') || !engine.includes('prefetchedBytes.prefetch')) errors.push('Predictive city tile prefetch is missing');
if (!engine.includes('loadQueue=Promise.resolve()') || !engine.includes('lastStreamCheck<400')) errors.push('City streaming must stay serialized and rate-limited');
if (engine !== distEngine) errors.push('Deployable map-engine.js is out of sync with the source');

if (!engine.includes('createPhotorealDetailMaps') || !engine.includes('applyPhotorealMaterial')) errors.push('City renderer must apply PBR surface detail maps');
if (!materials.includes('roughness=.93;') || !materials.includes('metalness=0;')) errors.push('Residential façades must retain matte, non-metallic material settings');
if (!materials.includes("identity.type==='casino'")) errors.push('Reflective material treatment must be reserved for casino identities');
if (!pbr.includes('roughnessMap') || !pbr.includes('bumpMap')) errors.push('PBR roughness and surface relief maps are required');
if (!facades.includes('photographic-atlas-v2.webp')) errors.push('Photographic facade atlas must remain connected to the city renderer');
if (!engine.includes('vegas-cell-')) errors.push('Photographic Vegas facade fallback is missing');

if (!Array.isArray(cityManifest.manifest?.sections) || cityManifest.manifest.sections.length === 0) errors.push('City manifest must include map sections');
if (!Array.isArray(cityManifest.manifest?.boundsEPSG32611) || cityManifest.manifest.boundsEPSG32611.length !== 4) errors.push('City manifest must define geographic streaming bounds');

if (errors.length) {
  console.error('JC site validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`JC site validation passed: ${requiredFiles.length} game files, WebGL2/WebGL1 setup, streamed map, and PBR city materials.`);
