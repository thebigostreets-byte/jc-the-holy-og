import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root = process.cwd();
const output = path.join(root, 'dist/client');
const manifest = JSON.parse(await readFile(path.join(root, 'scripts/public-assets.json'), 'utf8'));

// Run after `npm run build`: every published file must match the corresponding source byte-for-byte.
test('Pages build contains each manifest asset with identical bytes', async () => {
  assert.ok(Array.isArray(manifest) && manifest.length > 0, 'public assets manifest must be populated');
  for (const relative of manifest) {
    assert.equal(typeof relative, 'string', 'manifest entries must be strings');
    assert.ok(relative && !path.isAbsolute(relative) && !relative.split('/').includes('..'), `unsafe asset: ${relative}`);
    const source = path.join(root, relative);
    const built = path.join(output, relative);
    const [srcStat, dstStat] = await Promise.all([stat(source), stat(built)]);
    assert.ok(srcStat.isFile() && dstStat.isFile(), `asset is not a file: ${relative}`);
    assert.equal(srcStat.size, dstStat.size, `size mismatch for ${relative}`);
    const [src, dst] = await Promise.all([readFile(source), readFile(built)]);
    assert.equal(createHash('sha256').update(src).digest('hex'), createHash('sha256').update(dst).digest('hex'), `build differs from source: ${relative}`);
  }
});
