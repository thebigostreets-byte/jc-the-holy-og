// Deterministic, low-cost life simulation for off-screen NPCs.
// World time is supplied by the game. No network requests or rendering required.
const hash = value => {let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const pick=(id,values)=>values[hash(id)%values.length];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function createNpcLife(id, options={}) {
  const key=String(id);
  const occupation=options.occupation||pick(key+':job',['hotel-worker','casino-worker','driver','cook','security','shopkeeper','teacher','medic','office-worker','unemployed']);
  const homeId=options.homeId||'residence-'+(hash(key+':home')%1200);
  const workplaceId=options.workplaceId||'workplace-'+(hash(key+':work')%360);
  const familyId=options.familyId||'family-'+(hash(key+':family')%450);
  const startHour=occupation==='security'?22:occupation==='cook'?11:occupation==='unemployed'?null:7+(hash(key+':shift')%4);
  const shiftHours=occupation==='unemployed'?0:8;
  return {
    id:key, name:options.name||'Resident', occupation, homeId, workplaceId, familyId,
    relationships:Array.isArray(options.relationships)?options.relationships.slice(0,12):[],
    money:Number.isFinite(options.money)?options.money:40+(hash(key+':money')%800),
    stress:clamp(options.stress??10,0,100), energy:clamp(options.energy??85,0,100),
    hunger:clamp(options.hunger??10,0,100), safety:clamp(options.safety??80,0,100),
    startHour, shiftHours, lastDay:null, lastHour:null, activity:'at-home',
    memory:[], locationId:homeId,
  };
}
export function updateNpcLife(life, worldHour, day=0, events=[]) {
  if(!life||!Number.isFinite(worldHour))return life;
  const hour=((Math.floor(worldHour)%24)+24)%24;
  if(life.lastDay===day&&life.lastHour===hour)return life;
  const elapsed=life.lastDay===null?1:clamp((day-life.lastDay)*24+hour-life.lastHour,1,48);
  life.lastDay=day;life.lastHour=hour;
  life.hunger=clamp(life.hunger+elapsed*4,0,100);
  const onShift=life.startHour!==null&&((hour-life.startHour+24)%24)<life.shiftHours;
  const asleep=hour>=23||hour<6;
  if(asleep){life.activity='sleeping';life.locationId=life.homeId;life.energy=clamp(life.energy+elapsed*7,0,100);}
  else if(life.hunger>70){life.activity='getting-food';life.locationId=life.homeId;life.hunger=clamp(life.hunger-55,0,100);}
  else if(onShift){life.activity='working';life.locationId=life.workplaceId;life.energy=clamp(life.energy-elapsed*3,0,100);life.money+=elapsed*12;}
  else if(life.energy<25){life.activity='resting';life.locationId=life.homeId;life.energy=clamp(life.energy+elapsed*5,0,100);}
  else if(hour>=18&&hour<22){life.activity='family-time';life.locationId=life.homeId;life.stress=clamp(life.stress-elapsed*2,0,100);}
  else {life.activity=pick(life.id+':'+day+':'+Math.floor(hour/3),['shopping','commuting','socializing','walking','at-home']);life.locationId=life.activity==='at-home'?life.homeId:null;}
  for(const event of events.slice(-4)){
    if(event?.type==='danger'&&(!event.locationId||event.locationId===life.locationId)){
      life.activity='seeking-safety';life.safety=clamp(life.safety-25,0,100);
      life.stress=clamp(life.stress+20,0,100);
      life.memory.push({day,hour,type:'witnessed-danger',locationId:event.locationId||null});
    }
  }
  if(life.memory.length>16)life.memory.splice(0,life.memory.length-16);
  return life;
}
// Off-screen simulation: only active/visible residents require 3D actors.
// Call updateNpcLife at most once per simulated hour for inactive residents.
export function simulateNeighborhood(residents, worldHour, day, events=[]) {
  for(const resident of residents)updateNpcLife(resident,worldHour,day,events);
  return residents;
}
