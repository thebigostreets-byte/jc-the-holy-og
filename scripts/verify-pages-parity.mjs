import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';

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
    const source = path.join(root, asset);
    const published = path.join(root, 'dist/client', asset);
    const [sourceStat, publishedStat] = await Promise.all([stat(source), stat(published)]);
    assert.ok(sourceStat.isFile() && publishedStat.isFile(), `not a regular file: ${asset}`);
    assert.equal(sourceStat.size, publishedStat.size, `size mismatch: ${asset}`);
    const [sourceBytes, publishedBytes] = await Promise.all([readFile(source), readFile(published)]);
    const sha = bytes => createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha(sourceBytes), sha(publishedBytes), `published bytes differ: ${asset}`);
  }
  return seen.size;
}
