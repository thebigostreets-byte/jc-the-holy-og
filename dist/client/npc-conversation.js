import {requestNpcDialogue,requestNpcTranscription} from './npc-dialogue.js';

const CONVERSATION_STORAGE_KEY='jc-npc-conversations-v1';
const portraits = Object.fromEntries(['civilian','authority','angel','demon'].map(f => [f, `./character-art/${f}-npc-reference-v1.webp`]));

export function createNpcConversation({panel, log, onOpen = () => {}, onClose = () => {}, notice = () => {}, worldContext=()=>null, onWorldAction=()=>null}) {
  const form = panel.querySelector('form'), input = form.querySelector('input');
  const send = form.querySelector('[type=submit]'), mic = form.querySelector('[data-voice]');
  const portrait = panel.querySelector('img'), name = panel.querySelector('strong'), status = panel.querySelector('small');
  const closeButton = panel.querySelector('.close');
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.classList.add('npc-conversation');
  input.maxLength = 600; input.autocomplete = 'off'; input.enterKeyHint = 'send';
  const errorBox = document.createElement('div'); errorBox.className = 'npc-chat-error'; errorBox.hidden = true; errorBox.setAttribute('role','status');
  const errorText = document.createElement('p'), retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Retry';
  errorBox.append(errorText,retry); form.before(errorBox);
  const style = document.createElement('style');
  style.textContent = `
    #jcTalk.npc-conversation,#npcTalk.npc-conversation{position:fixed;z-index:60;bottom:max(14px,env(safe-area-inset-bottom));max-height:calc(var(--npc-visible-height,100dvh) - 28px);overflow-y:auto;width:min(460px,calc(100vw - 24px));box-sizing:border-box;overscroll-behavior:contain}
    .npc-conversation .npc-chat-error[hidden]{display:none}
    .npc-conversation .npc-chat-error{font-size:12px;line-height:1.45;padding:8px 10px;margin:8px 0;border:1px solid #bca378;border-radius:6px;background:#282318}
    .npc-conversation .npc-chat-error p{margin:0 0 8px}
    .npc-conversation button:disabled{opacity:.55;cursor:wait}
    #jcTalk.npc-conversation input,#npcTalk.npc-conversation input{font-size:16px;min-height:44px}
    #jcTalk.npc-conversation button,#npcTalk.npc-conversation button{min-height:44px}
    #jcTalk.npc-conversation img,#npcTalk.npc-conversation img{width:64px;height:80px;object-fit:contain;background:#454545}
    body.jc-chat-open .jc-touch,body.jc-chat-open #touch{visibility:hidden;pointer-events:none}
    body.jc-chat-open #scene,body.jc-chat-open #world{pointer-events:none}
    body.jc-chat-open #jcNpcTalkButton,body.jc-chat-open #npcTalkPrompt{display:none!important}
    @media(max-height:480px){#jcTalk.npc-conversation img,#npcTalk.npc-conversation img{width:36px;height:44px}.npc-conversation [role=log]{max-height:65px!important}}
  `;
  document.head.append(style);
  const conversations = new Map(), drafts = new Map();
  try {
    const saved=JSON.parse(globalThis.localStorage?.getItem(CONVERSATION_STORAGE_KEY)||'null');
    if(saved?.version===1&&saved.histories&&typeof saved.histories==='object'){
      for(const [key,items] of Object.entries(saved.histories).slice(-32)){
        if(Array.isArray(items))conversations.set(key,items.filter(item=>item&&['user','assistant'].includes(item.role)&&typeof item.content==='string').slice(-8));
      }
    }
  } catch {}
  function persistConversations(){
    try{globalThis.localStorage?.setItem(CONVERSATION_STORAGE_KEY,JSON.stringify({version:1,histories:Object.fromEntries([...conversations].slice(-32))}));}catch{}
  }
  let active = null, pending = false, requestId = 0, controller = null, recognition = null, recorder=null, stream=null, chunks=[],discardRecording=false;
  let ttsButton=form.querySelector('[data-tts]');if(!ttsButton){ttsButton=document.createElement('button');ttsButton.type='button';ttsButton.dataset.tts='';ttsButton.textContent='🔊';ttsButton.setAttribute('aria-label','Repeat NPC reply aloud');mic.after(ttsButton);}
  let lastAttempt = null, returnFocus = null, serviceIssue = null, listening = false;
  const keyFor = npc => `${npc.id ?? npc.name}:${npc.avatar || npc.file || npc.faction}`;
  const line = (label,text) => {const p = document.createElement('p'); p.textContent = `${label}: ${text}`; log.append(p); log.scrollTop = log.scrollHeight;};
  const setStatus = text => {status.textContent = `${active?.faction?.toUpperCase() || 'NPC'} · ${text}`;};
  function renderHistory() {log.replaceChildren(); for (const item of conversations.get(keyFor(active)) || []) line(item.role === 'user' ? 'YOU' : active.name,item.content);}
  function showError(error) {errorText.textContent = error.message || 'NPC dialogue is unavailable. Your message is saved.'; errorBox.hidden = false; setStatus(error.code === 'api_credit_exhausted' ? 'API CREDIT NEEDED' : 'CONNECTION UNAVAILABLE');}
  function resetMic() {listening = false; mic.textContent = '🎙'; mic.setAttribute('aria-label','Speak your message'); mic.setAttribute('aria-pressed','false');}
  function stopMic() {discardRecording=true;const current = recognition; recognition = null; try {current?.abort();} catch {}if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch{}}stream?.getTracks().forEach(t=>t.stop());stream=null;resetMic();}
  function speakReply(text,npc=active){if(!text||!npc||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text),female=/\b(female|woman|girl|samantha|victoria|karen|zira|aria|jenny|susan|ava|allison)\b/i,male=/\b(male|man|guy|matthew|daniel|alex|david|tom|aaron|guy)\b/i,voices=window.speechSynthesis.getVoices(),wanted=npc.gender==='female'?female:male;utterance.voice=voices.find(v=>/en/i.test(v.lang)&&wanted.test(v.name))||voices.find(v=>/en/i.test(v.lang))||null;utterance.pitch=npc.gender==='female'?1.08:.94;utterance.rate=.98;window.speechSynthesis.speak(utterance);}
  function placePanel() {
    if (!active) return;
    const viewport = window.visualViewport, height = viewport?.height || window.innerHeight;
    panel.style.setProperty('--npc-visible-height',`${height}px`);
    panel.style.bottom = `${Math.max(14,window.innerHeight - height - (viewport?.offsetTop || 0) + 12)}px`;
  }
  window.visualViewport?.addEventListener('resize',placePanel); window.visualViewport?.addEventListener('scroll',placePanel); window.addEventListener('resize',placePanel);
  function close({restoreFocus = true} = {}) {
    if (active) drafts.set(keyFor(active),input.value);
    requestId++; controller?.abort(); controller = null; pending = false; send.disabled = false; retry.disabled = false; input.readOnly = false;
    stopMic(); active = null; panel.classList.remove('open'); document.body.classList.remove('jc-chat-open'); onClose();
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  async function submit(message = '',greeting = false) {
    if (!active || pending || (!greeting && !message.trim())) return;
    const npc = active, key = keyFor(npc), id = ++requestId, history = conversations.get(key) || [];
    message = message.trim().slice(0,600); lastAttempt = {message,greeting}; pending = true; controller = new AbortController();
    send.disabled = true; retry.disabled = true; input.readOnly = !greeting; errorBox.hidden = true;
    setStatus(greeting ? 'CONNECTING…' : 'THINKING…'); renderHistory();
    if (message) {line('YOU',message); drafts.set(key,message);}
    try {
      const result = await requestNpcDialogue(npc,history,{message,greeting,signal:controller.signal,world:worldContext()});
      if (id !== requestId || active !== npc) return;
      const worldDirection=result.action?onWorldAction(result.action,npc,message):null;
      const reply=[result.reply,worldDirection].filter(Boolean).join(' ');
      if (message) history.push({role:'user',content:message});
      history.push({role:'assistant',content:reply}); conversations.set(key,history.slice(-8));persistConversations();
      serviceIssue = null; renderHistory(); setStatus('READY TO TALK');speakReply(reply,npc);
      if (message && input.value.trim() === message) input.value = '';
      drafts.set(key,input.value);
    } catch (error) {
      if (id !== requestId || active !== npc) return;
      if (error.code === 'api_credit_exhausted') serviceIssue = error;
      showError(error);
    } finally {if (id === requestId) {pending = false; controller = null; send.disabled = false; retry.disabled = false; input.readOnly = false;}}
  }
  function open(npc) {
    if (!npc || active === npc) return;
    if (active) close({restoreFocus:false});
    returnFocus = document.activeElement; active = npc; input.value = drafts.get(keyFor(npc)) || ''; input.placeholder = 'Say something…';
    name.textContent = npc.name; portrait.alt = `${npc.name}, ${npc.faction}`;
    const oldPortrait = `./npc-avatars/${npc.avatar || npc.file || npc.faction + '-01'}.webp`;
    portrait.onerror = () => {portrait.onerror = null; portrait.src = oldPortrait;}; portrait.src = portraits[npc.faction] || oldPortrait;
    errorBox.hidden = true; panel.classList.add('open'); document.body.classList.add('jc-chat-open'); renderHistory(); placePanel(); onOpen();
    if (!matchMedia('(pointer:coarse)').matches) input.focus({preventScroll:true}); else closeButton.focus({preventScroll:true});
    lastAttempt = {message:'',greeting:true};
    if (serviceIssue) showError(serviceIssue); else if ((conversations.get(keyFor(npc)) || []).length) setStatus('READY TO TALK'); else void submit('',true);
  }
  form.addEventListener('submit',event => {event.preventDefault();void submit(input.value,false);});
  retry.addEventListener('click',() => {const message = input.value.trim();void submit(message || lastAttempt?.message || '',message ? false : (lastAttempt?.greeting ?? true));});
  closeButton.addEventListener('click',() => close()); panel.addEventListener('pointerdown',event => event.stopPropagation());
  panel.addEventListener('keydown',event => {
    event.stopPropagation();
    if (event.key === 'Escape') {event.preventDefault();close();return;}
    if (event.key !== 'Tab') return;
    const elements = [...panel.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(element => !element.closest('[hidden]'));
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
  });
  mic.addEventListener('click',async() => {
    if (listening) {if(recorder&&recorder.state!=='inactive'){recorder.stop();stream?.getTracks().forEach(t=>t.stop());stream=null;mic.textContent='…';setStatus('TRANSCRIBING WITH WHISPER…');}else{try {recognition?.stop();} catch {}} return;}
    if (pending) return;
    if(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder){discardRecording=false;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});if(!active){stream.getTracks().forEach(t=>t.stop());return;}chunks=[];const types=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'];const mime=types.find(t=>MediaRecorder.isTypeSupported?.(t));recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);const current=recorder;listening=true;mic.textContent='■';mic.setAttribute('aria-label','Stop and transcribe recording');mic.setAttribute('aria-pressed','true');setStatus('LISTENING · TAP STOP WHEN FINISHED');current.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};current.onerror=()=>{resetMic();notice('Microphone recording failed. Check microphone permission and retry.');};current.onstop=async()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;recorder=null;resetMic();if(discardRecording){discardRecording=false;chunks=[];return;}try{const heard=await requestNpcTranscription(new Blob(chunks,{type:current.mimeType||'audio/webm'}));if(!active)return;input.value=[input.value.trim(),heard].filter(Boolean).join(' ').slice(0,600);drafts.set(keyFor(active),input.value);input.focus();setStatus('WHISPER READY · REVIEW THEN SEND');}catch(error){if(active)notice(error.message||'Whisper transcription failed. Retry or type your message.');}};current.start();return;}catch(error){stream?.getTracks().forEach(t=>t.stop());stream=null;resetMic();notice(error.name==='NotAllowedError'?'Allow microphone access to record a message.':'Could not start microphone recording. Try keyboard dictation.');}}
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {input.placeholder = 'Use the microphone on your keyboard';input.focus();notice('Use your keyboard microphone to dictate a message.');return;}
    if (pending && input.readOnly) return;
    stopMic();const current = new Speech();recognition = current;listening = true;
    current.lang = navigator.language || 'en-US';current.interimResults = false;current.maxAlternatives = 1;
    mic.textContent = '■';mic.setAttribute('aria-label','Stop listening');mic.setAttribute('aria-pressed','true');
    current.onresult = event => {
      if (recognition !== current || !active) return;
      const heard = event.results?.[0]?.[0]?.transcript?.trim();
      if (heard) {input.value = [input.value.trim(),heard].filter(Boolean).join(' ').slice(0,600);drafts.set(keyFor(active),input.value);input.focus();}
    };
    current.onerror = event => {
      if (recognition !== current || event.error === 'aborted') return;
      const message = event.error === 'not-allowed' ? 'Microphone permission is off. Allow it in your browser, or type your message.' : event.error === 'no-speech' ? 'No speech was heard. Tap the microphone and try again.' : 'Voice input is unavailable here. Use your keyboard microphone or type your message.';
      notice(message);input.placeholder = 'Type, or use your keyboard microphone';input.focus();
    };
    current.onend = () => {if (recognition === current) {recognition = null;resetMic();}};
    try {current.start();} catch {recognition = null;resetMic();notice('Microphone could not start. Type or use keyboard dictation.');}
  });
  ttsButton.addEventListener('click',()=>{const history=active&&conversations.get(keyFor(active))||[];const last=[...history].reverse().find(x=>x.role==='assistant');if(last)speakReply(last.content,active);else notice('There is no NPC reply to play yet.');});
  document.addEventListener('visibilitychange',() => {if (document.hidden) stopMic();});
  return {open,close,get isOpen(){return !!active;}};
}
