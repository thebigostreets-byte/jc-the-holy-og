import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const publicAssets=new Set(JSON.parse(await readFile('scripts/public-assets.json','utf8')));
const deployableFiles=[
  'map.html',
  'cinematic-look.js',
  'jc-character3d.js',
  'npc-dialogue.js',
  'npc-conversation.js',
  'npc-memory.js',
  'physical-building-materials.js',
  'map-engine.js',
  'jc-map-game.js',
  'jc-npcs.js',
  'jc-audio.js',
  'jc-crowd.js',
  'jc-traffic.js',
  'npc-contacts.js',
  'vegas-streets.js',
  'pose-cleanup.js',
  'rear-walk.js',
  'master-upgrade.js',
  'photorealism-pbr.js',
  'rooftop-details.js'
];

for(const file of deployableFiles){
  assert(publicAssets.has(file),`scripts/public-assets.json is missing ${file}`);
  const source=await readFile(file,'utf8');
  const deployed=await readFile(`dist/client/${file}`,'utf8');
  assert.equal(deployed,source,`dist/client/${file} is stale; deployment would not include the source change`);
}

for(const entry of ['map-engine.js','jc-map-game.js','jc-npcs.js']){
  const source=await readFile(entry,'utf8');
  const imports=[...source.matchAll(/from\s+['"]\.\/([^'"]+\.js)['"]/g)].map(match=>match[1]);
  for(const dependency of imports){
    assert(publicAssets.has(dependency),`${entry} imports ${dependency}, but it is missing from scripts/public-assets.json`);
    if(['jc-audio.js','jc-crowd.js','jc-traffic.js','npc-contacts.js','vegas-streets.js','photorealism-pbr.js','rooftop-details.js'].includes(dependency))
      await readFile(`dist/client/${dependency}`,'utf8');
  }
}

const html=await readFile('map.html','utf8');
const deployedHtml=await readFile('dist/client/map.html','utf8');
assert.equal(deployedHtml,html,'dist/client/map.html is stale');
for(const dependency of [...html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+\.(?:js|css))["']/g)].map(match=>match[1])){
  assert(publicAssets.has(dependency),`map.html references ${dependency}, but it is missing from scripts/public-assets.json`);
}

console.log(`Deployable-client sync passed: ${deployableFiles.length} source files match dist/client and new gameplay imports are included.`);
