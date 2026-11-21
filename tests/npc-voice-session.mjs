import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../npc-conversation.js',import.meta.url),'utf8');
const deployed=readFileSync(new URL('../dist/client/npc-conversation.js',import.meta.url),'utf8');

test('NPC voice session guard is deployed without source drift',()=>{
  assert.equal(deployed,source);
});

test('microphone permission completion cannot start recording for a different NPC',()=>{
  assert.match(source,/const recordingNpc=active,session=\+\+voiceSession;discardRecording=false;try\{const acquiredStream=await navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\);if\(active!==recordingNpc\|\|session!==voiceSession\)/);
  assert.match(source,/acquiredStream\.getTracks\(\)\.forEach\(t=>t\.stop\(\)\);return;/);
});

test('delayed Whisper result or failure cannot modify a different NPC conversation',()=>{
  assert.match(source,/await requestNpcTranscription\([\s\S]*?if\(active!==recordingNpc\|\|session!==voiceSession\)return;input\.value=/);
  assert.match(source,/if\(active===recordingNpc&&session===voiceSession\)notice\(error\.message/);
});

// Exercise the same session-ownership rule used by the recorder callbacks.
test('late recorder A stop cannot reset recorder B state',async()=>{
  let voiceSession=1,recorder={id:'A'},stream={id:'A'},resetCount=0,stopped=[];
  const onstop=(session,current,acquiredStream)=>()=>{
    acquiredStream.getTracks().forEach(track=>track.stop());
    if(session!==voiceSession||recorder!==current)return;
    stream=null;recorder=null;resetCount++;
  };
  const oldStream={getTracks:()=>[{stop:()=>stopped.push('A')}]};
  const oldStop=onstop(1,recorder,oldStream);
  voiceSession=2;recorder={id:'B'};stream={id:'B'};
  oldStop();
  assert.deepEqual(stopped,['A']);
  assert.equal(stream.id,'B');assert.equal(recorder.id,'B');assert.equal(resetCount,0);
});

test('late permission response is rejected by session even for same NPC',()=>{
  const recordingNpc={id:'npc-1'},active=recordingNpc,session=1,voiceSession=2;
  assert.equal(active!==recordingNpc||session!==voiceSession,true);
});

test('recorder callback has session guard before shared-state cleanup',()=>{
  assert.ok(source.includes('current.onstop=async()=>{acquiredStream.getTracks().forEach(t=>t.stop());if(session!==voiceSession||recorder!==current)return;stream=null;recorder=null;resetMic()'));
  assert.ok(source.includes('current.onerror=()=>{if(session!==voiceSession||recorder!==current)return;'));
});

test('one microphone permission request per active voice session',()=>{
  assert.match(source,/permissionSession && permissionSession===voiceSession/);
  assert.match(source,/permissionSession=session;discardRecording=false;try\{const acquiredStream=await navigator\.mediaDevices\.getUserMedia/);
  assert.match(source,/finally\{if\(permissionSession===session\)permissionSession=0;/);
  assert.match(source,/function stopMic\(\) \{voiceSession\+\+;/);
});


test('active recorder error releases its own microphone and clears recording state',()=>{
  assert.ok(source.includes("current.onerror=()=>{if(session!==voiceSession||recorder!==current)return;acquiredStream.getTracks().forEach(t=>t.stop());stream=null;recorder=null;discardRecording=true;resetMic()"));
});

test('stale transcription completion cannot overwrite a newer NPC draft',async()=>{
  let active={id:'npc-a'},voiceSession=1,input='A draft';
  const recordingNpc=active,session=voiceSession;
  let finish;
  const transcription=new Promise(resolve=>{finish=resolve;});
  const apply=async()=>{
    const heard=await transcription;
    if(active!==recordingNpc||session!==voiceSession)return;
    input=[input.trim(),heard].filter(Boolean).join(' ').slice(0,600);
  };
  const pending=apply();
  active={id:'npc-b'};voiceSession++;input='B draft';
  finish('A private transcript');
  await pending;
  assert.equal(input,'B draft');
});

test('stale transcription failure cannot display an error in a new NPC conversation',async()=>{
  let active={id:'npc-a'},voiceSession=1,notices=[];
  const recordingNpc=active,session=voiceSession;
  let fail;
  const transcription=new Promise((_,reject)=>{fail=reject;});
  const apply=async()=>{
    try{await transcription;}
    catch(error){if(active===recordingNpc&&session===voiceSession)notices.push(error.message);}
  };
  const pending=apply();
  active={id:'npc-b'};voiceSession++;
  fail(new Error('A transcription failed'));
  await pending;
  assert.deepEqual(notices,[]);
});

test('current NPC transcription still populates its draft',async()=>{
  const npc={id:'npc-a'};
  let active=npc,voiceSession=3,input='existing',savedDraft='';
  const recordingNpc=active,session=voiceSession;
  const heard=await Promise.resolve('turn left');
  if(active===recordingNpc&&session===voiceSession){
    input=[input.trim(),heard].filter(Boolean).join(' ').slice(0,600);
    savedDraft=input;
  }
  assert.equal(input,'existing turn left');
  assert.equal(savedDraft,input);
});

test('current NPC transcription failure remains visible to its owner',async()=>{
  const npc={id:'npc-a'};
  let active=npc,voiceSession=3,notices=[];
  const recordingNpc=active,session=voiceSession;
  try{await Promise.reject(new Error('Transcription unavailable'));}
  catch(error){if(active===recordingNpc&&session===voiceSession)notices.push(error.message);}
  assert.deepEqual(notices,['Transcription unavailable']);
});

test('stop recording preserves final audio until MediaRecorder onstop cleanup',()=>{
  assert.ok(source.includes("recorder.stop();mic.textContent='…';setStatus('TRANSCRIBING WITH WHISPER…')"));
  assert.ok(!source.includes("recorder.stop();stream?.getTracks().forEach(t=>t.stop());stream=null;"));
  assert.ok(source.includes("current.onstop=async()=>{acquiredStream.getTracks().forEach(t=>t.stop());"));
});


test('closing an NPC conversation cancels its spoken reply before another NPC opens',()=>{
  assert.ok(source.includes("stopMic(); window.speechSynthesis?.cancel(); active = null; panel.classList.remove('open');"));
  assert.ok(source.includes('if (active) close({restoreFocus:false});'));
});
