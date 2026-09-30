import {cp, mkdir, readFile, writeFile, readdir, unlink} from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const assets = JSON.parse(await readFile(path.join(root, 'scripts/public-assets.json'), 'utf8'));
await mkdir(path.join(root, 'dist/client'), {recursive: true});
const allowed = new Set(assets);
async function prune(directory, prefix = '') {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) await prune(path.join(directory, entry.name), relative + '/');
    else if (!allowed.has(relative)) await unlink(path.join(directory, entry.name));
  }
}
await prune(path.join(root, 'dist/client'));
for (const asset of assets) {
  await mkdir(path.dirname(path.join(root, 'dist/client', asset)), {recursive: true});
  await cp(path.join(root, asset), path.join(root, 'dist/client', asset), {recursive: true});
}
await mkdir(path.join(root, 'dist/server'), {recursive: true});
await cp(path.join(root, 'worker/index.js'), path.join(root, 'dist/server/index.js'));
await mkdir(path.join(root, 'dist/.openai'), {recursive: true});
await writeFile(path.join(root, 'dist/.openai/hosting.json'), await readFile(path.join(root, '.openai/hosting.json')));
console.log('JC game and integrated NPC route built.');
