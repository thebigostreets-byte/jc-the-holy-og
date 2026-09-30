import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {advanceGait} from '../jc-control-math.js';

// Run the real lightweight game loop with a minimal canvas/DOM host. This catches
// runtime scope errors that syntax checks miss, without needing a graphics GPU.
let now = 0, conversation, draws = 0;
const frames = [], listeners = new Map(), elements = new Map(), images = [];
const canvas = new Proxy({}, {get: () => () => {draws++;}});
function element() {
  const classes = new Set();
  return {
    classList: {add: name => classes.add(name),remove: name => classes.delete(name),contains: name => classes.has(name),toggle(name, force) {const active = force ?? !classes.has(name);active ? classes.add(name) : classes.delete(name);return active;}},
    addEventListener() {},replaceChildren() {},closest: () => null,getContext: () => canvas,
    textContent: '',dataset: {},
  };
}
const document = {
  hidden: false,
  getElementById(id) {if (!elements.has(id)) elements.set(id,element());return elements.get(id);},
  createElement: element,querySelectorAll: () => [],
};
const context = {
  document,window: {},innerWidth: 900,innerHeight: 700,devicePixelRatio: 1,
  performance: {now: () => now},
  Image: class {constructor() {this.complete = false;this.naturalWidth = 0;images.push(this);}},
  requestAnimationFrame: callback => frames.push(callback),setTimeout: () => 0,clearTimeout() {},
  addEventListener(type, callback) {if (!listeners.has(type)) listeners.set(type,[]);listeners.get(type).push(callback);},
  cleanPoseImage: image => image,
  advanceGait,loadRearWalk:()=>{},loadPoseSheet:()=>{},FLIGHT_CELLS:[],
  createNpcConversation(options) {conversation = {isOpen: false,open() {this.isOpen = true;options.onOpen();},close() {this.isOpen = false;options.onClose();}};return conversation;},
};
const source = (await readFile('play-lite.js','utf8')).replace(/^import .*;\n/gm,'');
vm.runInNewContext(source,context,{filename:'play-lite.js'});
const game = context.window.JC_LITE;
function tick() {now += 1000 / 60;const callback = frames.shift();assert.ok(callback,'game must continue scheduling frames');callback(now);}
function key(type, code) {for (const callback of listeners.get(type) || []) callback({code,repeat:false,target:element(),preventDefault() {}});}
for (let i = 0; i < 4; i++) tick();
for (const image of images) {image.complete = true;image.naturalWidth = 256;image.naturalHeight = 256;}
const start = game.player.y;
key('keydown','KeyW');for (let i = 0; i < 30; i++) tick();key('keyup','KeyW');
assert.ok(game.player.y < start - 20,'held movement must move JC');
assert.ok(Number.isFinite(game.player.gait),'animation timing must stay finite');
conversation.open();const pausedY = game.player.y;
key('keydown','KeyW');for (let i = 0; i < 10; i++) tick();
assert.equal(game.player.y,pausedY,'conversation must pause movement');conversation.close();
for (const ability of game.catalog) {game.player.grace = 100;now += 14000;assert.doesNotThrow(() => game.cast(ability.id),ability.id);}
for (let i = 0; i < 4; i++) tick();
assert.ok(draws > 0);assert.equal(frames.length,1,'one animation loop must stay active');
console.log('Lightweight game passed continuous rendering, movement, chat pause, finite animation timing, and all 39 power calls.');
