import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = new Set(JSON.parse(readFileSync(path.join(root, 'scripts/public-assets.json'), 'utf8')));
const pages = ['index.html', 'map.html'];

for (const page of pages) {
  test(`${page} local script, stylesheet and preload assets are included in Pages manifest`, () => {
    assert.ok(manifest.has(page), `${page} missing from Pages manifest`);
    const html = readFileSync(path.join(root, page), 'utf8');
    const references = [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi)].map(match => match[2]);
    for (const reference of references) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#|data:)/i.test(reference)) continue;
      const clean = reference.split(/[?#]/, 1)[0];
      if (!clean) continue;
      const relative = path.posix.normalize(path.posix.join(path.posix.dirname(page), clean));
      assert.ok(!relative.startsWith('../') && relative !== '..', `asset escapes Pages root: ${reference}`);
      assert.ok(manifest.has(relative), `${page} references ${reference}, absent from Pages manifest`);
    }
  });
}
