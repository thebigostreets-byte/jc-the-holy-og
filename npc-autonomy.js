const clamp=(v,min=-100,max=100)=>Math.max(min,Math.min(max,v));
const ACTIONS=new Set(['follow-player','help-nearest','protect-player','investigate-nearby','patrol-area','calm-nearest','corrupt-nearest','attack-nearest-hostile','flee-area','socialize','work-shift','errand']);
const OCCUPATIONS=['casino worker','hotel staff','rideshare driver','restaurant worker','security guard','retail clerk','medic','construction worker','tour guide','local resident'];

function hash(text){
  let h=2166136261;for(const c of String(text||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;
}
function rngFor(text){
  let s=hash(text)||1;return()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
}
function distance(a,b){return Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));}
function nearest(npcs,source,predicate,max=45){
  let best=null,bestDistance=max;
  for(const target of npcs){if(target===source||!predicate(target))continue;const d=distance(source.position,target.position);if(d<bestDistance){best=target;bestDistance=d;}}
  return best;
}
function localActionFromText(message=''){
  const text=String(message).toLowerCase();
  if(/\b(follow me|come with me|come on|stay with me)\b/.test(text))return'follow-player';
  if(/\b(help|assist|save|aid)\b.{0,35}\b(him|her|them|that person|someone|people|civilian|injured)\b/.test(text))return'help-nearest';
  if(/\b(protect|guard|watch my back|cover me)\b/.test(text))return'protect-player';
  if(/\b(investigate|check it out|check that|look into|see what happened)\b/.test(text))return'investigate-nearby';
  if(/\b(patrol|watch the area|keep an eye on|secure the area)\b/.test(text))return'patrol-area';
  if(/\b(calm|comfort|reassure)\b/.test(text))return'calm-nearest';
  if(/\b(corrupt|tempt|turn them|make them evil)\b/.test(text))return'corrupt-nearest';
  if(/\b(attack|fight|take him|take her|take them|stop that hostile)\b/.test(text))return'attack-nearest-hostile';
  if(/\b(run|flee|get out of here|evacuate)\b/.test(text))return'flee-area';
  return null;
}

export function createNpcAutonomy({npcs=[],player,groundAt=()=>0,isSafe=()=>true,remember=()=>{},onReport=()=>{}}={}){
  let lastUpdate=-Infinity,serial=0;
  for(let i=0;i<npcs.length;i++){
    const npc=npcs[i],r=rngFor(npc.id||i);
    npc.occupation=npc.occupation||OCCUPATIONS[Math.floor(r()*OCCUPATIONS.length)];
    npc.allegiance=npc.allegiance||'neutral';npc.alignmentScore=Number(npc.alignmentScore)||0;npc.health=Number.isFinite(npc.health)?npc.health:100;
    npc.traits=npc.traits||{bravery:r(),empathy:r(),sociability:r(),duty:r(),faith:r(),susceptibility:r()};
    npc.homeAnchor={x:npc.position.x+(r()-.5)*24,z:npc.position.z+(r()-.5)*24};
    npc.workAnchor={x:npc.position.x+(r()-.5)*55,z:npc.position.z+(r()-.5)*55};
    npc.autonomyCooldown=0;npc.goal=null;npc.decision='living daily life';npc.lastAction=null;
  }
  function safePoint(x,z){
    if(isSafe(x,z,1.4))return{x,z};
    for(let radius=4;radius<=20;radius+=4)for(let i=0;i<8;i++){const a=i*Math.PI/4,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;if(isSafe(px,pz,1.4))return{x:px,z:pz};}
    return{x,z};
  }
  function setTarget(npc,p){
    const q=safePoint(Number(p?.x)||npc.position.x,Number(p?.z)||npc.position.z);
    npc.target.set(q.x,groundAt(q.x,q.z)+1.55,q.z);
  }
  function resolveSelector(npc,type){
    if(type==='help-nearest')return nearest(npcs,npc,n=>!n.collapse&&(n.health<75||n.state==='fear'||n.prayerPending),55);
    if(type==='calm-nearest')return nearest(npcs,npc,n=>!n.collapse&&(n.state==='fear'||n.state==='retreat'),50);
    if(type==='corrupt-nearest')return nearest(npcs,npc,n=>!n.collapse&&n.faction==='civilian',48);
    if(type==='attack-nearest-hostile')return nearest(npcs,npc,n=>!n.collapse&&(n.faction==='demon'||(npc.faction==='demon'&&n.faction!=='demon')),48);
    return null;
  }
  function allowed(npc,type){
    if(!ACTIONS.has(type))return false;
    if(type==='corrupt-nearest'&&npc.faction!=='demon')return false;
    if(type==='attack-nearest-hostile'&&npc.faction==='civilian')return false;
    if(type==='protect-player'&&npc.faction==='demon')return false;
    return true;
  }
  function command(npcOrId,action,source='script'){
    const npc=typeof npcOrId==='object'?npcOrId:npcs.find(n=>String(n.id)===String(npcOrId));
    const type=typeof action==='string'?action:String(action?.npcAction||action?.type||'');
    if(!npc||!allowed(npc,type))return null;
    let targetNpc=resolveSelector(npc,type);
    let destination=action?.position&&typeof action.position==='object'?action.position:null;
    if(type==='follow-player'||type==='protect-player'||type==='flee-area'||type==='investigate-nearby')destination=player?.position;
    else if(targetNpc)destination=targetNpc.position;
    else if(type==='patrol-area')destination={x:npc.position.x+Math.cos(serial+npcs.indexOf(npc))*24,z:npc.position.z+Math.sin(serial+npcs.indexOf(npc))*24};
    else if(type==='work-shift')destination=npc.workAnchor;
    else if(type==='errand')destination={x:npc.workAnchor.x+12,z:npc.workAnchor.z-10};
    else if(type==='socialize'){const other=nearest(npcs,npc,n=>!n.collapse,35);if(other){targetNpc=other;destination=other.position;}}
    if(!destination&&['help-nearest','calm-nearest','corrupt-nearest','attack-nearest-hostile'].includes(type))return null;
    const priority=source==='event'?8:source==='ai'?7:source==='player'?9:3;
    if(npc.goal&&npc.goal.priority>priority&&npc.goal.expiresAt>Date.now())return null;
    npc.goal={id:'goal-'+(++serial),type,targetNpcId:targetNpc?.id||null,priority,source,phase:'move',startedAt:Date.now(),expiresAt:Date.now()+(type==='follow-player'?45000:18000),performUntil:0};
    npc.actionPose=null;
    npc.decision=type.replace(/-/g,' ');
    if(destination){
      if(type==='flee-area'){const dx=npc.position.x-(destination.x||0),dz=npc.position.z-(destination.z||0),len=Math.max(1,Math.hypot(dx,dz));setTarget(npc,{x:npc.position.x+dx/len*34,z:npc.position.z+dz/len*34});}
      else setTarget(npc,destination);
    }
    npc.state=['corrupt-nearest','attack-nearest-hostile','investigate-nearby'].includes(type)?'respond':type==='flee-area'?'fear':'wander';
    return npc.goal;
  }
  function complete(npc,goal,now){
    const target=goal.targetNpcId?npcs.find(n=>n.id===goal.targetNpcId):null;
    let report='';
    switch(goal.type){
      case'help-nearest':
        if(target){target.health=Math.min(100,(target.health??100)+35);target.prayerPending=false;target.state='awe';target.emotionUntil=now+3500;remember(npc,`helped ${target.name}`);remember(target,`${npc.name} helped me`);report=`${npc.name} helped ${target.name}`;}break;
      case'calm-nearest':
        if(target){target.state='awe';target.emotionUntil=now+3200;remember(target,`${npc.name} calmed me down`);report=`${npc.name} calmed ${target.name}`;}break;
      case'corrupt-nearest':
        if(target){target.alignmentScore=clamp((target.alignmentScore||0)-14);if(target.alignmentScore<=-30)target.allegiance='satanic';target.state='fear';target.emotionUntil=now+4200;remember(npc,`corrupted ${target.name}`);remember(target,`${npc.name} tried to corrupt me`);report=`${npc.name} corrupted ${target.name}`;}break;
      case'attack-nearest-hostile':
        if(target){target.health=Math.max(0,(target.health??100)-24);target.state='fear';target.emotionUntil=now+3000;if(target.health<=0)target.collapse=true;remember(npc,`fought ${target.name}`);report=`${npc.name} fought ${target.name}`;}break;
      case'protect-player':npc.protectingPlayerUntil=now+9000;report=`${npc.name} is protecting JC`;break;
      case'investigate-nearby':remember(npc,'investigated a disturbance');report=`${npc.name} investigated the disturbance`;break;
      case'patrol-area':report=`${npc.name} completed a patrol`;break;
      case'socialize':
        if(target){remember(npc,`talked with ${target.name}`);remember(target,`talked with ${npc.name}`);report=`${npc.name} talked with ${target.name}`;}break;
      case'work-shift':remember(npc,`worked a shift as ${npc.occupation}`);report=`${npc.name} worked as ${npc.occupation}`;break;
      case'errand':remember(npc,'ran an errand');report=`${npc.name} finished an errand`;break;
      case'flee-area':report=`${npc.name} evacuated the area`;break;
    }
    npc.lastAction={type:goal.type,at:Date.now(),targetNpcId:goal.targetNpcId||null};
    npc.goal=null;npc.actionPose=null;npc.autonomyCooldown=now+1800+hash(npc.id+goal.id)%3200;npc.state='idle';npc.decision='choosing next task';
    if(report)onReport(report.toUpperCase());
  }
  function chooseRoutine(npc,now){
    if(npc.goal||now<npc.autonomyCooldown||now<(npc.emotionUntil||0))return;
    if(npc.faction==='authority'){
      const hurt=resolveSelector(npc,'help-nearest');if(hurt){command(npc,'help-nearest','script');return;}
      command(npc,'patrol-area','script');return;
    }
    if(npc.faction==='angel'){
      const afraid=resolveSelector(npc,'calm-nearest');if(afraid){command(npc,'calm-nearest','script');return;}
      command(npc,'help-nearest','script')||command(npc,'patrol-area','script');return;
    }
    if(npc.faction==='demon'){
      command(npc,'corrupt-nearest','script')||command(npc,'patrol-area','script');return;
    }
    const roll=rngFor(npc.id+':'+Math.floor(now/7000)),r=roll(),traits=npc.traits||{};
    if(resolveSelector(npc,'help-nearest')&&r<(0.10+(traits.empathy||0)*.42)){command(npc,'help-nearest','script');return;}
    if(r<(0.18+(traits.sociability||0)*.34))command(npc,'socialize','script');
    else if(r<(0.55+(traits.duty||0)*.28))command(npc,'work-shift','script');
    else command(npc,'errand','script');
  }
  function update(now=performance.now()){
    if(now-lastUpdate<500)return;lastUpdate=now;
    for(const npc of npcs){
      const goal=npc.goal;
      if(!goal){chooseRoutine(npc,now);continue;}
      if(Date.now()>goal.expiresAt){npc.goal=null;npc.actionPose=null;npc.decision='task expired';npc.autonomyCooldown=now+1200;continue;}
      if(goal.type==='follow-player'&&player?.position){
        const d=distance(npc.position,player.position);if(d>5)setTarget(npc,{x:player.position.x+2,z:player.position.z+2});else{npc.target.copy(npc.position);npc.state='awe';}
        continue;
      }
      const arrived=distance(npc.position,npc.target)<1.8;
      if(!arrived)continue;
      if(goal.phase==='move'){
        goal.phase='perform';goal.performUntil=now+900+(hash(goal.id)%1200);
        npc.state=['corrupt-nearest','attack-nearest-hostile','investigate-nearby'].includes(goal.type)?'respond':'awe';
        npc.actionPose=goal.type;
        npc.decision='performing '+goal.type.replace(/-/g,' ');
        const target=goal.targetNpcId?npcs.find(n=>n.id===goal.targetNpcId):null;
        if(target){
          const dx=target.position.x-npc.position.x,dz=target.position.z-npc.position.z;
          if(npc.sprite)npc.sprite.rotation.y=Math.atan2(dx,dz);
          if(goal.type==='socialize'&&!target.goal){target.actionPose='socialize';target.state='awe';target.emotionUntil=now+Math.max(1200,goal.performUntil-now);}
        }
        continue;
      }
      if(goal.phase==='perform'&&now>=goal.performUntil)complete(npc,goal,now);
    }
  }
  function react(type,position,radius=95){
    const dangerous=!['heal','shield','cleanse','sunrise','sanctuary','restore','grace-surge','rain','rebuild','bless','redemption-wave','flight','hover','glide'].includes(type);
    for(const npc of npcs){
      if(distance(npc.position,position)>radius)continue;
      if(npc.faction==='authority')command(npc,{npcAction:dangerous?'investigate-nearby':'help-nearest',position},'event');
      else if(npc.faction==='angel')command(npc,{npcAction:dangerous?'calm-nearest':'help-nearest',position},'event');
      else if(npc.faction==='demon'&&dangerous)command(npc,'corrupt-nearest','event');
      else if(npc.faction==='civilian'&&dangerous){
        const traits=npc.traits||{},roll=rngFor(npc.id+':event:'+type+':'+Math.floor(Date.now()/5000))();
        if((traits.empathy||0)>.72&&resolveSelector(npc,'help-nearest'))command(npc,'help-nearest','event');
        else if((traits.bravery||0)>.76&&roll>.35)command(npc,{npcAction:'investigate-nearby',position},'event');
        else command(npc,{npcAction:'flee-area',position},'event');
      }
    }
  }
  function commandFromText(npc,message,source='player'){
    const type=localActionFromText(message);return type?command(npc,type,source):null;
  }
  return {update,react,command,commandFromText,localActionFromText,get actions(){return [...ACTIONS];}};
}

export {localActionFromText,ACTIONS as NPC_AUTONOMY_ACTIONS};
