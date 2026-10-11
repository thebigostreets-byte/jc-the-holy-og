import assert from 'node:assert/strict';
import {createJcAudio} from '../jc-audio.js';
let assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};
class Param{
  constructor(value=0){this.value=value;}
  setTargetAtTime(v){if(FakeAudioContext.failParam)throw Error('setTargetAtTime unavailable');this.value=v;}
  setValueAtTime(v){this.value=v;}
  exponentialRampToValueAtTime(v){this.value=v;}
}
class Node{
  constructor(){this.gain=new Param();this.frequency=new Param();this.started=false;this.stopped=false;this.disconnected=false;this.listeners=[];}
  connect(){return this;}
  start(){this.started=true;}
  stop(){this.stopped=true;}
  disconnect(){this.disconnected=true;}
  addEventListener(name,fn){if(name==='ended')this.listeners.push(fn);}
  ended(){for(const fn of this.listeners.splice(0))fn();}
}
class FakeAudioContext{
  static instances=[];static failGainAt=0;static failParam=false;static resumeThrows=false;
  constructor(){this.state='running';this.currentTime=0;this.destination=new Node();this.oscillators=[];this.gains=[];this.closed=false;FakeAudioContext.instances.push(this);}
  createGain(){if(FakeAudioContext.failGainAt===this.gains.length+1)throw Error('gain failure');const n=new Node();this.gains.push(n);return n;}
  createOscillator(){const n=new Node();this.oscillators.push(n);return n;}
  resume(){if(FakeAudioContext.resumeThrows)throw Error('resume rejected synchronously');this.state='running';return Promise.resolve();}
  close(){this.closed=true;this.state='closed';return Promise.resolve();}
}
const registered=new Map(),removed=[];
const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)};
globalThis.window={AudioContext:FakeAudioContext,addEventListener(name,fn){registered.set(name,fn);},removeEventListener(name,fn,capture){removed.push([name,fn,capture]);registered.delete(name);}};
const audio=createJcAudio();
check(registered.has('pointerdown')&&registered.has('keydown'),'gesture listeners installed');
check(audio.start()===true,'audio starts');
const context=FakeAudioContext.instances.at(-1);
check(context.oscillators.length===4,'four ambient oscillators start');
check(audio.play('collect')===true,'three-note effect starts');
check(context.oscillators.length===7,'three effect oscillators created');
check(audio.set('master',.4).master===.4,'volume remains configurable');
check(context.gains[0].gain.value===.4,'gain updates');
check(JSON.parse(store.get('jc-audio-settings-v1')).master===.4,'volume persists');
check(audio.set('muted',true).muted===true,'mute toggles');
check(audio.play('collect')===false,'mute blocks effects');
audio.set('muted',false);
for(let i=0;i<9;i++)check(audio.play('collect')===true,'effect within 32 voice budget');
check(audio.play('collect')===false,'voice budget rejects overload');
check(context.oscillators.length===34,'voice limit bounds allocations (4 ambient + 30 effect)');
context.oscillators.at(-1).ended();
check(audio.play('ui')===true,'ended effect frees a voice slot');
audio.dispose();
check(context.closed,'context closed on disposal');
check(context.oscillators.every(o=>o.stopped),'all oscillators stopped');
check(context.oscillators.every(o=>o.disconnected),'all oscillators disconnected');
check(context.gains.every(g=>g.disconnected),'all gain nodes disconnected');
check(removed.length===2&&!registered.size,'global gesture listeners removed');
check(audio.start()===false&&audio.play('ui')===false,'disposed audio cannot restart');
check(audio.set('master',1).master===.4,'disposed audio settings are immutable');
audio.dispose();
check(removed.length===2,'dispose is idempotent');

FakeAudioContext.failGainAt=2;
const bad=createJcAudio();
check(bad.start()===false,'partial context initialization fails safely');
check(FakeAudioContext.instances.at(-1).closed,'partial context is closed');
bad.dispose();FakeAudioContext.failGainAt=0;

const broken=createJcAudio();
check(broken.start()===true,'recovery creates a new context');
const brokenContext=FakeAudioContext.instances.at(-1);
FakeAudioContext.failGainAt=brokenContext.gains.length+1;
check(broken.play('ui')===false,'effect creation exception is isolated');
check(brokenContext.oscillators.at(-1).disconnected,'partially created oscillator is cleaned');
FakeAudioContext.failGainAt=0;
check(broken.play('ui')===true,'audio recovers after transient node failure');
brokenContext.state='suspended';FakeAudioContext.resumeThrows=true;
check(broken.start()===false,'synchronous resume exception is isolated');
FakeAudioContext.resumeThrows=false;brokenContext.state='running';
FakeAudioContext.failParam=true;
check(broken.set('effects',.5).effects===.5,'settings update exception does not escape');
check(brokenContext.closed,'failed settings update releases damaged context');
FakeAudioContext.failParam=false;
check(broken.start()===true,'audio reinitializes after failed settings update');
broken.dispose();
console.log('PASS: '+assertions+' audio lifecycle and overload assertions');
