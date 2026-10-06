const STORAGE_KEY='jc-living-world-v1';
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const point=p=>({x:Number(p?.x)||0,y:Number(p?.y)||0,z:Number(p?.z)||0});
const dist=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));
const nowDate=()=>Date.now();

const RIVAL_EVENTS=[
  {id:'corrupt-crowd',label:'RIVAL CORRUPTING A CROWD',signal:'despair',impact:4},
  {id:'start-fire',label:'RIVAL STARTED A FIRE',signal:'fire',impact:5},
  {id:'false-rumor',label:'RIVAL SPREADING FALSE RUMORS',signal:'panic',impact:3},
  {id:'ambush',label:'RIVAL AMBUSH',signal:'demon-sighting',impact:6},
  {id:'rescue',label:'RIVAL RESCUED CIVILIANS',signal:'rescue',impact:-4},
  {id:'restore',label:'RIVAL RESTORED A DISTRICT',signal:'awe',impact:-5}
];

const BOSS_STAGES=[
  {level:3,id:'possessed-enforcer',label:'POSSESSED ENFORCER',health:180},
  {level:6,id:'demon-commander',label:'DEMON COMMANDER',health:320},
  {level:10,id:'satan-showdown',label:'SATAN SHOWDOWN',health:600}
];

function fresh(){
  return {
    version:1,level:1,xp:0,answeredPrayers:0,failedPrayers:0,
    rivalScore:0,playerScore:0,eventSerial:0,lastRivalAt:0,lastPrayerAt:0,
    completedBosses:[],prayers:[],history:[],npcRelations:{},destroyedBuildings:{},
    lastSavedAt:nowDate()
  };
}
function load(storage){
  const base=fresh();
  try{
    const raw=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');
    if(!raw||raw.version!==1)return base;
    return {...base,...raw,prayers:Array.isArray(raw.prayers)?raw.prayers.slice(-30):[],history:Array.isArray(raw.history)?raw.history.slice(-80):[],completedBosses:Array.isArray(raw.completedBosses)?raw.completedBosses:[],npcRelations:raw.npcRelations||{},destroyedBuildings:raw.destroyedBuildings||{}};
  }catch{return base;}
}
function relationKey(npc){return String(npc?.contactId??npc?.id??npc?.name??'unknown');}

export function createLivingWorldDirector({
  player,npcSystem=null,systemicWorld=null,fireSystem=null,
  groundAt=(x,z)=>0,clearSpot=(x,z)=>[x,z],getFaction=()=> 'jc',
  onStatus=()=>{},storage=globalThis.localStorage,seed=(Date.now()>>>0)||1
}={}){
  const state=load(storage);
  let serialSeed=seed>>>0,lastPersist=0,lastTick=0,activeBoss=null;
  const rng=()=>((serialSeed=Math.imul(serialSeed,1664525)+1013904223>>>0)/4294967296);
  const activePrayers=()=>state.prayers.filter(p=>p.status==='active');

  function persist(force=false){
    const now=performance.now?.()??Date.now();
    if(!force&&now-lastPersist<2000)return;
    lastPersist=now;state.lastSavedAt=nowDate();
    try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
  }
  function log(type,details={}){
    const event={id:'living-'+(++state.eventSerial),type,at:nowDate(),...details};
    state.history.push(event);while(state.history.length>80)state.history.shift();
    return event;
  }
  function addXp(amount,reason='world action'){
    const gain=Math.max(0,Math.round(amount||0));if(!gain)return state.level;
    state.xp+=gain;state.playerScore+=gain;
    const nextLevel=1+Math.floor(Math.sqrt(state.xp/120));
    if(nextLevel>state.level){state.level=nextLevel;onStatus(`INFLUENCE LEVEL ${state.level} · ${reason.toUpperCase()}`);}
    return state.level;
  }
  function remember(npc,type,detail=''){
    if(!npc)return;
    const key=relationKey(npc),entry=state.npcRelations[key]||{trust:0,fear:0,alignment:0,met:0,lastSeen:0,memories:[]};
    entry.met++;entry.lastSeen=nowDate();
    if(type==='helped'){entry.trust=clamp(entry.trust+12,-100,100);entry.alignment=clamp(entry.alignment+7,-100,100);}
    if(type==='harmed'){entry.fear=clamp(entry.fear+18,-100,100);entry.trust=clamp(entry.trust-14,-100,100);entry.alignment=clamp(entry.alignment-8,-100,100);}
    if(detail){entry.memories.push(detail);entry.memories=entry.memories.slice(-8);}
    state.npcRelations[key]=entry;persist();
  }
  function spawnPrayer(npc=null,forcedNeed=null){
    if(activePrayers().length>=8)return null;
    const candidates=(npcSystem?.npcs||[]).filter(n=>!n.collapse&&n.faction!=='demon'&&n.position);
    npc ||= candidates[Math.floor(rng()*Math.max(1,candidates.length))]||null;
    if(!npc)return null;
    const need=forcedNeed||['healing','protection','fire','fear','corruption','rescue'][Math.floor(rng()*6)];
    const prayer={id:'prayer-'+(++state.eventSerial),npcId:relationKey(npc),name:npc.name||'Resident',need,status:'active',createdAt:nowDate(),expiresAt:nowDate()+90000+Math.floor(rng()*60000),position:point(npc.position)};
    state.prayers.push(prayer);state.prayers=state.prayers.slice(-30);npc.prayerPending=true;
    log('prayer-created',{prayerId:prayer.id,npcId:prayer.npcId,need,position:prayer.position});
    onStatus(`PRAYER · ${prayer.name.toUpperCase()} · ${need.toUpperCase()} · ${Math.round(dist(player?.position,prayer.position))}m`);
    persist(true);return prayer;
  }
  function nearestPrayer(position=player?.position,max=130){
    let best=null,bestDistance=max;
    for(const prayer of activePrayers()){const d=dist(position,prayer.position);if(d<bestDistance){best=prayer;bestDistance=d;}}
    return best?{prayer:best,distance:bestDistance}:null;
  }
  function resolvePrayer(prayer,method='answer-prayer',actor=getFaction()){
    if(!prayer||prayer.status!=='active')return false;
    prayer.status='resolved';prayer.resolvedAt=nowDate();prayer.method=method;prayer.actor=actor;
    const npc=(npcSystem?.npcs||[]).find(n=>relationKey(n)===prayer.npcId);
    if(npc){npc.prayerPending=false;remember(npc,actor==='satan'?'harmed':'helped',`${actor} answered a ${prayer.need} prayer with ${method}`);}
    if(actor==='satan'){state.rivalScore+=8;systemicWorld?.onAbility?.('ruin-lives',prayer.position,'satan');}
    else{state.answeredPrayers++;addXp(35+Math.max(0,Math.round(20-(Date.now()-prayer.createdAt)/5000)),'prayer answered');}
    log('prayer-resolved',{prayerId:prayer.id,method,actor});
    onStatus(`PRAYER ANSWERED · ${prayer.name.toUpperCase()} · ${method.replace(/-/g,' ').toUpperCase()}`);persist(true);return true;
  }
  function failPrayer(prayer){
    if(!prayer||prayer.status!=='active')return false;
    prayer.status='failed';prayer.failedAt=nowDate();state.failedPrayers++;state.rivalScore+=4;
    const npc=(npcSystem?.npcs||[]).find(n=>relationKey(n)===prayer.npcId);if(npc)npc.prayerPending=false;
    log('prayer-failed',{prayerId:prayer.id,npcId:prayer.npcId});persist();return true;
  }
  function spawnRivalEvent(force=null){
    const faction=getFaction(),rival=faction==='satan'?'jc':'satan';
    let template=force?RIVAL_EVENTS.find(e=>e.id===force):null;
    if(!template){const pool=rival==='satan'?RIVAL_EVENTS.slice(0,4):RIVAL_EVENTS.slice(4);template=pool[Math.floor(rng()*pool.length)];}
    const base=player?.position||{x:0,y:0,z:0},angle=rng()*Math.PI*2,radius=90+rng()*230;
    const [x,z]=clearSpot((base.x||0)+Math.cos(angle)*radius,(base.z||0)+Math.sin(angle)*radius)||[base.x,base.z];
    const position={x,y:groundAt(x,z)+1,z};
    npcSystem?.signal?.(template.signal,position,80+Math.abs(template.impact)*8);
    if(template.id==='start-fire')fireSystem?.ignite?.('rival-'+state.eventSerial,position,22000);
    if(rival==='satan'){state.rivalScore+=Math.max(1,template.impact);systemicWorld?.onAbility?.(template.id==='start-fire'?'ruin-lives':'crumble',position,'satan');}
    else{state.rivalScore+=Math.max(1,-template.impact);systemicWorld?.onAbility?.('restore',position,'jc');}
    state.lastRivalAt=nowDate();log('rival-event',{rival,event:template.id,label:template.label,position});
    onStatus(`${template.label} · ${Math.round(dist(base,position))}m`);persist();return {rival,...template,position};
  }
  function maybeBoss(){
    const stage=BOSS_STAGES.find(s=>state.level>=s.level&&!state.completedBosses.includes(s.id));
    if(!stage||activeBoss)return null;
    const base=player?.position||{x:0,y:0,z:0},[x,z]=clearSpot((base.x||0)+60,(base.z||0)-90)||[base.x+60,base.z-90];
    activeBoss={...stage,position:{x,y:groundAt(x,z)+1,z},currentHealth:stage.health,startedAt:nowDate()};
    npcSystem?.signal?.('demon-sighting',activeBoss.position,150);log('boss-started',{bossId:stage.id,position:activeBoss.position});
    onStatus(`BOSS EVENT · ${stage.label} · ${Math.round(dist(base,activeBoss.position))}m`);return activeBoss;
  }
  function damageBoss(amount=0,ability='ability'){
    if(!activeBoss||dist(player?.position,activeBoss.position)>180)return false;
    const damage=Math.max(0,Math.round(amount));if(!damage)return false;
    activeBoss.currentHealth=Math.max(0,activeBoss.currentHealth-damage);
    if(activeBoss.currentHealth===0){state.completedBosses.push(activeBoss.id);addXp(180*activeBoss.level,'boss defeated');log('boss-defeated',{bossId:activeBoss.id,ability});onStatus(`${activeBoss.label} DEFEATED · CITY INFLUENCE SURGES`);activeBoss=null;persist(true);}
    return true;
  }
  function onAbility(id,position=player?.position,actor=getFaction()){
    const prayer=nearestPrayer(position,120)?.prayer;
    const prayerResolvers=new Set(['heal','answer-prayer','shield','sanctuary','cleanse','rain','restore','bless','redemption-wave','exorcise']);
    if(prayer&&prayerResolvers.has(id))resolvePrayer(prayer,id,actor);
    const harmful=new Set(['lightning','crumble','shockwave','judgment-storm','singularity','sonic-boom','ruin-lives']);
    if(activeBoss&&harmful.has(id))damageBoss(id==='singularity'?90:id==='judgment-storm'?70:45,id);
    if(actor!=='satan'&&!harmful.has(id))addXp(2,id);
    persist();
  }
  function onBuildingDestroyed(detail={},actor=getFaction()){
    const id=String(detail.buildingId||detail.id||'unknown');state.destroyedBuildings[id]={at:nowDate(),actor,position:point(detail.position)};
    if(actor==='satan')state.playerScore+=3;else state.rivalScore+=3;
    log('building-destroyed',{buildingId:id,actor,position:point(detail.position)});persist();
  }
  function onBuildingRebuilt(detail={}){
    const id=String(detail.buildingId||detail.id||'unknown');delete state.destroyedBuildings[id];addXp(18,'building rebuilt');log('building-rebuilt',{buildingId:id});persist();
  }
  function onNpcInteraction(npc){remember(npc,'met',`Met ${npc?.name||'resident'}`);addXp(1,'met resident');}

  function update(dt,now=performance.now()){
    if(now-lastTick<500)return;lastTick=now;
    for(const prayer of activePrayers())if(Date.now()>=prayer.expiresAt)failPrayer(prayer);
    if(Date.now()-state.lastPrayerAt>24000+Math.floor(rng()*18000)&&activePrayers().length<5){state.lastPrayerAt=Date.now();spawnPrayer();}
    if(Date.now()-state.lastRivalAt>35000+Math.floor(rng()*25000)){spawnRivalEvent();}
    maybeBoss();persist();
  }
  function hudLine(){
    const prayer=nearestPrayer(player?.position,9999),boss=activeBoss;
    const prayerText=prayer?` · PRAYER ${prayer.prayer.name.toUpperCase()} ${Math.round(prayer.distance)}m`:'';
    const bossText=boss?` · BOSS ${boss.label} ${boss.currentHealth}/${boss.health}`:'';
    return `LVL ${state.level} · XP ${state.xp} · PRAYERS ${state.answeredPrayers}/${state.failedPrayers} · YOU ${state.playerScore} / RIVAL ${state.rivalScore}${prayerText}${bossText}`;
  }
  function snapshot(){return JSON.parse(JSON.stringify({...state,activeBoss}));}
  function reset(){const next=fresh();for(const key of Object.keys(state))delete state[key];Object.assign(state,next);activeBoss=null;persist(true);}

  return {update,onAbility,onBuildingDestroyed,onBuildingRebuilt,onNpcInteraction,spawnPrayer,nearestPrayer,resolvePrayer,spawnRivalEvent,damageBoss,hudLine,snapshot,reset,get state(){return state;},get boss(){return activeBoss;}};
}

export {STORAGE_KEY as LIVING_WORLD_STORAGE_KEY,RIVAL_EVENTS,BOSS_STAGES};
