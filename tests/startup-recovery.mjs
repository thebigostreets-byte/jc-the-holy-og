import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// The 3D engine is created BEFORE its tiles are ready. It must not be treated
// as success when the player is still staring at 'Opening the city…'.
const script=fs.readFileSync(new URL('../map-startup.js',import.meta.url),'utf8');
const timers=[],intervals=[],elements=new Map();
const makeElement=tag=>({
  tagName:tag,style:{},dataset:{},children:[],textContent:'',
  append(...children){this.children.push(...children);if(this.id)elements.set(this.id,this);},
  remove(){elements.delete(this.id);},
  querySelector(selector){return selector==='p'?this.children.find(c=>c.tagName==='p')||null:this.children.find(c=>c.dataset.liteFallback)||null;}
});
const body={append(el){elements.set(el.id,el);}};
const location={href:'https://example.test/map.html?play=1',search:'?play=1',replace(){}};
const context={
  URL,URLSearchParams,location,console,
  document:{body,createElement:makeElement,getElementById:id=>elements.get(id)||null,querySelectorAll:()=>[]},
  setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},
  setInterval(fn,ms){intervals.push({fn,ms});return intervals.length;},
  clearTimeout(){},clearInterval(){},addEventListener(){}
};
context.window=context;
vm.runInNewContext(script,context);
assert.equal(context.JC_BOOT_FAILED,false);
assert.ok(timers.find(x=>x.ms===45000),'45-second recovery watchdog exists');

context.studio={ready:new Promise(()=>{})}; // engine exists but has not loaded
timers.find(x=>x.ms===45000).fn();
assert.equal(context.JC_BOOT_FAILED,true,'timeout remains active while engine is unready');
assert.ok(elements.has('jcRecovery'),'recovery buttons replace endless spinner');
assert.match(elements.get('jcRecovery').children[0].textContent,/taking too long/i);
assert.equal(elements.get('jcRecovery').children.some(c=>c.dataset.liteFallback),true);

context.JC_CITY_READY=true;
intervals[0].fn();
assert.ok(elements.has('jcRecovery'),'city ready alone cannot hide recovery while player still loads');
context.JC_PLAYER_READY=true;
intervals[0].fn();
assert.equal(elements.has('jcRecovery'),false,'actual player readiness clears recovery');
assert.equal(context.JC_BOOT_FAILED,false);

const engine=fs.readFileSync(new URL('../map-engine.js',import.meta.url),'utf8');
assert.match(engine,/window\.studio\.ready=loadArea\('C15_R14',0\)/,'startup only loads one spawn tile');
assert.match(engine,/createMissingTileFallback\(spawn\)/,'failed initial Strip load starts with generated placeholder');
assert.match(engine,/window\.JC_CITY_READY=true/,'city readiness is explicit');
assert.match(engine,/const timeoutMs=critical\?18000:45000/,'critical downloads have bounded attempts');
assert.match(engine,/clearTimeout\(timer\)/,'optional bootstrap wait clears timers');
const html=fs.readFileSync(new URL('../map.html',import.meta.url),'utf8');
assert.match(html,/opening-city-recovery-20261012a/,'updated startup assets bypass stale mobile cache');
console.log('PASS: 45-second recovery, unready studio detection, playable-only cleanup, bounded spawn fetch and cache refresh.');
