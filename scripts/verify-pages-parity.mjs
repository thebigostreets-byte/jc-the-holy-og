import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, lstat} from 'node:fs/promises';
import path from 'node:path';

async function assertRegularPath(base, asset) {
  let current = base;
  const baseStat = await lstat(current);
  assert.ok(baseStat.isDirectory() && !baseStat.isSymbolicLink(), `unsafe asset root: ${base}`);
  const parts = asset.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const info = await lstat(current);
    assert.ok(!info.isSymbolicLink(), `symlink asset path: ${asset}`);
    assert.ok(i === parts.length - 1 ? info.isFile() : info.isDirectory(),
      `not a regular asset path: ${asset}`);
  }
  return current;
}

export async function verifyPagesAssets(root = process.cwd()) {
  const manifest = JSON.parse(await readFile(path.join(root, 'scripts/public-assets.json'), 'utf8'));
  assert.ok(Array.isArray(manifest) && manifest.length > 0, 'asset manifest must be a nonempty array');
  const seen = new Set();
  for (const asset of manifest) {
    assert.equal(typeof asset, 'string', 'asset paths must be strings');
    assert.ok(asset && !asset.includes('\\') && !asset.startsWith('/') &&
      !asset.split('/').some(part => part === '..' || part === '.' || part === ''),
      `unsafe asset path: ${asset}`);
    assert.ok(!seen.has(asset), `duplicate asset: ${asset}`);
    seen.add(asset);
    const source = await assertRegularPath(root, asset);
    const published = await assertRegularPath(path.join(root, 'dist/client'), asset);
    const [sourceBytes, publishedBytes] = await Promise.all([readFile(source), readFile(published)]);
    assert.equal(sourceBytes.length, publishedBytes.length, `size mismatch: ${asset}`);
    const sha = bytes => createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha(sourceBytes), sha(publishedBytes), `published bytes differ: ${asset}`);
  }
  assert.ok(seen.has('index.html'), 'index.html entrypoint missing from public assets manifest');
  return seen.size;
}
