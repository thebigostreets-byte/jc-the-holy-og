const ENDPOINT = '/api/npc-chat';
let sessionApiKey='';
export function setNpcApiKey(value){sessionApiKey=String(value||'').trim().slice(0,512);return sessionApiKey.length>0;}
export function clearNpcApiKey(){sessionApiKey='';}

export async function requestNpcTranscription(blob){
  if(!blob?.size)throw new Error('No audio was recorded. Tap the microphone and try again.');
  if(blob.size>18*1024*1024)throw new Error('That recording is too long. Try a shorter message.');
  const form=new FormData();form.append('audio',blob,`npc-message.${blob.type.includes('mp4')?'mp4':blob.type.includes('ogg')?'ogg':'webm'}`);if(sessionApiKey)form.append('apiKey',sessionApiKey);
  const response=await fetch('/api/npc-transcribe',{method:'POST',mode:'same-origin',credentials:'same-origin',body:form,signal:AbortSignal.timeout(30000)});
  const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.error||'Groq Whisper could not transcribe that recording. Try again.');
  if(typeof data?.text!=='string'||!data.text.trim())throw new Error('Whisper did not hear a clear message. Try again.');return data.text.trim();
}

export async function requestNpcDialogue(npc, history, {message = '', greeting = false, signal: callerSignal, world = null} = {}) {
  const controller = new AbortController(), abort = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  callerSignal?.addEventListener('abort',abort,{once:true});
  const timer = setTimeout(abort,22000);
  const witnessMemories=(npc.witnessMemory?.entries||[]).slice(-6).map(item=>item.text);
  const observedPlayer=npc.observedPlayer||null;
  const playerIdentity=npc.playerIdentity||{id:'jc-player',name:'Jesus (JC)',role:'the player character',isConversationPartner:true};
  const identityContext=`The person speaking to you right now is the same player you can see in front of you: ${playerIdentity.name}. In this game world, that player character IS Jesus/JC. Any memory saying you saw JC or Jesus flying, hovering, performing a miracle, or standing nearby refers to this same conversation partner, not a separate third person. Never deny that the speaker is JC because of real-world skepticism; maintain the game's fictional character identity. You may react according to your personality, but distinguish doubting his motives from failing to recognize who the game identifies him as.`;
  const memoryContext=[...witnessMemories,observedPlayer?.state?`Currently seeing the player ${observedPlayer.state}, appearance: ${observedPlayer.appearance}.`:''].filter(Boolean).join(' | ').slice(0,1600);
  try {
    const response = await fetch(ENDPOINT,{
      method:'POST',mode:'same-origin',credentials:'same-origin',headers:{'content-type':'application/json'},signal:controller.signal,
      body:JSON.stringify({playerIdentity,npc:{gender:npc.gender,allegiance:npc.allegiance,alignmentScore:npc.alignmentScore,id:npc.id,personality:[npc.personality,identityContext,memoryContext?'Personally witnessed (do not invent unseen events): '+memoryContext:''].filter(Boolean).join('. '),witnessMemories,observedPlayer,occupation:npc.occupation,decision:npc.decision,memories:npc.lifeMemory?.memories,trust:npc.lifeMemory?.trust,name:npc.name,faction:npc.faction,state:npc.state || 'calm',recentEvent:[npc.event?.type || npc.memory?.type || '',memoryContext].filter(Boolean).join(' · ')},world,history:history.slice(-8),message,greeting,...(sessionApiKey?{apiKey:sessionApiKey}:{})}),
    });
    let data;
    try {data = await response.json();} catch {throw new Error('NPC dialogue returned an unreadable response. Your message is saved.');}
    if (!response.ok) {const error = new Error(data?.error || `NPC dialogue failed (${response.status}).`);error.code = data?.code || 'dialogue_failed';error.retryAfter = Number(data?.retryAfter) || 0;throw error;}
    if (typeof data?.reply !== 'string' || !data.reply.trim()) throw new Error('NPC dialogue returned an empty reply. Your message is saved.');
    return {reply:data.reply.trim(),action:data.action||null};
  } catch (error) {
    if (controller.signal.aborted && !callerSignal?.aborted) throw new Error('The NPC reply timed out. Your message is saved; try again.');
    if (error instanceof TypeError) throw new Error('Could not connect to NPC dialogue. Check your connection and retry.');
    throw error;
  } finally {clearTimeout(timer);callerSignal?.removeEventListener('abort',abort);}
}
