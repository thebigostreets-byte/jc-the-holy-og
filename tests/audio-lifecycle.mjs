import assert from 'node:assert/strict';
import test from 'node:test';
import {createJcAudio} from '../jc-audio.js';
class Param{constructor(){this.value=0;}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
class Node{constructor(){this.frequency=new Param();this.gain=new Param();this.stopped=false;}connect(){}disconnect(){this.disconnected=true;}start(){}stop(){this.stopped=true;}addEventListener(){}}
class Audio{constructor(){this.currentTime=0;this.state='running';this.destination=new Node();this.osc=[];Audio.last=this;}createOscillator(){const n=new Node();this.osc.push(n);return n;}createGain(){return new Node();}close(){this.closed=true;this.state='closed';}resume(){return Promise.resolve();}}
const setup=()=>{const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};globalThis.window={AudioContext:Audio,addEventListener(){},removeEventListener(){}};return createJcAudio();};
test('muted audio never creates an AudioContext',()=>{const a=setup();a.set('muted',true);Audio.last=null;assert.equal(a.play('collect'),false);assert.equal(Audio.last,null);a.dispose();});
test('mute and zero ambience stop running oscillators, unmute restarts',()=>{const a=setup();a.start();const c=Audio.last;const first=c.osc.slice(0,4);assert.equal(first.length,4);a.set('muted',true);assert.ok(first.every(x=>x.stopped));a.set('muted',false);assert.equal(c.osc.length,8);const second=c.osc.slice(4,8);a.set('music',0);assert.ok(second.every(x=>x.stopped));a.dispose();});
test('invalid gain settings do not change existing volume',()=>{const a=setup();a.set('master',.4);a.set('master',Infinity);a.set('master',NaN);assert.equal(a.getSettings().master,.4);a.dispose();});
test('effect voices are capped under rapid repeated casts',()=>{const a=setup();a.set('music',0);let count=0;while(a.play('collect'))count++;assert.equal(count,8);a.dispose();});
test('dispose closes context, stops voices and disables future sounds',()=>{const a=setup();a.start();const c=Audio.last;a.play('cast');a.dispose();a.dispose();assert.equal(c.closed,true);assert.ok(c.osc.every(x=>x.stopped));assert.equal(a.start(),false);assert.equal(a.play('cast'),false);});
