import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../map-startup.js',import.meta.url),'utf8');
function setup(){
 const timers=[];const intervals=[];const elements=new Map();const redirects=[];
 const document={
  getElementById:id=>elements.get(id)||null,
  querySelectorAll:()=>[],
  createElement:tag=>({tagName:tag.toUpperCase(),dataset:{},style:{},children:[],append(...nodes){this.children.push(...nodes);},querySelector(sel){return sel==='p'?this.children.find(c=>c.tagName==='P'):this.children.find(c=>c.dataset?.liteFallback);},remove(){elements.delete(this.id);this.removed=true;},get textContent(){return this._textContent??this.children.map(c=>c.textContent||'').join('');},set textContent(v){this._textContent=v;}}),
  body:{append(node){elements.set(node.id,node);}},
 };
 const location={href:'https://example.test/map.html?play=1',search:'?play=1',replace(url){redirects.push(url);}};
 const window={studio:{renderer:{}},JC_PLAYER_READY:false,JC_CITY_READY:false};
 const context={window,document,location,URL,URLSearchParams,Date,console:{warn(){},error(){}},
  addEventListener(){},setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},setInterval(fn,ms){intervals.push({fn,ms});return intervals.length;},clearInterval(){} };
 vm.runInNewContext(source,context);
 return {window,elements,timers,intervals,redirects};
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
 env.window.JC_CITY_READY=true;
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
console.log('PASS: startup watchdog, late readiness recovery, no premature overlay removal, and conditional lite fallback.');
