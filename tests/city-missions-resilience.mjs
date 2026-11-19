import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = new URL('../city-missions.js', import.meta.url);
const temp = mkdtempSync(join(tmpdir(), 'jc-city-missions-'));
const stub = `export class Mesh { constructor(geometry,material){this.geometry=geometry;this.material=material;this.rotation={x:0};this.position={x:0,y:0,z:0,copy(p){this.x=p.x;this.y=p.y;this.z=p.z;}};this.visible=false;} }\nexport class TorusGeometry {dispose(){this.disposed=true;}}\nexport class MeshBasicMaterial {dispose(){this.disposed=true;}}`;
writeFileSync(join(temp, 'package.json'), '{"type":"module"}');
writeFileSync(join(temp, 'three.module.js'), stub);
writeFileSync(join(temp, 'city-missions.js'), readFileSync(source));
const { createCityMissions } = await import(pathToFileURL(join(temp, 'city-missions.js')));

const created = [];
function element(tag) { return {tag, hidden:false, textContent:'', style:{cssText:''}, children:[], append(...nodes){this.children.push(...nodes);}, remove(){this.removed=true;}}; }
globalThis.document = { createElement: tag => element(tag), body:{append(node){created.push(node);}} };
const saved = new Map();
globalThis.localStorage = {getItem:key=>saved.get(key) ?? null, setItem:(key,val)=>saved.set(key,val)};
globalThis.performance = {now:()=>1000};
const player = {position:{x:0,y:0,z:0}};
const npc = (x=5) => ({faction:'civilian',collapse:false,position:{x,y:0,z:0},target:{copy(p){this.x=p.x;this.y=p.y;this.z=p.z;}}});
function setup(npcs=[npc()], opts={}){
  const scene = {added:[],removed:[],add(m){this.added.push(m);},remove(m){this.removed.push(m);}};
  const rewards=[];
  const game = createCityMissions({scene,player,npcs,onReward:r=>rewards.push(r),...opts});
  return {scene,game,npcs,rewards,panel:created.at(-1),marker:scene.added.at(-1)};
}
try {
  // 1. Corrupted or oversized stored progress cannot corrupt mission selection.
  for (const value of ['NaN','Infinity','-15','1.5','1e100']) {
    saved.set('jc-rescues', value);
    const t=setup(); assert.equal(t.game.start(),true,value);assert.equal(t.game.usePower('heal'),true,value);
    assert.equal(saved.get('jc-rescues'),'1',value);t.game.dispose();
  }
  // 2. Missing, malformed, or invalid NPCs do not crash mission selection.
  for(const input of [null,{},[null,{}, {faction:'civilian'}, {faction:'civilian',position:{x:NaN,y:0,z:0},target:{copy(){}}}]]){
    const t=setup(input);assert.equal(t.game.start(),false);t.game.dispose();
  }
  // 3. A second start cannot replace the active mission or strand the held NPC.
  saved.set('jc-rescues','0');
  {const a=npc(),b=npc(10),t=setup([a,b]);assert.equal(t.game.start(),true);assert.equal(a.missionHeld,true);assert.equal(t.game.start(),false);assert.equal(a.missionHeld,true);assert.equal(b.missionHeld,undefined);t.game.dispose();}
  // 4. A missing NPC position cancels safely and releases the hold on update.
  {const a=npc(),t=setup([a]);t.game.start();a.position=null;t.game.update(1100,true);assert.equal(a.missionHeld,false);assert.equal(t.marker.visible,false);assert.equal(t.game.usePower('heal'),false);t.game.dispose();}
  // 5. Failed and out-of-range casts cannot award progress.
  {const a=npc(),t=setup([a]);t.game.start();assert.equal(t.game.usePower('shield'),false);a.position.x=150;assert.equal(t.game.usePower('heal'),false);assert.equal(t.rewards.length,0);t.game.dispose();}
  // 6. Optional population and reward callbacks throwing cannot strand a completed rescue.
  {const a=npc(),t=setup([a],{population:{remember(){throw Error('memory down');},influence(){throw Error('influence down');}},onReward(){throw Error('reward down');}});t.game.start();assert.equal(t.game.usePower('heal'),true);assert.equal(a.missionHeld,false);assert.equal(t.marker.visible,false);assert.equal(t.game.usePower('heal'),false);t.game.dispose();}
  // 7. Invalid frame timestamps and clock rollback are recoverable.
  {const a=npc(),t=setup([a]);t.game.start();t.game.update(NaN,true);t.game.update(-100,true);assert.match(t.panel.children[0].textContent,/m\\n|triage|A safe place|Hope on the Strip/);t.game.dispose();}
  // 8. Disposal releases scene/UI/GPU resources and prevents future awards or updates.
  {const a=npc(),t=setup([a]);t.game.start();t.game.dispose();t.game.dispose();assert.equal(a.missionHeld,false);assert.equal(t.panel.removed,true);assert.equal(t.scene.removed.length,1);assert.equal(t.marker.geometry.disposed,true);assert.equal(t.marker.material.disposed,true);assert.equal(t.game.start(),false);assert.equal(t.game.usePower('heal'),false);t.game.update(3000,true);}
  // 9. Normal successful mission still awards correct grace and persists progress.
  {saved.set('jc-rescues','0');const a=npc(),t=setup([a]);assert.equal(t.game.start(),true);assert.equal(t.game.usePower('heal'),true);assert.deepEqual(t.rewards,[25]);assert.equal(saved.get('jc-rescues'),'1');assert.equal(a.health,100);assert.equal(a.state,'awe');t.game.dispose();}
  console.log('PASS: 9 city-mission resilience and gameplay scenarios');
} finally {rmSync(temp,{recursive:true,force:true});}
