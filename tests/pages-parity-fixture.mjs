import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm, symlink, unlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {verifyPagesAssets} from '../scripts/verify-pages-parity.mjs';

test('Pages parity rejects stale, unsafe, duplicate, symlink and missing entrypoint assets', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jc-pages-parity-'));
  try {
    await mkdir(path.join(root, 'scripts'), {recursive: true});
    await mkdir(path.join(root, 'dist/client'), {recursive: true});
    const manifest = entries => writeFile(path.join(root, 'scripts/public-assets.json'), JSON.stringify(entries));
    await manifest(['index.html']);
    await writeFile(path.join(root, 'index.html'), '<main>valid</main>');
    await writeFile(path.join(root, 'dist/client/index.html'), '<main>valid</main>');
    assert.equal(await verifyPagesAssets(root), 1);
    await writeFile(path.join(root, 'dist/client/index.html'), '<main>stale</main>');
    await assert.rejects(verifyPagesAssets(root), /published bytes differ/);
    await writeFile(path.join(root, 'dist/client/index.html'), '<main>valid</main>');
    await manifest(['../escape.html']);
    await assert.rejects(verifyPagesAssets(root), /unsafe asset path/);
    await manifest(['index.html', 'index.html']);
    await assert.rejects(verifyPagesAssets(root), /duplicate asset/);
    await manifest(['game.js']);
    await writeFile(path.join(root, 'game.js'), 'valid');
    await writeFile(path.join(root, 'dist/client/game.js'), 'valid');
    await assert.rejects(verifyPagesAssets(root), /index.html entrypoint missing/);
    await manifest(['index.html']);
    await unlink(path.join(root, 'dist/client/index.html'));
    await symlink(path.join(root, 'index.html'), path.join(root, 'dist/client/index.html'));
    await assert.rejects(verifyPagesAssets(root), /symlink asset path/);
    await unlink(path.join(root, 'dist/client/index.html'));
    await writeFile(path.join(root, 'dist/client/index.html'), '<main>valid</main>');
    await mkdir(path.join(root, 'nested'));
    await mkdir(path.join(root, 'dist/client/nested'));
    await mkdir(path.join(root, 'linked'));
    await writeFile(path.join(root, 'linked/asset.js'), 'nested');
    await writeFile(path.join(root, 'nested/asset.js'), 'nested');
    await symlink(path.join(root, 'nested'), path.join(root, 'dist/client/linked'));
    await manifest(['index.html', 'linked/asset.js']);
    await assert.rejects(verifyPagesAssets(root), /symlink asset path/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});
