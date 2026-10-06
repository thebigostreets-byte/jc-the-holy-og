const ENDPOINT = '/api/npc-chat';
let sessionApiKey='';

function stableIndex(value,count){let h=0;for(const c of String(value||''))h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;return count?h%count:0;}
export function localNpcGreeting(npc={}){
  const state=String(npc.state||'idle'),faction=String(npc.faction||'civilian'),name=String(npc.name||'there');
  const urgent=state==='fear'||state==='retreat'?['Something is wrong out here.','Keep your eyes open. Something just happened.','I am trying to get clear of this mess.']:null;
  const lines=urgent||({
    authority:['Need something? I am working this area.','Stay alert. What do you need?','I am on duty. Talk to me.'],
    angel:['Peace. What do you need?','I am listening.','You can speak freely.'],
    demon:['What do you want?','Make it quick.','You have my attention.'],
    civilian:['Hey. What is up?','What do you need?','Yeah? I am listening.']
  }[faction]||['What do you need?']);
  return lines[stableIndex(name+':'+state,lines.length)];
}
export function localNpcReply(npc={},message=''){
  const text=String(message||'').trim().toLowerCase();if(!text)return null;
  if(/\b(what(?:'s| is) your name|who are you)\b/.test(text))return `I'm ${npc.name||'a local'}.`;
  if(/\b(what do you do|what(?:'s| is) your job|where do you work|occupation)\b/.test(text))return `I work as ${npc.occupation||npc.role||'a local'}.`;
  if(/\b(what are you doing|what(?:'s| is) going on with you|where are you going|what are you up to)\b/.test(text)){
    const doing=String(npc.decision||npc.state||'watching what is happening').replace(/-/g,' ');
    return `I'm ${doing}.`;
  }
  if(/\b(are you okay|you okay|are you alright|you alright)\b/.test(text)){
    if(['fear','retreat'].includes(npc.state))return 'Not really. I am trying to get somewhere safe.';
    if((npc.health??100)<60)return 'I am hurt, but I am still moving.';
    return 'Yeah. I am okay right now.';
  }
  return null;
}
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
  const spatialContext=npc.conversationSpatial||{mode:'face-to-face',speakerVisible:true,speakerIsPlayer:true,source:'the visible player character standing/flying near this NPC'};
  const identityContext=`This is a face-to-face in-world conversation, not a phone call, radio, disembodied voice, narrator, or unknown source. The voice you hear comes from the visible player character near you. Look at and address that character as the speaker. The person speaking to you right now is the same player you can see in front of you: ${playerIdentity.name}. In this game world, that player character IS Jesus/JC. Any memory saying you saw JC or Jesus flying, hovering, performing a miracle, or standing nearby refers to this same conversation partner, not a separate third person. Never deny that the speaker is JC because of real-world skepticism; maintain the game's fictional character identity. You may react according to your personality, but distinguish doubting his motives from failing to recognize who the game identifies him as.`;
  const memoryContext=[...witnessMemories,observedPlayer?.state?`Currently seeing the player ${observedPlayer.state}, appearance: ${observedPlayer.appearance}.`:''].filter(Boolean).join(' | ').slice(0,1600);
  try {
    const response = await fetch(ENDPOINT,{
      method:'POST',mode:'same-origin',credentials:'same-origin',headers:{'content-type':'application/json'},signal:controller.signal,
      body:JSON.stringify({playerIdentity,spatialContext,npc:{gender:npc.gender,allegiance:npc.allegiance,alignmentScore:npc.alignmentScore,id:npc.id,personality:[npc.personality,identityContext,memoryContext?'Personally witnessed (do not invent unseen events): '+memoryContext:''].filter(Boolean).join('. '),witnessMemories,observedPlayer,occupation:npc.occupation,decision:npc.decision,memories:npc.lifeMemory?.memories,trust:npc.lifeMemory?.trust,name:npc.name,faction:npc.faction,state:npc.state || 'calm',recentEvent:[npc.event?.type || npc.memory?.type || '',memoryContext].filter(Boolean).join(' · ')},world,history:history.slice(-8),message,greeting,...(sessionApiKey?{apiKey:sessionApiKey}:{})}),
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
