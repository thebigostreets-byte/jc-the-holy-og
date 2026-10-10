import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../map-startup.js',import.meta.url),'utf8');
function setup(search='?play=1'){
 const timers=[];const intervals=[];const clearedIntervals=new Set();const elements=new Map();const redirects=[];
 const document={
  getElementById:id=>elements.get(id)||null,
  querySelectorAll:()=>[],
  createElement:tag=>({tagName:tag.toUpperCase(),dataset:{},style:{},children:[],append(...nodes){this.children.push(...nodes);},querySelector(sel){return sel==='p'?this.children.find(c=>c.tagName==='P'):this.children.find(c=>c.dataset?.liteFallback);},remove(){elements.delete(this.id);this.removed=true;},get textContent(){return this._textContent??this.children.map(c=>c.textContent||'').join('');},set textContent(v){this._textContent=v;}}),
  body:{append(node){elements.set(node.id,node);}},
 };
 const location={href:'https://example.test/map.html'+search,search,replace(url){redirects.push(url);}};
 const window={studio:{renderer:{}},JC_PLAYER_READY:false,JC_CITY_READY:false};
 const context={window,document,location,URL,URLSearchParams,Date,console:{warn(){},error(){}},
  addEventListener(){},setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},setInterval(fn,ms){intervals.push({fn,ms});return intervals.length;},clearInterval(id){clearedIntervals.add(id);} };
 vm.runInNewContext(source,context);
 return {window,elements,timers,intervals,clearedIntervals,redirects};
}
{
 const env=setup();
 env.window.jcLoadingRecovery('Full 3D startup is taking too long at player.');
 assert.equal(env.window.JC_BOOT_FAILED,true,'studio allocation is not proof of playable scene');
 assert.ok(env.elements.has('jcRecovery'),'watchdog must show recovery when player not ready');
 env.intervals[0].fn();
 assert.ok(env.elements.has('jcRecovery'),'cleanup must not remove overlay before readiness');
 env.window.JC_PLAYER_READY=true;
 env.intervals[0].fn();
 assert.equal(env.elements.has('jcRecovery'),false,'late successful player should clear stale recovery');
 assert.equal(env.window.JC_BOOT_FAILED,false);
}
{
 const env=setup();
 env.timers.find(t=>t.ms===90000).fn();
 assert.ok(env.elements.has('jcRecovery'),'90-second watchdog must surface an actionable recovery');
}
{
 const env=setup();
 env.window.jcLoadingRecovery('WebGL 2 and WebGL 1 are unavailable');
 assert.equal(env.window.JC_BOOT_FAILED,true);
 const redirect=env.timers.find(t=>t.ms===1800);
 assert.ok(redirect,'fatal graphics error schedules fallback');
 env.window.JC_PLAYER_READY=true;
 redirect.fn();
 assert.equal(env.redirects.length,0,'late scene readiness must cancel automatic lite redirect');
}
{
 const env=setup();
 env.window.jcLoadingRecovery('WebGL 2 and WebGL 1 are unavailable');
 env.timers.find(t=>t.ms===1800).fn();
 assert.equal(env.redirects.length,1,'real fatal graphics failure still opens lite fallback');
 assert.match(env.redirects[0],/play-lite\.html/);
}

// City geometry alone must not suppress recovery in playable mode.
{
 const env=setup();
 env.window.JC_CITY_READY=true;
 env.window.jcLoadingRecovery('Player avatar never initialized');
 assert.equal(env.window.JC_BOOT_FAILED,true);
 assert.ok(env.elements.has('jcRecovery'));
 env.intervals[0].fn();
 assert.ok(env.elements.has('jcRecovery'),'city-only readiness must not dismiss player warning');
 env.window.JC_PLAYER_READY=true;
 env.intervals[0].fn();
 assert.equal(env.elements.has('jcRecovery'),false);
}
// Graphics fallback must remain available when city loads but the player is still missing.
{
 const env=setup();
 env.window.jcLoadingRecovery('WebGL 2 and WebGL 1 are unavailable');
 env.window.JC_CITY_READY=true;
 env.timers.find(t=>t.ms===1800).fn();
 assert.equal(env.redirects.length,1);
}
// Once a real playable scene recovers, even a graphics-error overlay must clear.
{
 const env=setup();
 env.window.jcLoadingRecovery('WebGL 2 and WebGL 1 are unavailable');
 assert.ok(env.elements.has('jcRecovery'));
 env.window.JC_PLAYER_READY=true;
 env.intervals[0].fn();
 assert.equal(env.elements.has('jcRecovery'),false);
 assert.equal(env.window.JC_BOOT_FAILED,false);
}
// Non-playable map viewing should consider the city ready without a player avatar.
{
 const env=setup('?view=1');
 env.window.JC_CITY_READY=true;
 env.window.jcLoadingRecovery('Late optional asset failure');
 assert.equal(env.elements.has('jcRecovery'),false);
 assert.equal(env.window.JC_BOOT_FAILED,false);
}

// Recoverable GPU context loss must not silently redirect before the player can retry.
{
 const env=setup();
 env.window.jcLoadingRecovery('The game lost its graphics connection');
 assert.ok(env.elements.has('jcRecovery'));
 assert.equal(env.timers.some(t=>t.ms===1800),false,'recoverable graphics failures must not force lite mode');
 assert.equal(env.redirects.length,0);
}
// A partially removed recovery overlay must be repaired rather than crashing recovery itself.
{
 const env=setup();
 env.window.jcLoadingRecovery('Initial stall');
 const overlay=env.elements.get('jcRecovery');
 overlay.children=overlay.children.filter(c=>c.tagName!=='P');
 assert.doesNotThrow(()=>env.window.jcLoadingRecovery('Updated stall'));
 assert.equal(env.elements.get('jcRecovery').querySelector('p').textContent,'Updated stall');
}
// On very slow devices, recovery must still clear after the former 120s cutoff.
{
 const env=setup();
 env.window.jcLoadingRecovery('Still starting');
 const cutoff=env.timers.find(t=>t.ms===120000);
 if(cutoff)cutoff.fn();
 assert.equal(env.clearedIntervals.has(1),false,'readiness cleanup must remain active past 120s');
 env.window.JC_PLAYER_READY=true;
 env.intervals[0].fn();
 assert.equal(env.elements.has('jcRecovery'),false);
 assert.equal(env.clearedIntervals.has(1),true);
}
// External overlay removal must not leave a stale boot-failed flag after readiness.
{
 const env=setup();
 env.window.jcLoadingRecovery('Waiting');
 env.elements.delete('jcRecovery');
 env.window.JC_PLAYER_READY=true;
 env.intervals[0].fn();
 assert.equal(env.window.JC_BOOT_FAILED,false);
}

console.log('PASS: startup watchdog, late readiness recovery, no premature overlay removal, and conditional lite fallback.');
