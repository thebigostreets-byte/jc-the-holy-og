const GAME_ORIGIN = 'https://jc-the-holy-og.ill5299.chatgpt.site';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'},
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/healthz') return json({ok: true, game: 'JC The Holy OG', npcDialogue: 'integrated'});
    if (url.pathname === '/api/npc-chat') {
      if (request.method !== 'POST') return json({error: 'Use the conversation box to talk to an NPC.'}, 405);
      if (request.headers.get('origin') !== GAME_ORIGIN) return json({error: 'Open NPC dialogue inside JC The Holy OG.'}, 403);
      if (!request.headers.get('content-type')?.includes('application/json')) return json({error: 'Send a JSON message.'}, 415);
      if (Number(request.headers.get('content-length') || 0) > 12000) return json({error: 'Message is too large.'}, 413);
      const body = await request.text();
      if (body.length > 12000) return json({error: 'Message is too large.'}, 413);
      let input;try{input=JSON.parse(body);}catch{return json({error:'Message payload is not valid JSON.'},400);}
      const suppliedKey=typeof input.apiKey==='string'&&input.apiKey.trim().length<=512?input.apiKey.trim():'';
      const apiKey=suppliedKey||env.GROQ_API_KEY;
      if (!apiKey) return json({error:'Add a Groq API key in game settings to enable NPC dialogue.',code:'dialogue_not_configured'},503);
      const npc=input.npc||{},name=String(npc.name||'Las Vegas local').slice(0,48),faction=String(npc.faction||'civilian').slice(0,24),state=String(npc.state||'calm').slice(0,24),event=String(npc.recentEvent||'').slice(0,80);
      const history=Array.isArray(input.history)?input.history.slice(-8).filter(x=>['user','assistant'].includes(x?.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,600)})):[];
      if(typeof input.message==='string'&&input.message.trim())history.push({role:'user',content:input.message.trim().slice(0,600)});
      if(input.greeting&&!history.length)history.push({role:'user',content:'Greet me naturally in one short line. React to the current scene if relevant.'});
      if(!history.length)return json({error:'Write a message to start the conversation.'},400);
      const personality=String(npc.personality||'practical').slice(0,40),occupation=String(npc.occupation||'local').slice(0,40),decision=String(npc.decision||'observe').slice(0,30),gender=['male','female'].includes(npc.gender)?npc.gender:'unspecified',memories=JSON.stringify(Array.isArray(npc.memories)?npc.memories.slice(-6):[]).slice(0,800);
      const alignment=['neutral','religious','satanic'].includes(npc.allegiance)?npc.allegiance:'neutral';
      const witnessed=JSON.stringify(Array.isArray(npc.witnessMemories)?npc.witnessMemories.slice(-6).map(text=>String(text).slice(0,220)):[]).slice(0,1600);
      const observation=npc.observedPlayer&&typeof npc.observedPlayer==='object'?{state:String(npc.observedPlayer.state||'').slice(0,32),appearance:String(npc.observedPlayer.appearance||'').slice(0,180)}:null;
      const world=input.world&&typeof input.world==='object'?input.world:{};
      const places=Array.isArray(world.places)?world.places.slice(0,8).map(p=>({id:String(p.id||'').slice(0,160),name:String(p.name||'').slice(0,100),kind:String(p.kind||'').slice(0,32),entry:p.entry&&typeof p.entry==='object'?{x:Number(p.entry.x)||0,z:Number(p.entry.z)||0}:null,items:Array.isArray(p.items)?p.items.slice(0,8).map(i=>({type:String(i.type||'').slice(0,24),name:String(i.name||'').slice(0,80)})):[]})):[];
      const itemTypes=Array.isArray(world.itemTypes)?world.itemTypes.slice(0,5).map(i=>({id:String(i.id||'').slice(0,24),name:String(i.name||'').slice(0,80)})):[];
      const itemRequest=/\b(need|find|get|bring|grab|fetch|look for|where.*find|where.*get)\b.{0,70}\b(item|med|health|first aid|suppl|battery|relic|weapon|sidearm|flare|storm cell)\b/i.test(String(input.message||''));
      const worldContext=JSON.stringify({player:world.player&&typeof world.player==='object'?{x:Number(world.player.x)||0,z:Number(world.player.z)||0}:null,places,itemTypes}).slice(0,4200);
      const system=`Allegiance: ${alignment}, shaped by remembered interactions with JC and the Devil. Express beliefs naturally without stereotyping religious groups. Voice identity for local speech playback: ${gender}. Personality: ${personality}. Occupation: ${occupation}. Current intention: ${decision}. Remembered events: ${memories}. Personally witnessed events: ${witnessed}. Current visible player observation: ${JSON.stringify(observation)}. These observations describe what this NPC actually saw; remember them naturally, including hovering, flight and appearance, and do not invent unseen events. Trust toward player: ${Number(npc.trust)||0}. You are ${name}, an in-world ${faction} in JC The Holy OG, a supernatural open-world game set in neon Las Vegas. Emotion/state: ${state}. Recent event: ${event||'none'}. Speak as this character with a distinct, grounded voice. Keep replies to 1-3 short sentences and never claim the player obtained an item unless the game reports it. Item locations are game state: ${worldContext}. When the player explicitly asks for a useful item, choose one item type and one exact place id from that data; return ONLY a JSON object with reply and action {itemType,placeId}. Otherwise return ONLY a JSON object with reply. Never make up building names or item locations. Do not mention being an AI, a prompt, or a backend. This is fictional game dialogue.`;
      try {
        const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({model:env.GROQ_MODEL||'openai/gpt-oss-20b',messages:[{role:'system',content:system},...history],temperature:.8,max_tokens:450,...((env.GROQ_MODEL||'openai/gpt-oss-20b').startsWith('openai/gpt-oss')?{reasoning_effort:'low',include_reasoning:false}:{})}),signal:AbortSignal.timeout(16000)});
        const result=await response.json().catch(()=>null);
        if(!response.ok){const status=response.status===429?429:response.status===401||response.status===403?503:502;return json({error:response.status===429?'NPCs are catching their breath. Try again shortly.':status===503?'NPC dialogue credentials need attention.':'NPC dialogue is temporarily unavailable.',upstreamStatus:response.status,code:response.status===429?'rate_limited':status===503?'dialogue_credentials':'dialogue_service_unavailable'},status);}
        const content=result?.choices?.[0]?.message?.content?.trim();if(!content)return json({error:'NPC dialogue returned no reply. Retry in a moment.',code:'empty_reply'},502);
        let parsed=null;try{parsed=JSON.parse(content.replace(/^\x60{3}(?:json)?\s*|\s*\x60{3}$/g,''));}catch{}
        const generated=typeof parsed?.reply==='string'?parsed.reply:content;
        let action=null;
        if(itemRequest&&parsed?.action&&typeof parsed.action==='object'){
          const place=places.find(p=>p.id===String(parsed.action.placeId||''));
          const item=itemTypes.find(i=>i.id===String(parsed.action.itemType||''));
          if(place&&item)action={placeId:place.id,itemType:item.id};
        }
        if(itemRequest&&!action&&places.length&&itemTypes.length){
          const text=String(input.message||'').toLowerCase(),wanted=/med|health|first aid|heal/.test(text)?'medkit':/battery|storm|charge|electric/.test(text)?'battery':/relic|miracle|bless/.test(text)?'relic':/weapon|sidearm|gun/.test(text)?'sidearm':/flare/.test(text)?'flare':'medkit';
          const chosen=itemTypes.find(i=>i.id===wanted)||itemTypes[0],origin=world.player||{x:0,z:0};
          const place=[...places].sort((a,b)=>Math.hypot((a.entry?.x||0)-origin.x,(a.entry?.z||0)-origin.z)-Math.hypot((b.entry?.x||0)-origin.x,(b.entry?.z||0)-origin.z))[0];
          action={placeId:place.id,itemType:chosen.id};
        }
        return json({reply:generated.slice(0,1200),...(action?{action}:{})});
      } catch {return json({error:'NPC dialogue could not connect. Try again in a moment.',code:'dialogue_service_unavailable'},502);}
    }
    if (url.pathname === '/api/npc-transcribe') {
      if(request.method!=='POST')return json({error:'Record a voice message in the NPC conversation.'},405);
      if(request.headers.get('origin')!==GAME_ORIGIN)return json({error:'Open voice input inside JC The Holy OG.'},403);
      if(Number(request.headers.get('content-length')||0)>19*1024*1024)return json({error:'Recording is too large. Record a shorter message.'},413);
      if(!request.headers.get('content-type')?.includes('multipart/form-data'))return json({error:'Send a recorded audio message.'},415);
      let form;try{form=await request.formData();}catch{return json({error:'The audio upload could not be read.'},400);}
      const audio=form.get('audio'),suppliedKey=form.get('apiKey'),apiKey=typeof suppliedKey==='string'&&suppliedKey.trim().length<=512?suppliedKey.trim():env.GROQ_API_KEY;
      if(!audio||typeof audio.arrayBuffer!=='function'||!audio.size)return json({error:'No recorded audio was received.'},400);
      if(audio.size>18*1024*1024)return json({error:'Recording is too large. Record a shorter message.'},413);
      if(!apiKey)return json({error:'Add a Groq API key in game settings to use Whisper voice input.'},503);
      const upload=new FormData();upload.append('file',audio,audio.name||'npc-message.webm');upload.append('model','whisper-large-v3');upload.append('response_format','json');
      try{const upstream=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{authorization:`Bearer ${apiKey}`},body:upload,signal:AbortSignal.timeout(25000)});const result=await upstream.json().catch(()=>null);if(!upstream.ok)return json({error:upstream.status===429?'Whisper is busy. Wait a moment and retry.':upstream.status===401||upstream.status===403?'Groq voice credentials need attention.':'Whisper could not transcribe this recording.',code:upstream.status===429?'rate_limited':'transcription_failed'},upstream.status===429?429:502);if(typeof result?.text!=='string'||!result.text.trim())return json({error:'Whisper did not hear a clear message. Try again.'},502);return json({text:result.text.slice(0,1200)});}catch{return json({error:'Groq Whisper could not connect. Check your connection and retry.'},502);}
    }
    if (url.pathname === '/api/city-tile') {
      const id = url.searchParams.get('id') || '';
      if (!/^C\d{2}_R\d{2}$/.test(id)) return json({error:'Invalid city tile.'},400);
      if (!env.ASSETS?.fetch) return json({error:'City assets unavailable.'},503);
      const assetUrl = new URL(request.url);
      assetUrl.pathname = `/tiles/${id}.glb.br`;assetUrl.search = '';
      const asset = await env.ASSETS.fetch(new Request(assetUrl, {method:'GET'}));
      if (!asset.ok) return asset;
      const headers = new Headers(asset.headers);
      headers.set('content-type', 'model/gltf-binary');
      headers.set('content-encoding', 'br');
      headers.set('cache-control', 'public, max-age=31536000, immutable');
      return new Response(asset.body, {status: asset.status, statusText: asset.statusText, headers});
    }
    if (/^\/api\/music\/[a-z0-9-]+\.(m4a|mp3)$/.test(url.pathname)&&env.ASSETS?.fetch){const assetUrl=new URL(request.url);assetUrl.pathname=assetUrl.pathname.replace('/api/music/','/music/');const asset=await env.ASSETS.fetch(new Request(assetUrl,request));const headers=new Headers(asset.headers);headers.set('content-type',url.pathname.endsWith('.m4a')?'audio/mp4':'audio/mpeg');return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});}
    if (env.ASSETS?.fetch) return env.ASSETS.fetch(request);
    return new Response('Not found', {status: 404});
  },
};
