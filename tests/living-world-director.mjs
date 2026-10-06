import assert from 'node:assert/strict';
import {createLivingWorldDirector,RIVAL_EVENTS,BOSS_STAGES} from '../living-world-director.js';

class MemoryStorage {
  constructor(){this.data=new Map();}
  getItem(k){return this.data.has(k)?this.data.get(k):null;}
  setItem(k,v){this.data.set(k,String(v));}
}
class Vec {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
}
const storage=new MemoryStorage();
const player={position:new Vec(0,0,0)};
const npc={id:'n1',contactId:'n1',name:'Marcus',faction:'civilian',position:new Vec(8,0,0),prayerPending:false};
const signals=[],abilities=[],fires=[];
const systemicWorld={onAbility:(id,pos,actor)=>abilities.push({id,pos,actor})};
const director=createLivingWorldDirector({
  player,
  npcSystem:{npcs:[npc],signal:(type,position,radius)=>signals.push({type,position,radius})},
  systemicWorld,
  fireSystem:{ignite:(id,position,duration)=>fires.push({id,position,duration})},
  clearSpot:(x,z)=>[x,z],
  groundAt:()=>0,
  getFaction:()=> 'jc',
  storage,
  seed:7
});

assert.ok(RIVAL_EVENTS.length>=6);
assert.ok(BOSS_STAGES.length>=3);

const prayer=director.spawnPrayer(npc,'healing');
assert.equal(prayer.status,'active');
assert.equal(npc.prayerPending,true);
assert.equal(director.nearestPrayer(player.position,20).prayer.id,prayer.id);
director.onAbility('heal',player.position,'jc');
assert.equal(prayer.status,'resolved');
assert.equal(npc.prayerPending,false);
assert.equal(director.state.answeredPrayers,1);
assert.ok(director.state.xp>0);
assert.ok(director.state.npcRelations.n1.trust>0);

const fireEvent=director.spawnRivalEvent('start-fire');
assert.equal(fireEvent.rival,'satan');
assert.equal(fires.length,1);
assert.ok(signals.length>0);
assert.ok(abilities.some(x=>x.actor==='satan'));

director.onBuildingDestroyed({buildingId:'tower-1',position:new Vec(4,0,4)},'jc');
assert.ok(director.state.destroyedBuildings['tower-1']);
director.onBuildingRebuilt({buildingId:'tower-1'});
assert.equal(director.state.destroyedBuildings['tower-1'],undefined);

for(let i=0;i<30;i++)director.onAbility('restore',player.position,'jc');
assert.ok(director.state.level>=3);
director.update(1,1000);
if(director.boss){
  const before=director.boss.currentHealth;
  director.damageBoss(40,'lightning');
  assert.equal(director.boss.currentHealth,before-40);
}
assert.match(director.hudLine(),/LVL/);
assert.match(director.hudLine(),/PRAYERS/);
assert.doesNotThrow(()=>JSON.stringify(director.snapshot()));

const persisted=JSON.parse(storage.getItem('jc-living-world-v1'));
assert.equal(persisted.version,1);
console.log('Living world director prayers, rivalry, progression, persistence, consequences and boss escalation passed.');
