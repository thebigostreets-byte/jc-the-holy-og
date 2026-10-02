const ENDPOINT = '/api/npc-chat';

export async function requestNpcDialogue(npc, history, {message = '', greeting = false, signal: callerSignal} = {}) {
  const controller = new AbortController(), abort = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  callerSignal?.addEventListener('abort',abort,{once:true});
  const timer = setTimeout(abort,22000);
  try {
    const response = await fetch(ENDPOINT,{
      method:'POST',mode:'same-origin',credentials:'same-origin',headers:{'content-type':'application/json'},signal:controller.signal,
      body:JSON.stringify({npc:{name:npc.name,faction:npc.faction,state:npc.state || 'calm',recentEvent:npc.event?.type || npc.memory?.type || '',prayer:npc.prayer?.text || '',prayerAnswered:!!npc.prayer?.answered},history:history.slice(-8),message,greeting}),
    });
    let data;
    try {data = await response.json();} catch {throw new Error('NPC dialogue returned an unreadable response. Your message is saved.');}
    if (!response.ok) {const error = new Error(data?.error || `NPC dialogue failed (${response.status}).`);error.code = data?.code || 'dialogue_failed';error.retryAfter = Number(data?.retryAfter) || 0;throw error;}
    if (typeof data?.reply !== 'string' || !data.reply.trim()) throw new Error('NPC dialogue returned an empty reply. Your message is saved.');
    return data.reply.trim();
  } catch (error) {
    if (controller.signal.aborted && !callerSignal?.aborted) throw new Error('The NPC reply timed out. Your message is saved; try again.');
    if (error instanceof TypeError) throw new Error('Could not connect to NPC dialogue. Check your connection and retry.');
    throw error;
  } finally {clearTimeout(timer);callerSignal?.removeEventListener('abort',abort);}
}
