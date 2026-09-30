import {cleanPoseImage} from './pose-cleanup.js';
import {loadRearWalk,loadPoseSheet,FLIGHT_CELLS} from './rear-walk.js';
import {advanceGait} from './jc-control-math.js';
import {createNpcConversation} from './npc-conversation.js';
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('world'), ctx = canvas.getContext('2d', {alpha:false});
  const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
  const worldSize = 1668;
  const layout = [
    [338,164,110,116],[1150,167,107,132],[462,379,94,103],[1010,388,104,120],
    [260,725,112,123],[1172,774,111,132],[470,980,93,112],[1040,994,106,110],
    [220,1250,100,112],[1235,1267,101,116],[588,1390,89,104],[1418,507,88,112]
  ];
  const buildings = layout.map(([x,y,w,h],i) => ({x,y,w,h,id:i+1,restored:false,offset:0}));
  const souls = [[740,230],[778,420],[780,610],[745,940],[790,1170],[750,1460],[620,850],[916,840]].map(([x,y])=>({x,y,active:true}));
  const player = {x:780,y:790,vx:0,vy:0,angle:-Math.PI/2,altitude:0,flying:false,hyper:false,glide:false,grace:100};
  const images = {aerial:new Image(),hero:new Image(),poses:[],facades:[]};
  images.aerial.src = './assets/imagery/C15_R14.jpg';
  images.hero.src = './character-art/jc-hero-reference-v1.webp';
  for(let i=0;i<12;i++){const im=new Image();im.src=`./facades/vegas-cell-${String(i).padStart(2,'0')}.webp`;images.facades.push(im);}
  let rearWalkReady=false;const sheetOverrides=new Set();
  for(let i=0;i<39;i++){const im=new Image();im.onload=()=>{if(sheetOverrides.has(i)||(rearWalkReady&&(i===0||(i>=23&&i<=30))))return;const clean=cleanPoseImage(im);clean.complete=true;clean.naturalWidth=clean.width;images.poses[i]=clean;};im.src=`./poses/pose-${i}.webp`;images.poses.push(im);}
  loadRearWalk(frames=>{frames.forEach((frame,i)=>{images.poses[23+i]=frame;});images.poses[0]=frames[6];rearWalkReady=true;});
  for(const [url,cols,rows,indices] of [['./character-art/jc-rear-run-v2.webp',4,2,[31,32,33,34,35,36,37,38]],['./character-art/jc-rear-flight-v2.webp',3,3,[14,15,16,17,18,19,20,21,22]]])loadPoseSheet(url,cols,rows,indices.map((_,i)=>i),frames=>frames.forEach((frame,i)=>{images.poses[indices[i]]=frame;sheetOverrides.add(indices[i]);}),rows===3?FLIGHT_CELLS:undefined);
  const npcKinds=['civilian','authority','angel','demon'];
  const npcFiles=['civilian-01','authority-01','angel-01','demon-01','civilian-02','authority-02','angel-02','demon-02'];
  const npcHomes=[[735,520],[825,530],[735,650],[825,650],[735,910],[825,900],[735,1085],[825,1085]];
  const npcs=npcFiles.map((file,i)=>{const image=new Image();image.src=`./npc-avatars/${file}.webp`;const home=npcHomes[i];return {image,file,name:['Mara','Darius','Sol','Nia','Ezra','Vale','Imani','Theo'][i],faction:npcKinds[i%4],x:home[0],y:home[1],homeX:home[0],homeY:home[1],targetX:home[0],targetY:home[1],state:'calm',until:0,gait:Math.random()*6.28};});

  const talkPrompt=$('npcTalkPrompt'),talkPanel=$('npcTalk');let nearNpc=null;
  const conversation=createNpcConversation({panel:talkPanel,log:$('npcChatLog'),onOpen:()=>{held.clear();player.vx=player.vy=0;},onClose:()=>held.clear(),notice:message=>say(message)});
  function nearestNpc(){return npcs.map(n=>[n,Math.hypot(n.x-player.x,n.y-player.y)]).filter(([,d])=>d<150).sort((a,b)=>a[1]-b[1])[0]?.[0]||null;}
  function startNpcTalk(npc=nearNpc){if(!npc){say('MOVE CLOSE TO A CHARACTER TO TALK');return;}conversation.open(npc);}
  talkPrompt.onclick=()=>startNpcTalk();
  const catalog = [
    ['Travel','flight','Flight',0,0],['Travel','hypersonic','Hypersonic Flight',12,2],['Travel','teleport','Teleport',30,2],['Travel','beam-down','Beam Down',0,1],
    ['Travel','dash','Dash',25,.8],['Travel','hover','Hover',10,1],['Travel','leap','Leap',12,1],['Travel','glide','Glide',0,1],['Travel','sky-lift','Sky Lift',15,1],
    ['Travel','skydive','Skydive',0,1],['Travel','phase-step','Phase Step',22,7],['Travel','recall','Recall to Strip',20,5],['Travel','time-step','Time Step',20,8],
    ['Light','light-pulse','Light Pulse',35,1.5],['Light','divine-beam','Divine Beam',20,2],['Light','chain-light','Chain Light',34,4],['Light','radiance-nova','Radiance Nova',45,6],
    ['Light','shield','Shield',24,8],['Light','heal','Heal',12,6],['Light','cleanse','Cleanse',18,2],['Light','reveal','Reveal',8,5],['Light','sunrise','Sunrise',35,10],
    ['Light','sanctuary','Sanctuary',25,9],['Light','restore','Restore',25,4],['Light','grace-surge','Grace Surge',10,9],['Light','shockwave','Shockwave',35,5],
    ['World','rain','Rain',20,6],['World','lightning','Lightning',24,3],['World','telekinesis','Telekinesis',18,3],['World','crumble','Crumble',28,4],
    ['World','rebuild','Rebuild',18,3],['World','bless','Bless Building',15,2],['World','exorcise','Exorcise',40,6],['World','stasis','Stasis',22,7],
    ['World','vortex','Vortex',26,5],['World','repel','Repel',12,2],['World','attract','Attract',12,2],['World','slow-time','Slow Time',24,8],['World','redemption-wave','Redemption Wave',55,12]
  ].map(([group,id,name,cost,cooldown])=>({group,id,name,cost,cooldown}));
  if(catalog.length!==39) throw Error('Incomplete JC miracle catalog');
  // The first twenty are the mobile-friendly signature set. Keep this contract
  // explicit so every advertised ability remains backed by a real cast branch.
  const signatureIds = ['flight','hypersonic','teleport','dash','hover','leap','glide','sky-lift','skydive','phase-step','light-pulse','divine-beam','chain-light','radiance-nova','shield','heal','lightning','telekinesis','crumble','redemption-wave'];
  const handledIds = new Set(['flight','hypersonic','teleport','beam-down','skydive','dash','hover','leap','sky-lift','glide','phase-step','recall','time-step','light-pulse','divine-beam','chain-light','radiance-nova','shield','heal','cleanse','reveal','sunrise','sanctuary','restore','grace-surge','shockwave','rain','lightning','telekinesis','crumble','rebuild','bless','exorcise','stasis','vortex','repel','attract','slow-time','redemption-wave']);
  if(signatureIds.length!==20 || signatureIds.some(id=>!catalog.some(a=>a.id===id)||!handledIds.has(id))) throw Error('Signature miracle contract failed');
  const held=new Set(), cooldowns=new Map();
  let selected='light-pulse',group='Light',target=null,restored=0;
  let width=0,height=0,dpr=1,zoom=1,camX=player.x,camY=player.y,prev=performance.now();
  let pulseUntil=0,pulseRadius=0,castUntil=0,boostUntil=0,shieldUntil=0,glowUntil=0,stasisUntil=0;
  let messageTimer=0,won=false,combo=0,lastRestore=0,slowFrames=0,fastFrames=0,qualityWindow=performance.now();
  function say(message,ms=2200){$('banner').textContent=message;$('banner').classList.add('show');clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('banner').classList.remove('show'),ms);}
  function alertNpcs(type,now=performance.now()){
    let heard=0;
    for(const npc of npcs){if(Math.hypot(npc.x-player.x,npc.y-player.y)>650)continue;heard++;npc.memory={type,time:now,x:player.x,y:player.y};npc.until=now+5200;
      if(npc.faction==='civilian'){npc.state='fear';const a=Math.atan2(npc.y-player.y,npc.x-player.x);npc.targetX=clamp(npc.x+Math.cos(a)*150,25,worldSize-25);npc.targetY=clamp(npc.y+Math.sin(a)*150,25,worldSize-25);}
      else if(npc.faction==='authority'){npc.state='respond';npc.targetX=clamp(player.x+(npc.x<player.x?-42:42),25,worldSize-25);npc.targetY=clamp(player.y+(npc.y<player.y?-42:42),25,worldSize-25);}
      else if(npc.faction==='angel'){npc.state='awe';const a=Math.atan2(npc.y-player.y,npc.x-player.x);npc.targetX=clamp(player.x+Math.cos(a)*45,25,worldSize-25);npc.targetY=clamp(player.y+Math.sin(a)*45,25,worldSize-25);}
      else{npc.state='retreat';const a=Math.atan2(npc.y-player.y,npc.x-player.x);npc.targetX=clamp(npc.x+Math.cos(a)*180,25,worldSize-25);npc.targetY=clamp(npc.y+Math.sin(a)*180,25,worldSize-25);}
    }
    if(heard)say(`${type.toUpperCase()} · CIVILIANS FLEE · RESPONDERS MOVE IN · ANGELS APPROACH · DEMONS RETREAT`);
  }
  function npcClear(x,y){return buildings.every(b=>x<b.x-8||x>b.x+b.w+8||y<b.y-8||y>b.y+b.h+8);}
  function updateNpcs(dt,now){for(const npc of npcs){if(now>=npc.until&&npc.state!=='calm'){npc.state='calm';npc.targetX=npc.homeX;npc.targetY=npc.homeY;}
      if(npc.state==='calm'&&Math.hypot(npc.x-npc.targetX,npc.y-npc.targetY)<4){npc.targetX=npc.homeX+Math.sin(now*.00025+npc.homeY)*22;npc.targetY=npc.homeY+Math.cos(now*.00022+npc.homeX)*22;}
      const dx=npc.targetX-npc.x,dy=npc.targetY-npc.y,d=Math.hypot(dx,dy);if(d>.5){const speed=npc.state==='fear'||npc.state==='retreat'?78:npc.state==='respond'?45:18,step=Math.min(d,speed*dt),x=npc.x+dx/d*step,y=npc.y+dy/d*step;if(npcClear(x,y)){npc.x=x;npc.y=y;npc.gait+=step*.12;}}
    }}
  function resize(){dpr=Math.min(devicePixelRatio||1,dprLimit);width=innerWidth;height=innerHeight;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);zoom=clamp(width/730,.62,1.05);}
  let dprLimit=1.25;
  addEventListener('resize',resize);resize();
  function distance(b){return Math.hypot(b.x+b.w/2-player.x,b.y+b.h/2-player.y);}
  function nearby(radius,count=1){return buildings.filter(b=>!b.restored&&distance(b)<radius).sort((a,b)=>a===target?-1:b===target?1:distance(a)-distance(b)).slice(0,count);}
  function restore(b){if(!b||b.restored)return;const now=performance.now();combo=now-lastRestore<8000?combo+1:1;lastRestore=now;b.restored=true;restored++;const reward=16+Math.min(20,(combo-1)*4);player.grace=clamp(player.grace+reward,0,100);$('count').textContent=`${restored} / ${buildings.length} · ${combo}× CHAIN`;say(`BUILDING ${String(b.id).padStart(2,'0')} ANCHORED · +${reward} GRACE · ${combo}× CHAIN`);if(restored===buildings.length){won=true;$('finish').classList.add('open');}}
  function ring(radius=180){pulseRadius=radius;pulseUntil=performance.now()+530;castUntil=performance.now()+470;}
  function direction(){let dx=Number(held.has('d')||held.has('KeyD')||held.has('ArrowRight'))-Number(held.has('a')||held.has('KeyA')||held.has('ArrowLeft'));let dy=Number(held.has('s')||held.has('KeyS')||held.has('ArrowDown'))-Number(held.has('w')||held.has('KeyW')||held.has('ArrowUp'));let length=Math.hypot(dx,dy);return length?[dx/length,dy/length]:[Math.cos(player.angle),Math.sin(player.angle)];}
  function dash(){const [dx,dy]=direction();player.x=clamp(player.x+dx*155,28,worldSize-28);player.y=clamp(player.y+dy*155,30,worldSize-30);player.angle=Math.atan2(dy,dx);castUntil=performance.now()+300;ring(80);}
  function teleport(){const b=(target&&!target.restored?target:nearby(700)[0]);if(!b){say('TAP A BUILDING TO TARGET IT');return;}player.x=clamp(b.x+b.w/2,28,worldSize-28);player.y=clamp(b.y+b.h+48,30,worldSize-30);ring(130);say(`TELEPORTED TO BUILDING ${String(b.id).padStart(2,'0')}`);}
  function cast(id=selected){if(won)return;const ability=catalog.find(a=>a.id===id);if(!ability)return;
    const now=performance.now();if((cooldowns.get(id)||0)>now){say(`${ability.name.toUpperCase()} RECHARGING`);return;}
    if(player.grace<ability.cost){say('COLLECT GOLD LIGHTS TO REFILL GRACE');return;}
    player.grace-=ability.cost;cooldowns.set(id,now+ability.cooldown*1000);alertNpcs(id,now);
    const strike=(radius,count=1)=>nearby(radius,count).forEach(restore);
    let special=true;
    switch(id){
      case 'flight':player.flying=!player.flying;player.hyper=false;player.altitude=player.flying?Math.max(30,player.altitude):0;break;
      case 'hypersonic':player.flying=true;player.hyper=!player.hyper;player.altitude=Math.max(player.altitude,70);break;
      case 'teleport':teleport();break;
      case 'beam-down':player.flying=false;player.hyper=false;player.altitude=0;break;
      case 'skydive':player.flying=false;player.hyper=false;player.altitude=0;strike(95,3);ring(220);alertNpcs('dive-impact',now);break;
      case 'dash':dash();break;
      case 'hover':player.flying=true;player.altitude=30;break;
      case 'leap':case 'sky-lift':player.flying=true;player.altitude=clamp(player.altitude+(id==='leap'?35:90),0,175);break;
      case 'glide':player.flying=true;player.glide=!player.glide;player.altitude=Math.max(30,player.altitude);break;
      case 'phase-step':boostUntil=now+2200;break;
      case 'recall':player.x=780;player.y=790;player.flying=false;player.altitude=0;break;
      case 'time-step':case 'slow-time':boostUntil=now+7000;break;
      case 'light-pulse':strike(178,3);ring(178);break;
      case 'divine-beam':strike(245);ring(245);break;
      case 'chain-light':strike(265,3);ring(265);break;
      case 'radiance-nova':strike(290,12);ring(290);break;
      case 'shield':shieldUntil=now+6000;ring(140);break;
      case 'heal':player.grace=clamp(player.grace+45,0,100);ring(100);break;
      case 'cleanse':strike(145);ring(145);break;
      case 'reveal':glowUntil=now+6000;break;
      case 'sunrise':glowUntil=now+7000;ring(250);break;
      case 'sanctuary':shieldUntil=now+7000;player.grace=clamp(player.grace+15,0,100);ring(180);break;
      case 'restore':strike(190,3);ring(190);break;
      case 'grace-surge':player.grace=clamp(player.grace+35,0,100);boostUntil=now+8000;break;
      case 'shockwave':strike(175,8);ring(175);break;
      case 'rain':player.grace=clamp(player.grace+35,0,100);glowUntil=now+4000;break;
      case 'lightning':strike(320);ring(320);break;
      case 'telekinesis':{const b=nearby(210)[0];if(b){b.offset=35;setTimeout(()=>b.offset=0,900);}break;}
      case 'crumble':case 'rebuild':case 'bless':strike(170);ring(170);break;
      case 'exorcise':strike(240,5);ring(240);break;
      case 'stasis':stasisUntil=now+6000;ring(160);break;
      case 'vortex':case 'attract':for(const soul of souls)if(soul.active&&Math.hypot(soul.x-player.x,soul.y-player.y)<330){soul.x+=(player.x-soul.x)*.55;soul.y+=(player.y-soul.y)*.55;}ring(240);break;
      case 'repel':for(const soul of souls)if(soul.active&&Math.hypot(soul.x-player.x,soul.y-player.y)<260){soul.x=clamp(soul.x+(soul.x-player.x)*.35,20,1648);soul.y=clamp(soul.y+(soul.y-player.y)*.35,20,1648);}ring(210);break;
      case 'redemption-wave':strike(430,12);ring(430);break;
      default:special=false;
    }
    $('grace').textContent=Math.round(player.grace);
    $('flight').textContent=player.hyper?'HYPERSONIC':player.flying?`FLYING +${Math.round(player.altitude)}M`:'GROUNDED';
    if(special&&id!=='teleport'&&id!=='light-pulse')say(ability.name.toUpperCase());
  }
  function renderWheel(){
    $('miracle-tabs').replaceChildren(...['Travel','Light','World'].map(g=>{const b=document.createElement('button');b.textContent=g;b.className=g===group?'active':'';b.onclick=()=>{group=g;renderWheel();};return b;}));
    $('miracle-list').replaceChildren(...catalog.filter(a=>a.group===group).map(a=>{const b=document.createElement('button');b.className=a.id===selected?'active':'';b.innerHTML=`${a.name}<small>${a.cost} grace · ${a.cooldown}s cooldown</small>`;b.onclick=()=>{selected=a.id;$('selected').textContent=a.name;$('miracle').classList.remove('open');renderWheel();say(`${a.name.toUpperCase()} SELECTED · PRESS CAST`);};return b;}));
  }
  renderWheel();
  function wheel(){const open=$('miracle').classList.toggle('open');held.clear();if(open)renderWheel();}
  $('miracle-close').onclick=()=>$('miracle').classList.remove('open');
  $('again').onclick=()=>{conversation.close({restoreFocus:false});for(const b of buildings)b.restored=false;for(const soul of souls)soul.active=true;for(const npc of npcs){npc.x=npc.homeX;npc.y=npc.homeY;npc.targetX=npc.homeX;npc.targetY=npc.homeY;npc.state='calm';npc.until=0;npc.memory=null;}restored=0;combo=0;won=false;player.x=780;player.y=790;player.vx=player.vy=0;player.grace=100;player.flying=false;player.hyper=false;player.altitude=0;$('count').textContent='0 / 12';$('grace').textContent='100';$('finish').classList.remove('open');say('ANCHOR THE CITY');};
  addEventListener('keydown',e=>{if(conversation.isOpen||e.target.closest('input,textarea,select'))return;if(e.code==='KeyC'&&!e.repeat&&!$('miracle').classList.contains('open')){e.preventDefault();startNpcTalk();return;}if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Tab'){if(!e.repeat)wheel();return;}if($('miracle').classList.contains('open')){if(e.code==='Escape')$('miracle').classList.remove('open');return;}held.add(e.code);if(e.repeat)return;
    if(e.code==='KeyQ')cast();else if(e.code==='KeyF')cast('flight');else if(e.code==='KeyG')cast('hypersonic');else if(e.code==='KeyV')cast('skydive');else if(e.code==='KeyT')cast('teleport');else if(e.code==='KeyR')cast('beam-down');else if(e.code==='Space')cast(player.flying?'sky-lift':'dash');else if(e.code==='ControlLeft'||e.code==='ControlRight')player.altitude=clamp(player.altitude-25,0,175);
  });
  addEventListener('keyup',e=>held.delete(e.code));addEventListener('blur',()=>held.clear());
  document.querySelectorAll('[data-hold]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(b.dataset.hold);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>held.delete(b.dataset.hold));});
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const action=b.dataset.action;if(action==='wheel')wheel();else if(action==='cast')cast();else if(action==='rise'){player.flying=true;player.altitude=clamp(player.altitude+25,0,175);$('flight').textContent=`FLYING +${Math.round(player.altitude)}M`;}else if(action==='drop'){player.altitude=clamp(player.altitude-25,0,175);if(player.altitude===0)player.flying=false;$('flight').textContent=player.flying?`FLYING +${Math.round(player.altitude)}M`:'GROUNDED';}else cast(action);});
  canvas.addEventListener('pointerdown',e=>{const x=camX+(e.clientX-width/2)/zoom,y=camY+(e.clientY-height/2)/zoom;const b=buildings.find(b=>x>b.x-25&&x<b.x+b.w+25&&y>b.y-b.offset-25&&y<b.y+b.h+25);if(b){target=b;say(`BUILDING ${String(b.id).padStart(2,'0')} TARGETED · MOVE CLOSE AND CAST`);}else target=null;});
  function update(dt,now){if(conversation.isOpen||won||$('miracle').classList.contains('open'))return;let dx=Number(held.has('d')||held.has('KeyD')||held.has('ArrowRight'))-Number(held.has('a')||held.has('KeyA')||held.has('ArrowLeft'));let dy=Number(held.has('s')||held.has('KeyS')||held.has('ArrowDown'))-Number(held.has('w')||held.has('KeyW')||held.has('ArrowUp'));const length=Math.hypot(dx,dy);
    if(length){dx/=length;dy/=length;player.angle=Math.atan2(dy,dx);}
    const sprint=length&&held.has('ShiftLeft')&&player.grace>1;
    const speed=210*(sprint?1.9:1)*(player.hyper?2.2:player.flying?1.3:1)*(now<boostUntil?1.35:1);
    const response=player.flying?(player.hyper?3.5:6):13;
    const blend=1-Math.exp(-response*dt);
    player.vx+=(dx*speed-player.vx)*blend;player.vy+=(dy*speed-player.vy)*blend;
    player.x=clamp(player.x+player.vx*dt,28,worldSize-28);
    player.y=clamp(player.y+player.vy*dt,30,worldSize-30);
    player.grace=clamp(player.grace+(sprint?-12:11)*dt,0,100);
    if(combo&&now-lastRestore>8000){combo=0;$('count').textContent=`${restored} / ${buildings.length}`;}
    for(const s of souls)if(s.active&&Math.hypot(s.x-player.x,s.y-player.y)<35){s.active=false;player.grace=clamp(player.grace+22,0,100);say('GOLD LIGHT COLLECTED · +22 GRACE');}
    updateNpcs(dt,now);
    $('grace').textContent=Math.round(player.grace);
    nearNpc=nearestNpc();talkPrompt.classList.toggle('show',!!nearNpc&&!talkPanel.classList.contains('open'));if(nearNpc&&!talkPanel.classList.contains('open'))$('banner').textContent=`${nearNpc.name.toUpperCase()} · ${nearNpc.faction.toUpperCase()} · PRESS C TO TALK`;
    camX+=((clamp(player.x,width/(2*zoom),worldSize-width/(2*zoom))||player.x)-camX)*Math.min(1,dt*8);
    camY+=((clamp(player.y,height/(2*zoom),worldSize-height/(2*zoom))||player.y)-camY)*Math.min(1,dt*8);
  }
  function drawBuilding(b,now){const {x,y,w,h}=b;const lift=b.offset+(b.restored?4:Math.sin(now*.002+b.id)*3);ctx.save();ctx.shadowColor=b.restored?'#f5d981':'#ff165b';ctx.shadowBlur=b.restored?15:24;ctx.fillStyle=b.restored?'#ffe2a8':'#b9123f';ctx.fillRect(x-5,y-lift-5,w+10,h+10);ctx.shadowBlur=0;ctx.fillStyle='#080e19';ctx.fillRect(x,y-lift,w,h);const im=images.facades[b.id-1];if(im.complete&&im.naturalWidth)ctx.drawImage(im,x,y-lift,w,h);else{ctx.fillStyle=`hsl(${b.id*29},57%,27%)`;ctx.fillRect(x,y-lift,w,h);}if(b.restored){ctx.fillStyle='#ffe2a97b';ctx.fillRect(x,y-lift,w,h);ctx.strokeStyle='#fff1bd';}else{ctx.fillStyle='#17051f40';ctx.fillRect(x,y-lift,w,h);ctx.strokeStyle='#ff4777';}ctx.lineWidth=4;ctx.strokeRect(x,y-lift,w,h);ctx.fillStyle=b.restored?'#162638':'#430e24';ctx.fillRect(x,y-lift+h-25,w,25);ctx.fillStyle='#fff3d4';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.fillText(b.restored?'ANCHORED':`CURSED ${String(b.id).padStart(2,'0')}`,x+w/2,y-lift+h-8);if(target===b){ctx.strokeStyle='#fff5a0';ctx.lineWidth=5;ctx.strokeRect(x-12,y-lift-12,w+24,h+24);}if(now<glowUntil&&!b.restored){ctx.strokeStyle='#ffe8ad';ctx.lineWidth=4;ctx.strokeRect(x-11,y-lift-11,w+22,h+22);}ctx.restore();}
  function draw(now,dt){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0b1120';ctx.fillRect(0,0,width,height);ctx.translate(width/2,height/2);ctx.scale(zoom,zoom);ctx.translate(-camX,-camY);ctx.save();ctx.beginPath();ctx.rect(0,0,worldSize,worldSize);ctx.clip();if(images.aerial.complete&&images.aerial.naturalWidth){const left=clamp(camX-width/(2*zoom)-10,0,worldSize),top=clamp(camY-height/(2*zoom)-10,0,worldSize),right=clamp(camX+width/(2*zoom)+10,0,worldSize),bottom=clamp(camY+height/(2*zoom)+10,0,worldSize);if(right>left&&bottom>top)ctx.drawImage(images.aerial,left,top,right-left,bottom-top,left,top,right-left,bottom-top);}else{ctx.fillStyle='#303943';ctx.fillRect(0,0,worldSize,worldSize);}ctx.fillStyle=now<glowUntil?'#6d4a2c2e':'#06132368';ctx.fillRect(0,0,worldSize,worldSize);
    ctx.fillStyle='#0508177a';ctx.beginPath();ctx.ellipse(780,840,32,680,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#dfb55a99';ctx.setLineDash([15,28]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(780,30);ctx.lineTo(780,1635);ctx.stroke();ctx.setLineDash([]);
    for(const b of buildings)drawBuilding(b,now);
    for(const npc of npcs){const color=npc.faction==='civilian'?'#e8d5ad':npc.faction==='authority'?'#86c9ff':npc.faction==='angel'?'#ffe7a3':'#ef6b8e';ctx.save();ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(npc.x,npc.y+4,16,6,0,0,Math.PI*2);ctx.fill();if(npc.state!=='calm'){ctx.strokeStyle=color;ctx.globalAlpha=.35+Math.sin(now*.009)*.18;ctx.lineWidth=4;ctx.beginPath();ctx.arc(npc.x,npc.y-18,27,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}if(npc.image.complete&&npc.image.naturalWidth){const bob=Math.abs(Math.sin(npc.gait))*(Math.hypot(npc.targetX-npc.x,npc.targetY-npc.y)>.5?2.4:.4);ctx.drawImage(npc.image,npc.x-21,npc.y-53-bob,42,56);}else{ctx.fillStyle=color;ctx.beginPath();ctx.arc(npc.x,npc.y-24,11,0,Math.PI*2);ctx.fill();}if(npc.state!=='calm'){ctx.fillStyle=color;ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText(npc.state==='fear'?'FLEE':npc.state==='respond'?'RESPOND':npc.state==='awe'?'AWE':'RETREAT',npc.x,npc.y-60);}ctx.restore();}
    for(const s of souls)if(s.active){const pulse=12+Math.sin(now*.005+s.x)*3;ctx.fillStyle='#ffd77844';ctx.beginPath();ctx.arc(s.x,s.y,pulse+14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff2b6';ctx.beginPath();ctx.arc(s.x,s.y,pulse*.62,0,Math.PI*2);ctx.fill();}
    if(now<pulseUntil){const r=pulseRadius*(1-(pulseUntil-now)/530);ctx.strokeStyle=`rgba(255,233,163,${(pulseUntil-now)/530})`;ctx.lineWidth=8;ctx.beginPath();ctx.arc(player.x,player.y,r,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(player.x,player.y+18,22+player.altitude*.11,10+player.altitude*.04,0,0,Math.PI*2);ctx.fill();
    const speedNow=Math.hypot(player.vx,player.vy),moving=speedNow>12;
    player.gait=advanceGait(player.gait||0,speedNow/30,dt,held.has('ShiftLeft')||held.has('ShiftRight'));
    const runCycle=31+Math.floor(player.gait),walkCycle=23+Math.floor(player.gait);
    const strafe=player.vx*Math.cos(player.angle+Math.PI/2)+player.vy*Math.sin(player.angle+Math.PI/2);
    const flightPose=player.hyper?20:player.glide?17:Math.abs(strafe)>60?(strafe<0?15:16):moving?20:14;
    const pose=now<castUntil?3:player.flying?flightPose:moving?(held.has('ShiftLeft')||held.has('ShiftRight')?runCycle:walkCycle):0;
    const im=images.poses[pose],hero=images.hero;
    const size=player.flying?76:moving?70:72,bob=moving?Math.sin(player.gait)*2:Math.sin(now*.003)*.8,airY=player.y-player.altitude*.65+bob;
    ctx.save();ctx.shadowColor=now<shieldUntil?'#8cecff':'#fff0ba';ctx.shadowBlur=player.flying?35:22;
    const art=im?.complete&&im.naturalWidth?im:hero.complete&&hero.naturalWidth?hero:null;
    if(art){const lean=clamp(player.vx/900,-.18,.18),aspect=art.width/art.height,drawHeight=player.flying?80:94;ctx.translate(player.x,airY);ctx.rotate(lean);ctx.drawImage(art,-drawHeight*aspect*.5,-drawHeight,drawHeight*aspect,drawHeight);}
    else{ctx.fillStyle='#fff8ea';ctx.beginPath();ctx.arc(player.x,airY,20,0,Math.PI*2);ctx.fill();}
    ctx.restore();ctx.strokeStyle=now<shieldUntil?'#8cecff':'#f6d37d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(player.x,player.y-player.altitude*.65,26,0,Math.PI*2);ctx.stroke();ctx.restore();}
  function frame(now){const elapsed=now-prev,dt=Math.min(.06,elapsed/1000||0);prev=now;if(document.hidden){requestAnimationFrame(frame);return;}update(dt,now);draw(now,dt);slowFrames+=elapsed>38?1:0;fastFrames+=elapsed>0&&elapsed<24?1:0;if(now-qualityWindow>3000){const next=slowFrames>35?Math.max(.65,dprLimit-.15):fastFrames>120?Math.min(1.25,dprLimit+.05):dprLimit;if(next!==dprLimit){dprLimit=next;resize();}slowFrames=fastFrames=0;qualityWindow=now;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
  window.JC_LITE={player,buildings,souls,catalog,cast,restore,mode:'2d-canvas',get restored(){return restored;}};
  say('MOVE TO THE CURSED BUILDINGS · CAST TO ANCHOR THEM',4000);
})();
