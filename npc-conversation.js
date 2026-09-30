import {requestNpcDialogue} from './npc-dialogue.js';

const portraits = Object.fromEntries(['civilian','authority','angel','demon'].map(f => [f, `./character-art/${f}-npc-reference-v1.webp`]));

export function createNpcConversation({panel, log, onOpen = () => {}, onClose = () => {}, notice = () => {}}) {
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
  let active = null, pending = false, requestId = 0, controller = null, recognition = null;
  let lastAttempt = null, returnFocus = null, serviceIssue = null, listening = false;
  const keyFor = npc => `${npc.avatar || npc.file || npc.faction}:${npc.name}`;
  const line = (label,text) => {const p = document.createElement('p'); p.textContent = `${label}: ${text}`; log.append(p); log.scrollTop = log.scrollHeight;};
  const setStatus = text => {status.textContent = `${active?.faction?.toUpperCase() || 'NPC'} · ${text}`;};
  function renderHistory() {log.replaceChildren(); for (const item of conversations.get(keyFor(active)) || []) line(item.role === 'user' ? 'YOU' : active.name,item.content);}
  function showError(error) {errorText.textContent = error.message || 'NPC dialogue is unavailable. Your message is saved.'; errorBox.hidden = false; setStatus(error.code === 'api_credit_exhausted' ? 'API CREDIT NEEDED' : 'CONNECTION UNAVAILABLE');}
  function resetMic() {listening = false; mic.textContent = '🎙'; mic.setAttribute('aria-label','Speak your message'); mic.setAttribute('aria-pressed','false');}
  function stopMic() {const current = recognition; recognition = null; try {current?.abort();} catch {} resetMic();}
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
      const reply = await requestNpcDialogue(npc,history,{message,greeting,signal:controller.signal});
      if (id !== requestId || active !== npc) return;
      if (message) history.push({role:'user',content:message});
      history.push({role:'assistant',content:reply}); conversations.set(key,history.slice(-8));
      serviceIssue = null; renderHistory(); setStatus('READY TO TALK');
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
  mic.addEventListener('click',() => {
    if (listening) {try {recognition?.stop();} catch {} return;}
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
  document.addEventListener('visibilitychange',() => {if (document.hidden) stopMic();});
  return {open,close,get isOpen(){return !!active;}};
}
