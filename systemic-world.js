class Vec3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  clone(){return new Vec3(this.x,this.y,this.z);}
  copy(value){this.x=Number(value?.x)||0;this.y=Number(value?.y)||0;this.z=Number(value?.z)||0;return this;}
  distanceTo(value){return Math.hypot(this.x-(Number(value?.x)||0),this.y-(Number(value?.y)||0),this.z-(Number(value?.z)||0));}
}

const STORAGE_KEY='jc-systemic-world-v1';
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const distance2D=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));
const copyPoint=p=>({x:Number(p?.x)||0,y:Number(p?.y)||0,z:Number(p?.z)||0});
const restorative=new Set(['heal','answer-prayer','shield','cleanse','sunrise','sanctuary','restore','grace-surge','rain','rebuild','bless','exorcise','redemption-wave']);
const destructive=new Set(['shockwave','lightning','crumble','heavenly-spear','judgment-storm','singularity','sonic-boom','ruin-lives']);
const travel=new Set(['flight','hypersonic','teleport','beam-down','dash','hover','leap','glide','sky-lift','skydive','phase-step','recall','time-step','portal']);

export const INCIDENT_TEMPLATES=[
  {type:'traffic-crash',label:'TRAFFIC CRASH',signal:'traffic-impact',weight:18,severity:[1,3],duration:42000,resolvers:['heal','shield','telekinesis','restore']},
  {type:'structure-fire',label:'STRUCTURE FIRE',signal:'fire',weight:16,severity:[2,4],duration:52000,resolvers:['rain','heal','shield','restore']},
  {type:'medical',label:'MEDICAL EMERGENCY',signal:'injury',weight:14,severity:[1,3],duration:36000,resolvers:['heal','answer-prayer']},
  {type:'robbery',label:'ROBBERY IN PROGRESS',signal:'gunfire',weight:11,severity:[2,4],duration:46000,resolvers:['shield','telekinesis','stasis','repel']},
  {type:'power-outage',label:'LOCAL POWER OUTAGE',signal:'blackout',weight:10,severity:[1,3],duration:60000,resolvers:['lightning','restore','sunrise']},
  {type:'demon-sighting',label:'DEMONIC DISTURBANCE',signal:'demon-sighting',weight:9,severity:[2,5],duration:56000,resolvers:['exorcise','cleanse','redemption-wave','divine-beam']},
  {type:'crowd-panic',label:'CROWD PANIC',signal:'panic',weight:9,severity:[1,4],duration:42000,resolvers:['sanctuary','shield','bless','redemption-wave']},
  {type:'collapse-risk',label:'STRUCTURAL COLLAPSE RISK',signal:'collapse-risk',weight:7,severity:[3,5],duration:50000,resolvers:['telekinesis','shield','restore','rebuild']}
];

const DISTRICT_NAMES=['Strip Core','Airport Corridor','Psalms','Residential East','Downtown','Industrial West'];

function freshDistrict(name){
  return {name,hope:50,corruption:50,fear:18,crime:24,prosperity:55,jcInfluence:50,satanInfluence:50,lastEvent:0};
}
export function createDefaultSystemicState(){
  return {
    version:1,
    publicReputation:0,
    civilianReputation:0,
    authorityReputation:0,
    criminalFear:0,
    spiritualInfluence:0,
    satanPressure:18,
    incidentsResolved:0,
    incidentsFailed:0,
    eventSerial:0,
    districts:Object.fromEntries(DISTRICT_NAMES.map(name=>[name,freshDistrict(name)]))
  };
}

function loadState(storage){
  const base=createDefaultSystemicState();
  try{
    const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');
    if(!saved||saved.version!==1)return base;
    for(const key of ['publicReputation','civilianReputation','authorityReputation','criminalFear','spiritualInfluence','satanPressure','incidentsResolved','incidentsFailed','eventSerial']){
      if(Number.isFinite(saved[key]))base[key]=saved[key];
    }
    for(const name of DISTRICT_NAMES){
      const source=saved.districts?.[name];
      if(!source)continue;
      for(const key of ['hope','corruption','fear','crime','prosperity','jcInfluence','satanInfluence','lastEvent']){
        if(Number.isFinite(source[key]))base.districts[name][key]=source[key];
      }
    }
  }catch{}
  return base;
}

function createRng(seed=(Date.now()>>>0)||1){
  let state=seed>>>0;
  return ()=>{
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  };
}

function weightedTemplate(rng){
  const total=INCIDENT_TEMPLATES.reduce((sum,item)=>sum+item.weight,0);
  let pick=rng()*total;
  for(const item of INCIDENT_TEMPLATES){pick-=item.weight;if(pick<=0)return item;}
  return INCIDENT_TEMPLATES[0];
}

export function createSystemicWorld({
  player,
  npcSystem=null,
  fireSystem=null,
  groundAt=(x,z)=>0,
  clearSpot=(x,z)=>[x,z],
  onStatus=()=>{},
  getFaction=()=> 'jc',
  storage=globalThis.localStorage,
  seed
}={}){
  const state=loadState(storage),rng=createRng(seed??((Date.now()^0x51c17a)>>>0));
  const anchor=copyPoint(player?.position);
  const activeIncidents=[];
  const recentEvents=[];
  let nextIncidentAt=performance.now()+9000+rng()*7000;
  let lastTick=0,lastPersist=0,lastPressure=0;

  function persist(now=performance.now()){
    if(now-lastPersist<2500)return;
    lastPersist=now;
    try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
  }

  function districtAt(position){
    const dx=(position?.x||0)-anchor.x,dz=(position?.z||0)-anchor.z;
    const r=Math.hypot(dx,dz);
    if(r<360)return state.districts['Strip Core'];
    if(dz>520&&Math.abs(dx)<620)return state.districts['Airport Corridor'];
    if(dx>520&&Math.abs(dz)<760)return state.districts['Residential East'];
    if(dx<-620&&Math.abs(dz)<760)return state.districts['Industrial West'];
    if(dz<-650)return state.districts['Downtown'];
    return state.districts['Psalms'];
  }

  function mutateDistrict(district,delta={}){
    for(const key of ['hope','corruption','fear','crime','prosperity','jcInfluence','satanInfluence']){
      if(Number.isFinite(delta[key]))district[key]=clamp(district[key]+delta[key]);
    }
    district.lastEvent=Date.now();
  }

  function reputation(delta={}){
    for(const key of ['publicReputation','civilianReputation','authorityReputation','criminalFear','spiritualInfluence']){
      if(Number.isFinite(delta[key]))state[key]=clamp(state[key]+delta[key],-100,100);
    }
    if(Number.isFinite(delta.satanPressure))state.satanPressure=clamp(state.satanPressure+delta.satanPressure);
  }

  function record(type,position,details={}){
    const event={id:'evt-'+(++state.eventSerial),type,position:copyPoint(position),at:Date.now(),...details};
    recentEvents.push(event);while(recentEvents.length>32)recentEvents.shift();
    return event;
  }

  function spawnIncident(now=performance.now(),forcedType=null){
    if(activeIncidents.length>=4)return null;
    const template=forcedType?INCIDENT_TEMPLATES.find(item=>item.type===forcedType)||weightedTemplate(rng):weightedTemplate(rng);
    const base=player?.position||anchor,angle=rng()*Math.PI*2,radius=45+rng()*105;
    const desiredX=(base.x||0)+Math.cos(angle)*radius,desiredZ=(base.z||0)+Math.sin(angle)*radius;
    const spot=clearSpot(desiredX,desiredZ)||[desiredX,desiredZ],x=Number(spot[0])||desiredX,z=Number(spot[1])||desiredZ,y=groundAt(x,z)+1;
    const severity=Math.max(template.severity[0],Math.min(template.severity[1],template.severity[0]+Math.floor(rng()*(template.severity[1]-template.severity[0]+1))));
    const incident={
      id:'inc-'+(++state.eventSerial),
      type:template.type,label:template.label,signal:template.signal,severity,
      position:new Vec3(x,y,z),
      startedAt:now,expiresAt:now+template.duration+severity*4500,
      phase:'active',responded:false,npcResponses:0,resolvers:[...template.resolvers]
    };
    activeIncidents.push(incident);
    const district=districtAt(incident.position);
    mutateDistrict(district,{fear:2+severity,crime:template.type==='robbery'?2+severity:1,prosperity:-Math.max(1,severity-1),corruption:template.type==='demon-sighting'?2+severity:0});
    npcSystem?.signal?.(template.signal,incident.position,65+severity*12);
    if(template.type==='structure-fire')fireSystem?.ignite?.(incident.id,incident.position,Math.max(18000,incident.expiresAt-now));
    record('incident-started',incident.position,{incidentType:incident.type,severity,district:district.name});
    onStatus(`${template.label} · ${Math.round(distance2D(player?.position,incident.position))}m · MULTIPLE SOLUTIONS AVAILABLE`);
    return incident;
  }

  function resolveIncident(incident,method='intervention',actor=getFaction()){
    if(!incident||incident.phase!=='active')return false;
    incident.phase='resolved';incident.resolvedBy=method;incident.resolvedAt=performance.now();
    state.incidentsResolved++;
    const district=districtAt(incident.position),power=Math.max(1,incident.severity);
    if(actor==='satan'){
      mutateDistrict(district,{hope:-1-power,corruption:2+power,fear:2+power,crime:1+power,satanInfluence:2+power,jcInfluence:-1});
      reputation({publicReputation:-power,civilianReputation:-power,spiritualInfluence:-power,satanPressure:1+power});
    }else if(actor==='civic'){
      mutateDistrict(district,{hope:1+Math.ceil(power/2),fear:-1-power*.5,crime:-Math.max(0,Math.floor(power/2)),prosperity:Math.max(0,power-1)});
    }else{
      mutateDistrict(district,{hope:2+power,corruption:-1-power,fear:-2-power,crime:-Math.ceil(power/2),prosperity:1+power,jcInfluence:2+power,satanInfluence:-1-power});
      reputation({publicReputation:1+power,civilianReputation:2+power,authorityReputation:incident.type==='robbery'||incident.type==='traffic-crash'?1+power:1,criminalFear:1+power,spiritualInfluence:2+power,satanPressure:-Math.max(1,power-1)});
    }
    fireSystem?.extinguish?.(incident.position,36+power*8);
    npcSystem?.signal?.(actor==='satan'?'despair':'rescue',incident.position,70+power*12);
    record('incident-resolved',incident.position,{incidentType:incident.type,method,actor,district:district.name});
    onStatus(`${incident.label} RESOLVED · ${method.replace(/-/g,' ').toUpperCase()} · ${district.name.toUpperCase()}`);
    return true;
  }

  function npcResponse(incident,npc){
    if(!incident||incident.phase!=='active'||!npc)return {handled:false,resolved:false};
    const faction=String(npc.faction||'civilian');
    const effective=faction==='authority'
      ? new Set(['traffic-crash','robbery','crowd-panic','collapse-risk']).has(incident.type)
      : faction==='angel'
        ? new Set(['medical','crowd-panic','demon-sighting','structure-fire']).has(incident.type)
        : faction==='civilian'
          ? new Set(['medical','crowd-panic','traffic-crash']).has(incident.type)
          : false;
    if(faction==='demon'){
      incident.responded=true;incident.npcResponses=(incident.npcResponses||0)+1;
      const district=districtAt(incident.position);mutateDistrict(district,{fear:1,corruption:1});
      record('npc-response',incident.position,{incidentId:incident.id,npcId:npc.id||npc.name,faction,effect:'worsened'});
      return {handled:true,resolved:false,effect:'worsened'};
    }
    if(!effective)return {handled:false,resolved:false};
    incident.responded=true;incident.npcResponses=(incident.npcResponses||0)+1;
    incident.severity=Math.max(1,incident.severity-1);
    incident.expiresAt+=6000;
    record('npc-response',incident.position,{incidentId:incident.id,npcId:npc.id||npc.name,faction,effect:'stabilized',responses:incident.npcResponses});
    npcSystem?.signal?.('responder-action',incident.position,28);
    if(incident.severity<=1&&incident.npcResponses>=2){
      resolveIncident(incident,'local-responders','civic');
      return {handled:true,resolved:true,effect:'resolved'};
    }
    return {handled:true,resolved:false,effect:'stabilized'};
  }

  function failIncident(incident){
    if(!incident||incident.phase!=='active')return false;
    incident.phase='failed';incident.failedAt=performance.now();state.incidentsFailed++;
    const district=districtAt(incident.position),power=Math.max(1,incident.severity);
    mutateDistrict(district,{hope:-1-power,corruption:1+power,fear:2+power,crime:1+power,prosperity:-power,satanInfluence:1+power,jcInfluence:-1});
    reputation({publicReputation:-1,civilianReputation:-1,spiritualInfluence:-1,satanPressure:1+Math.ceil(power/2)});
    npcSystem?.signal?.('incident-unresolved',incident.position,68+power*10);
    record('incident-failed',incident.position,{incidentType:incident.type,severity:power,district:district.name});
    return true;
  }

  function nearestIncident(position=player?.position,max=130){
    let best=null,bestDistance=max;
    for(const incident of activeIncidents){
      if(incident.phase!=='active')continue;
      const d=distance2D(position,incident.position);
      if(d<bestDistance){best=incident;bestDistance=d;}
    }
    return best?{incident:best,distance:bestDistance}:null;
  }

  function onAbility(id,position=player?.position,actor=getFaction()){
    const district=districtAt(position),incidentInfo=nearestIncident(position,145),incident=incidentInfo?.incident;
    if(incident&&incident.resolvers.includes(id))resolveIncident(incident,id,actor);
    if(actor==='satan'){
      if(restorative.has(id))mutateDistrict(district,{fear:1,corruption:1,satanInfluence:1});
      if(destructive.has(id)){mutateDistrict(district,{hope:-2,corruption:3,fear:4,crime:2,satanInfluence:3,jcInfluence:-1});reputation({publicReputation:-2,civilianReputation:-3,authorityReputation:-2,criminalFear:2,spiritualInfluence:-2,satanPressure:2});}
    }else{
      if(restorative.has(id)){mutateDistrict(district,{hope:2,corruption:-2,fear:-2,crime:-1,prosperity:1,jcInfluence:2,satanInfluence:-1});reputation({publicReputation:1,civilianReputation:2,authorityReputation:1,spiritualInfluence:2,satanPressure:-1});}
      if(destructive.has(id)){mutateDistrict(district,{fear:2,prosperity:-1});reputation({publicReputation:-1,authorityReputation:-1,criminalFear:2});}
      if(travel.has(id)&&['flight','hypersonic','sonic-boom'].includes(id))reputation({publicReputation:.1,spiritualInfluence:.15});
    }
    record('ability',position,{ability:id,actor,district:district.name});
    persist();
  }

  function onDestruction(detail={},actor=getFaction()){
    const position=detail.position||player?.position||anchor,district=districtAt(position);
    if(actor==='satan'){
      mutateDistrict(district,{hope:-4,corruption:5,fear:7,crime:3,prosperity:-5,satanInfluence:5,jcInfluence:-2});
      reputation({publicReputation:-3,civilianReputation:-4,authorityReputation:-4,criminalFear:4,spiritualInfluence:-3,satanPressure:4});
    }else{
      mutateDistrict(district,{hope:-2,fear:5,prosperity:-4});
      reputation({publicReputation:-3,civilianReputation:-3,authorityReputation:-4,criminalFear:2});
    }
    record('destruction',position,{actor,buildingId:detail.buildingId||detail.id||null,district:district.name});
    persist();
  }

  function onRebuild(position=player?.position,actor=getFaction()){
    const district=districtAt(position);
    if(actor!=='satan'){
      mutateDistrict(district,{hope:4,corruption:-2,fear:-3,prosperity:5,jcInfluence:3,satanInfluence:-2});
      reputation({publicReputation:3,civilianReputation:3,authorityReputation:2,spiritualInfluence:2,satanPressure:-2});
    }
    record('rebuild',position,{actor,district:district.name});persist();
  }

  function update(dt,now=performance.now()){
    if(now-lastTick<500)return;
    const elapsed=Math.max(.001,(now-lastTick)/1000);lastTick=now;
    if(now>=nextIncidentAt){
      spawnIncident(now);
      nextIncidentAt=now+22000+rng()*26000;
    }
    for(const incident of activeIncidents)if(incident.phase==='active'&&now>=incident.expiresAt)failIncident(incident);
    for(let i=activeIncidents.length-1;i>=0;i--){
      const incident=activeIncidents[i];
      const finishedAt=incident.resolvedAt||incident.failedAt;
      if(finishedAt&&now-finishedAt>9000)activeIncidents.splice(i,1);
    }
    if(now-lastPressure>8000){
      lastPressure=now;
      for(const district of Object.values(state.districts)){
        const pressure=(state.satanPressure-50)*.0025*elapsed;
        district.corruption=clamp(district.corruption+pressure);
        district.satanInfluence=clamp(district.satanInfluence+pressure*.8);
        district.jcInfluence=clamp(district.jcInfluence-pressure*.35);
      }
    }
    persist(now);
  }

  function hudLine(position=player?.position){
    const district=districtAt(position),near=nearestIncident(position,9999);
    const balance=Math.round(district.hope-district.corruption);
    const incidentText=near?` · ${near.incident.label} ${Math.round(near.distance)}m`:' · NO ACTIVE INCIDENT NEARBY';
    return `${district.name.toUpperCase()} · HOPE ${Math.round(district.hope)} · CORRUPTION ${Math.round(district.corruption)} · BAL ${balance>=0?'+':''}${balance}${incidentText}`;
  }

  function snapshot(){
    return {
      ...JSON.parse(JSON.stringify(state)),
      activeIncidents:activeIncidents.map(incident=>({...incident,position:copyPoint(incident.position)})),
      recentEvents:recentEvents.map(event=>({...event}))
    };
  }

  return {update,onAbility,onDestruction,onRebuild,spawnIncident,resolveIncident,npcResponse,nearestIncident,districtAt,hudLine,snapshot,get state(){return state;},get incidents(){return activeIncidents;}};
}

export {STORAGE_KEY as SYSTEMIC_WORLD_STORAGE_KEY};
