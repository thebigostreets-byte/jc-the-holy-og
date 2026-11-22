import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {verifyPagesAssets} from '../scripts/verify-pages-parity.mjs';

test('Pages manifest and published assets match byte-for-byte', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jc-pages-parity-'));
  try {
    await mkdir(path.join(root, 'scripts'), {recursive: true});
    await mkdir(path.join(root, 'dist/client'), {recursive: true});
    await writeFile(path.join(root, 'scripts/public-assets.json'), JSON.stringify(['game.js']));
    await writeFile(path.join(root, 'game.js'), 'valid');
    await writeFile(path.join(root, 'dist/client/game.js'), 'valid');
    assert.equal(await verifyPagesAssets(root), 1);
    await writeFile(path.join(root, 'dist/client/game.js'), 'stale');
    await assert.rejects(verifyPagesAssets(root), /published bytes differ/);
    await writeFile(path.join(root, 'scripts/public-assets.json'), JSON.stringify(['../escape.js']));
    await assert.rejects(verifyPagesAssets(root), /unsafe asset path/);
    await writeFile(path.join(root, 'scripts/public-assets.json'), JSON.stringify(['game.js','game.js']));
    await assert.rejects(verifyPagesAssets(root), /duplicate asset/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});
