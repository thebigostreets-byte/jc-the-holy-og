import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../map-engine.js',import.meta.url),'utf8');
const deployed=readFileSync(new URL('../dist/client/map-engine.js',import.meta.url),'utf8');
const block=s=>s.slice(s.indexOf("window.addEventListener('keydown'"),s.indexOf("$('autoStream').onchange"));
test('keyboard handlers match deployable client',()=>assert.equal(block(source),block(deployed)));
test('stale keys clear on tab hiding and focus in form fields',()=>{
 const code=block(source);
 assert.match(code,/visibilitychange.*document\.hidden.*keys\.clear\(\)/);
 assert.match(code,/focusin.*keys\.clear\(\)/);
 assert.match(code,/contenteditable/);
 assert.match(code,/e\.ctrlKey\|\|e\.metaKey\|\|e\.altKey/);
});
