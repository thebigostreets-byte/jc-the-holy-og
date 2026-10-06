import assert from 'node:assert/strict';
import {createSystemicWorld,INCIDENT_TEMPLATES,createDefaultSystemicState} from '../systemic-world.js';

class MemoryStorage {
  constructor(){this.data=new Map();}
  getItem(key){return this.data.has(key)?this.data.get(key):null;}
  setItem(key,value){this.data.set(key,String(value));}
}

assert.ok(INCIDENT_TEMPLATES.length>=8,'systemic incident catalog covers multiple city situations');
const defaults=createDefaultSystemicState();
for(const name of ['Strip Core','Airport Corridor','Psalms','Residential East','Downtown','Industrial West'])assert.ok(defaults.districts[name],name+' district exists');

const player={position:{x:0,y:0,z:0}};
const signals=[];
const fires=[];
const storage=new MemoryStorage();
const world=createSystemicWorld({
  player,
  seed:42,
  storage,
  groundAt:()=>0,
  clearSpot:(x,z)=>[x,z],
  npcSystem:{signal:(type,position,radius)=>signals.push({type,position:position.clone(),radius})},
  fireSystem:{
    ignite:(id,position)=>fires.push({id,position:position.clone()}),
    extinguish:()=>1
  },
  getFaction:()=> 'jc'
});

const fire=world.spawnIncident(1000,'structure-fire');
assert.equal(fire.type,'structure-fire');
assert.ok(fires.length===1,'fire incidents connect to the fire system');
assert.ok(signals.some(item=>item.type==='fire'),'incident is broadcast to nearby NPCs');

fire.position.copy(player.position);
world.onAbility('rain',player.position,'jc');
assert.equal(fire.phase,'resolved','matching contextual powers resolve incidents');
assert.equal(world.state.incidentsResolved,1);
assert.ok(world.state.publicReputation>0,'successful rescue changes public reputation');
assert.ok(world.districtAt(player.position).hope>50,'successful intervention improves local hope');

const crash=world.spawnIncident(2000,'traffic-crash');
const civicRepBefore=world.state.publicReputation;
const responder={id:'officer-1',name:'Officer',faction:'authority'};
const firstResponse=world.npcResponse(crash,responder);
const secondResponse=world.npcResponse(crash,responder);
assert.equal(firstResponse.handled,true,'authority can locally respond to a traffic crash');
assert.equal(secondResponse.handled,true);
assert.ok(crash.npcResponses>=2,'incident records autonomous responder work');
assert.equal(crash.phase,'resolved','multiple local responses can resolve a stabilized low-severity incident');
assert.equal(world.state.publicReputation,civicRepBefore,'autonomous civic response does not award JC reputation');

const before=world.state.publicReputation;
world.onDestruction({position:player.position,buildingId:'test-tower'},'jc');
assert.ok(world.state.publicReputation<before,'destructive consequences reduce public reputation');

const snapshot=world.snapshot();
assert.ok(Array.isArray(snapshot.activeIncidents));
assert.ok(snapshot.recentEvents.some(event=>event.type==='destruction'));
assert.match(world.hudLine(player.position),/HOPE/);
assert.match(world.hudLine(player.position),/CORRUPTION/);

console.log('Systemic world director incidents, consequences, reputation and district state passed.');
