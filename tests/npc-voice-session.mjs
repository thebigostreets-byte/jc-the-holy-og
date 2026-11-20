import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../npc-conversation.js',import.meta.url),'utf8');
const deployed=readFileSync(new URL('../dist/client/npc-conversation.js',import.meta.url),'utf8');

test('NPC voice session guard is deployed without source drift',()=>{
  assert.equal(deployed,source);
});

test('microphone permission completion cannot start recording for a different NPC',()=>{
  assert.match(source,/const recordingNpc=active;discardRecording=false;try\{stream=await navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\);if\(active!==recordingNpc\)/);
  assert.match(source,/stream\.getTracks\(\)\.forEach\(t=>t\.stop\(\)\);stream=null;return;/);
});

test('delayed Whisper result or failure cannot modify a different NPC conversation',()=>{
  assert.match(source,/await requestNpcTranscription\([\s\S]*?if\(active!==recordingNpc\)return;input\.value=/);
  assert.match(source,/if\(active===recordingNpc\)notice\(error\.message/);
});
