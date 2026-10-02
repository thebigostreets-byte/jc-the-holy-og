import {loadPhotoFacades} from './photo-facades.js';
import {createCinematicLook} from './cinematic-look.js';
import * as THREE from './three.module.js';
import {cloneBuildingMaterial} from './map-materials.js';

import {stickAxis, response, advanceChain, advanceGait, advanceLook, setFlightForward} from './jc-control-math.js';
import {transitionFlight,shouldTouchDown} from './jc-flight-state.js';
import {createMiracleEffects} from './jc-miracle-effects.js';
import {loadRearWalk,loadPoseSheet,FLIGHT_CELLS} from './rear-walk.js';
import {cachedGroundSample} from './ground-sampling.js';
import {createNpcSystem} from './jc-npcs.js';
import {createNpcConversation} from './npc-conversation.js';
import {createCharacter3D} from './jc-character3d.js';
import {cleanPoseImage,POSE_FRAME_HEIGHT,POSE_FRAME_BOTTOM_PADDING} from './pose-cleanup.js';
import {createJcAudio} from './jc-audio.js';
import {createNpcContactStore} from './npc-contacts.js';
import {createVegasStreetNetwork,resolveStreetLocation,VEGAS_LOCATIONS} from './vegas-streets.js';
import {createTrafficSystem} from './jc-traffic.js';
import {createMissionTracker} from './jc-missions.js';
import {createPhotorealDetailMaps,applyPhotorealMaterial} from './photorealism-pbr.js';

const jcAudio=createJcAudio();
const npcContacts=createNpcContactStore();
const missionTracker=createMissionTracker();

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
hud.innerHTML = `<div class="jc-top"><div class="jc-score">JC · STRIP RESTORATION<br><strong id="jcScore">0 / 8</strong> LIGHTS &nbsp; GRACE <span id="jcGrace">100</span>%<div id="jcRun">Restore 8 lights · start moving to begin</div><button id="jcRestart" type="button">RESTART RUN</button></div><div class="jc-top-tools"><button id="jcWorldToggle" type="button" aria-expanded="false" aria-controls="jcWorldPanel" title="Open nearby map and saved people">WORLD</button><button id="jcSoundToggle" type="button" aria-expanded="false" aria-controls="jcSoundPanel" title="Open sound settings">SOUND</button><button id="jcEditor" type="button">CITY EDITOR</button></div></div><div class="jc-ability">SELECTED MIRACLE<strong id="jcSelected">Light Pulse</strong><span id="jcState">Grounded</span><span id="jcAbilityReady">Ready</span></div><div class="jc-hint">WASD move · Drag to look / aim · Right stick look / flight pitch · Shift sprint · Space dash / rise · Ctrl descend · E enter/exit · F fly · G boost · V dive · B brake · K building target · L light target · T teleport · Q answer prayer / cast · Tab miracles</div><div id="jcFeedback" role="status" aria-live="polite"></div><div id="jcTarget"></div><div id="jcFlight"></div><div class="jc-touch"><div id="jcStick" role="group" aria-label="Left joystick: move"><i></i></div><div id="jcLookStick" role="group" aria-label="Right joystick: look and steer flight pitch"><i></i></div><div class="jc-actions"><button data-move="e" type="button">RISE</button><button data-move="c" type="button">DROP</button><button data-move="b" type="button">BRAKE</button><button data-action="boost" type="button">BOOST</button><button data-action="dive" type="button">DIVE</button><button data-action="fly" type="button">FLY</button><button data-action="land" type="button">LAND</button><button data-action="more" type="button" aria-expanded="false">MORE</button><div class="jc-extras"><button data-action="lock" type="button">TARGET</button><button data-action="teleport" type="button">TELEPORT</button><button data-action="cast" type="button">CAST</button><button data-action="enter" type="button">ENTER</button><button data-action="wheel" type="button">43 POWERS</button></div></div></div><div id="jcWheel" role="dialog" aria-label="JC miracles"><div class="jc-wheel-title"><strong>43 MIRACLES</strong><button id="jcWheelClose" type="button" aria-label="Close miracles">✕</button></div><div class="jc-groups"></div><div class="jc-list"></div></div><section id="jcSoundPanel" role="dialog" aria-label="Sound settings" hidden><div class="jc-sound-heading"><strong>AUDIO SETTINGS</strong><button id="jcSoundClose" type="button" aria-label="Close sound settings">×</button></div><button id="jcSoundMute" type="button">MUTE ALL</button><label for="jcMasterVolume">MASTER <output id="jcMasterValue">72%</output></label><input id="jcMasterVolume" data-audio-level="master" type="range" min="0" max="100" step="1" value="72"><label for="jcMusicVolume">AMBIENCE <output id="jcMusicValue">14%</output></label><input id="jcMusicVolume" data-audio-level="music" type="range" min="0" max="100" step="1" value="14"><label for="jcEffectsVolume">SOUND EFFECTS <output id="jcEffectsValue">78%</output></label><input id="jcEffectsVolume" data-audio-level="effects" type="range" min="0" max="100" step="1" value="78"><small>Settings save automatically on this device.</small></section><section id="jcWorldPanel" role="dialog" aria-label="World map and people" hidden><div class="jc-world-heading"><strong>WORLD INTEL</strong><span id="jcWorldStatus">City loading…</span><button id="jcWorldClose" type="button" aria-label="Close world panel">×</button></div><div class="jc-world-tabs" role="tablist"><button type="button" data-world-tab="map" aria-selected="true">MAP</button><button type="button" data-world-tab="people" aria-selected="false">PEOPLE</button></div><div id="jcWorldMapTab"><div id="jcStreetName">LOCATING STREET…</div><canvas id="jcStreetMap" width="360" height="220" aria-label="Nearby streets and people"></canvas><div class="jc-region-grid"><button type="button" data-region="strip">STRIP</button><button type="button" data-region="psalms">PSALMS</button><button type="button" data-region="airport">AIRPORT</button><button type="button" data-region="sphere">SPHERE / WHEEL</button><button type="button" data-region="downtown">DOWNTOWN</button></div><small>Game road layout is approximate. Choose a region to travel there.</small></div><div id="jcWorldPeopleTab" hidden><input id="jcContactSearch" type="search" maxlength="60" placeholder="Search saved people…" aria-label="Search saved contacts"><div id="jcContactList"><p>No saved people yet. Click a person in the world to talk and track them.</p></div><small>Saved contacts and their last-known locations persist on this device.</small></div></section><div id="jcStreetChip">LOCATING STREET…</div><div id="jcTrackedMarker" aria-live="polite"></div>`;
document.body.append(hud);
const sinState=document.createElement('section');
sinState.id='jcSinState';sinState.setAttribute('aria-label','Sin City good and evil state');
sinState.innerHTML='<div class="jc-sin-labels"><b>EVIL</b><strong>SIN CITY STATE</strong><b>GOOD</b></div><div class="jc-sin-track"><i id="jcSinMarker"></i></div><div class="jc-sin-footer"><span id="jcSinVerdict">CONTESTED</span><small id="jcSinScore">BALANCE 0</small></div>';
hud.append(sinState);
style.textContent += '#jcHud .jc-top-tools{display:flex;align-items:start;gap:6px;pointer-events:auto}#jcSoundToggle{min-width:64px}#jcSoundPanel{position:absolute;top:54px;right:12px;z-index:8;width:min(260px,calc(100vw - 24px));box-sizing:border-box;padding:12px;background:#071018f5;border:1px solid #d2b86b99;border-radius:8px;box-shadow:0 12px 32px #000b;pointer-events:auto;color:#fff}#jcSoundPanel[hidden]{display:none!important}.jc-sound-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;color:#ffe6a4;letter-spacing:.08em;font-size:12px}.jc-sound-heading button{padding:2px 9px!important;font-size:18px!important}#jcSoundMute{width:100%;margin-bottom:12px}#jcSoundPanel label{display:flex;justify-content:space-between;gap:12px;margin:9px 0 4px;font-size:11px;letter-spacing:.06em}#jcSoundPanel output{color:#ffe6a4;font-variant-numeric:tabular-nums}#jcSoundPanel input[type=range]{display:block;width:100%;margin:0 0 8px;accent-color:#f9d878;cursor:pointer}#jcSoundPanel small{display:block;color:#aebaca;font-size:10px;margin-top:8px}@media(max-width:800px),(pointer:coarse){#jcSoundToggle{padding:8px 9px!important;min-width:55px;font-size:11px}#jcSoundPanel{top:48px;right:8px}}#jcSinState{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:min(360px,42vw);padding:8px 10px;background:#071018e6;border:1px solid #d2b86b77;border-radius:7px;text-shadow:0 2px 5px #000;pointer-events:none}.jc-sin-labels,.jc-sin-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:9px;letter-spacing:.12em}.jc-sin-labels>b:first-child{color:#ff684d}.jc-sin-labels>b:last-child{color:#9effc2}.jc-sin-labels strong{color:#f4df9e}.jc-sin-track{position:relative;height:8px;margin:6px 0;background:linear-gradient(90deg,#8e1e1e 0%,#431d27 35%,#777 50%,#23553e 65%,#4fbf78 100%);border:1px solid #ffffff30;border-radius:8px}.jc-sin-track i{position:absolute;top:50%;left:50%;width:4px;height:18px;transform:translate(-50%,-50%);background:#fff7cf;box-shadow:0 0 8px #fff;transition:left .35s ease}.jc-sin-footer span{font-weight:900}.jc-sin-footer small{color:#cbd1d6}@media(max-width:800px),(pointer:coarse){#jcSinState{top:8px;width:min(300px,55vw);padding:6px 8px}.jc-sin-labels strong{font-size:8px}.jc-sin-footer{font-size:8px}}';
let sinBalance=0,prayersAnswered=0;
try{sinBalance=THREE.MathUtils.clamp(Number(localStorage.getItem('jc-sin-city-balance'))||0,-100,100);}catch{}
function updateSinState(delta=0,reason=''){
  sinBalance=THREE.MathUtils.clamp(sinBalance+delta,-100,100);
  try{localStorage.setItem('jc-sin-city-balance',String(Math.round(sinBalance)));}catch{}
  const marker=hud.querySelector('#jcSinMarker'),verdict=hud.querySelector('#jcSinVerdict'),scoreLabel=hud.querySelector('#jcSinScore');
  if(marker)marker.style.left=((sinBalance+100)/2)+'%';
  const state=sinBalance>=55?'REDEEMED':sinBalance>=20?'GOOD RISING':sinBalance<=-55?'OVERRUN':sinBalance<=-20?'EVIL RISING':'CONTESTED';
  if(verdict)verdict.textContent=state;
  if(scoreLabel)scoreLabel.textContent=sinBalance===0?'BALANCE 0':(sinBalance>0?'GOOD +'+Math.round(sinBalance):'EVIL +'+Math.round(Math.abs(sinBalance)));
  sinState.dataset.balance=String(Math.round(sinBalance));if(reason)sinState.title=reason;
}
updateSinState();
window.JC_SIN_STATE={adjust:(delta,reason)=>updateSinState(delta,reason),value:()=>sinBalance,label:()=>hud.querySelector('#jcSinVerdict')?.textContent||'CONTESTED'};
style.textContent += '#jcNpcReadout{position:absolute;left:12px;bottom:144px;max-width:min(390px,78vw);padding:7px 10px;background:#091018d9;border-left:2px solid #c4ffee;color:#c4ffee;font-size:11px;letter-spacing:.4px;pointer-events:auto}#jcNpcTalkButton{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 178px);transform:translateX(-50%);display:none;pointer-events:auto;padding:11px 16px;border:1px solid #f1d17e;border-radius:8px;background:#111b2aee;color:#ffe6a4;font-weight:900;box-shadow:0 6px 18px #0009;z-index:2}#jcNpcTalkButton.available{display:block}@media(pointer:fine){#jcNpcTalkButton{display:none!important}}';
const npcReadout=document.createElement('div');npcReadout.id='jcNpcReadout';npcReadout.textContent='CITY FOLKS · OBSERVING';hud.append(npcReadout);
const npcTalkButton=document.createElement('button');npcTalkButton.id='jcNpcTalkButton';npcTalkButton.type='button';npcTalkButton.textContent='TALK';npcTalkButton.setAttribute('aria-label','Talk to nearby character');hud.append(npcTalkButton);
const prayerButton=document.createElement('button');prayerButton.id='jcPrayerButton';prayerButton.type='button';prayerButton.textContent='ANSWER PRAYER';prayerButton.setAttribute('aria-label','Answer nearby NPC prayer');hud.append(prayerButton);
style.textContent += '#jcPrayerButton{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 226px);transform:translateX(-50%);display:none;pointer-events:auto;padding:11px 16px;border:1px solid #b9f3cf;border-radius:8px;background:#10251eee;color:#d8ffe5;font-weight:900;box-shadow:0 6px 18px #0009;z-index:3}#jcPrayerButton.available{display:block}@media(pointer:fine){#jcPrayerButton{bottom:86px}}';
style.textContent += '@media(max-width:800px),(pointer:coarse){#jcTalk{bottom:calc(env(safe-area-inset-bottom) + 170px)}}#jcTalk{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:min(420px,90vw);padding:12px;background:#08111eF2;border:1px solid #e0bf75;border-radius:10px;color:#f5f0df;display:none;pointer-events:auto;box-shadow:0 10px 35px #000b}#jcTalk.open{display:block}#jcTalkHead{display:flex;align-items:center;gap:10px}#jcTalk img{width:48px;height:58px;object-fit:contain;background:#111a28;border-radius:6px}#jcTalk strong{color:#ffdf94}#jcTalk small{display:block;color:#aebaca;margin-top:4px}#jcTalkLog{max-height:108px;overflow:auto;font-size:12px;line-height:1.45;padding:8px 0}#jcTalk form{display:flex;gap:6px}#jcTalk [data-voice]{min-width:42px;font-size:17px}#jcTalk input{min-width:0;flex:1;background:#111a28;color:white;border:1px solid #566273;border-radius:5px;padding:9px}#jcTalk button{background:#94702e;color:white;border:1px solid #efcf81;border-radius:5px;padding:8px 10px}#jcTalk button.close{margin-left:auto;background:#18212c}';
style.textContent += '#jcWorldToggle{min-width:62px}#jcWorldPanel{position:absolute;top:54px;right:12px;z-index:9;width:min(340px,calc(100vw - 24px));max-height:min(72vh,620px);overflow:auto;box-sizing:border-box;padding:12px;background:#071018f7;border:1px solid #d2b86b99;border-radius:9px;box-shadow:0 12px 32px #000b;pointer-events:auto;color:#f4f0e6}#jcWorldPanel[hidden],#jcWorldMapTab[hidden],#jcWorldPeopleTab[hidden]{display:none!important}.jc-world-heading{display:flex;align-items:center;gap:8px;margin-bottom:9px;color:#ffe6a4;font-size:12px;letter-spacing:.08em}.jc-world-heading span{margin-left:auto;color:#aebaca;font-size:9px;letter-spacing:0}.jc-world-heading button{padding:2px 8px!important;font-size:18px!important}.jc-world-tabs{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px}.jc-world-tabs button{padding:7px!important;font-size:10px!important}.jc-world-tabs button[aria-selected=true]{background:#59482a;border-color:#ffe293;color:#fff0bc}#jcStreetName{font-size:11px;font-weight:900;letter-spacing:.06em;color:#ffe6a4;margin:0 0 7px}#jcStreetMap{display:block;width:100%;height:auto;aspect-ratio:18/11;border:1px solid #ffffff22;border-radius:6px;background:#08111b}#jcWorldMapTab>small,#jcWorldPeopleTab>small{display:block;color:#9eacba;font-size:9px;line-height:1.4;margin-top:8px}.jc-region-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px}.jc-region-grid button{padding:7px 4px!important;font-size:9px!important}#jcContactSearch{width:100%;box-sizing:border-box;margin:0 0 8px;background:#111a28;color:#fff;border:1px solid #566273;border-radius:5px;padding:9px}#jcContactList{display:grid;gap:6px}.jc-contact-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:4px;align-items:stretch}.jc-contact-row button{padding:7px 6px!important;font-size:9px!important;min-width:0}.jc-contact-row .jc-contact-main{text-align:left;overflow:hidden}.jc-contact-main strong,.jc-contact-main small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.jc-contact-main strong{font-size:10px;color:#f5e3b3}.jc-contact-main small{font-size:8px;color:#aebaca;margin-top:3px}.jc-contact-row.is-tracked .jc-contact-main{border-color:#ffe293;background:#40351f}.jc-contact-row .jc-track-button{min-width:50px}.jc-contact-row .jc-remove-button{min-width:25px}#jcStreetChip{position:absolute;left:12px;top:112px;max-width:min(300px,45vw);padding:7px 9px;background:#071018e8;border:1px solid #ffffff26;border-left:2px solid #f9d878;border-radius:5px;color:#ffe6a4;font-size:10px;font-weight:900;letter-spacing:.04em;pointer-events:none;text-shadow:0 2px 5px #000}#jcTrackedMarker{display:none;position:absolute;left:50%;top:25%;transform:translate(-50%,-100%);max-width:60vw;padding:6px 9px;background:#101a26ed;border:1px solid #ffe293;border-radius:6px;color:#ffe6a4;font-size:10px;font-weight:900;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none;z-index:5}#jcTalkHead #jcSaveContact{margin-left:auto;padding:5px 7px!important;font-size:9px!important;white-space:nowrap}#jcTalkHead button.close{margin-left:0!important}@media(max-width:800px),(pointer:coarse){#jcWorldPanel{top:48px;right:8px;width:calc(100vw - 16px);max-height:68vh}#jcWorldToggle{padding:8px 8px!important;min-width:54px;font-size:10px}#jcStreetChip{top:102px;left:8px;max-width:47vw;padding:6px 7px;font-size:9px}#jcTrackedMarker{font-size:9px;max-width:70vw}.jc-region-grid{grid-template-columns:repeat(3,minmax(0,1fr))}#jcTalkHead #jcSaveContact{padding:5px 5px!important;font-size:8px!important}}';
const talk=document.createElement('section');talk.id='jcTalk';talk.setAttribute('aria-label','Talk to nearby character');talk.innerHTML='<div id=jcTalkHead><img alt=""><div><strong></strong><small></small></div><button id=jcSaveContact type=button aria-pressed="false">☆ SAVE PERSON</button><button class=close type=button aria-label="Close conversation">×</button></div><div id=jcTalkLog role=log aria-live=polite></div><form><input maxlength=180 aria-label="Message to character" placeholder="Say something…"><button data-voice type=button aria-label="Speak your message" title="Speak your message">🎙</button><button type=submit>Send</button></form>';hud.append(talk);
let nearNpc=null;
const conversation=createNpcConversation({panel:talk,log:talk.querySelector('#jcTalkLog'),onOpen:()=>{resetInput();velocity.set(0,0,0);updateSaveContactButton();},onClose:()=>{resetInput();activeConversationNpc=null;updateSaveContactButton();},notice:message=>feedback(message)});
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
function openNpcTalk(npc=nearNpc,{track=false}={}){if(!npc||!playing)return;const wasSaved=npcContacts.has(npc.id);if(track){npcContacts.add(npc);npcContacts.setTracked(npc.id);npcSystem?.setTracked(npc.id);renderContactList();feedback('TRACKING '+npc.name.toUpperCase());}if(!wasSaved&&npcContacts.has(npc.id))missionTracker.add('people');activeConversationNpc=npc;conversation.open(npc);updateSaveContactButton();}

function updateSaveContactButton(){
  const button=hud.querySelector('#jcSaveContact');
  if(!button)return;
  const saved=!!activeConversationNpc&&npcContacts.has(activeConversationNpc.id);
  button.textContent=saved?'★ SAVED':'☆ SAVE PERSON';
  button.setAttribute('aria-pressed',String(saved));
  button.disabled=!activeConversationNpc;
}
function renderContactList(){
  const container=hud.querySelector('#jcContactList'),search=hud.querySelector('#jcContactSearch');
  if(!container)return;
  const query=(search?.value||'').trim().toLowerCase();
  const trackedId=npcContacts.getTrackedId();
  const contacts=npcContacts.getAll().filter(contact=>(contact.name+' '+contact.faction+' '+contact.avatar).toLowerCase().includes(query));
  container.replaceChildren();
  if(!contacts.length){
    const empty=document.createElement('p');empty.textContent=npcContacts.size?'No contacts match that search.':'No saved people yet. Click a person in the world to talk and track them.';
    container.append(empty);return;
  }
  for(const contact of contacts){
    const npc=npcSystem?.npcs.find(person=>person.id===contact.id);
    const distance=npc?Math.round(npc.position.distanceTo(player.position)):contact.position?Math.round(Math.hypot(contact.position.x-player.position.x,contact.position.z-player.position.z)):null;
    const row=document.createElement('div');row.className='jc-contact-row'+(trackedId===contact.id?' is-tracked':'');
    const main=document.createElement('button');main.type='button';main.className='jc-contact-main';main.dataset.contactAction='talk';main.dataset.contactId=contact.id;
    const name=document.createElement('strong');name.textContent=contact.name;
    const detail=document.createElement('small');detail.textContent=(npc?contact.faction.toUpperCase():'LAST KNOWN LOCATION')+(distance===null?'':' · '+distance+' m');
    main.append(name,detail);
    const track=document.createElement('button');track.type='button';track.className='jc-track-button';track.dataset.contactAction='track';track.dataset.contactId=contact.id;track.textContent=trackedId===contact.id?'TRACKED':'TRACK';
    const remove=document.createElement('button');remove.type='button';remove.className='jc-remove-button';remove.dataset.contactAction='remove';remove.dataset.contactId=contact.id;remove.setAttribute('aria-label','Remove '+contact.name);remove.textContent='×';
    row.append(main,track,remove);container.append(row);
  }
}
function drawWorldMap(){
  const canvas=hud.querySelector('#jcStreetMap');
  if(!canvas||!vegasStreetNetwork||!player)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const width=canvas.width,height=canvas.height,range=1800,scale=Math.min(width,height)/(range*2),cx=width/2,cy=height/2;
  const mapPoint=(x,z)=>({x:cx+(x-player.position.x)*scale,y:cy+(z-player.position.z)*scale});
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#07111b';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#182b39';ctx.lineWidth=1;
  for(let x=0;x<width;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
  for(let y=0;y<height;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  for(const segment of vegasStreetNetwork.segments){
    const a=mapPoint(segment.a[0],segment.a[1]),b=mapPoint(segment.b[0],segment.b[1]);
    if(Math.max(a.x,b.x)<-30||Math.min(a.x,b.x)>width+30||Math.max(a.y,b.y)<-30||Math.min(a.y,b.y)>height+30)continue;
    ctx.strokeStyle=segment.kind==='freeway'?'#d69a63':segment.kind==='arterial'?'#617b90':'#304656';
    ctx.lineWidth=segment.kind==='freeway'?3.2:segment.kind==='arterial'?2:1;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(const key of ['psalms','airport','sphere','downtown']){
    const location=VEGAS_LOCATIONS[key],p=vegasStreetNetwork.project(location.lon,location.lat),m=mapPoint(p.x,p.z);
    if(m.x<0||m.x>width||m.y<0||m.y>height)continue;
    ctx.fillStyle='#8adbc6';ctx.beginPath();ctx.arc(m.x,m.y,3.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b8cbd5';ctx.font='9px Arial';ctx.fillText(key==='psalms'?'PSALMS':key==='airport'?'AIRPORT':key==='sphere'?'SPHERE':'DOWNTOWN',m.x+5,m.y-4);
  }
  for(const npc of npcSystem?.npcs||[]){
    const m=mapPoint(npc.position.x,npc.position.z);
    if(m.x<0||m.x>width||m.y<0||m.y>height)continue;
    const tracked=npc.id===npcContacts.getTrackedId();
    ctx.fillStyle=tracked?'#ffe293':npc.faction==='demon'?'#ff6c77':npc.faction==='angel'?'#c8f4ff':'#a4d8c7';
    ctx.beginPath();ctx.arc(m.x,m.y,tracked?4.5:2.5,0,Math.PI*2);ctx.fill();
    if(tracked){ctx.strokeStyle='#ffe293';ctx.lineWidth=1;ctx.beginPath();ctx.arc(m.x,m.y,7,0,Math.PI*2);ctx.stroke();}
  }
  const trackedId=npcContacts.getTrackedId(),trackedNpc=npcSystem?.npcs.find(npc=>npc.id===trackedId);
  const trackedContact=npcContacts.getAll().find(contact=>contact.id===trackedId);
  if(!trackedNpc&&trackedContact?.position){
    const m=mapPoint(trackedContact.position.x,trackedContact.position.z);
    ctx.strokeStyle='#ffe293';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(m.x,m.y-6);ctx.lineTo(m.x+6,m.y);ctx.lineTo(m.x,m.y+6);ctx.lineTo(m.x-6,m.y);ctx.closePath();ctx.stroke();
  }
  ctx.save();ctx.translate(cx,cy);ctx.rotate(yaw);ctx.fillStyle='#fff0b8';ctx.strokeStyle='#0b1119';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  ctx.fillStyle='#d4e3ec';ctx.font='bold 10px Arial';ctx.fillText('N',10,15);
}
function updateStreetHud(now){
  if(!player||!vegasStreetNetwork||now-lastWorldMapDraw<180)return;
  lastWorldMapDraw=now;
  const location=resolveStreetLocation(player.position.x,player.position.z,vegasStreetNetwork);
  const chip=hud.querySelector('#jcStreetChip'),name=hud.querySelector('#jcStreetName');
  if(location.label!==lastStreetLabel){lastStreetLabel=location.label;if(chip)chip.textContent=location.label;if(name)name.textContent=location.label;}
  const trackedId=npcContacts.getTrackedId(),trackedNpc=npcSystem?.npcs.find(npc=>npc.id===trackedId);
  const contact=npcContacts.getAll().find(item=>item.id===trackedId);
  const marker=hud.querySelector('#jcTrackedMarker');
  if(!marker)return;
  if(!trackedId||(!trackedNpc&&!contact?.position)){marker.style.display='none';if(!hud.querySelector('#jcWorldPanel').hidden&&!hud.querySelector('#jcWorldMapTab').hidden)drawWorldMap();return;}
  const position=trackedNpc?trackedNpc.position:contact.position;
  if(trackedNpc)npcContacts.touch(trackedNpc);
  const distance=Math.round(Math.hypot(position.x-player.position.x,position.z-player.position.z));
  const projected=new THREE.Vector3(position.x,position.y+2.7,position.z).project(game.camera);
  const onScreen=projected.z<1&&Math.abs(projected.x)<.88&&Math.abs(projected.y)<.78;
  const bearing=Math.atan2(position.x-player.position.x,-(position.z-player.position.z));
  const delta=Math.atan2(Math.sin(bearing-yaw),Math.cos(bearing-yaw));
  const arrow=Math.abs(delta)>2.4?'↓':Math.abs(delta)<.55?'↑':delta>0?'→':'←';
  marker.textContent=(onScreen?'◆':arrow)+' '+(trackedNpc?.name||contact?.name||'PERSON')+' · '+distance+' m'+(trackedNpc?'':' · LAST SEEN');
  marker.style.display='block';
  marker.style.left=onScreen?((projected.x+1)*50)+'%':'50%';
  marker.style.top=onScreen?((1-projected.y)*50)+'%':'23%';
  if(!hud.querySelector('#jcWorldPanel').hidden&& !hud.querySelector('#jcWorldMapTab').hidden)drawWorldMap();
}
function travelToRegion(key){
  const location=VEGAS_LOCATIONS[key];
  if(!location||!player||!game||!vegasStreetNetwork)return;
  const projected=vegasStreetNetwork.project(location.lon,location.lat);
  const tileId=game.sectionAt(projected.x,projected.z);
  if(!game.availableTile(tileId)){feedback('AREA TILE NOT IN THIS DEPLOYMENT · '+location.label);return;}
  if(interiorState)exitInterior(false);
  feedback('LOADING '+location.label);
  void game.loadArea(tileId,coarseDevice?0:1,false).then(()=>{
    if(!game.loaded.has(tileId)){feedback('COULD NOT LOAD '+location.label);return;}
    refreshFootprints();
    const spot=clearSpot(projected.x,projected.z);
    terrainY=groundAt(spot[0],spot[1]);
    player.position.set(spot[0],terrainY,spot[1]);spawnPoint.copy(player.position);velocity.set(0,0,0);
    flying=false;hypersonic=false;glide=false;diving=false;flightHeight=0;descending=0;
    game.controls?.target?.copy(player.position);snapCameraBehindPlayer();
    feedback('ARRIVED · '+location.label);
    missionTracker.visit(key);
    hud.querySelector('#jcWorldPanel').hidden=true;hud.querySelector('#jcWorldToggle').setAttribute('aria-expanded','false');
  });
}
const prayerTemplates=[
  {kind:'heal',text:'Please give me strength and healing.'},
  {kind:'shield',text:'Please protect me and my family tonight.'},
  {kind:'sanctuary',text:'Please bring peace to this block.'},
  {kind:'restore',text:'Please restore something broken near us.'},
  {kind:'cleanse',text:'Please clear the darkness around here.'}
];
function assignNpcPrayer(npc,index=0,now=performance.now()){
  if(!npc||npc.faction==='demon'||npc.faction==='angel'){if(npc)npc.prayer=null;return;}
  const template=prayerTemplates[Math.abs(index)%prayerTemplates.length];
  npc.prayer={...template,answered:false,createdAt:now,nextAt:0};
}
function pendingPrayerNpc(){return nearNpc?.prayer&&!nearNpc.prayer.answered?nearNpc:null;}
function answerPrayer(npc=pendingPrayerNpc()){
  if(!npc?.prayer||npc.prayer.answered||!playing)return false;
  const prayer=npc.prayer,now=performance.now();prayer.answered=true;prayer.answeredAt=now;prayer.nextAt=now+45000+(npc.name.length%6)*5000;
  npc.state='awe';npc.event={type:'prayer-answered',position:npc.position.clone(),time:now};npc.memory={type:'prayer-answered',prayer:prayer.text,time:now};npc.emotionUntil=now+6500;jcAudio.play('prayer');
  if(prayer.kind==='heal')grace=Math.min(100,grace+18);
  else if(prayer.kind==='shield')shieldUntil=Math.max(shieldUntil,now+5000);
  else if(prayer.kind==='sanctuary')sanctuaryUntil=Math.max(sanctuaryUntil,now+6500);
  else if(prayer.kind==='restore')nearbyBuildings(36,1).forEach(redeem);
  else if(prayer.kind==='cleanse')nearbyBuildings(42,2).forEach(redeem);
  prayersAnswered++;missionTracker.add('prayers');updateSinState(8,'Prayer answered for '+npc.name);
  npcSystem?.signal('bless',npc.position,20);ringAt(npc.position.clone().add(new THREE.Vector3(0,1,0)),0xc8ffd9,10);showPose(9,900);
  feedback('PRAYER ANSWERED · '+npc.name.toUpperCase()+' · GOOD RISING');
  prayerButton.classList.remove('available');return true;
}
npcTalkButton.addEventListener('click',()=>{if(conversation.isOpen)conversation.close();else openNpcTalk();});
prayerButton.addEventListener('click',()=>answerPrayer());
hud.addEventListener('click',e=>{if(e.target.closest('button')&&!wheel.classList.contains('open'))e.target.closest('button').blur();});
const missionPanel=document.createElement('section');
missionPanel.id='jcMissionPanel';missionPanel.setAttribute('aria-label','Campaign missions');missionPanel.innerHTML='<div class="jc-mission-head"><strong>JC CAMPAIGN</strong><button type="button" id="jcMissionToggle">MISSIONS</button></div><div id="jcMissionList"></div>';
hud.append(missionPanel);
const missionList=missionPanel.querySelector('#jcMissionList');
style.textContent += '#jcMissionPanel{position:absolute;top:116px;left:12px;width:min(300px,calc(100vw - 24px));padding:10px;background:#091018e8;border:1px solid #f9d87877;border-radius:7px;pointer-events:auto;box-sizing:border-box;box-shadow:0 10px 28px #0008}#jcMissionPanel[hidden]{display:none}.jc-mission-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.jc-mission-head button{padding:6px 8px}.jc-mission{display:grid;grid-template-columns:1fr auto;gap:3px 8px;font-size:12px;padding:5px 0;border-top:1px solid #ffffff14}.jc-mission small{grid-column:1/-1;color:#b9c0c8}.jc-mission.done{opacity:.55}.jc-mission.done small{color:#b8eddf}@media(max-width:800px),(pointer:coarse){#jcMissionPanel{top:104px;left:8px;width:min(270px,calc(100vw - 16px));font-size:11px}}';
const renderMissions=()=>{const s=missionTracker.getSnapshot();missionList.innerHTML=s.missions.map(m=>'<div class="jc-mission '+(m.complete?'done':'')+'"><span>'+m.label+'</span><b>'+m.value+'/'+m.target+'</b><small>'+m.unit+(m.complete?' · COMPLETE':' remaining')+'</small></div>').join('')+(s.allComplete?'<div class="jc-mission done"><span>CAMPAIGN</span><b>100%</b><small>Sin City restored</small></div>':'');};
renderMissions();missionTracker.onChange(renderMissions);missionPanel.hidden=false;
missionPanel.querySelector('#jcMissionToggle').addEventListener('click',()=>{missionPanel.querySelector('#jcMissionList').hidden=!missionPanel.querySelector('#jcMissionList').hidden;});
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
let game, player, portrait, realisticAvatar, npcSystem, trafficSystem, vegasStreetNetwork, worldLandmarks, souls = [], grace = 100, redeemed = 0, playerStepPhase=0;
let activeConversationNpc=null,lastStreetLabel='',lastWorldMapDraw=0,pointerStart=null;
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
  // The transparent bottom gutter keeps shoe pixels safe; offset the plane so
  // the visible shoe baseline still meets the ground instead of floating.
  realisticAvatar.position.y=height*(.5-POSE_FRAME_BOTTOM_PADDING/POSE_FRAME_HEIGHT);
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
let worldClock=performance.now();
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
  const load=loadTextureSafe(imageLoader,`./miracles/${abilityArt(id)}.webp`,fallbackMiracleTexture).then(texture=>{
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
  if(!game?.scene||!playing)return;
  activeMiracleSprites.set(id,(activeMiracleSprites.get(id)||0)+1);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,opacity:.96,blending:THREE.AdditiveBlending}));
  sprite.position.copy(base).add(new THREE.Vector3(0,2.4,0));sprite.scale.set(3.4,3.4,1);game.scene.add(sprite);
  effects().sprite(sprite,()=>{const active=activeMiracleSprites.get(id)||1;if(active<=1)activeMiracleSprites.delete(id);else activeMiracleSprites.set(id,active-1);trimMiracleTextures();});
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
  teleportTarget=new THREE.Vector3(safe[0],groundAt(safe[0],safe[1])+flightHeight,safe[1]);
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
  if(interiorState)exitInterior(false);
  miracleEffects?.clear();phaseUntil=timeScaleUntil=shieldUntil=graceSurgeUntil=sanctuaryUntil=stasisUntil=revealUntil=sunriseUntil=poseOverrideUntil=castingUntil=0;poseOverride=-1;lockedBuilding=null;
  clearTeleportMarker();teleportAim=false;teleportTarget=null;
  redeemed=0;runTime=0;runActive=false;runFinished=false;chain={count:0,last:0,points:0};lockedSoul=null;
  prayersAnswered=0;updateSinState();npcSystem?.npcs?.forEach((npc,index)=>assignNpcPrayer(npc,index));
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
let miracleEffects=null;
function effects(){return miracleEffects||(miracleEffects=createMiracleEffects(game.scene,coarseDevice));}
const abilityArtIds={'heavenly-spear':'divine-beam','judgment-storm':'lightning',singularity:'vortex','sonic-boom':'hypersonic'};
function abilityArt(id){return abilityArtIds[id]||id;}
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

const photorealDetailMaps=createPhotorealDetailMaps(THREE);

function applyBuildingTheme(mesh, ownerId, redeemed = false) {
  if(mesh.material?.userData?.customTexture) return;
  const identity=mesh.material?.userData?.buildingIdentity||mesh.userData.owner?.userData?.identity||game.buildings?.get(ownerId)?.userData?.identity;
  const casino=identity?.type==='casino';
  // Non-casino buildings stay physically matte. Redemption changes game state,
  // not their material class; only verified casino zones receive Strip shine.
  if(mesh.material?.userData?.physicalSurface){
    const material=mesh.material,edit=game.edits?.get(ownerId);
    if(casino&&redeemed){material.emissive.set(0xffd8a0);material.emissiveIntensity=.1;}
    else if(!casino||!edit?.glow){material.emissive.set(0x000000);material.emissiveIntensity=0;material.emissiveMap=null;}
    material.metalness=casino?(material.userData.original?.metalness??material.metalness):0;
    applyPhotorealMaterial(THREE,material,photorealDetailMaps,{casino,buildingHeight:game.buildings?.get(ownerId)?.userData?.heightMetres||12});
    if(!casino)material.roughness=Math.max(.82,material.roughness);
    material.userData.jcBuildingId=ownerId;
    material.needsUpdate=true;
    return;
  }
  if (!mesh.userData.jcMaterialClone) {
    mesh.material = cloneBuildingMaterial(mesh.material);
    mesh.userData.jcMaterialClone = true;
  }
  const material = mesh.material;
  applyPhotorealMaterial(THREE,material,photorealDetailMaps,{casino,buildingHeight:game.buildings?.get(ownerId)?.userData?.heightMetres||12});
  if(!casino){
    if(material.emissive)material.emissive.set(0x000000);
    material.emissiveMap=null;
    if('emissiveIntensity' in material)material.emissiveIntensity=0;
    material.roughness=Math.max(.84,material.roughness??.84);
    material.metalness=0;
    material.userData.jcBuildingId=ownerId;
    material.needsUpdate=true;
    return;
  }
  const hash = buildingHash(ownerId);
  material.map = themedFacade(ownerId, redeemed);
  material.color.setRGB(.86+((hash>>>8)&31)/230, (redeemed?.82:.74)+((hash>>>15)&31)/250, (redeemed?.80:.68)+((hash>>>22)&31)/240);
  // Keep facade texture readable under scene lighting; emissive color is a restrained accent, not a glowing whole wall.
  material.emissiveMap=null;
  const heavenly=redeemed || hash%7===0;
  if(material.emissive)material.emissive.set(heavenly?0xffdf9e:vegasNeon[(hash>>>11)%vegasNeon.length]);
  if ('emissiveIntensity' in material) material.emissiveIntensity = (heavenly?.10:.055)+((hash>>>3)&7)/180;
  material.roughness = redeemed ? .48 : .54;
  material.metalness = .08;
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

function installPavedRoads(centerX,centerZ,network=vegasStreetNetwork) {
  if(game.scene.getObjectByName('JC paved Strip roads'))return;
  if(!network){network=createVegasStreetNetwork({anchorX:centerX,anchorZ:centerZ});vegasStreetNetwork=network;}
  const root=new THREE.Group();root.name='JC paved Strip roads';
  const asphalt=new THREE.MeshStandardMaterial({map:asphaltTexture(),color:0x263043,roughness:.36,metalness:.12});
  asphalt.map.repeat.set(1,8);
  const yellow=roadStripeMaterial(0xffd24a,.9),white=roadStripeMaterial(0xe8edf1,.78);
  const concrete=new THREE.MeshStandardMaterial({color:0x62636b,roughness:.92});
  const planeGeometry=new THREE.PlaneGeometry(1,1),boxGeometry=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const surfaces=[],sidewalks=[],yellowDashes=[],whiteDashes=[],curbs=[];
  const addPlane=(target,x,z,width,length,rotation,y)=>target.push({x,z,width,length,rotation,y});
  for(const route of network.routes){
    for(let i=0;i<route.points.length-1;i++){
      const a=route.points[i],b=route.points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],distance=Math.hypot(dx,dz);
      if(distance<1)continue;
      const parts=Math.max(1,Math.ceil(distance/(route.kind==='side'?190:220))),rotation=Math.atan2(dx,-dz),nx=-dz/distance,nz=dx/distance;
      for(let part=0;part<parts;part++){
        const t=(part+.5)/parts,x=a[0]+dx*t,z=a[1]+dz*t,length=distance/parts,y=groundAt(x,z)+.13;
        addPlane(surfaces,x,z,route.width,length+1,rotation,y);
        if(route.kind==='arterial'){
          for(const side of [-1,1]){
            const offset=route.width/2+2.6;
            addPlane(sidewalks,x+nx*offset*side,z+nz*offset*side,2.4,length+1,rotation,y+.055);
            curbs.push({x:x+nx*(route.width/2+.35)*side,y:y+.07,z:z+nz*(route.width/2+.35)*side,width:.42,height:.2,length:length+1,yaw:Math.atan2(-dz,dx)});
          }
        }
        if(route.kind==='arterial'&&route.width>=18&&part%2===0)addPlane(yellowDashes,x,z,.2,Math.min(18,length*.42),rotation,y+.04);
        if(route.kind==='freeway'&&part%2===0)for(const offset of [-6,6])addPlane(whiteDashes,x+nx*offset,z+nz*offset,.18,Math.min(22,length*.45),rotation,y+.04);
      }
    }
  }
  function addPlaneInstances(data,material,name){
    if(!data.length)return;
    const mesh=new THREE.InstancedMesh(planeGeometry,material,data.length);mesh.name=name;mesh.frustumCulled=false;
    data.forEach((item,index)=>{dummy.position.set(item.x,item.y,item.z);dummy.rotation.set(-Math.PI/2,0,item.rotation);dummy.scale.set(item.width,item.length,1);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);});
    mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
  }
  addPlaneInstances(surfaces,asphalt,'Street surfaces');
  addPlaneInstances(sidewalks,concrete,'Sidewalks');
  addPlaneInstances(yellowDashes,yellow,'Yellow lane markings');
  addPlaneInstances(whiteDashes,white,'Freeway lane markings');
  if(curbs.length){
    const mesh=new THREE.InstancedMesh(boxGeometry,concrete,curbs.length);mesh.name='Street curbs';mesh.frustumCulled=false;
    curbs.forEach((item,index)=>{dummy.position.set(item.x,item.y,item.z);dummy.rotation.set(0,item.yaw,0);dummy.scale.set(item.length,item.height,item.width);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);});
    mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
  }
  // A raised Tropicana crossing makes the I-15 intersection visibly grade-separated.
  const bridge=network.project(-115.1775,36.0997),baseY=groundAt(bridge.x,bridge.z),deckY=baseY+8;
  const bridgeMat=asphalt,railMat=new THREE.MeshStandardMaterial({color:0x9ba5ad,roughness:.65,metalness:.2});
  function bridgePart(length,offsetX,angle,y){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(length,.75,26),bridgeMat);
    mesh.position.set(bridge.x+offsetX,y,bridge.z);mesh.rotation.z=angle;mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh);
  }
  bridgePart(105,0,0,deckY);
  bridgePart(132,-118,.055,baseY+4);
  bridgePart(132,118,-.055,baseY+4);
  for(const side of [-1,1]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(108,1.1,.36),railMat);
    rail.position.set(bridge.x,deckY+.8,bridge.z+side*13);root.add(rail);
    for(const offset of [-37,37]){
      const pier=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.25,7,8),concrete);
      pier.position.set(bridge.x+offset,baseY+3.5,bridge.z+side*8);root.add(pier);
    }
  }
  root.userData.semanticGroups=['ROADS','SIDEWALKS','CURBS','OVERPASSES'];
  root.userData.routeCount=network.routes.length;root.userData.surfaceCount=surfaces.length;
  game.scene.add(root);
}

function installVegasLandmarks(network=vegasStreetNetwork) {
  const existing=game.scene.getObjectByName('JC Vegas landmarks and palms');
  if(existing)return worldLandmarks;
  const root=new THREE.Group();root.name='JC Vegas landmarks and palms';
  const steel=new THREE.MeshStandardMaterial({color:0xb8c5cc,roughness:.42,metalness:.68});
  const cabinMaterial=new THREE.MeshStandardMaterial({color:0x26384a,roughness:.38,metalness:.22,emissive:0x102338,emissiveIntensity:.28});
  const wheelPoint=network.project(-115.1684,36.1175),wheelGround=groundAt(wheelPoint.x,wheelPoint.z),wheelCenterY=wheelGround+91;
  const wheel=new THREE.Group();wheel.name='High Roller observation wheel';wheel.position.set(wheelPoint.x,wheelCenterY,wheelPoint.z);root.add(wheel);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(82,2.2,8,96),steel);wheel.add(ring);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(4,4,11,12),steel);hub.rotation.x=Math.PI/2;wheel.add(hub);
  const spokeGeometry=new THREE.CylinderGeometry(.32,.32,82,5);
  for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,spoke=new THREE.Mesh(spokeGeometry,steel);
    spoke.position.set(Math.sin(angle)*41,Math.cos(angle)*41,0);spoke.rotation.z=-angle;wheel.add(spoke);
  }
  const cabinGeometry=new THREE.BoxGeometry(5.4,6.4,4.4);
  for(let i=0;i<28;i++){
    const angle=i*Math.PI*2/28,cabin=new THREE.Mesh(cabinGeometry,cabinMaterial);
    cabin.position.set(Math.sin(angle)*82,Math.cos(angle)*82,0);wheel.add(cabin);
  }
  for(const side of [-1,1]){
    const support=new THREE.Mesh(new THREE.BoxGeometry(3,98,3),steel);
    support.position.set(wheelPoint.x+side*22,wheelGround+45,wheelPoint.z);support.rotation.z=side<0?-.22:.22;root.add(support);
  }
  const spherePoint=network.project(-115.1612,36.1208),sphereGround=groundAt(spherePoint.x,spherePoint.z);
  const ledTexture=canvasTexture((ctx,w,h)=>{
    const gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#08152d');gradient.addColorStop(.45,'#102f53');gradient.addColorStop(1,'#180f30');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=8){ctx.strokeStyle='rgba(104,213,255,.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    for(let x=0;x<w;x+=10){ctx.strokeStyle='rgba(116,199,255,.15)';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    ctx.strokeStyle='rgba(255,190,93,.85)';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(w*.52,h*.49,w*.18,h*.34,-.15,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(107,237,255,.9)';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(w*.52,h*.49,w*.31,h*.2,.18,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,235,171,.95)';ctx.beginPath();ctx.arc(w*.52,h*.49,13,0,Math.PI*2);ctx.fill();
  },512,256);
  ledTexture.wrapS=THREE.RepeatWrapping;ledTexture.colorSpace=THREE.SRGBColorSpace;
  const sphereMaterial=new THREE.MeshStandardMaterial({map:ledTexture,emissiveMap:ledTexture,emissive:0x3268a3,emissiveIntensity:.52,roughness:.3,metalness:.18});
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(74,48,32),sphereMaterial);
  sphere.name='Sphere LED dome landmark';sphere.position.set(spherePoint.x,sphereGround+62,spherePoint.z);sphere.scale.y=.8;root.add(sphere);
  const sphereBase=new THREE.Mesh(new THREE.TorusGeometry(76,1.5,8,80),steel);sphereBase.rotation.x=Math.PI/2;sphereBase.position.set(spherePoint.x,sphereGround+2,spherePoint.z);root.add(sphereBase);

  // Two instanced meshes keep 200 palms and 1,000 fronds to two draw calls.
  const treeRoutes=network.routes.filter(route=>route.kind==='arterial'&&route.width>=16&&route.name!=='Airport Connector');
  const palms=[];
  for(let i=0;i<200;i++){
    const route=treeRoutes[i%treeRoutes.length],segmentIndex=Math.floor(i/treeRoutes.length)%(route.points.length-1);
    const a=route.points[segmentIndex],b=route.points[segmentIndex+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;
    const t=.12+((i*37)%76)/100,side=i%2?1:-1,offset=route.width/2+8,nx=-dz/length,nz=dx/length;
    let x=a[0]+dx*t+nx*offset*side,z=a[1]+dz*t+nz*offset*side;
    if(!openSpace(x,z,1.8)){
      const otherX=a[0]+dx*t-nx*offset*side,otherZ=a[1]+dz*t-nz*offset*side;
      if(openSpace(otherX,otherZ,1.8)){x=otherX;z=otherZ;}
      else [x,z]=clearSpot(x,z);
    }
    palms.push({x,z,y:groundAt(x,z),angle:(i*2.3999632297)%(Math.PI*2)});
  }
  const trunkGeometry=new THREE.CylinderGeometry(.22,.42,7,7,1),frondGeometry=new THREE.ConeGeometry(.18,4.5,5);
  const trunkMaterial=new THREE.MeshStandardMaterial({color:0x72523a,roughness:.94}),frondMaterial=new THREE.MeshStandardMaterial({color:0x397b4a,roughness:.82,side:THREE.DoubleSide});
  const trunks=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,palms.length),fronds=new THREE.InstancedMesh(frondGeometry,frondMaterial,palms.length*5);
  trunks.frustumCulled=false;fronds.frustumCulled=false;
  const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  palms.forEach((p,i)=>{
    dummy.position.set(p.x,p.y+3.5,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    for(let leaf=0;leaf<5;leaf++){
      const angle=p.angle+leaf*Math.PI*2/5,direction=new THREE.Vector3(Math.cos(angle),-.38,Math.sin(angle)).normalize();
      dummy.position.set(p.x+direction.x*1.35,p.y+7.1+direction.y*1.35,p.z+direction.z*1.35);
      dummy.quaternion.setFromUnitVectors(up,direction);dummy.scale.set(1,1,1);dummy.updateMatrix();fronds.setMatrixAt(i*5+leaf,dummy.matrix);
    }
  });
  trunks.instanceMatrix.needsUpdate=true;fronds.instanceMatrix.needsUpdate=true;root.add(trunks,fronds);
  root.userData.palmCount=palms.length;root.userData.landmarks=['HIGH ROLLER','SPHERE'];
  game.scene.add(root);
  return worldLandmarks={root,sphere,wheel,palmCount:palms.length,update(dt){sphere.rotation.y+=dt*.018;}};
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
  jcAudio.play('collect');
  soul.visible = false;
  soul.userData.collected = true;
  if(!runActive&&!runFinished)runActive=true;
  redeemed++;missionTracker.add('lights');
  updateSinState(8,'Lost light restored');
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
  ringAt(player.position,0xc8eeff,5);jcAudio.play('dash');
  if (charge) grace -= 25;
  dashCooldown = .8;
}

function beginDive(charge=false) {
  if(!playing||!flying||diving){feedback(flying?'DIVE ALREADY IN PROGRESS':'TAKE FLIGHT BEFORE DIVING');return;}
  if(charge&&grace<16){feedback('Need 16 grace to dive');return;}
  if(charge)grace-=16;
  setFlight('dive');jcAudio.play('dive');feedback('DIVE · impact changes the street');
}

function resolveDiveImpact() {
  jcAudio.play('impact');
  const impact=player.position.clone();
  cinematicLook?.impact(impact);
  const hit=nearbyBuildings(30,3);
  let broken=0;
  for(const ob of hit)if(ob?.userData?.buildingId){game.destroy(ob,'crumble');broken++;}
  if(broken){updateSinState(-6*broken,'Dive impact destroyed '+broken+' building'+(broken===1?'':'s'));refreshFootprints();}
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
  ringAt(player.position,0xffe090,20);
}

function ringAt(position,color=0xffe090,max=20){effects().ring(position,color,max);}
function beamTo(destination,color=0xffe4a4){effects().beam(player.position.clone().add(new THREE.Vector3(0,2.4,0)),destination,color);}

function nearbyRuins(radius=55){
  let nearest=null,best=radius*radius;
  for(const [id,ob] of game.buildings||[]){if(!game.chunks?.has(id))continue;const point=ob.getWorldPosition(new THREE.Vector3());const d=(point.x-player.position.x)**2+(point.z-player.position.z)**2;if(d<best){best=d;nearest=ob;}}
  return nearest;
}
function nearbyBuildings(radius, count = 1) {
  return footprints.map(({box,ob}) => ({ob,d:box.distanceToPoint(player.position)}))
    .filter(({ob,d}) => d < radius && ob.userData.buildingId)
    .sort((a,b) => a.d - b.d).slice(0,count).map(({ob}) => ob);
}

let interiorState=null;
function nearestEnterableBuilding(radius=7){
  let best=null,bestDistance=radius;
  for(const item of footprints){
    const {box,ob}=item;if(!ob?.userData?.buildingId)continue;
    const nearestX=THREE.MathUtils.clamp(player.position.x,box.min.x,box.max.x),nearestZ=THREE.MathUtils.clamp(player.position.z,box.min.z,box.max.z);
    const distance=Math.hypot(player.position.x-nearestX,player.position.z-nearestZ);
    if(distance<bestDistance){best={box,ob};bestDistance=distance;}
  }
  return best;
}
function interiorMesh(group,geometry,material,position){
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function createProceduralInterior(ob,box){
  const center=box.getCenter(new THREE.Vector3()),sourceWidth=Math.max(1,box.max.x-box.min.x),sourceDepth=Math.max(1,box.max.z-box.min.z);
  const width=THREE.MathUtils.clamp(sourceWidth-1,8,28),depth=THREE.MathUtils.clamp(sourceDepth-1,8,24),height=3.4,floorY=box.min.y+.12;
  const identity=ob.userData.identity||{type:'commercial',name:'Building'},type=identity.type;
  const group=new THREE.Group();group.name='JC procedural interior · '+ob.userData.buildingId;group.position.set(center.x,floorY,center.z);
  const isHome=type==='residential',isCasino=type==='casino';
  const wall=new THREE.MeshStandardMaterial({color:isHome?0xd9c6ae:isCasino?0x3a2922:0xc8c4bc,roughness:isCasino?.48:.92,metalness:isCasino?.08:0});
  const floor=new THREE.MeshStandardMaterial({color:isHome?0x7a5b43:isCasino?0x332920:0x767676,roughness:isCasino?.55:.88,metalness:0});
  const trim=new THREE.MeshStandardMaterial({color:isCasino?0xc9a85d:0x6f6256,roughness:isCasino?.42:.82,metalness:isCasino?.18:0});
  const accent=new THREE.MeshStandardMaterial({color:isHome?0x76695d:isCasino?0x7b2630:0x4b5960,roughness:.75,metalness:0});
  interiorMesh(group,new THREE.BoxGeometry(width,.18,depth),floor,[0,-.09,0]);
  interiorMesh(group,new THREE.BoxGeometry(width,.16,depth),wall,[0,height+.08,0]);
  interiorMesh(group,new THREE.BoxGeometry(width,height,.2),wall,[0,height/2,-depth/2]);
  interiorMesh(group,new THREE.BoxGeometry(width,height,.2),wall,[0,height/2,depth/2]);
  interiorMesh(group,new THREE.BoxGeometry(.2,height,depth),wall,[-width/2,height/2,0]);
  interiorMesh(group,new THREE.BoxGeometry(.2,height,depth),wall,[width/2,height/2,0]);
  if(isHome){
    interiorMesh(group,new THREE.BoxGeometry(Math.min(3.4,width*.35),.75,1.05),accent,[-width*.19,.42,-depth*.22]);
    interiorMesh(group,new THREE.BoxGeometry(1.4,.45,.85),trim,[.4,.24,-depth*.05]);
    interiorMesh(group,new THREE.BoxGeometry(Math.min(2.6,width*.3),.55,1.6),new THREE.MeshStandardMaterial({color:0xd7d0c4,roughness:.95}),[width*.18,.29,depth*.22]);
  }else if(isCasino){
    for(let i=-2;i<=2;i++){interiorMesh(group,new THREE.BoxGeometry(.72,1.7,.72),trim,[i*1.15,.86,-depth*.2]);const panel=new THREE.MeshStandardMaterial({color:0xffd96b,emissive:0xff9b2f,emissiveIntensity:.35,roughness:.45});interiorMesh(group,new THREE.BoxGeometry(.48,.52,.04),panel,[i*1.15,1.08,-depth*.2-.38]);}
    interiorMesh(group,new THREE.BoxGeometry(Math.min(5.5,width*.45),1.05,1.15),accent,[0,.53,depth*.2]);
  }else{
    interiorMesh(group,new THREE.BoxGeometry(Math.min(5,width*.5),1.05,.85),trim,[0,.53,-depth*.22]);
    for(let i=-1;i<=1;i++)interiorMesh(group,new THREE.BoxGeometry(1.3,.72,.75),accent,[i*2,.37,depth*.18]);
  }
  const light=new THREE.PointLight(isCasino?0xffd28c:0xffedd0,isCasino?35:22,Math.max(width,depth)*1.5,2);light.position.set(0,height-0.35,0);group.add(light);
  game.scene.add(group);
  return {group,ob,returnPosition:player.position.clone(),floorY,minX:center.x-width/2+.7,maxX:center.x+width/2-.7,minZ:center.z-depth/2+.7,maxZ:center.z+depth/2-.7,identity};
}
function enterInterior(){
  if(interiorState)return true;if(flying||flightHeight>0){feedback('Land before entering a building');return false;}
  const target=nearestEnterableBuilding(7);if(!target){feedback('Move closer to a building entrance');return false;}
  interiorState=createProceduralInterior(target.ob,target.box);target.ob.visible=false;velocity.set(0,0,0);
  player.position.set((interiorState.minX+interiorState.maxX)/2,interiorState.floorY,(interiorState.minZ+interiorState.maxZ)/2);terrainY=interiorState.floorY;
  nearNpc=null;conversation.close({restoreFocus:false});resetInput();
  const enterButton=hud.querySelector('[data-action="enter"]');if(enterButton)enterButton.textContent='EXIT';
  jcAudio.play('enter');feedback('ENTERED · '+(interiorState.identity.name||interiorState.identity.type)+' · E TO EXIT');return true;
}
function exitInterior(showMessage=true){
  if(!interiorState)return false;const state=interiorState;interiorState=null;
  if(state.ob?.parent)state.ob.visible=true;
  state.group.traverse(node=>{if(!node.isMesh)return;node.geometry?.dispose();const materials=Array.isArray(node.material)?node.material:[node.material];for(const material of materials){if(material&&!material.userData?.shared)material.dispose?.();}});
  game.scene.remove(state.group);player.position.copy(state.returnPosition);terrainY=groundAt(player.position.x,player.position.z);player.position.y=terrainY;velocity.set(0,0,0);
  const enterButton=hud.querySelector('[data-action="enter"]');if(enterButton)enterButton.textContent='ENTER';
  resetInput();if(showMessage){jcAudio.play('exit');feedback('BACK OUTSIDE · '+(state.identity.name||'BUILDING'));}return true;
}
function toggleInterior(){return interiorState?exitInterior():enterInterior();}

function redeem(ob) {
  if (!ob) return false;
  const firstRedemption=!redeemedBuildings.has(ob.userData.buildingId);
  redeemedBuildings.add(ob.userData.buildingId);
  if(firstRedemption){missionTracker.add('buildings');updateSinState(3,'Building restored');}
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
    const direction = player.position.clone().sub(soul.position).setY(0);
    const separation=direction.length();direction.normalize();
    const distance = mode === 'repel' ? -25 : mode === 'vortex' ? Math.min(18,separation) : Math.min(25,separation);
    soul.position.addScaledVector(direction, distance);
    soul.userData.baseY = groundAt(soul.position.x, soul.position.z) + 1.6;
    if (soul.position.distanceTo(player.position) < 3) collect(soul);
  }
}

function rainEffect(){effects().rainAt(player.position);}

function beamDown() {
  if (!flying) return;
  const landingHeight=flightHeight;
  const [x,z]=clearSpot(player.position.x,player.position.z);
  player.position.x=x;player.position.z=z;terrainY=groundAt(x,z);lastGround=performance.now();
  velocity.set(0,0,0);
  setFlight('land');
  showPose(6,700);
  spawnMiracleSprite('beam-down');
  ringAt(player.position, 0xffedb5, 24);
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,Math.max(4,landingHeight),12,1,true),new THREE.MeshBasicMaterial({color:0xffe6a0,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
  marker.position.copy(player.position);
  marker.position.y = terrainY+landingHeight/2;
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
  if(interiorState){feedback('Exit the building to use miracles');return;}
  const ability = abilities.find(a=>a.id===id);
  if (!ability) return;
  if(id==='teleport'&&!teleportTarget){beginTeleportTarget();return;}
  if((cooldowns.get(id)||0)>performance.now()){feedback('Miracle recharging');return;}
  if(grace<ability.cost){feedback(`Need ${ability.cost} grace · release boost to recover`);return;}
  if(id==='skydive'&&(!flying||diving)){feedback(flying?'DIVE ALREADY IN PROGRESS':'TAKE FLIGHT BEFORE DIVING');return;}
  if(id==='beam-down'&&!flying){feedback('Already grounded');return;}
  if(id==='dash'&&dashCooldown>0||id==='light-pulse'&&pulseCooldown>0){feedback('Miracle recharging');return;}
  if(lockedBuilding&&game.buildings?.get(lockedBuilding.userData.buildingId)!==lockedBuilding)lockedBuilding=null;
  const buildingRadii={'divine-beam':110,'chain-light':100,'radiance-nova':56,cleanse:45,reveal:75,restore:60,shockwave:40,lightning:130,telekinesis:40,crumble:55,bless:45,exorcise:65,'redemption-wave':105,'heavenly-spear':105,'judgment-storm':140};
  if(buildingRadii[id]&&!nearbyBuildings(buildingRadii[id],1).length){feedback('No building in range');return;}
  if(id==='rebuild'&&!nearbyRuins()){feedback('No collapsed building in range');return;}
  if(id==='teleport'&&teleportTarget&&(!Number.isFinite(teleportTarget.x)||!Number.isFinite(teleportTarget.z)||(!flying&&(!openSpace(teleportTarget.x,teleportTarget.z,2)||blockedAt(teleportTarget.x,teleportTarget.y,teleportTarget.z,2))))){teleportTarget=null;clearTeleportMarker();feedback('Choose a clear landing point');return;}
  feedback(ability.name);
  const soundId=id==='hypersonic'?'boost':id==='teleport'?'teleport':id==='light-pulse'?'pulse':id==='dash'?'dash':id==='beam-down'?'impact':['crumble','heavenly-spear','judgment-storm'].includes(id)?'destroy':['heal','bless','restore','cleanse','radiance-nova','redemption-wave'].includes(id)?'restore':['shield','sanctuary'].includes(id)?'prayer':['flight','hover','leap','glide','sky-lift','skydive'].includes(id)?'flight':'cast';
  jcAudio.play(soundId);
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
    case 'telekinesis':{const ob=near(40)[0];if(ob){const p=ob.getWorldPosition(new THREE.Vector3());beamTo(p,0x9bdcff);ringAt(p,0x9bdcff,16);const original=ob.position.y;ob.position.y+=5;refreshFootprints();setTimeout(()=>{ob.position.y=original;refreshFootprints();},900);}break;}
    case 'crumble':{const ob=lockedBuilding||near(55)[0];if(!ob){feedback('No building in range');break;}const point=ob.getWorldPosition(new THREE.Vector3());game.destroy(ob,'crumble');updateSinState(-8,'Building destroyed');cinematicLook?.impact(point);refreshFootprints();ringAt(point,0xffc38e,26);feedback(`${ob.userData.buildingId} CRUMBLED · debris falling`);lockedBuilding=null;break;}
    case 'rebuild':{const ob=nearbyRuins();if(ob){game.rebuild(ob);refreshFootprints();redeem(ob);feedback(`${ob.userData.buildingId} REBUILT`);lockedBuilding=null;}break;}
    case 'bless':near(45).forEach(redeem);break;
    case 'exorcise':near(65,5).forEach(redeem);break;
    case 'stasis':stasisUntil=performance.now()+6000;ringAt(player.position,0x9fd9ff,25);break;
    case 'vortex':moveSouls('vortex',50);ringAt(player.position,0xaedaff,30);break;
    case 'repel':moveSouls('repel',40);ringAt(player.position,0xffb992,30);break;
    case 'attract':moveSouls('attract',55);ringAt(player.position,0xffe6b0,40);break;
    case 'slow-time':timeScaleUntil=performance.now()+7000;ringAt(player.position,0xb9d8ff,30);break;
    case 'redemption-wave':near(105,8).forEach(redeem);ringAt(player.position,0xffe7b1,105);cinematicLook?.impact(player.position);break;
    case 'heavenly-spear':{const ob=lockedBuilding||near(105)[0];if(!ob){feedback('No building in range');break;}const point=ob.getWorldPosition(new THREE.Vector3());point.y+=Math.max(5,ob.userData.heightMetres*.55);beamTo(point,0xffe6a5);game.destroy(ob,'explode');updateSinState(-10,'Building destroyed');refreshFootprints();cinematicLook?.impact(point);ringAt(point,0xffe6a5,34);ringAt(player.position,0xfff4ce,17);feedback(`${ob.userData.buildingId} · HEAVENLY SPEAR`);lockedBuilding=null;break;}
    case 'judgment-storm':{const targets=near(140,3);if(!targets.length){feedback('No buildings in range');break;}for(const ob of targets){const point=ob.getWorldPosition(new THREE.Vector3());point.y+=Math.max(5,ob.userData.heightMetres*.45);beamTo(point,0xb6dcff);game.destroy(ob,'crumble');ringAt(point,0xc4e6ff,24);}updateSinState(-4*targets.length,'Multiple buildings destroyed');refreshFootprints();cinematicLook?.impact(player.position);ringAt(player.position,0xaed8ff,55);feedback(`JUDGMENT STORM · ${targets.length} IMPACTS`);break;}
    case 'singularity':moveSouls('vortex',85);timeScaleUntil=performance.now()+1800;ringAt(player.position,0x9bdcff,72);feedback('SINGULARITY · nearby lights pulled inward');break;
    case 'sonic-boom':{setFlight('surge');const direction=desired.lengthSq()?desired.clone().normalize():forward.clone();moveSafely(direction.x*22,direction.z*22,performance.now()<phaseUntil);velocity.addScaledVector(direction,24);const point=player.position.clone();cinematicLook?.impact(point);ringAt(point,0xbceaff,36);npcSystem?.signal('sonic-boom',point,110);feedback('SONIC BOOM · HYPERFLIGHT');break;}
  }
  graceLabel.textContent=Math.round(grace);
}

function renderWheel() {
  hud.querySelector('.jc-groups').replaceChildren(...['Travel','Light','World'].map(group=>{
    const button=document.createElement('button');button.textContent=group;button.setAttribute('aria-pressed',String(group===selectedGroup));button.onclick=()=>{selectedGroup=group;renderWheel();};return button;
  }));
  hud.querySelector('.jc-list').replaceChildren(...abilities.filter(a=>a.group===selectedGroup).map(a=>{
    const button=document.createElement('button');button.className=a.id===selectedAbility?'selected':'';
    button.innerHTML=`${a.name}<small>${a.cost} grace · ${a.cooldown}s cooldown</small>`;button.style.backgroundImage=`url('./miracles/${abilityArt(a.id)}.webp')`;
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
  if (!play) {if(interiorState)exitInterior(false);conversation.close({restoreFocus:false});miracleEffects?.clear();}
  playing = play;window.JC_WORLD_SCALE=1;
  if(player)cinematicLook?.update(0,performance.now(),player.position,velocity,false,false,play);
  npcSystem?.setVisible(play);
  trafficSystem?.setVisible(play);
  if(!play){const panel=hud.querySelector('#jcWorldPanel');if(panel)panel.hidden=true;hud.querySelector('#jcWorldToggle')?.setAttribute('aria-expanded','false');}
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
  miracleEffects?.update(now);
  if (conversation.isOpen) {window.JC_WORLD_SCALE=0;last=now;return;}
  const elapsed = Math.max(0, now - last);
  const dt = Math.min(.045, elapsed / 1000);
  last = now;
  if (document.hidden) {window.JC_WORLD_SCALE=0;frameWindow = now; return;}
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
  if (!playing) {window.JC_WORLD_SCALE=1;return;}
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
  if(wheel.classList.contains('open')){window.JC_WORLD_SCALE=0;velocity.set(0,0,0);return;}
  const worldScale=now<stasisUntil?0:now<timeScaleUntil?.22:1;window.JC_WORLD_SCALE=worldScale;const worldDt=dt*worldScale;worldClock+=worldDt*1000;
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
  if(interiorState){
    window.JC_WORLD_SCALE=0;const move=desired.clone().setY(0);if(move.lengthSq()>1)move.normalize();
    const indoorSpeed=(keys.has('Shift')||padKeys.has('Shift'))?5.2:3.8;
    player.position.x=THREE.MathUtils.clamp(player.position.x+move.x*indoorSpeed*dt,interiorState.minX,interiorState.maxX);
    player.position.z=THREE.MathUtils.clamp(player.position.z+move.z*indoorSpeed*dt,interiorState.minZ,interiorState.maxZ);player.position.y=interiorState.floorY;terrainY=interiorState.floorY;
    velocity.set(move.x*indoorSpeed,0,move.z*indoorSpeed);const indoorVelocity=Math.hypot(velocity.x,velocity.z);
    if(indoorVelocity>.15)playerStepPhase=advanceGait(playerStepPhase,indoorVelocity,dt,indoorVelocity>4.5);
    const indoorPose=indoorVelocity>1.1?(indoorVelocity>4.5?runPoseSet:walkPoseSet)[Math.floor(playerStepPhase)]:0;
    portrait.userData.character.setPose(indoorPose,playerStepPhase,indoorVelocity,now,false);applyCharacterFrame(indoorPose);portrait.rotation.y=Math.PI+yaw;
    if(realisticAvatar){realisticAvatar.material.rotation=0;realisticAvatar.position.y=realisticAvatar.scale.y*(.5-POSE_FRAME_BOTTOM_PADDING/POSE_FRAME_HEIGHT);}
    const focus=player.position.clone().add(new THREE.Vector3(0,2.05,0));
    const cameraPoint=focus.clone().add(new THREE.Vector3(-Math.sin(yaw)*4.2,1.05,Math.cos(yaw)*4.2));
    cameraPoint.x=THREE.MathUtils.clamp(cameraPoint.x,interiorState.minX+.2,interiorState.maxX-.2);cameraPoint.z=THREE.MathUtils.clamp(cameraPoint.z,interiorState.minZ+.2,interiorState.maxZ-.2);cameraPoint.y=interiorState.floorY+2.65;
    game.camera.position.copy(cameraPoint);game.camera.lookAt(focus);game.controls?.target?.copy(focus);
    grace=THREE.MathUtils.clamp(grace+12*dt,0,100);graceLabel.textContent=Math.round(grace);
    nearNpc=null;npcTalkButton.classList.remove('available');prayerButton.classList.remove('available');
    stateLabel.textContent='INSIDE · '+(interiorState.identity.type||'BUILDING').toUpperCase();flightLabel.textContent=interiorState.identity.name||'BUILDING INTERIOR';targetLabel.textContent='';
    feedbackLabel.style.opacity=now<feedbackUntil?'1':'0';const indoorAbility=abilities.find(a=>a.id===selectedAbility);hud.querySelector('#jcAbilityReady').textContent='Exit building to cast · E';
    runLabel.textContent='INTERIOR · '+(interiorState.identity.name||interiorState.identity.type||'BUILDING');
    return;
  }
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
  else if(shouldTouchDown(flying,previousHeight,flightHeight,velocity.y)){setFlight('touchdown');velocity.y=0;}
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
    realisticAvatar.position.y=realisticAvatar.scale.y*(.5-POSE_FRAME_BOTTOM_PADDING/POSE_FRAME_HEIGHT)+(flying?Math.sin(now*.004)*.06:0);
  }
  portrait.rotation.y=Math.PI+yaw;
  portrait.position.y = velocity.lengthSq() > 1 && !flying ? Math.sin(now * .014) * .035 : 0;
  for (const s of souls) {
    if (!s.visible) continue;
    if(now>stasisUntil) {s.rotation.y += worldDt * 1.6;s.position.y = s.userData.baseY + Math.sin(worldClock * .002 + s.position.z) * .25;}
    if (s.position.distanceTo(player.position.clone().add(new THREE.Vector3(0,1.6,0))) < 3.4) collect(s);
  }
  if(worldDt>0)npcSystem?.update(worldDt,now);
  trafficSystem?.update(dt,now,player,npcSystem?.npcs,(car)=>{
    if(Math.abs((player.position.y||0)-car.y)>3.2)return;
    const dx=player.position.x-car.x,dz=player.position.z-car.z,length=Math.hypot(dx,dz)||1;
    velocity.x+=dx/length*7;velocity.z+=dz/length*7;grace=Math.max(0,grace-5);feedback('TRAFFIC IMPACT · GRACE -5');
    npcSystem?.signal('traffic-impact',new THREE.Vector3(car.x,car.y,car.z),18);
  },(npc,car)=>npcSystem?.trafficImpact(npc,car));
  worldLandmarks?.update(dt);
  nearNpc=closestNpc();
  if(nearNpc?.prayer?.answered&&now>=nearNpc.prayer.nextAt)assignNpcPrayer(nearNpc,nearNpc.name.charCodeAt(0)+prayersAnswered,now);
  const prayerNpc=pendingPrayerNpc();
  npcTalkButton.classList.toggle('available',coarseDevice&&!!nearNpc&&!talk.classList.contains('open'));npcTalkButton.textContent=nearNpc?`TALK TO ${nearNpc.name.toUpperCase()}`:'TALK';
  prayerButton.classList.toggle('available',!!prayerNpc&&!talk.classList.contains('open'));prayerButton.textContent=prayerNpc?`ANSWER ${prayerNpc.name.toUpperCase()}'S PRAYER`:'ANSWER PRAYER';
  npcReadout.textContent=talk.classList.contains('open')?npcReadout.textContent:(prayerNpc?`${prayerNpc.name.toUpperCase()} PRAYS: ${prayerNpc.prayer.text} · Q TO ANSWER`:nearNpc?`NEAR ${nearNpc.name.toUpperCase()} · ${nearNpc.faction.toUpperCase()} · PRESS C TO TALK`:`${npcSystem?.totalPopulation||0} CITIZENS · ${npcSystem?.npcs.length||0} TALKABLE · OPEN WORLD`);
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
  updateStreetHud(now);
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
  const stripSection=game.sections?.find(section=>section.id==='C15_R14');
  const corners=stripSection?.cornersLonLat||[];
  const referenceLon=corners.length?corners.reduce((sum,point)=>sum+point[0],0)/corners.length:-115.173;
  const referenceLat=corners.length?corners.reduce((sum,point)=>sum+point[1],0)/corners.length:36.108;
  vegasStreetNetwork=createVegasStreetNetwork({anchorX:targetX,anchorZ:targetZ,referenceLon,referenceLat});
  const [x, z] = clearSpot(targetX, targetZ);
  installPavedRoads(targetX, targetZ, vegasStreetNetwork);
  worldLandmarks=installVegasLandmarks(vegasStreetNetwork);
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
  npcSystem=createNpcSystem({scene:game.scene,player,groundAt,isSafe:(x,z,r=2)=>!blockedAt(x,groundAt(x,z)+1.55,z,r),count:coarseDevice?8:(window.JC_NPC_COUNT||16),crowdCount:coarseDevice?180:500,mobile:coarseDevice,onReport:text=>{npcReadout.textContent=text;}});
  npcSystem.npcs.forEach((npc,index)=>assignNpcPrayer(npc,index));
  const savedTracked=npcContacts.getTrackedId();
  if(savedTracked)npcSystem.setTracked(savedTracked);
  trafficSystem=createTrafficSystem({scene:game.scene,network:vegasStreetNetwork,groundAt,mobile:coarseDevice});
  npcReadout.textContent=npcSystem.totalPopulation.toLocaleString()+' CITIZENS · '+npcSystem.npcs.length+' TALKABLE · CLICK A PERSON TO TALK';
  npcReadout.style.cursor='pointer';npcReadout.setAttribute('role','button');npcReadout.tabIndex=0;npcReadout.onclick=()=>{selectWorldTab('people');hud.querySelector('#jcWorldPanel').hidden=false;hud.querySelector('#jcWorldToggle').setAttribute('aria-expanded','true');soundPanel.hidden=true;soundToggle.setAttribute('aria-expanded','false');renderContactList();};npcReadout.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();npcReadout.onclick();}};
  hud.querySelector('#jcEditor').onclick = () => setMode(false);
  const worldPanel=hud.querySelector('#jcWorldPanel'),worldToggle=hud.querySelector('#jcWorldToggle'),soundToggle=hud.querySelector('#jcSoundToggle'),soundPanel=hud.querySelector('#jcSoundPanel');
  const soundMute=hud.querySelector('#jcSoundMute');
  function syncSoundControls(){
    const settings=jcAudio.getSettings();
    soundToggle.textContent=settings.muted?'SOUND OFF':'SOUND';
    soundToggle.setAttribute('aria-label',settings.muted?'Sound muted. Open sound settings':'Open sound settings');
    soundMute.textContent=settings.muted?'UNMUTE ALL':'MUTE ALL';
    for(const key of ['master','music','effects']){
      const input=hud.querySelector(`[data-audio-level="${key}"]`),output=hud.querySelector(`#jc${key==='master'?'Master':key==='music'?'Music':'Effects'}Value`);
      input.value=String(Math.round(settings[key]*100));output.textContent=input.value+'%';
    }
  }
  soundToggle.onclick=()=>{jcAudio.start();const open=soundPanel.hidden;soundPanel.hidden=!open;soundToggle.setAttribute('aria-expanded',String(open));if(open){worldPanel.hidden=true;worldToggle.setAttribute('aria-expanded','false');jcAudio.play('ui');}};
  hud.querySelector('#jcSoundClose').onclick=()=>{soundPanel.hidden=true;soundToggle.setAttribute('aria-expanded','false');jcAudio.play('ui');};
  soundMute.onclick=()=>{const muted=!jcAudio.getSettings().muted;jcAudio.set('muted',muted);syncSoundControls();if(!muted)jcAudio.play('ui');};
  soundPanel.querySelectorAll('[data-audio-level]').forEach(input=>input.addEventListener('input',()=>{jcAudio.set(input.dataset.audioLevel,Number(input.value)/100);syncSoundControls();}));
  function selectWorldTab(name){
    const mapTab=hud.querySelector('#jcWorldMapTab'),peopleTab=hud.querySelector('#jcWorldPeopleTab');
    const mapSelected=name!=='people';
    mapTab.hidden=!mapSelected;peopleTab.hidden=mapSelected;
    hud.querySelectorAll('[data-world-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.worldTab===(mapSelected?'map':'people'))));
    if(mapSelected)drawWorldMap();else renderContactList();
  }
  worldToggle.onclick=()=>{
    const open=worldPanel.hidden;worldPanel.hidden=!open;worldToggle.setAttribute('aria-expanded',String(open));
    if(open){soundPanel.hidden=true;soundToggle.setAttribute('aria-expanded','false');selectWorldTab('map');renderContactList();}
  };
  hud.querySelector('#jcWorldClose').onclick=()=>{worldPanel.hidden=true;worldToggle.setAttribute('aria-expanded','false');};
  hud.querySelectorAll('[data-world-tab]').forEach(button=>button.addEventListener('click',()=>selectWorldTab(button.dataset.worldTab)));
  hud.querySelector('#jcContactSearch').addEventListener('input',renderContactList);
  worldPanel.addEventListener('click',event=>{
    const region=event.target.closest('[data-region]');
    if(region){travelToRegion(region.dataset.region);return;}
    const action=event.target.closest('[data-contact-action]');
    if(!action)return;
    const id=action.dataset.contactId,npc=npcSystem?.npcs.find(person=>person.id===id),contact=npcContacts.getAll().find(person=>person.id===id);
    if(action.dataset.contactAction==='remove'){
      npcContacts.remove(id);npcSystem?.setTracked(npcContacts.getTrackedId());renderContactList();updateSaveContactButton();return;
    }
    if(action.dataset.contactAction==='track'){
      npcContacts.setTracked(id);
      if(npc){npcContacts.touch(npc);npcSystem?.setTracked(id);feedback('TRACKING '+npc.name.toUpperCase());}
      else{npcSystem?.setTracked(null);feedback('TRACKING LAST KNOWN LOCATION');}
      renderContactList();drawWorldMap();return;
    }
    if(action.dataset.contactAction==='talk'){
      if(npc){openNpcTalk(npc,{track:true});worldPanel.hidden=true;worldToggle.setAttribute('aria-expanded','false');}
      else if(contact){npcContacts.setTracked(id);npcSystem?.setTracked(null);feedback('PERSON NOT IN THIS CROWD · TRACKING LAST KNOWN LOCATION');renderContactList();}
    }
  });
  hud.querySelector('#jcSaveContact').addEventListener('click',()=>{
    if(!activeConversationNpc)return;
    const result=npcContacts.toggle(activeConversationNpc);
    if(result.saved){npcContacts.setTracked(activeConversationNpc.id);npcSystem?.setTracked(activeConversationNpc.id);feedback('SAVED & TRACKING '+activeConversationNpc.name.toUpperCase());}
    else{npcSystem?.setTracked(npcContacts.getTrackedId());feedback('REMOVED '+activeConversationNpc.name.toUpperCase()+' FROM CONTACTS');}
    renderContactList();updateSaveContactButton();
  });
  syncSoundControls();
  playReturn.onclick = () => setMode(true);
  addEventListener('keydown', e => {
    if (conversation.isOpen || !playing || e.target.closest('input,select,textarea')) return;
    if(e.target.closest('button')&&(e.code==='Space'||e.code==='Enter'))return;
    if(wheel.classList.contains('open')){if(e.code==='Tab'||e.code==='Escape'){e.preventDefault();toggleWheel();}return;}
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['w','a','s','d','e','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift','b'].includes(key)) keys.add(key);
    if(e.code==='Space'||e.code.startsWith('Control')){keys.add(e.code==='Space'?'Space':'Control');e.preventDefault();}
    if(e.code==='KeyC'&&!e.repeat){e.preventDefault();if(conversation.isOpen)conversation.close();else openNpcTalk();return;}
    if(e.code==='KeyE'&&!e.repeat&&!flying){e.preventDefault();toggleInterior();return;}
    if(e.code==='KeyL'&&!e.repeat)cycleTarget();
    if(e.code==='KeyK'&&!e.repeat)cycleBuildingTarget();
    if (e.code === 'Space' && !e.repeat && !flying) dash();
    if (e.code === 'KeyQ' && !e.repeat) {if(!answerPrayer())cast();}
    if (e.code === 'KeyF' && !e.repeat) cast('flight');
    if (e.code === 'KeyG' && !e.repeat) cast('hypersonic');
    if (e.code === 'KeyV' && !e.repeat) beginDive(true);
    if (e.code === 'KeyT' && !e.repeat) {cast('teleport');}
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
  const npcRay=new THREE.Raycaster(),npcPointer=new THREE.Vector2();
  function pickNpcAt(clientX,clientY){
    if(!npcSystem||!game)return null;
    const rect=game.renderer.domElement.getBoundingClientRect();
    npcPointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
    npcRay.setFromCamera(npcPointer,game.camera);
    const hit=npcRay.intersectObjects(npcSystem.npcs.map(npc=>npc.sprite).filter(Boolean),true)[0];
    let object=hit?.object;
    while(object){if(object.userData?.npcRef)return object.userData.npcRef;object=object.parent;}
    let nearest=null,nearestPixels=coarseDevice?44:32;
    for(const npc of npcSystem.npcs){
      const point=npc.position.clone().add(new THREE.Vector3(0,1.6,0)).project(game.camera);
      if(point.z>1)continue;
      const sx=(point.x+1)*.5*rect.width,sy=(1-point.y)*.5*rect.height;
      const pixels=Math.hypot(sx-(clientX-rect.left),sy-(clientY-rect.top));
      if(pixels<nearestPixels){nearest=npc;nearestPixels=pixels;}
    }
    return nearest;
  }
  game.renderer.domElement.addEventListener('pointerdown', e => {
    if (!playing) return;
    if(teleportAim){pointerStart=null;e.preventDefault();chooseTeleportPoint(e.clientX,e.clientY);return;}
    pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY};
    dragging = true;lookPointer=e.pointerId;game.renderer.domElement.setPointerCapture(e.pointerId);pointerX = e.clientX;pointerY = e.clientY;
  });
  for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>{
    if(e.pointerId!==lookPointer)return;
    const clicked=type==='pointerup'&&pointerStart?.id===e.pointerId&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<7;
    dragging=false;lookPointer=null;pointerStart=null;
    if(clicked&&playing&&!teleportAim&&!conversation.isOpen&&!wheel.classList.contains('open')&&hud.querySelector('#jcWorldPanel').hidden){
      const npc=pickNpcAt(e.clientX,e.clientY);
      if(npc){e.preventDefault();openNpcTalk(npc,{track:true});}
    }
  });
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
  hud.querySelector('[data-action="teleport"]').onclick=()=>{cast('teleport');};
  hud.querySelector('[data-action="cast"]').onclick=()=>{if(!answerPrayer())cast();};
  hud.querySelector('[data-action="enter"]').onclick=()=>toggleInterior();
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
