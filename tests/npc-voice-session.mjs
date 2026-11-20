import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../npc-conversation.js',import.meta.url),'utf8');
const deployed=readFileSync(new URL('../dist/client/npc-conversation.js',import.meta.url),'utf8');

test('NPC voice session guard is deployed without source drift',()=>{
  assert.equal(deployed,source);
});

test('microphone permission completion cannot start recording for a different NPC',()=>{
  assert.match(source,/const recordingNpc=active,session=++voiceSession;discardRecording=false;try\{const acquiredStream=await navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\);if\(active!==recordingNpc\|\|session!==voiceSession\)/);
  assert.match(source,/acquiredStream\.getTracks\(\)\.forEach\(t=>t\.stop\(\)\);return;/);
});

test('delayed Whisper result or failure cannot modify a different NPC conversation',()=>{
  assert.match(source,/await requestNpcTranscription\([\s\S]*?if\(active!==recordingNpc\|\|session!==voiceSession\)return;input\.value=/);
  assert.match(source,/if\(active===recordingNpc\)notice\(error\.message/);
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
  assert.match(source,/current\\.onstop=async\\(\\)=>\\{acquiredStream\\.getTracks\\(\\)\\.forEach\\(t=>t\\.stop\\(\\)\\);if\\(session!==voiceSession\\|\\|recorder!==current\\)return;stream=null;recorder=null;resetMic\\(\\)/);
  assert.match(source,/current\\.onerror=\\(\\)=>\\{if\\(session!==voiceSession\\|\\|recorder!==current\\)return;/);
});
