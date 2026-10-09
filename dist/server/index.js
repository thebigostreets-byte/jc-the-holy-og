const DIALOGUE_SERVICE = 'https://jc-npc-dialogue.ill5299.chatgpt.site/api/npc-chat';
const GAME_ORIGIN = 'https://jc-the-holy-og.ill5299.chatgpt.site';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'},
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/jc-the-holy-og/api/healthz') return json({ok: true, game: 'JC The Holy OG', npcDialogue: 'integrated'});
    if (url.pathname === '/jc-the-holy-og/api/npc-chat') {
      if (request.method !== 'POST') return json({error: 'Use the conversation box to talk to an NPC.'}, 405);
      if (request.headers.get('origin') !== GAME_ORIGIN) return json({error: 'Open NPC dialogue inside JC The Holy OG.'}, 403);
      if (!request.headers.get('content-type')?.includes('application/json')) return json({error: 'Send a JSON message.'}, 415);
      if (Number(request.headers.get('content-length') || 0) > 12000) return json({error: 'Message is too large.'}, 413);
      const body = await request.text();
      if (body.length > 12000) return json({error: 'Message is too large.'}, 413);
      try {
        const response = await fetch(DIALOGUE_SERVICE, {
          method: 'POST',
          headers: {'content-type': 'application/json', origin: GAME_ORIGIN},
          body,
          signal: AbortSignal.timeout(19000),
        });
        if (!response.headers.get('content-type')?.includes('application/json')) return json({error: 'NPC dialogue could not connect. Your message is saved; please retry.', code: 'dialogue_service_unavailable'}, 502);
        return new Response(response.body, {
          status: response.status,
          headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(response.headers.has('retry-after') ? {'retry-after': response.headers.get('retry-after')} : {})},
        });
      } catch {
        return json({error: 'NPC dialogue could not connect. Try again in a moment.'}, 502);
      }
    }
    if (env.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response('Not found', {status: 404});
  },
};
