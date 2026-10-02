import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createJcAudio} from '../jc-audio.js';

class FakeParam{
  constructor(value=0){this.value=value;}
  setTargetAtTime(value){this.value=value;}
  setValueAtTime(value){this.value=value;}
  exponentialRampToValueAtTime(value){this.value=value;}
}
class FakeNode{
  constructor(){this.gain=new FakeParam();this.frequency=new FakeParam();this.type='sine';this.connections=[];this.started=false;}
  connect(target){this.connections.push(target);return target;}
  start(){this.started=true;}
  stop(){this.stopped=true;}
  disconnect(){}
  addEventListener(){}
}
class FakeAudioContext{
  constructor(){this.state='running';this.currentTime=0;this.destination=new FakeNode();this.oscillators=[];this.gains=[];FakeAudioContext.last=this;}
  createGain(){const node=new FakeNode();this.gains.push(node);return node;}
  createOscillator(){const node=new FakeNode();this.oscillators.push(node);return node;}
  resume(){this.state='running';return Promise.resolve();}
}
const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
globalThis.window={AudioContext:FakeAudioContext,addEventListener(){}};

const audio=createJcAudio();
assert.equal(audio.start(),true,'audio context can start after a user gesture');
const context=FakeAudioContext.last;
const ambientCount=context.oscillators.length;
assert.ok(ambientCount>=3,'ambient sound starts when audio is enabled');
assert.equal(audio.play('collect'),true,'collect effect can play');
assert.equal(context.oscillators.length,ambientCount+3,'collect plays its three-note effect');
audio.set('master',.4);
assert.equal(audio.getSettings().master,.4,'master volume updates');
assert.equal(context.gains[0].gain.value,.4,'master gain updates immediately');
assert.equal(JSON.parse(store.get('jc-audio-settings-v1')).master,.4,'settings persist locally');
audio.set('muted',true);
const mutedCount=context.oscillators.length;
assert.equal(context.gains[0].gain.value,0,'mute silences master output');
assert.equal(audio.play('collect'),false,'muted effects are blocked');
assert.equal(context.oscillators.length,mutedCount,'muted effects do not create sounds');
audio.set('muted',false);
audio.set('effects',0);
assert.equal(audio.play('ui'),false,'effects slider can silence sound effects');
audio.set('effects',.5);
audio.set('music',0);
assert.equal(audio.getSettings().music,0,'ambience slider can turn off ambience');

const game=readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
assert.match(game,/id="jcSoundToggle"/,'HUD exposes a sound settings button');
assert.match(game,/id="jcMasterVolume"/,'HUD exposes master volume');
assert.match(game,/id="jcMusicVolume"/,'HUD exposes ambience volume');
assert.match(game,/id="jcEffectsVolume"/,'HUD exposes sound effects volume');
assert.match(game,/jcAudio\.play\('collect'\)/,'collecting lights plays a sound');
assert.match(game,/jcAudio\.play\('prayer'\)/,'answering prayers plays a sound');
assert.match(game,/jcAudio\.play\(soundId\)/,'miracle casts play a sound');
console.log('PASS: audio controls, persistent volumes, mute behavior, ambience, and gameplay sound hooks.');
