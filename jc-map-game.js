import {loadPhotoFacades} from './photo-facades.js';
import {createCinematicLook} from './cinematic-look.js';
import * as THREE from './three.module.js';
import {cloneBuildingMaterial} from './map-materials.js';

import {stickAxis, response, advanceChain, advanceGait, advanceLook, setFlightForward} from './jc-control-math.js';
import {transitionFlight} from './jc-flight-state.js';
import {loadRearWalk,loadPoseSheet,FLIGHT_CELLS} from './rear-walk.js';
import {cachedGroundSample} from './ground-sampling.js';
import {createNpcSystem} from './jc-npcs.js';
import {createNpcConversation} from './npc-conversation.js';
import {createCharacter3D} from './jc-character3d.js';
import {cleanPoseImage} from './pose-cleanup.js';

const style = document.createElement('style');
style.textContent = `
body.jc-playing header,body.jc-playing aside,body.jc-playing .views,body.jc-playing .compass{display:none}
body.jc-playing #viewport{inset:0}
body.jc-playing #status{display:none}
#jcHud{display:none;position:fixed;inset:0;z-index:6;pointer-events:none;color:#fff;font:600 14px Arial,sans-serif}
body.jc-playing #jcHud{display:block}
#jcStick,#jcLookStick{width:min(23vw,92px);height:min(23vw,92px);min-width:68px;min-height:68px;border:2px solid #f9d87880;border-radius:50%;background:#091018a8;pointer-events:auto;touch-action:none;position:relative;flex-shrink:0}
#jcLookStick{border-color:#a9dfff88;background:#071520ad}
#jcStick i,#jcLookStick i{position:absolute;left:32%;top:32%;width:36%;height:36%;border-radius:50%;background:#ffe4a6aa;pointer-events:none}
#jcLookStick i{background:#a9dfffbb}
#jcFeedback{position:absolute;top:28%;left:50%;transform:translateX(-50%);background:#091018df;padding:10px 16px;border-bottom:2px solid #f9d878;opacity:0;transition:opacity .15s;text-align:center}
#jcRun{font-size:14px;color:#ffdf91}#jcAbilityReady{display:block;margin-top:6px;color:#b8eddf}
#jcTarget{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#ffe29c;font-size:14px;text-shadow:0 2px 4px #000;text-align:center}
#jcTarget b{display:block;font-size:32px;font-weight:normal}#jcFlight{position:absolute;right:12px;top:158px;background:#091018dc;padding:8px 12px;font-variant-numeric:tabular-nums}
#jcHud .jc-score button{padding:6px 9px;margin-top:6px;font-size:12px}
@media(max-height:520px){#jcHud .jc-top{top:4px}#jcHud .jc-score{padding:5px 8px}#jcHud .jc-ability{top:4px;right:125px}#jcFlight{top:78px}#jcHud .jc-touch{bottom:max(8px,env(safe-area-inset-bottom))}}
#jcHud .jc-top{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:start;gap:12px}
#jcHud .jc-score{padding:10px 13px;background:#091018df;border-left:3px solid #f9d878;line-height:1.6}
#jcHud .jc-score strong{font-size:18px}
#jcHud button,#jcPlayReturn{border:1px solid #f9d87888;border-radius:5px;background:#101b24df;color:#fff;padding:11px 14px;font-weight:bold;cursor:pointer;pointer-events:auto}
#jcHud .jc-hint{position:absolute;bottom:12px;left:12px;padding:8px 10px;background:#091018d9;font-size:12px}
#jcHud .jc-touch{display:none;position:absolute;bottom:18px;left:10px;right:10px;grid-template-columns:minmax(68px,23vw) minmax(68px,23vw) minmax(116px,37vw);justify-content:space-between;align-items:end;gap:4px;pointer-events:none}
#jcHud .jc-dpad{display:none;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,52px);gap:4px;pointer-events:auto}
#jcHud .jc-dpad button{padding:0;touch-action:none}
#jcHud .jc-dpad button:first-child{grid-column:2}
#jcHud .jc-actions{pointer-events:auto}
#jcHud .jc-actions{display:grid;grid-template-columns:repeat(2,minmax(70px,1fr));gap:6px;width:158px;max-height:44vh;overflow-y:auto;overscroll-behavior:contain;justify-content:stretch}
#jcHud .jc-actions button{min-height:48px;touch-action:none}
#jcHud .jc-extras{display:none;grid-column:1/-1;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
#jcHud .jc-extras.open{display:grid}
#jcHud .jc-extras button{min-width:0;padding:7px 4px}
#jcHud .jc-ability{position:absolute;right:12px;top:70px;padding:9px 12px;background:#091018e8;border:1px solid #f9d87877;max-width:260px}
#jcHud .jc-ability strong{display:block;color:#ffdf91}
#jcWheel{display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(680px,96vw);max-height:min(75vh,680px);overflow:auto;background:#101820f5;border:1px solid #bb9771;padding:14px;pointer-events:auto}
#jcWheel.open{display:block}
#jcWheel .jc-groups{display:flex;gap:6px;margin-bottom:10px}
#jcWheel .jc-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
#jcWheel .jc-list button{text-align:left;min-height:54px;font-size:12px;padding-left:48px;background-repeat:no-repeat;background-position:8px center;background-size:32px 32px}
#jcWheel .jc-list button.selected{border-color:#ffe293;background:#59402b}
#jcWheel .jc-list small{display:block;color:#c8b8a4;margin-top:3px}
#jcWheel .jc-wheel-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
#jcPlayReturn{display:none;position:fixed;top:12px;right:12px;z-index:7}
body:not(.jc-playing) #jcPlayReturn{display:block}
@media(max-width:800px),(pointer:coarse){#jcHud .jc-touch{display:grid;bottom:calc(env(safe-area-inset-bottom) + 12px)}#jcHud .jc-hint{display:none}#jcHud .jc-score{font-size:12px}#jcHud .jc-score strong{font-size:15px}#jcWheel .jc-list{grid-template-columns:repeat(2,minmax(0,1fr))}#jcHud .jc-ability{top:76px;right:8px;font-size:12px}#jcHud .jc-actions{width:min(37vw,146px);max-height:42vh;gap:5px}#jcHud .jc-actions button{padding:7px 5px;font-size:12px;min-height:46px}}
`;
document.head.append(style);

const hud = document.createElement('div');
hud.id = 'jcHud';
hud.innerHTML = `<div class="jc-top"><div class="jc-score">JC · STRIP RESTORATION<br><strong id="jcScore">0 / 8</strong> LIGHTS &nbsp; GRACE <span id="jcGrace">100</span>%<div id="jcRun">Restore 8 lights · start moving to begin</div><button id="jcRestart" type="button">RESTART RUN</button></div><button id="jcEditor" type="button">CITY EDITOR</button></div><div class="jc-ability">SELECTED MIRACLE<strong id="jcSelected">Light Pulse</strong><span id="jcState">Grounded</span><span id="jcAbilityReady">Ready</span></div><div class="jc-hint">WASD move · Drag to look / aim · Right stick look / flight pitch · Shift sprint · Space dash / rise · Ctrl descend · F fly · G boost · V dive · B brake · K building target · L light target · T teleport · Q cast · Tab miracles</div><div id="jcFeedback" role="status" aria-live="polite"></div><div id="jcTarget"></div><div id="jcFlight"></div><div class="jc-touch"><div id="jcStick" role="group" aria-label="Left joystick: move"><i></i></div><div id="jcLookStick" role="group" aria-label="Right joystick: look and steer flight pitch"><i></i></div><div class="jc-actions"><button data-move="e" type="button">RISE</button><button data-move="c" type="button">DROP</button><button data-move="b" type="button">BRAKE</button><button data-action="boost" type="button">BOOST</button><button data-action="dive" type="button">DIVE</button><button data-action="fly" type="button">FLY</button><button data-action="land" type="button">LAND</button><button data-action="more" type="button" aria-expanded="false">MORE</button><div class="jc-extras"><button data-action="lock" type="button">TARGET</button><button data-action="teleport" type="button">TELEPORT</button><button data-action="cast" type="button">CAST</button><button data-action="wheel" type="button">43 POWERS</button></div></div></div><div id="jcWheel" role="dialog" aria-label="JC miracles"><div class="jc-wheel-title"><strong>43 MIRACLES</strong><button id="jcWheelClose" type="button" aria-label="Close miracles">✕</button></div><div class="jc-groups"></div><div class="jc-list"></div></div>`;
document.body.append(hud);
style.textContent += '#jcNpcReadout{position:absolute;left:12px;bottom:144px;max-width:min(390px,78vw);padding:7px 10px;background:#091018d9;border-left:2px solid #c4ffee;color:#c4ffee;font-size:11px;letter-spacing:.4px;pointer-events:auto}#jcNpcTalkButton{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 178px);transform:translateX(-50%);display:none;pointer-events:auto;padding:11px 16px;border:1px solid #f1d17e;border-radius:8px;background:#111b2aee;color:#ffe6a4;font-weight:900;box-shadow:0 6px 18px #0009;z-index:2}#jcNpcTalkButton.available{display:block}@media(pointer:fine){#jcNpcTalkButton{display:none!important}}';
const npcReadout=document.createElement('div');npcReadout.id='jcNpcReadout';npcReadout.textContent='CITY FOLKS · OBSERVING';hud.append(npcReadout);
const npcTalkButton=document.createElement('button');npcTalkButton.id='jcNpcTalkButton';npcTalkButton.type='button';npcTalkButton.textContent='TALK';npcTalkButton.setAttribute('aria-label','Talk to nearby character');hud.append(npcTalkButton);
style.textContent += '@media(max-width:800px),(pointer:coarse){#jcTalk{bottom:calc(env(safe-area-inset-bottom) + 170px)}}#jcTalk{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:min(420px,90vw);padding:12px;background:#08111eF2;border:1px solid #e0bf75;border-radius:10px;color:#f5f0df;display:none;pointer-events:auto;box-shadow:0 10px 35px #000b}#jcTalk.open{display:block}#jcTalkHead{display:flex;align-items:center;gap:10px}#jcTalk img{width:48px;height:58px;object-fit:contain;background:#111a28;border-radius:6px}#jcTalk strong{color:#ffdf94}#jcTalk small{display:block;color:#aebaca;margin-top:4px}#jcTalkLog{max-height:108px;overflow:auto;font-size:12px;line-height:1.45;padding:8px 0}#jcTalk form{display:flex;gap:6px}#jcTalk [data-voice]{min-width:42px;font-size:17px}#jcTalk input{min-width:0;flex:1;background:#111a28;color:white;border:1px solid #566273;border-radius:5px;padding:9px}#jcTalk button{background:#94702e;color:white;border:1px solid #efcf81;border-radius:5px;padding:8px 10px}#jcTalk button.close{margin-left:auto;background:#18212c}';
const talk=document.createElement('section');talk.id='jcTalk';talk.setAttribute('aria-label','Talk to nearby character');talk.innerHTML='<div id=jcTalkHead><img alt=""><div><strong></strong><small></small></div><button class=close type=button aria-label="Close conversation">×</button></div><div id=jcTalkLog role=log aria-live=polite></div><form><input maxlength=180 aria-label="Message to character" placeholder="Say something…"><button data-voice type=button aria-label="Speak your message" title="Speak your message">🎙</button><button type=submit>Send</button></form>';hud.append(talk);
let nearNpc=null;
const conversation=createNpcConversation({panel:talk,log:talk.querySelector('#jcTalkLog'),onOpen:()=>{resetInput();velocity.set(0,0,0);},onClose:()=>resetInput(),notice:message=>feedback(message)});
function closestNpc(){
  if(!npcSystem||!player)return null;
  let nearest=null,nearestDistance=10;
  for(const npc of npcSystem.npcs){
    if(!npc.sprite)continue;
    const distance=npc.position.distanceTo(player.position);
    if(distance<nearestDistance){nearest=npc;nearestDistance=distance;}
  }
  return nearest;
}
function openNpcTalk(npc=nearNpc){if(npc&&playing)conversation.open(npc);}
npcTalkButton.addEventListener('click',()=>{if(conversation.isOpen)conversation.close();else openNpcTalk();});
hud.addEventListener('click',e=>{if(e.target.closest('button')&&!wheel.classList.contains('open'))e.target.closest('button').blur();});
const playReturn = document.createElement('button');
playReturn.id = 'jcPlayReturn';
playReturn.textContent = 'PLAY AS JC';
document.body.append(playReturn);

const score = hud.querySelector('#jcScore');
const graceLabel = hud.querySelector('#jcGrace');
const stateLabel = hud.querySelector('#jcState');
const wheel = hud.querySelector('#jcWheel');
const keys = new Set();
const velocity = new THREE.Vector3();
const desired = new THREE.Vector3();
const forward = new THREE.Vector3();
const flightForward = new THREE.Vector3();
const right = new THREE.Vector3();
const ray = new THREE.Raycaster();
const down = new THREE.Vector3();
const footprints = [];
const collisionCells = new Map();
const cellSize=64;
const terrainHeightCache=new Map();
let terrainGround=null;
const padKeys = new Set();
let gamepadButtons = [];
let game, player, portrait, realisticAvatar, npcSystem, souls = [], grace = 100, redeemed = 0, playerStepPhase=0;
const characterFrames = Array(39).fill(null);
let rearWalkReady=false;
const sheetOverrides=new Set();
function installPoseSheet(url,columns,rows,indices){
  loadPoseSheet(url,columns,rows,indices.map((_,i)=>i),frames=>{
    frames.forEach((canvas,i)=>{
      const index=indices[i],old=characterFrames[index];
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
      characterFrames[index]={texture,aspect:canvas.width/canvas.height};sheetOverrides.add(index);
      if(poseIndex===index)applyCharacterFrame(index);
      old?.texture.dispose();
    });
  },rows===3?FLIGHT_CELLS:undefined);
}
function loadCharacterFrames(){
  installPoseSheet('./character-art/jc-rear-run-v2.webp',4,2,[31,32,33,34,35,36,37,38]);
  installPoseSheet('./character-art/jc-rear-flight-v2.webp',3,3,[14,15,16,17,18,19,20,21,22]);
  for(let i=0;i<characterFrames.length;i++){
    const image=new Image();
    image.onload=()=>{
      if(sheetOverrides.has(i)||(rearWalkReady&&(i===0||(i>=23&&i<=30))))return;
      const cleaned=cleanPoseImage(image),texture=new THREE.CanvasTexture(cleaned);
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.minFilter=THREE.LinearFilter;
      texture.generateMipmaps=false;
      characterFrames[i]={texture,aspect:cleaned.width/cleaned.height};
      if(i===0&&realisticAvatar)applyCharacterFrame(0);
    };
    image.src=`./poses/pose-${i}.webp`;
  }
  loadRearWalk(frames=>{
    const obsolete=new Set([characterFrames[0],...characterFrames.slice(23,31)].filter(Boolean));
    frames.forEach((canvas,i)=>{
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
      const frame={texture,aspect:canvas.width/canvas.height};
      characterFrames[23+i]=frame;
    });
    rearWalkReady=true;characterFrames[0]=characterFrames[29];applyCharacterFrame(poseIndex);
    obsolete.forEach(frame=>frame.texture.dispose());
  });
}
function applyCharacterFrame(index){
  if(!realisticAvatar)return;
  const frame=characterFrames[index]||characterFrames[0];
  if(!frame)return;
  const material=realisticAvatar.material;
  if(material.map!==frame.texture){material.map=frame.texture;material.needsUpdate=true;}
  const height=index>=14&&index<=22?3.05:3.63;
  realisticAvatar.scale.set(height*frame.aspect,height,1);
  realisticAvatar.position.y=height*.5;
}
function horizontalFlightPose(){return velocity.lengthSq()>16?20:14;}
function setFlight(action){
  const next=transitionFlight({flying,hypersonic,glide,diving,height:flightHeight,descending},action);
  flying=next.flying;hypersonic=next.hypersonic;glide=next.glide;diving=next.diving;
  flightHeight=next.height;descending=next.descending;
  poseOverride=-1;poseOverrideUntil=0;castingUntil=0;
  return next;
}
let playing = false, yaw = 0, viewPitch = 0, last = performance.now(), lastGround = 0, terrainY = 0;
let frameWindow = 0, slowFrames = 0, steadyFrames = 0;
const coarseDevice = matchMedia('(pointer:coarse), (max-width:800px)').matches || navigator.maxTouchPoints>1 || new URLSearchParams(location.search).get('quality')==='mobile';
const maximumDpr = coarseDevice ? .9 : Math.min(1.25, devicePixelRatio || 1);
let adaptiveDpr = Math.min(maximumDpr, coarseDevice ? .75 : 1);
let dashCooldown = 0, pulseCooldown = 0, lastTiles = -1, dragging = false;
let pointerX = 0, pointerY = 0, lookPointer = null, stickPointer = null, lookStickPointer = null;
const analog = {x:0,y:0}, touchStick = {x:0,y:0}, touchLookStick = {x:0,y:0};
let lockedSoul = null, lockedBuilding = null, teleportAim = false, teleportTarget = null, teleportMarker = null, feedbackUntil = 0, nextHud = 0, runTime = 0, runActive = false, runFinished = false;
let chain = {count:0,last:0,points:0}, personalBest = 0;
try {personalBest = Number(localStorage.getItem('jc-restoration-best')) || 0;} catch {}
const runLabel=hud.querySelector('#jcRun'), feedbackLabel=hud.querySelector('#jcFeedback');
const targetLabel=hud.querySelector('#jcTarget'), flightLabel=hud.querySelector('#jcFlight');
function feedback(text) {feedbackLabel.textContent=text;feedbackUntil=performance.now()+2100;}
function showPose(index,duration=800){
  if(index<0||index>38)return;
  poseOverride=index;poseOverrideUntil=performance.now()+duration;
  if(portrait?.userData.character){portrait.userData.character.setPose(index,playerStepPhase,0,performance.now(),flightHeight>0);poseIndex=index;}
  applyCharacterFrame(index);
}
const miracleLoads=new Map();
const activeMiracleSprites=new Map();
function trimMiracleTextures(){
  while(miracleTextures.size>8){
    const victim=[...miracleTextures.keys()].find(id=>!activeMiracleSprites.get(id));
    if(!victim)return;
    miracleTextures.get(victim).dispose();miracleTextures.delete(victim);
  }
}
function loadMiracleTexture(id){
  if(miracleTextures.has(id)){const texture=miracleTextures.get(id);miracleTextures.delete(id);miracleTextures.set(id,texture);return Promise.resolve(texture);}
  if(miracleLoads.has(id))return miracleLoads.get(id);
  const load=loadTextureSafe(imageLoader,`./miracles/${id}.webp`,fallbackMiracleTexture).then(texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=1;
    if(texture.image&&Math.max(texture.image.width,texture.image.height)>512){const ratio=512/Math.max(texture.image.width,texture.image.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(texture.image.width*ratio));canvas.height=Math.max(1,Math.round(texture.image.height*ratio));canvas.getContext('2d').drawImage(texture.image,0,0,canvas.width,canvas.height);texture.image=canvas;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;}
    miracleTextures.set(id,texture);trimMiracleTextures();return texture;
  }).finally(()=>miracleLoads.delete(id));
  miracleLoads.set(id,load);return load;
}
function spawnMiracleSprite(id,position=player?.position){
  if(!position||!game)return;
  const base=position.clone();
  loadMiracleTexture(id).then(texture=>{
  if(!game?.scene)return;
  activeMiracleSprites.set(id,(activeMiracleSprites.get(id)||0)+1);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,opacity:.96,blending:THREE.AdditiveBlending}));
  sprite.position.copy(base).add(new THREE.Vector3(0,2.4,0));sprite.scale.set(3.4,3.4,1);game.scene.add(sprite);
  const started=performance.now(),base=sprite.position.clone();
  const animate=now=>{const t=(now-started)/1000;if(t>1.15){game.scene.remove(sprite);sprite.material.dispose();const active=activeMiracleSprites.get(id)||1;if(active<=1)activeMiracleSprites.delete(id);else activeMiracleSprites.set(id,active-1);trimMiracleTextures();return;}sprite.position.y=base.y+Math.sin(t*8)*.16;sprite.scale.setScalar(3.4+t*2.2);sprite.material.opacity=Math.max(0,1-t/1.15);sprite.material.rotation=t*.9;requestAnimationFrame(animate);};
  requestAnimationFrame(animate);
  }).catch(error=>console.warn('Miracle effect art unavailable',id,error));
}
function clearTeleportMarker(){if(teleportMarker){game?.scene?.remove(teleportMarker);teleportMarker.geometry.dispose();teleportMarker.material.dispose();teleportMarker=null;}}
function beginTeleportTarget(){if(!playing)return;teleportAim=true;teleportTarget=null;clearTeleportMarker();feedback('TELEPORT AIM · click or tap a clear landing point');}
function chooseTeleportPoint(clientX,clientY){
  if(!teleportAim||!game)return;
  const rect=game.renderer.domElement.getBoundingClientRect();
  const ndc=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
  ray.setFromCamera(ndc,game.camera);
  const floor=new THREE.Plane(new THREE.Vector3(0,1,0),-terrainY);
  const point=ray.ray.intersectPlane(floor,new THREE.Vector3());
  if(!point){feedback('Choose a point on the city floor');return;}
  const offset=point.clone().sub(player.position);offset.y=0;if(offset.length()>1500){offset.setLength(1500);point.copy(player.position).add(offset);feedback('Teleport range capped at 1.5 km');}
  const safe=clearSpot(point.x,point.z);
  if(!flying&&Math.hypot(safe[0]-point.x,safe[1]-point.z)>8){feedback('That landing point is blocked');return;}
  teleportTarget.set(safe[0],groundAt(safe[0],safe[1])+flightHeight,safe[1]);
  clearTeleportMarker();
  teleportMarker=new THREE.Mesh(new THREE.RingGeometry(2,2.4,32),new THREE.MeshBasicMaterial({color:0x9fe8ff,transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false}));
  teleportMarker.rotation.x=-Math.PI/2;teleportMarker.position.set(teleportTarget.x,groundAt(teleportTarget.x,teleportTarget.z)+.14,teleportTarget.z);game.scene.add(teleportMarker);
  teleportAim=false;feedback('DESTINATION LOCKED · click TELEPORT again or press T');
}
function resetInput(){keys.clear();padKeys.clear();analog.x=analog.y=touchStick.x=touchStick.y=touchLookStick.x=touchLookStick.y=0;dragging=false;lookPointer=null;stickPointer=lookStickPointer=null;hud.querySelector('#jcStick i').style.transform='';hud.querySelector('#jcLookStick i').style.transform='';}
function toggleWheel(){wheel.classList.toggle('open');resetInput();}
function cycleBuildingTarget(){
  const candidates=nearbyBuildings(90,12);lockedBuilding=candidates[(candidates.indexOf(lockedBuilding)+1)%candidates.length]||null;
  feedback(lockedBuilding?`BUILDING TARGET · ${lockedBuilding.userData.buildingId}`:'No building in range');
}
function cycleTarget(){
  const candidates=souls.filter(s=>!s.userData.collected).sort((a,b)=>a.position.distanceToSquared(player.position)-b.position.distanceToSquared(player.position));
  lockedSoul=candidates[(candidates.indexOf(lockedSoul)+1)%candidates.length]||null;
  feedback(lockedSoul?'Light tracked · Q pulse within 18 m':'All lights restored');
}
function resetRun(){
  clearTeleportMarker();teleportAim=false;teleportTarget=null;
  redeemed=0;runTime=0;runActive=false;runFinished=false;chain={count:0,last:0,points:0};lockedSoul=null;
  grace=100;cooldowns.clear();dashCooldown=pulseCooldown=0;flightHeight=0;flying=hypersonic=glide=diving=false;
  descending=0;velocity.set(0,0,0);player.position.copy(spawnPoint);terrainY=spawnPoint.y;
  for(const soul of souls){soul.position.copy(soul.userData.home);soul.userData.baseY=soul.position.y;soul.userData.collected=false;soul.visible=playing;}
  score.textContent='0 / 8';resetInput();feedback('Restore all 8 lights. Chain pickups within 12 seconds.');
}
function blockedAt(x,y,z,radius=1.2){return (collisionCells.get(`${Math.floor(x/cellSize)}:${Math.floor(z/cellSize)}`)||[]).some(b=>x>b.min.x-radius&&x<b.max.x+radius&&z>b.min.z-radius&&z<b.max.z+radius&&y+3.6>b.min.y&&y<b.max.y);}
function moveSafely(dx,dz,phase=false){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.8));
  for(let i=0;i<steps;i++){
    const x=player.position.x+dx/steps,z=player.position.z+dz/steps;
    if(phase||!blockedAt(x,player.position.y,player.position.z))player.position.x=x;else {if(performance.now()-lastImpact>300){showPose(10,350);feedback('Impact · use Phase Step or rise');lastImpact=performance.now();}velocity.x=0;}
    if(phase||!blockedAt(player.position.x,player.position.y,z))player.position.z=z;else velocity.z=0;
  }
}
let flying = false, hypersonic = false, glide = false, diving = false, flightHeight = 0, descending = 0, phaseUntil = 0, timeScaleUntil = 0;
let shieldUntil = 0, graceSurgeUntil = 0, sanctuaryUntil = 0, stasisUntil = 0, revealUntil = 0, sunriseUntil = 0;
let castingUntil = 0, poseIndex = -1, selectedAbility = 'light-pulse', selectedGroup = 'Travel';
const cooldowns = new Map(), redeemedBuildings = new Set();
const miracleTextures = new Map();
let poseOverride = -1, poseOverrideUntil = 0, lastImpact = 0;
// Flight poses are states, not consecutive frames of a looping animation.
const walkPoseSet=[23,24,25,26,27,28,29,30];
const runPoseSet=[31,32,33,34,35,36,37,38];
const miraclePose = {
  flight:14,hypersonic:20,teleport:7,'beam-down':8,dash:15,hover:14,leap:18,glide:17,'sky-lift':22,skydive:19,'phase-step':7,recall:7,'time-step':7,
  'light-pulse':5,'divine-beam':8,'chain-light':8,'radiance-nova':5,shield:9,heal:9,cleanse:9,reveal:9,sunrise:8,sanctuary:9,restore:9,'grace-surge':9,shockwave:8,
  rain:8,lightning:8,telekinesis:9,crumble:10,rebuild:9,bless:9,exorcise:8,stasis:9,vortex:5,repel:8,attract:9,'slow-time':7,'redemption-wave':12,
  'heavenly-spear':8,'judgment-storm':8,singularity:5,'sonic-boom':20
};
let neutralTexture, cursedTextures = [], restoredTextures = [], spawnPoint, startQueued = false;
const abilities = [
  ['Travel','flight','Flight',0,0],['Travel','hypersonic','Hypersonic Flight',12,2],['Travel','teleport','Teleport',30,2],['Travel','beam-down','Beam Down',0,1],
  ['Travel','dash','Dash',25,.8],['Travel','hover','Hover',10,1],['Travel','leap','Leap',12,1],['Travel','glide','Glide',0,1],['Travel','sky-lift','Sky Lift',15,1],
  ['Travel','skydive','Skydive',0,1],['Travel','phase-step','Phase Step',22,7],['Travel','recall','Recall to Strip',20,5],['Travel','time-step','Time Step',20,8],
  ['Light','light-pulse','Light Pulse',35,1.5],['Light','divine-beam','Divine Beam',20,2],['Light','chain-light','Chain Light',34,4],['Light','radiance-nova','Radiance Nova',45,6],
  ['Light','shield','Shield',24,8],['Light','heal','Heal',12,6],['Light','cleanse','Cleanse',18,2],['Light','reveal','Reveal',8,5],['Light','sunrise','Sunrise',35,10],
  ['Light','sanctuary','Sanctuary',25,9],['Light','restore','Restore',25,4],['Light','grace-surge','Grace Surge',10,9],['Light','shockwave','Shockwave',35,5],
  ['World','rain','Rain',20,6],['World','lightning','Lightning',24,3],['World','telekinesis','Telekinesis',18,3],['World','crumble','Crumble',28,4],
  ['World','rebuild','Rebuild',18,3],['World','bless','Bless Building',15,2],['World','exorcise','Exorcise',40,6],['World','stasis','Stasis',22,7],
  ['World','vortex','Vortex',26,5],['World','repel','Repel',12,2],['World','attract','Attract',12,2],['World','slow-time','Slow Time',24,8],['World','redemption-wave','Redemption Wave',55,12]
  ,['Light','heavenly-spear','Heavenly Spear',38,7],['Light','judgment-storm','Judgment Storm',48,10],['World','singularity','Singularity',36,9],['Travel','sonic-boom','Sonic Boom',30,6]
].map(([group,id,name,cost,cooldown])=>({group,id,name,cost,cooldown}));
const signatureAbilityIds = ['flight','hypersonic','teleport','dash','hover','leap','glide','sky-lift','skydive','phase-step','light-pulse','divine-beam','chain-light','radiance-nova','shield','heal','lightning','telekinesis','crumble','redemption-wave','heavenly-spear','judgment-storm','singularity','sonic-boom'];
const castableAbilityIds = new Set(['flight','hypersonic','teleport','beam-down','dash','hover','leap','glide','sky-lift','skydive','phase-step','recall','time-step','light-pulse','divine-beam','chain-light','radiance-nova','shield','heal','cleanse','reveal','sunrise','sanctuary','restore','grace-surge','shockwave','rain','lightning','telekinesis','crumble','rebuild','bless','exorcise','stasis','vortex','repel','attract','slow-time','redemption-wave','heavenly-spear','judgment-storm','singularity','sonic-boom']);
if(signatureAbilityIds.length !== 24 || signatureAbilityIds.some(id => !abilities.some(a => a.id === id) || !castableAbilityIds.has(id))) throw Error('JC signature ability contract failed');
if (abilities.length !== 43) throw Error('JC miracle catalog must contain 43 abilities');

const studioReady = new Promise(resolve => {
  const check = () => window.JC_BOOT_FAILED ? undefined : window.studio ? resolve(window.studio) : setTimeout(check, 100);
  check();
});

function refreshFootprints() {
  footprints.length = 0;
  collisionCells.clear();
  terrainHeightCache.clear();
  for (const group of game.loaded.values()) {
    group.updateWorldMatrix(true, true);
    for (const ob of group.children) {
      if(game.chunks?.has(ob.userData.buildingId))continue;
      const c = ob.userData.collider;
      if (!c?.min || !c?.max) continue;
      const box = new THREE.Box3(new THREE.Vector3(...c.min), new THREE.Vector3(...c.max)).applyMatrix4(ob.matrixWorld);
      footprints.push({box, ob});
      for(let x=Math.floor((box.min.x-2)/cellSize);x<=Math.floor((box.max.x+2)/cellSize);x++)for(let z=Math.floor((box.min.z-2)/cellSize);z<=Math.floor((box.max.z+2)/cellSize);z++){
        const key=`${x}:${z}`;if(!collisionCells.has(key))collisionCells.set(key,[]);collisionCells.get(key).push(box);
      }
    }
  }
}
let footprintRefreshTimer=0;
function queueFootprintRefresh(){
  clearTimeout(footprintRefreshTimer);
  footprintRefreshTimer=setTimeout(()=>{footprintRefreshTimer=0;refreshFootprints();},120);
}

function openSpace(x, z, radius = 2) {
  const nearby=collisionCells.get(`${Math.floor(x/cellSize)}:${Math.floor(z/cellSize)}`)||[];
  return !nearby.some(b=>x>b.min.x-radius&&x<b.max.x+radius&&z>b.min.z-radius&&z<b.max.z+radius);
}

function groundAt(x, z) {
  return cachedGroundSample(x,z,terrainHeightCache,(sx,sz)=>{
    terrainGround ||= game.scene.getObjectByName('Connected 35 km terrain');
    if(!terrainGround)return NaN;
    ray.set(down.set(sx,3000,sz),new THREE.Vector3(0,-1,0));ray.far=6000;
    return ray.intersectObject(terrainGround,true)[0]?.point.y??NaN;
  },(sx,sz)=>{
    const cx=Math.floor(sx/cellSize),cz=Math.floor(sz/cellSize),seen=new Set();
    let distance=Infinity,elevation=130;
    for(let zc=cz-2;zc<=cz+2;zc++)for(let xc=cx-2;xc<=cx+2;xc++){
      for(const box of collisionCells.get(`${xc}:${zc}`)||[]){
        if(seen.has(box))continue;seen.add(box);
        const dx=Math.max(box.min.x-sx,0,sx-box.max.x),dz=Math.max(box.min.z-sz,0,sz-box.max.z),d=dx*dx+dz*dz;
        if(d<distance){distance=d;elevation=box.min.y;}
      }
    }
    return elevation;
  });
}

function atlasTile(base, quadrant) {
  const texture=base.clone();
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(.5,.5);
  texture.offset.set(quadrant%2*.5,quadrant<2 ? .5 : 0);
  texture.needsUpdate=true;
  return texture;
}

function buildingHash(id) {
  let hash=2166136261;
  for(const char of String(id))hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return hash>>>0;
}

const vegasNeon = [0xff331a,0xff4820,0xffb85b,0xff2210,0xffd28a];
let cinematicLook=null;
const vegasTints = [0xffffff,0xffd6f3,0xd8fbff,0xfff3c8,0xe6ffd2,0xffdfc8,0xe6ddff,0xd8ffe9,0xffd8e5,0xd6e6ff];


function installVegasNight() {
  if (game.scene.userData.jcVegasNight) return;
  game.scene.userData.jcVegasNight = true;
  cinematicLook=createCinematicLook(game,coarseDevice);
  game.renderFrame=cinematicLook.render;
}

function canvasTexture(draw, width = 256, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function fallbackFacadeTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#160716';
    ctx.fillRect(0, 0, w, h);
    for (let y = 12; y < h; y += 30) {
      for (let x = 8; x < w; x += 36) {
        ctx.fillStyle = ((x + y) % 72) ? '#ff2bd6' : '#16f4ff';
        ctx.fillRect(x, y, 12, 18);
      }
    }
    ctx.strokeStyle = '#fff066';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  });
}

function fallbackMiracleTexture() {
  return canvasTexture((ctx,w,h)=>{
    ctx.clearRect(0,0,w,h);ctx.translate(w/2,h/2);ctx.strokeStyle='#ffe19a';ctx.shadowColor='#ffe19a';ctx.shadowBlur=18;ctx.lineWidth=8;
    ctx.beginPath();ctx.arc(0,0,w*.28,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff4ce';ctx.beginPath();ctx.arc(0,0,w*.08,0,Math.PI*2);ctx.fill();
  },256,256);
}

async function loadTextureSafe(loader, url, fallback) {
  try {
    let expired=false,timer;
    const pending=loader.loadAsync(url).then(texture=>{if(expired){texture.dispose();throw Error('Late texture discarded');}return texture;});
    const texture=await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('Texture load timed out'));},10000);})]).finally(()=>clearTimeout(timer));
    const image=texture.image,maxSize=512;
    if(image&&Math.max(image.width,image.height)>maxSize){
      const ratio=maxSize/Math.max(image.width,image.height),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      texture.image=canvas;texture.needsUpdate=true;
    }
    texture.anisotropy=1;return texture;
  } catch (error) {
    console.warn(`Using fallback texture for ${url}`, error);
    return fallback();
  }
}

function uniqueFacadeTexture(base, ownerId, salt = 0) {
  const hash = buildingHash(`${ownerId}:${salt}`);
  const texture = base.clone();
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  const repeatX = .72 + ((hash >>> 1) % 7) * .11;
  const repeatY = .78 + ((hash >>> 5) % 9) * .1;
  texture.repeat.set(repeatX, repeatY);
  texture.offset.set(((hash >>> 9) % 997) / 997, ((hash >>> 19) % 991) / 991);
  texture.center.set(.5,.5);
  texture.rotation = (((hash >>> 13) % 5) - 2) * .012;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(2, game?.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  texture.needsUpdate = true;
  texture.userData.jcUnique = ownerId;
  return texture;
}

function resolvedBuildingId(mesh, fallback) {
  let ob = mesh;
  while (ob) {
    if (ob.userData?.buildingId) return ob.userData.buildingId;
    ob = ob.parent;
  }
  return fallback || mesh.uuid;
}

function themedFacade(ownerId, redeemed = false) {
  const hash = buildingHash(ownerId);
  const library = redeemed ? restoredTextures : cursedTextures;
  const base = library[hash % library.length] || neutralTexture;
  return base; // Share the GPU image; each building owns its tint and glow.
}

function applyBuildingTheme(mesh, ownerId, redeemed = false) {
  if(mesh.material?.userData?.customTexture) return;
  const hash = buildingHash(ownerId);
  if (!mesh.userData.jcMaterialClone) {
    mesh.material = cloneBuildingMaterial(mesh.material);
    mesh.userData.jcMaterialClone = true;
  }
  const material = mesh.material;
  material.map = themedFacade(ownerId, redeemed);
  material.color.setRGB(.86+((hash>>>8)&31)/230, (redeemed?.82:.74)+((hash>>>15)&31)/250, (redeemed?.80:.68)+((hash>>>22)&31)/240);
  // The bright windows glow; dark masonry stays dark instead of a neon wash.
  material.emissiveMap=material.map;
  const heavenly=redeemed || hash%7===0;
  if(material.emissive)material.emissive.set(heavenly?0xffdf9e:vegasNeon[(hash>>>11)%vegasNeon.length]);
  if ('emissiveIntensity' in material) material.emissiveIntensity = (heavenly?.32:.22)+((hash>>>3)&31)/180;
  material.roughness = redeemed ? .62 : .72;
  material.metalness = .04;
  material.userData.original ??= {};
  material.userData.original.map = material.map;
  material.userData.original.color = material.userData.original.color || new THREE.Color();
  material.userData.original.color.copy(material.color);
  material.userData.wallpapered = true;
  material.userData.jcBuildingId = ownerId;
  material.needsUpdate = true;
}

function restoredMap(id) {
  return themedFacade(id, true);
}

function asphaltTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#191b1f';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const shade = 28 + Math.floor(Math.random() * 28);
      ctx.fillStyle = `rgb(${shade},${shade},${shade + 3})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let y = 0; y < h; y += 48) ctx.fillRect(0, y, w, 2);
  }, 256, 256);
}

function roadStripeMaterial(color, opacity = .9) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}

function addRoadPlane(root, x, z, width, length, rotation, material, y) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rotation;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 2;
  root.add(mesh);
  return mesh;
}

function installPavedRoads(centerX, centerZ) {
  if (game.scene.getObjectByName('JC paved Strip roads')) return;
  const root = new THREE.Group();
  root.name = 'JC paved Strip roads';
  const asphalt = new THREE.MeshStandardMaterial({map:asphaltTexture(), color:0x263043, roughness:.30, metalness:.22});
  asphalt.map.repeat.set(7, 48);
  asphalt.map.needsUpdate = true;
  const yellow = roadStripeMaterial(0xffd24a, .95);
  const white = roadStripeMaterial(0xe8edf1, .75);
  const concrete = new THREE.MeshStandardMaterial({color:0x62636b, roughness:.92});
  const curbMaterial = new THREE.MeshStandardMaterial({color:0xa4a1a0, roughness:.85});
  const lampMaterial = new THREE.MeshStandardMaterial({color:0xffcb81, emissive:0xffa35a, emissiveIntensity:1.4});
  const roads = [
    [centerX, centerZ, 34, 1800, 0],
    [centerX - 86, centerZ, 24, 1500, 0],
    [centerX + 92, centerZ, 24, 1500, 0],
    [centerX, centerZ - 285, 24, 520, Math.PI / 2],
    [centerX, centerZ + 320, 24, 560, Math.PI / 2]
  ];
  for (const [x, z, width, length, rotation] of roads) {
    const alongX = Math.abs(rotation) > .1;
    const pieces = Math.ceil(length / 50);
    const pieceLength = length / pieces;
    for (let i = 0; i < pieces; i++) {
      const offset = (i + .5) * pieceLength - length / 2;
      const px = x + (alongX ? offset : 0);
      const pz = z + (alongX ? 0 : offset);
      const y = groundAt(px, pz) + .12;
      addRoadPlane(root, px, pz, width, pieceLength + .35, rotation, asphalt, y);
      for (const side of [-1, 1]) {
        const sx = px + (alongX ? 0 : side * (width / 2 + 2.3));
        const sz = pz + (alongX ? side * (width / 2 + 2.3) : 0);
        addRoadPlane(root, sx, sz, 3.4, pieceLength + .3, rotation, concrete, y + .09);
        const cx = px + (alongX ? 0 : side * (width / 2 + .35));
        const cz = pz + (alongX ? side * (width / 2 + .35) : 0);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(alongX ? pieceLength + .3 : .48, .22, alongX ? .48 : pieceLength + .3), curbMaterial);
        edge.position.set(cx, y + .06, cz);
        root.add(edge);
        const laneX = px + (alongX ? 0 : side * (width / 2 - 2.5));
        const laneZ = pz + (alongX ? side * (width / 2 - 2.5) : 0);
        if (i % 2 === 0) addRoadPlane(root, laneX, laneZ, .18, pieceLength * .58, rotation, white, y + .025);
      }
      if (i % 2 === 0) addRoadPlane(root, px, pz, .22, pieceLength * .58, rotation, yellow, y + .03);
      if (i % 6 === 0) {
        for (const side of [-1, 1]) {
          const lx = px + (alongX ? 0 : side * (width / 2 + 3.2));
          const lz = pz + (alongX ? side * (width / 2 + 3.2) : 0);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, 7, 6), curbMaterial);
          pole.position.set(lx, y + 3.38, lz);
          root.add(pole);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(.38, 6, 4), lampMaterial);
          bulb.position.set(lx, pole.position.y + 3.6, lz);
          root.add(bulb);
        }
      }
    }
  }
  // Road surfaces follow terrain samples; visual lamps are emissive so mobile
  // renderers do not need a live shadow casting light at every intersection.
  root.userData.semanticGroups = ['ROADS','SIDEWALKS','CURBS','LIGHTING'];
  game.scene.add(root);
}

function clearSpot(x, z) {
  if (openSpace(x, z, 4)) return [x, z];
  for (let radius = 8; radius < 140; radius += 8) {
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
      if (openSpace(px, pz, 4)) return [px, pz];
    }
  }
  return [x, z];
}

function createSouls(x, z) {
  for (const s of souls) game.scene.remove(s);
  souls = [];
  const geometry = new THREE.OctahedronGeometry(.8);
  const material = new THREE.MeshBasicMaterial({color:0xffde7e});
  for (let i = 0; i < 8; i++) {
    const [sx, sz] = clearSpot(x + (i % 2 ? 34 : -34), z + 320 - i * 90);
    const soul = new THREE.Mesh(geometry, material);
    soul.position.set(sx, groundAt(sx, sz) + 1.6, sz);
    soul.userData.baseY = soul.position.y;
    game.scene.add(soul);
    soul.userData.home=soul.position.clone();
    souls.push(soul);
  }
}

function collect(soul) {
  if (!soul.visible) return;
  soul.visible = false;
  soul.userData.collected = true;
  if(!runActive&&!runFinished)runActive=true;
  redeemed++;
  grace = Math.min(100, grace + 15);
  score.textContent = `${redeemed} / ${souls.length}`;
  chain=advanceChain(chain,runTime);
  showPose(redeemed === souls.length ? 12 : 9, redeemed === souls.length ? 2600 : 450);
  ringAt(soul.position,0xffe6a0,5);
  feedback(`LIGHT RESTORED · ${chain.count}× CHAIN · ${chain.points} POINTS`);
  if(lockedSoul===soul)lockedSoul=null;
  if (redeemed === souls.length) {
    runActive=false;runFinished=true;
    const previous=personalBest;
    if(!personalBest||runTime<personalBest){personalBest=runTime;try{localStorage.setItem('jc-restoration-best',String(personalBest));}catch{}}
    score.textContent='STRIP RESTORED';
    feedback(`${runTime.toFixed(1)}s · ${chain.points} points${!previous||runTime<previous?' · PERSONAL BEST':''}`);
  }
}

function dash(charge = true) {
  if (!playing || wheel.classList.contains('open') || dashCooldown > 0 || (charge && grace < 25)) return;
  const direction = desired.lengthSq() ? desired.clone().normalize() : forward.clone();
  moveSafely(direction.x*12,direction.z*12,performance.now()<phaseUntil);
  ringAt(player.position,0xc8eeff,5);
  if (charge) grace -= 25;
  dashCooldown = .8;
}

function beginDive(charge=false) {
  if(!playing||!flying||diving){feedback(flying?'DIVE ALREADY IN PROGRESS':'TAKE FLIGHT BEFORE DIVING');return;}
  if(charge&&grace<16){feedback('Need 16 grace to dive');return;}
  if(charge)grace-=16;
  setFlight('dive');feedback('DIVE · impact changes the street');
}

function resolveDiveImpact() {
  const impact=player.position.clone();
  cinematicLook?.impact(impact);
  const hit=nearbyBuildings(30,3);
  let broken=0;
  for(const ob of hit)if(ob?.userData?.buildingId){game.destroy(ob,'crumble');broken++;}
  if(broken)refreshFootprints();
  for(const soul of souls)if(soul.visible&&soul.position.distanceTo(impact)<20)collect(soul);
  ringAt(impact,0xffc986,broken?36:24);
  npcSystem?.signal('dive-impact',impact,100);
  feedback(broken?`DIVE IMPACT · ${broken} BUILDING${broken===1?'':'S'} CRUMBLED`:'DIVE IMPACT · SHOCKWAVE THROUGH THE STREET');
}

function pulse(charge = true) {
  if (!playing || pulseCooldown > 0 || (charge && grace < 35)) return;
  if (charge) grace -= 35;
  pulseCooldown = 1.5;
  for (const soul of souls) if (soul.visible && soul.position.distanceTo(player.position) < 18) collect(soul);
  const mesh = new THREE.Mesh(new THREE.RingGeometry(.5, 1, 32), new THREE.MeshBasicMaterial({color:0xffe090,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(player.position);
  mesh.position.y += .12;
  game.scene.add(mesh);
  let radius = 1;
  const expand = () => {
    radius += 1.6;
    mesh.scale.setScalar(radius);
    mesh.material.opacity = Math.max(0, 1 - radius / 20);
    if (radius < 20) requestAnimationFrame(expand);
    else {game.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
  };
  requestAnimationFrame(expand);
}

function ringAt(position, color = 0xffe090, max = 20) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(.5, 1, 32), new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(position);
  mesh.position.y += .12;
  game.scene.add(mesh);
  let radius = 1;
  function grow() {
    radius += max / 12;
    mesh.scale.setScalar(radius);
    mesh.material.opacity = Math.max(0, 1 - radius / max);
    if (radius < max) requestAnimationFrame(grow);
    else {game.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
  }
  requestAnimationFrame(grow);
}

function beamTo(destination, color = 0xffe4a4) {
  const from = player.position.clone().add(new THREE.Vector3(0, 2.4, 0));
  const length = from.distanceTo(destination);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.08, .2, length, 8), new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}));
  beam.position.copy(from).add(destination).multiplyScalar(.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), destination.clone().sub(from).normalize());
  game.scene.add(beam);
  setTimeout(() => {game.scene.remove(beam);beam.geometry.dispose();beam.material.dispose();}, 320);
}

function nearbyBuildings(radius, count = 1) {
  return footprints.map(({box,ob}) => ({ob,d:box.distanceToPoint(player.position)}))
    .filter(({ob,d}) => d < radius && ob.userData.buildingId)
    .sort((a,b) => a.d - b.d).slice(0,count).map(({ob}) => ob);
}

function redeem(ob) {
  if (!ob) return false;
  redeemedBuildings.add(ob.userData.buildingId);
  ob.traverse(mesh => {
    if (!mesh.isMesh || !mesh.material?.name?.endsWith('_walls')) return;
    applyBuildingTheme(mesh, ob.userData.buildingId, true);
  });
  ringAt(ob.getWorldPosition(new THREE.Vector3()), 0xffe5a8, 13);
  return true;
}

function moveSouls(mode, radius = 35) {
  for (const soul of souls) {
    if (!soul.visible || soul.position.distanceTo(player.position) > radius) continue;
    const direction = player.position.clone().sub(soul.position).setY(0).normalize();
    const distance = mode === 'repel' ? -25 : mode === 'vortex' ? 18 : 25;
    soul.position.addScaledVector(direction, distance);
    soul.userData.baseY = groundAt(soul.position.x, soul.position.z) + 1.6;
    if (soul.position.distanceTo(player.position) < 3) collect(soul);
  }
}

function rainEffect() {
  const drops = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({color:0x90c6ed,transparent:true,opacity:.8});
  const geometry = new THREE.BoxGeometry(.04, 1.6, .04);
  for (let i=0;i<100;i++) {
    const drop = new THREE.Mesh(geometry, material);
    drop.position.set(player.position.x+(Math.random()-.5)*55,player.position.y+5+Math.random()*25,player.position.z+(Math.random()-.5)*55);
    drop.userData.floor=groundAt(drop.position.x,drop.position.z);
    drops.add(drop);
  }
  game.scene.add(drops);
  const started = performance.now();
  function fall(now) {
    if (now-started > 3000) {game.scene.remove(drops);geometry.dispose();material.dispose();return;}
    for (const drop of drops.children) {drop.position.y-=.9;if(drop.position.y<drop.userData.floor)drop.position.y=player.position.y+25;}
    requestAnimationFrame(fall);
  }
  requestAnimationFrame(fall);
}

function beamDown() {
  if (!flying) return;
  const [x,z]=clearSpot(player.position.x,player.position.z);
  player.position.x=x;player.position.z=z;terrainY=groundAt(x,z);lastGround=performance.now();
  velocity.set(0,0,0);
  setFlight('land');
  showPose(6,700);
  spawnMiracleSprite('beam-down');
  ringAt(player.position, 0xffedb5, 24);
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,Math.max(4,flightHeight),12,1,true),new THREE.MeshBasicMaterial({color:0xffe6a0,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
  marker.position.copy(player.position);
  marker.position.y -= flightHeight/2;
  game.scene.add(marker);
  setTimeout(()=>{game.scene.remove(marker);marker.geometry.dispose();marker.material.dispose();},800);
}

function stabilizeAfterTeleport(){
  if(!game||!player)return;
  playing=true;window.JC_MAP_PLAYING=true;document.body.classList.add('jc-playing');player.visible=true;
  if(game.controls)game.controls.enabled=false;
  snapCameraBehindPlayer();
}
function cameraFocus(){return player.position.clone().add(new THREE.Vector3(0,2.3,0));}
function cameraBoom(distance=9){
  const focus=cameraFocus();
  const horizontal=Math.cos(viewPitch);
  const behind=focus.clone().add(new THREE.Vector3(-Math.sin(yaw)*horizontal*distance,3-Math.sin(viewPitch)*distance,Math.cos(yaw)*horizontal*distance));
  const line=new THREE.Line3(focus,behind);
  for(let t=.08;t<=1;t+=.08){
    const point=line.at(t,new THREE.Vector3());
    if(blockedAt(point.x,point.y,point.z,.35))return line.at(Math.max(.04,t-.08),new THREE.Vector3());
  }
  return behind;
}
function snapCameraBehindPlayer(){
  if(!game||!player)return;
  const focus=cameraFocus(), behind=cameraBoom(9);
  game.camera.position.copy(behind);game.camera.lookAt(focus);game.controls?.target?.copy(focus);
}
function teleport(distance = 75) {
  if(!game||!player){feedback('3D city is still loading');return;}
  try{
    const chosen=teleportTarget?.clone();
    if(chosen){
      if(!Number.isFinite(chosen.x)||!Number.isFinite(chosen.z)){teleportTarget=null;clearTeleportMarker();feedback('Choose another landing point');return;}
      if(!flying&&(!openSpace(chosen.x,chosen.z,2)||blockedAt(chosen.x,chosen.y,chosen.z,2))){teleportTarget=null;clearTeleportMarker();feedback('That destination is blocked');return;}
      clearTeleportMarker();teleportTarget=null;ringAt(player.position,0xaadcfb,8);player.position.x=chosen.x;player.position.z=chosen.z;terrainY=groundAt(chosen.x,chosen.z);lastGround=performance.now();player.position.y=terrainY+flightHeight;velocity.set(0,0,0);ringAt(player.position,0xaadcfb,12);castingUntil=performance.now()+400;stabilizeAfterTeleport();feedback('TELEPORTED · 3D gameplay resumed');return;
    }
    const direction = desired.lengthSq() ? desired.clone().normalize() : forward.clone();
    let point = player.position.clone();
    for (let step=distance;step>3;step-=3) {
      const next = player.position.clone().addScaledVector(direction,step);
      if ((flying ? !blockedAt(next.x,groundAt(next.x,next.z)+flightHeight,next.z,2) : openSpace(next.x,next.z,2)) && Number.isFinite(groundAt(next.x,next.z))) {point=next;break;}
    }
    ringAt(player.position,0xaadcfb,8);player.position.x=point.x;player.position.z=point.z;terrainY=groundAt(point.x,point.z);lastGround=performance.now();player.position.y=terrainY+flightHeight;velocity.set(0,0,0);ringAt(player.position,0xaadcfb,8);castingUntil=performance.now()+400;stabilizeAfterTeleport();
  }catch(error){console.error('JC teleport recovered',error);teleportTarget=null;clearTeleportMarker();stabilizeAfterTeleport();feedback('Teleport recovered · 3D gameplay restored');}
}

function cast(id = selectedAbility) {
  if (!playing || wheel.classList.contains('open')) return;
  const ability = abilities.find(a=>a.id===id);
  if (!ability) return;
  if(id==='teleport'&&!teleportTarget){beginTeleportTarget();return;}
  if((cooldowns.get(id)||0)>performance.now()){feedback('Miracle recharging');return;}
  if(grace<ability.cost){feedback(`Need ${ability.cost} grace · release boost to recover`);return;}
  if((id==='heavenly-spear'||id==='judgment-storm')&&!lockedBuilding&&!nearbyBuildings(id==='heavenly-spear'?105:140,1).length){feedback('No building in range');return;}
  feedback(ability.name);
  const flightAbilities=new Set(['flight','hypersonic','hover','leap','glide','sky-lift','skydive','beam-down']);
  if(!flightAbilities.has(id))showPose(miraclePose[id] ?? 5, id === 'redemption-wave' ? 2400 : 800);
  spawnMiracleSprite(id);
  if(!runActive&&!runFinished)runActive=true;
  npcSystem?.signal(id,player.position,id==='redemption-wave'?120:85);
  grace-=ability.cost;
  cooldowns.set(id,performance.now()+ability.cooldown*1000);
  if(!flightAbilities.has(id))castingUntil=performance.now()+450;
  const near=(radius=55,count=1)=>nearbyBuildings(radius,count);
  const strike=(radius=55,count=1)=>{for(const ob of near(radius,count)){beamTo(ob.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,ob.userData.heightMetres*.4,0)));redeem(ob);}};
  switch(id) {
    case 'flight':if(flying)beamDown();else setFlight('takeoff');break;
    case 'hypersonic':setFlight('boost');break;
    case 'teleport':teleport();break;
    case 'beam-down':beamDown();break;
    case 'dash':dash(false);break;
    case 'hover':setFlight('hover');break;
    case 'leap':setFlight('leap');break;
    case 'glide':setFlight('glide');break;
    case 'sky-lift':setFlight('sky-lift');break;
    case 'skydive':beginDive(false);break;
    case 'phase-step':phaseUntil=performance.now()+2200;ringAt(player.position,0x8ddfff,9);break;
    case 'recall':player.position.copy(spawnPoint);setFlight('recall');ringAt(player.position);break;
    case 'time-step':timeScaleUntil=performance.now()+3500;ringAt(player.position,0x9afaff,14);break;
    case 'light-pulse':pulse(false);break;
    case 'divine-beam':strike(110);ringAt(player.position,0xfff0bd,18);break;
    case 'chain-light':strike(100,4);ringAt(player.position,0x9bdcff,24);break;
    case 'radiance-nova':near(56,8).forEach(redeem);ringAt(player.position,0xffe6af,58);cinematicLook?.impact(player.position);break;
    case 'shield':shieldUntil=performance.now()+6000;ringAt(player.position,0x9fefff,15);break;
    case 'heal':grace=Math.min(100,grace+45);ringAt(player.position,0xbaffd8,12);break;
    case 'cleanse':near(45).forEach(redeem);break;
    case 'reveal':revealUntil=performance.now()+6000;near(75,25).forEach(ob=>{for(const m of ob.children)if(m.material?.name?.endsWith('_walls')){m.material.emissive.set(0xff6666);m.material.emissiveIntensity=.3;setTimeout(()=>{m.material.emissiveIntensity=redeemedBuildings.has(ob.userData.buildingId)?.12:0;},6000);}});break;
    case 'sunrise':sunriseUntil=performance.now()+7000;cinematicLook?.setSunrise(true);ringAt(player.position,0xffda8b,40);break;
    case 'sanctuary':sanctuaryUntil=performance.now()+7000;ringAt(player.position,0xc4ffee,22);break;
    case 'restore':near(60,3).forEach(redeem);break;
    case 'grace-surge':graceSurgeUntil=performance.now()+8000;ringAt(player.position,0xffdfa6,14);break;
    case 'shockwave':near(40,5).forEach(redeem);ringAt(player.position,0xffd18b,42);cinematicLook?.impact(player.position);break;
    case 'rain':rainEffect();break;
    case 'lightning':strike(130,3);ringAt(player.position,0xaed8ff,24);cinematicLook?.impact(player.position);break;
    case 'telekinesis':{const ob=near(40)[0];if(ob){const p=ob.getWorldPosition(new THREE.Vector3());beamTo(p,0x9bdcff);ringAt(p,0x9bdcff,16);const original=ob.position.y;ob.position.y+=5;setTimeout(()=>{ob.position.y=original;refreshFootprints();},900);}break;}
    case 'crumble':{const ob=lockedBuilding||near(55)[0];if(!ob){feedback('No building in range');break;}const point=ob.getWorldPosition(new THREE.Vector3());game.destroy(ob,'crumble');cinematicLook?.impact(point);refreshFootprints();ringAt(point,0xffc38e,26);feedback(`${ob.userData.buildingId} CRUMBLED · debris falling`);lockedBuilding=null;break;}
    case 'rebuild':{const ob=lockedBuilding||near(55)[0];if(ob){game.rebuild(ob);refreshFootprints();redeem(ob);feedback(`${ob.userData.buildingId} REBUILT`);lockedBuilding=null;}break;}
    case 'bless':near(45).forEach(redeem);break;
    case 'exorcise':near(65,5).forEach(redeem);break;
    case 'stasis':stasisUntil=performance.now()+6000;ringAt(player.position,0x9fd9ff,25);break;
    case 'vortex':moveSouls('vortex',50);ringAt(player.position,0xaedaff,30);break;
    case 'repel':moveSouls('repel',40);ringAt(player.position,0xffb992,30);break;
    case 'attract':moveSouls('attract',55);ringAt(player.position,0xffe6b0,40);break;
    case 'slow-time':timeScaleUntil=performance.now()+7000;ringAt(player.position,0xb9d8ff,30);break;
    case 'redemption-wave':near(105,8).forEach(redeem);ringAt(player.position,0xffe7b1,105);cinematicLook?.impact(player.position);break;
    case 'heavenly-spear':{const ob=lockedBuilding||near(105)[0];if(!ob){feedback('No building in range');break;}const point=ob.getWorldPosition(new THREE.Vector3());point.y+=Math.max(5,ob.userData.heightMetres*.55);beamTo(point,0xffe6a5);game.destroy(ob,'explode');refreshFootprints();cinematicLook?.impact(point);ringAt(point,0xffe6a5,34);ringAt(player.position,0xfff4ce,17);feedback(`${ob.userData.buildingId} · HEAVENLY SPEAR`);lockedBuilding=null;break;}
    case 'judgment-storm':{const targets=near(140,3);if(!targets.length){feedback('No buildings in range');break;}for(const ob of targets){const point=ob.getWorldPosition(new THREE.Vector3());point.y+=Math.max(5,ob.userData.heightMetres*.45);beamTo(point,0xb6dcff);game.destroy(ob,'crumble');ringAt(point,0xc4e6ff,24);}refreshFootprints();cinematicLook?.impact(player.position);ringAt(player.position,0xaed8ff,55);feedback(`JUDGMENT STORM · ${targets.length} IMPACTS`);break;}
    case 'singularity':moveSouls('vortex',85);timeScaleUntil=performance.now()+1800;ringAt(player.position,0x9bdcff,72);feedback('SINGULARITY · everything pulled into the moment');break;
    case 'sonic-boom':{setFlight('boost');const direction=desired.lengthSq()?desired.clone().normalize():forward.clone();moveSafely(direction.x*22,direction.z*22,performance.now()<phaseUntil);velocity.addScaledVector(direction,24);const point=player.position.clone();cinematicLook?.impact(point);ringAt(point,0xbceaff,36);npcSystem?.signal('sonic-boom',point,110);feedback('SONIC BOOM · HYPERFLIGHT');break;}
  }
  graceLabel.textContent=Math.round(grace);
}

function renderWheel() {
  hud.querySelector('.jc-groups').replaceChildren(...['Travel','Light','World'].map(group=>{
    const button=document.createElement('button');button.textContent=group;button.setAttribute('aria-pressed',String(group===selectedGroup));button.onclick=()=>{selectedGroup=group;renderWheel();};return button;
  }));
  hud.querySelector('.jc-list').replaceChildren(...abilities.filter(a=>a.group===selectedGroup).map(a=>{
    const button=document.createElement('button');button.className=a.id===selectedAbility?'selected':'';
    button.innerHTML=`${a.name}<small>${a.cost} grace · ${a.cooldown}s cooldown</small>`;button.style.backgroundImage=`url('./miracles/${a.id}.webp')`;
    button.onclick=()=>{selectedAbility=a.id;hud.querySelector('#jcSelected').textContent=a.name;wheel.classList.remove('open');renderWheel();};
    return button;
  }));
}

function setMode(play) {
  if (play && (!game || !player)) {
    startQueued = true;
    playReturn.textContent = 'LOADING JC...';
    return;
  }
  if (!play) conversation.close({restoreFocus:false});
  playing = play;
  if(player)cinematicLook?.update(0,performance.now(),player.position,velocity,false,false,play);
  npcSystem?.setVisible(play);
  window.JC_MAP_PLAYING = play;
  document.body.classList.toggle('jc-playing', play);
  if (game.controls) game.controls.enabled = !play;
  player.visible = play;
  souls.forEach(s => s.visible = play && !s.userData.collected);
  resetInput();
  wheel.classList.remove('open');
  velocity.set(0, 0, 0);
  if (play) {
    feedback('Restore 8 lights · L / TARGET tracks the next light');
    snapCameraBehindPlayer();
  } else {
    game.controls?.target?.copy(player.position);
    game.camera.position.copy(player.position).add(new THREE.Vector3(240, 400, 600));
    game.controls?.update?.();
  }
};
playReturn.onclick = () => setMode(true);

function frameStep(now) {
  if (conversation.isOpen) {last=now;return;}
  const elapsed = Math.max(0, now - last);
  const dt = Math.min(.045, elapsed / 1000);
  last = now;
  if (document.hidden) {frameWindow = now; return;}
  // Hysteresis prevents resolution oscillation as tiles stream into view.
  if (playing) {
    slowFrames += elapsed > 22 ? 1 : 0;
    steadyFrames += elapsed > 0 && elapsed < 17.5 ? 1 : 0;
    if (now - frameWindow > 2500) {
      const next = slowFrames > 28 ? Math.max(.6, adaptiveDpr - .15)
        : steadyFrames > 100 ? Math.min(maximumDpr, adaptiveDpr + .05) : adaptiveDpr;
      if (next !== adaptiveDpr) {adaptiveDpr = next;game.renderer.setPixelRatio(adaptiveDpr);}
      slowFrames = steadyFrames = 0; frameWindow = now;
    }
  }
  if (!playing) return;
  const paused=wheel.classList.contains('open');
  const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);
  analog.x=stickAxis(touchStick.x,.12);analog.y=stickAxis(touchStick.y,.12);
  let lookX=stickAxis(touchLookStick.x,.12),lookY=stickAxis(touchLookStick.y,.12);
  if(pad){
    if(!paused){
      analog.x=THREE.MathUtils.clamp(analog.x+stickAxis(pad.axes[0]||0),-1,1);
      analog.y=THREE.MathUtils.clamp(analog.y+stickAxis(pad.axes[1]||0),-1,1);
      lookX=THREE.MathUtils.clamp(lookX+stickAxis(pad.axes[2]||0),-1,1);
      lookY=THREE.MathUtils.clamp(lookY+stickAxis(pad.axes[3]||0),-1,1);
      for(const [button,key] of [[6,'Control'],[7,'Space'],[10,'Shift'],[11,'b']]){if(pad.buttons[button]?.pressed)padKeys.add(key);else padKeys.delete(key);}
    }
    for(const [button,id] of [[0,'flight'],[1,selectedAbility],[2,'dash'],[3,'teleport'],[4,'target'],[5,'hypersonic'],[8,'wheel']]){
      if(pad.buttons[button]?.pressed&&!gamepadButtons[button]){if(id==='wheel')toggleWheel();else if(!paused){if(id==='target')cycleTarget();else cast(id);}}
    }
    gamepadButtons=pad.buttons.map(button=>button.pressed);
  }else{padKeys.clear();gamepadButtons=[];}
  if(wheel.classList.contains('open')){velocity.set(0,0,0);return;}
  const look=advanceLook(yaw,viewPitch,lookX,lookY,dt);
  yaw=look.yaw;viewPitch=look.pitch;
  if(runActive)runTime+=elapsed/1000;
  dashCooldown = Math.max(0, dashCooldown - dt);
  pulseCooldown = Math.max(0, pulseCooldown - dt);
  forward.set(Math.sin(yaw), 0, -Math.cos(yaw));
  setFlightForward(flightForward,yaw,viewPitch);
  right.set(Math.cos(yaw), 0, Math.sin(yaw));
  const travelForward=flying?flightForward:forward;
  desired.set(0, 0, 0);
  if (keys.has('w') || padKeys.has('w') || keys.has('ArrowUp')) desired.add(travelForward);
  if (keys.has('s') || padKeys.has('s') || keys.has('ArrowDown')) desired.sub(travelForward);
  if (keys.has('d') || padKeys.has('d') || keys.has('ArrowRight')) desired.add(right);
  if (keys.has('a') || padKeys.has('a') || keys.has('ArrowLeft')) desired.sub(right);
  desired.addScaledVector(travelForward,-analog.y).addScaledVector(right,analog.x);
  const riseHeld=keys.has('e')||keys.has('Space')||padKeys.has('Space');
  const dropHeld=keys.has('c')||keys.has('Control')||padKeys.has('Control');
  if(flying){if(riseHeld)desired.y+=1;if(dropHeld)desired.y-=1;}else desired.y=0;
  if (desired.lengthSq()>1) desired.normalize();
  if(!runActive&&!runFinished&&(desired.lengthSq()>.02||flightHeight>0)){runActive=true;}
  const braking=keys.has('b')||padKeys.has('b');
  const sprint = !flying && (keys.has('Shift')||padKeys.has('Shift')) && grace > 0 && desired.lengthSq() > 0;
  const boost = hypersonic && flying && grace > 0 && !braking;
  grace = THREE.MathUtils.clamp(grace + (boost ? -24 : sprint ? -20 : now < graceSurgeUntil ? 24 : now < sanctuaryUntil ? 19 : now < shieldUntil ? 17 : 12) * dt, 0, 100);
  if (boost && grace <= 0) hypersonic=false;
  const speed=(diving?34:boost?72:flying?24:sprint?9:4.8)*(now<timeScaleUntil?1.5:1);
  const steering = braking?38:desired.lengthSq()<.01?(flying?10:24):flying?(boost?20:28):32;
  velocity.x+=(desired.x*(braking?0:speed)-velocity.x)*response(steering,dt);
  velocity.z+=(desired.z*(braking?0:speed)-velocity.z)*response(steering,dt);
  velocity.y+=(desired.y*(braking?0:speed)-velocity.y)*response(braking?38:flying?steering:24,dt);
  moveSafely(velocity.x*dt,velocity.z*dt,now<phaseUntil);
  const previousHeight=flightHeight;
  if (flying) {
    if (diving){flightHeight=Math.max(0,flightHeight-110*dt);velocity.y=0;}
    else if (glide&&!riseHeld&&!dropHeld){flightHeight=Math.max(2,flightHeight-2*dt);velocity.y=0;}
    else flightHeight=THREE.MathUtils.clamp(flightHeight+velocity.y*dt,0,250);
  } else if (flightHeight>0){flightHeight=Math.max(0,flightHeight-(descending?80:28)*dt);velocity.y=0;}
  if(flightHeight===250&&velocity.y>0)velocity.y=0;
  if(!diving&&flightHeight<previousHeight&&blockedAt(player.position.x,terrainY+flightHeight,player.position.z)){flightHeight=previousHeight;velocity.y=0;}
  if(diving&&flightHeight<=0){setFlight('impact');velocity.multiplyScalar(.28);resolveDiveImpact();}
  else if(flying&&(dropHeld||(previousHeight>0&&flightHeight===0&&velocity.y<0))){setFlight('touchdown');velocity.y=0;}
  if (flightHeight===0) descending=0;
  if (now - lastGround > (flying ? 400 : 180)) {
    terrainY=groundAt(player.position.x,player.position.z);
    lastGround = now;
  }
  player.position.y=THREE.MathUtils.lerp(player.position.y,terrainY+flightHeight,Math.min(1,dt*(descending?14:8)));
  const riseInput=flying&&((keys.has('e')||keys.has('Space')||padKeys.has('Space'))||desired.y>.25);
  const dropInput=flying&&((keys.has('c')||keys.has('Control')||padKeys.has('Control'))||desired.y<-.25);
  const lateral=desired.dot(right);
  const flightPose=diving?19:braking?21:riseInput?18:dropInput?22:glide?17:lateral<-.25?15:lateral>.25?16:boost?20:horizontalFlightPose();
  const horizontalSpeed=Math.hypot(velocity.x,velocity.z);
  if(!flying&&horizontalSpeed>.2)playerStepPhase=advanceGait(playerStepPhase,horizontalSpeed,dt,sprint);
  const locomotionPose=horizontalSpeed>1.1?(sprint?runPoseSet:walkPoseSet)[Math.floor(playerStepPhase)]:0;
  const basePose=flying?flightPose:locomotionPose;
  const pose=now<poseOverrideUntil?poseOverride:(now<castingUntil?5:basePose);
  if (pose !== poseIndex) poseIndex=pose;
  portrait.userData.character.setPose(pose,playerStepPhase,horizontalSpeed,now,flying);
  applyCharacterFrame(pose);
  if(realisticAvatar){
    const bank=flying?THREE.MathUtils.clamp(-lateral*.16,-.16,.16):0;
    realisticAvatar.material.rotation=THREE.MathUtils.lerp(realisticAvatar.material.rotation,bank,response(8,dt));
    realisticAvatar.position.y=realisticAvatar.scale.y*.5+(flying?Math.sin(now*.004)*.06:0);
  }
  portrait.rotation.y=Math.PI+yaw;
  portrait.position.y = velocity.lengthSq() > 1 && !flying ? Math.sin(now * .014) * .035 : 0;
  for (const s of souls) {
    if (!s.visible) continue;
    if(now>stasisUntil) {s.rotation.y += dt * 1.6;s.position.y = s.userData.baseY + Math.sin(now * .002 + s.position.z) * .25;}
    if (s.position.distanceTo(player.position.clone().add(new THREE.Vector3(0,1.6,0))) < 3.4) collect(s);
  }
  npcSystem?.update(dt,now);
  nearNpc=closestNpc();npcTalkButton.classList.toggle('available',coarseDevice&&!!nearNpc&&!talk.classList.contains('open'));npcTalkButton.textContent=nearNpc?`TALK TO ${nearNpc.name.toUpperCase()}`:'TALK';npcReadout.textContent=talk.classList.contains('open')?npcReadout.textContent:(nearNpc?`NEAR ${nearNpc.name.toUpperCase()} · ${nearNpc.faction.toUpperCase()} · PRESS C TO TALK`:`${npcSystem?.npcs.length||0} LIVING NPCS · MOVE CLOSE TO TALK`);
  graceLabel.textContent = Math.round(grace);
  stateLabel.textContent=teleportAim?'CHOOSE DESTINATION':diving?'DIVE':braking?'BRAKING':hypersonic?'HYPERFLIGHT':flying&&flightHeight<9?'HOVER':flying&&glide?'GLIDE':flying?'CRUISE':flightHeight>0?'LANDING':'GROUNDED';
  cinematicLook?.setSunrise(now<sunriseUntil);
  cinematicLook?.update(dt,now,player.position,velocity,flying,boost,playing);
  const focus = cameraFocus();
  // Same rear offset in every movement mode; only walls shorten the boom.
  game.camera.position.copy(cameraBoom(9));
  game.camera.lookAt(focus);
  if(game.camera.fov!==62){game.camera.fov=62;game.camera.updateProjectionMatrix();}
  game.controls?.target?.copy(focus);
  if(now>nextHud){
    nextHud=now+100;
    feedbackLabel.style.opacity=now<feedbackUntil?'1':'0';
    const ability=abilities.find(a=>a.id===selectedAbility),remaining=Math.max(0,((cooldowns.get(selectedAbility)||0)-now)/1000);
    hud.querySelector('#jcAbilityReady').textContent=remaining?`Recharging ${remaining.toFixed(1)}s`:grace<ability.cost?`Need ${ability.cost} grace`:`Ready · ${ability.cost} grace`;
    flightLabel.textContent=`${Math.round(velocity.length()*3.6)} km/h · ${Math.round(flightHeight)} m${braking?' · BRAKING':''}`;
    runLabel.textContent=runFinished?`${runTime.toFixed(1)}s · ${chain.points} pts · Best ${personalBest.toFixed(1)}s`:`${runTime.toFixed(1)}s · ${chain.points} pts${personalBest?' · Best '+personalBest.toFixed(1)+'s':''}`;
    const target=lockedSoul||souls.filter(s=>!s.userData.collected).sort((a,b)=>a.position.distanceToSquared(player.position)-b.position.distanceToSquared(player.position))[0];
    if(target){
      const point=target.position.clone().project(game.camera),meters=Math.round(target.position.distanceTo(player.position));
      const onScreen=point.z<1&&Math.abs(point.x)<.9&&Math.abs(point.y)<.8;
      targetLabel.style.left=onScreen?`${(point.x+1)*50}%`:'50%';targetLabel.style.top=onScreen?`${(1-point.y)*50}%`:'45%';
      const bearing=Math.atan2(target.position.x-player.position.x,-(target.position.z-player.position.z));
      const delta=Math.atan2(Math.sin(bearing-yaw),Math.cos(bearing-yaw));
      targetLabel.innerHTML=`<b>${onScreen?'◇':Math.abs(delta)>2.4?'↶':delta>0?'→':'←'}</b>${lockedSoul?'TRACKED':'NEXT LIGHT'} · ${meters} m${meters<18?' · Q PULSE':''}`;
    }else targetLabel.textContent='';
  }
  const tiles=game.tileRevision?.()??[...game.loaded.keys()].join(',');
  if(tiles!==lastTiles){lastTiles=tiles;queueFootprintRefresh();}
}
function frame(now){
  requestAnimationFrame(frame);
  try{frameStep(now);}catch(error){
    console.error('JC runtime frame recovered',error);
    window.JC_RUNTIME_ERROR=error?.message||String(error);
    try{resetInput();teleportTarget=null;clearTeleportMarker();stabilizeAfterTeleport();feedback('3D recovered · gameplay continues');}catch{}
  }
}

game = await studioReady;
await game.ready;
if(!game.loaded.has('C15_R14'))throw Error('The Strip has not loaded. Retry the 3D city.');
installVegasNight();
const imageLoader=new THREE.TextureLoader();
const generatedFacades=await Promise.all(Array.from({length:16},(_,i)=>loadTextureSafe(imageLoader, `./facades/vegas-cell-${String(i).padStart(2,'0')}.webp`, fallbackFacadeTexture)));
neutralTexture=generatedFacades[7];
cursedTextures=await loadPhotoFacades().catch(()=>generatedFacades.slice(0,9));
restoredTextures=generatedFacades.slice(9);
for(const texture of generatedFacades){
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(1,1);
  texture.anisotropy=Math.min(4,game.renderer.capabilities.getMaxAnisotropy());
}
  // Ability art loads the first time that miracle is used instead of blocking startup.

// Tile groups and wall materials are built asynchronously by the city loader.
function wallpaperStrip() {
  for (const [id, group] of game.loaded) {
    if (group.userData.jcThemeApplied) continue;
    let buildingIndex = 0;
    group.traverse(ob => {
      if (!ob.isMesh || !ob.material?.name?.endsWith('_walls')) return;
      const ownerId = resolvedBuildingId(ob, `${id}:vegas-tower-${buildingIndex++}`);
      applyBuildingTheme(ob, ownerId, redeemedBuildings.has(ownerId));
    });
    group.userData.jcThemeApplied = true;
  }
}
setInterval(wallpaperStrip, 500);

// This anchor is the center of the map's actual C15_R14 Strip tile.
const strip = game.loaded.get('C15_R14');
if (!strip) {
  try {
    await game.loadArea('C15_R14', matchMedia('(pointer:coarse), (max-width:800px)').matches ? 0 : 1, false);
  } catch (error) {
    console.warn('C15_R14 stream failed; starting JC fallback play area', error);
  }
}
const group = game.loaded.get('C15_R14');
{
  wallpaperStrip();
  refreshFootprints();
  const tile = group?.userData?.origin;
  const originX = game.origin?.[0] ?? 0;
  const originZ = game.origin?.[1] ?? 0;
  const targetX = tile ? tile.originEasting + 500 - originX : 0;
  const targetZ = tile ? originZ - (tile.originNorthing + 500) : 0;
  const [x, z] = clearSpot(targetX, targetZ);
  installPavedRoads(targetX, targetZ);
  player = new THREE.Group();
  portrait = createCharacter3D({faction:'angel',player:true});
  // Use the photoreal JC cutout as the visible in-world avatar. The articulated
  // 3D rig remains attached for collision/pose state, but is hidden so the
  // player never sees the placeholder low-poly body.
  portrait.visible = false;
  player.add(portrait);
  const realisticTexture = await loadTextureSafe(imageLoader,'./jc-realistic.webp',fallbackMiracleTexture);
  realisticTexture.colorSpace = THREE.SRGBColorSpace;
  const realisticMaterial = new THREE.SpriteMaterial({map: realisticTexture, transparent:true, depthWrite:false, depthTest:true});
  realisticAvatar = new THREE.Sprite(realisticMaterial);
  realisticAvatar.name = 'JC realistic player avatar';
  realisticAvatar.scale.set(2.42, 3.63, 1);
  realisticAvatar.position.set(0, 1.82, 0);
  realisticAvatar.renderOrder = 4;
  player.add(realisticAvatar);
  loadCharacterFrames();
  terrainY=groundAt(x,z);
  player.position.set(x, terrainY, z);
  spawnPoint=player.position.clone();
  game.scene.add(player);
  createSouls(x, z);
  npcSystem=createNpcSystem({scene:game.scene,player,groundAt,isSafe:(x,z,r=2)=>!blockedAt(x,terrainY+1.55,z,r),count:coarseDevice?8:(window.JC_NPC_COUNT||12),onReport:text=>{npcReadout.textContent=text;}});
  npcReadout.textContent=`${npcSystem.npcs.length} LIVING NPCS · MOVE CLOSE TO TALK`;
  npcReadout.style.cursor='pointer';npcReadout.setAttribute('role','button');npcReadout.tabIndex=0;npcReadout.onclick=()=>openNpcTalk();npcReadout.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openNpcTalk();}};
  hud.querySelector('#jcEditor').onclick = () => setMode(false);
  playReturn.onclick = () => setMode(true);
  addEventListener('keydown', e => {
    if (conversation.isOpen || !playing || e.target.closest('input,select,textarea')) return;
    if(e.target.closest('button')&&(e.code==='Space'||e.code==='Enter'))return;
    if(wheel.classList.contains('open')){if(e.code==='Tab'||e.code==='Escape'){e.preventDefault();toggleWheel();}return;}
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['w','a','s','d','e','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift','b'].includes(key)) keys.add(key);
    if(e.code==='Space'||e.code.startsWith('Control')){keys.add(e.code==='Space'?'Space':'Control');e.preventDefault();}
    if(e.code==='KeyC'&&!e.repeat){e.preventDefault();if(conversation.isOpen)conversation.close();else openNpcTalk();return;}
    if(e.code==='KeyL'&&!e.repeat)cycleTarget();
    if(e.code==='KeyK'&&!e.repeat)cycleBuildingTarget();
    if (e.code === 'Space' && !e.repeat && !flying) dash();
    if (e.code === 'KeyQ' && !e.repeat) cast();
    if (e.code === 'KeyF' && !e.repeat) cast('flight');
    if (e.code === 'KeyG' && !e.repeat) cast('hypersonic');
    if (e.code === 'KeyV' && !e.repeat) beginDive(true);
    if (e.code === 'KeyT' && !e.repeat) {if(teleportAim)cast('teleport');else beginTeleportTarget();}
    if (e.code === 'KeyR' && !e.repeat) cast('beam-down');
    if (e.code === 'KeyZ' && !e.repeat) cast('light-pulse');
    if (e.code === 'KeyH' && !e.repeat) cast('shield');
    if (e.code === 'KeyX' && !e.repeat) cast('crumble');
    if (e.code === 'Comma' && !e.repeat) cast('rain');
    if (e.code === 'Digit0' && !e.repeat) cast('rebuild');
    if (e.code === 'Tab' && !e.repeat){e.preventDefault();toggleWheel();}
    if (e.code === 'Escape')wheel.classList.remove('open');
  });
  addEventListener('keyup', e => {keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);if(e.code==='Space')keys.delete('Space');if(e.code.startsWith('Control'))keys.delete('Control');});
  addEventListener('blur', resetInput);
  document.addEventListener('visibilitychange',()=>{resetInput();last=performance.now();});
  game.renderer.domElement.addEventListener('pointerdown', e => {
    if (!playing) return;
    if(teleportAim){e.preventDefault();chooseTeleportPoint(e.clientX,e.clientY);return;}
    dragging = true;lookPointer=e.pointerId;game.renderer.domElement.setPointerCapture(e.pointerId);pointerX = e.clientX;pointerY = e.clientY;
  });
  for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>{if(e.pointerId===lookPointer){dragging=false;lookPointer=null;}});
  addEventListener('pointermove', e => {
    if (!dragging || !playing || e.pointerId!==lookPointer) return;
    yaw += (e.clientX - pointerX) * (coarseDevice ? 0.0034 : 0.0025);
    viewPitch=THREE.MathUtils.clamp(viewPitch-(e.clientY-pointerY)*.0025,-.62,.62);
    pointerX = e.clientX;pointerY = e.clientY;
  });
  hud.querySelectorAll('[data-move]').forEach(button => {
    const key = button.dataset.move;
    button.addEventListener('pointerdown', e => {e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(key);});
    for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, () => keys.delete(key));
  });
  const stick=hud.querySelector('#jcStick'),lookStick=hud.querySelector('#jcLookStick');
  function readStick(e,element,state,pointer){
    if(e.pointerId!==pointer)return;
    const r=element.getBoundingClientRect(),travel=r.width*.30;
    let x=(e.clientX-r.left-r.width/2)/travel,y=(e.clientY-r.top-r.height/2)/travel;
    const magnitude=Math.hypot(x,y);if(magnitude>1){x/=magnitude;y/=magnitude;}
    state.x=x;state.y=y;
    element.querySelector('i').style.transform=`translate(${x*travel}px,${y*travel}px)`;
  }
  for(const [element,state,isLook] of [[stick,touchStick,false],[lookStick,touchLookStick,true]]){
    const pointer=()=>isLook?lookStickPointer:stickPointer;
    const begin=e=>{e.preventDefault();if(isLook)lookStickPointer=e.pointerId;else stickPointer=e.pointerId;element.setPointerCapture(e.pointerId);readStick(e,element,state,e.pointerId);};
    const move=e=>readStick(e,element,state,pointer());
    const end=e=>{if(e.pointerId!==pointer())return;if(isLook)lookStickPointer=null;else stickPointer=null;state.x=state.y=0;element.querySelector('i').style.transform='';};
    element.addEventListener('pointerdown',begin);element.addEventListener('pointermove',move);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,end);
  }
  hud.querySelector('#jcRestart').onclick=()=>{resetRun();hud.querySelector('#jcRestart').blur();};
  hud.querySelector('[data-action="boost"]').onclick=()=>cast('hypersonic');
  hud.querySelector('[data-action="dive"]').onclick=()=>beginDive(true);
  hud.querySelector('[data-action="lock"]').onclick=cycleTarget;
  hud.querySelector('[data-action="fly"]').onclick=()=>cast('flight');
  hud.querySelector('[data-action="land"]').onclick=()=>cast('beam-down');
  hud.querySelector('[data-action="teleport"]').onclick=()=>{if(teleportAim)cast('teleport');else beginTeleportTarget();};
  hud.querySelector('[data-action="cast"]').onclick=()=>cast();
  hud.querySelector('[data-action="wheel"]').onclick=()=>toggleWheel();
  const moreButton=hud.querySelector('[data-action="more"]'),extras=hud.querySelector('.jc-extras');
  moreButton.onclick=()=>{const open=extras.classList.toggle('open');moreButton.setAttribute('aria-expanded',String(open));moreButton.textContent=open?'LESS':'MORE';};
  hud.querySelector('#jcWheelClose').onclick=()=>wheel.classList.remove('open');
  renderWheel();
  playReturn.textContent = 'PLAY AS JC';
  setMode(startQueued || new URLSearchParams(location.search).get('play') === '1');
  window.JC_PLAYER_READY=true;document.getElementById('jcRecovery')?.remove();
  requestAnimationFrame(frame);
}
