import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile('dist/server/index.js', 'utf8');
const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
const origin = 'https://jc-the-holy-og.ill5299.chatgpt.site';
const health = await worker.fetch(new Request(`${origin}/api/healthz`), {});
assert.equal((await health.json()).npcDialogue, 'integrated');
const game = await worker.fetch(new Request(`${origin}/map.html`), {ASSETS: {fetch: async request => new Response(new URL(request.url).pathname)}});
assert.equal(await game.text(), '/map.html');
const denied = await worker.fetch(new Request(`${origin}/api/npc-chat`, {method: 'POST',headers: {origin:'https://other.invalid','content-type':'application/json'},body:'{}'}), {});
assert.equal(denied.status, 403);
const originalFetch = globalThis.fetch;
let forwarded;
globalThis.fetch = async (url, options) => {
  forwarded = {url, options};
  return Response.json({reply:'A real service response.'});
};
try {
  const body = JSON.stringify({npc:{name:'Mara'},message:'Hello'});
  const response = await worker.fetch(new Request(`${origin}/api/npc-chat`, {method:'POST',headers:{origin,'content-type':'application/json'},body}), {GROQ_API_KEY:'test-key'});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reply, 'A real service response.');
  assert.equal(forwarded.options.body, body);
  assert.equal(forwarded.options.headers.origin, origin);
} finally {globalThis.fetch = originalFetch;}
console.log('Main game Worker passed asset routing, origin protection, and NPC forwarding checks.');
