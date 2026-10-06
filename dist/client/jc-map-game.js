import {accelerateVelocity} from './realistic-motion.js';
import {createCharacterContact} from './character-contact.js';
import {loadPhotoFacades,getFacadeEmissiveMap} from './photo-facades.js?v=3d-20261003';
import {createCraterSystem} from './crater-system.js';
import {createCinematicLook} from './cinematic-look.js';
import * as THREE from './three.module.js';
import {cloneBuildingMaterial} from './map-materials.js';

import {stickAxis, response, advanceChain, advanceGait, advanceLook, setFlightForward} from './jc-control-math.js';
import {transitionFlight,shouldTouchDown} from './jc-flight-state.js';
import {createMiracleEffects} from './jc-miracle-effects.js';
import {loadRearWalk,loadPoseSheet,FLIGHT_CELLS} from './rear-walk.js';
import {cachedGroundSample} from './ground-sampling.js';
import {addBackgroundMusic} from './background-music.js';
import {createCityMissions} from './city-missions.js';
let cityMissions=null,systemicWorld=null,livingWorld=null;
import {createNpcSystem} from './jc-npcs.js';
import {createNpcConversation} from './npc-conversation.js';
import {createExplorableWorld} from './explorable-world.js';
import {createCharacter3D} from './jc-character3d.js';
import {cleanPoseImage} from './pose-cleanup.js';
import {abilityWheelPage,minimapPoint,compassHeading} from './jc-hud-model.js';
import {selectFlightPose,selectGroundPose} from './jc-character-pose.js';
import {setNpcApiKey,clearNpcApiKey} from './npc-dialogue.js';
import {createJcAudio} from './jc-audio.js';
import {createFireSystem} from './fire-system.js';
import {createSystemicWorld} from './systemic-world.js';
import {createLivingWorldDirector} from './living-world-director.js';
import {createStreetPickups} from './street-pickups.js';

const jcAudio=createJcAudio();
let worldTimeMode='day';
try{
 const savedTime=localStorage.getItem('jc-map-time-of-day');
 if(savedTime==='day'||savedTime==='night')worldTimeMode=savedTime;
 else {const legacy=JSON.parse(localStorage.getItem('jc-master-upgrade')||'null');if(legacy?.dayNight==='night')worldTimeMode='night';}
}catch{}
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
#jcOpenWheel{margin-top:8px;padding:8px 10px;font-size:10px;letter-spacing:.08em}
#jcMinimap{position:absolute;top:142px;left:12px;width:144px;height:144px;border:1px solid #e8c983a0;border-radius:50%;overflow:hidden;background:#09131dee;box-shadow:0 4px 20px #000b;pointer-events:none}
#jcMinimap canvas{display:block;width:100%;height:100%;border-radius:50%}
#jcStreetReadout{position:absolute;left:12px;top:294px;max-width:144px;padding:6px 8px;border:1px solid #e8c98388;border-radius:6px;background:#091018e8;color:#fff1c9;font:700 10px/1.25 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-shadow:0 1px 3px #000;pointer-events:none}
#jcCompass{position:absolute;inset:5px 0 auto;display:flex;justify-content:center;align-items:center;gap:4px;text-align:center;color:#fff2c9;font:800 9px/1 Arial,sans-serif;text-shadow:0 1px 4px #000;letter-spacing:.08em}
#jcCompass b{color:#ff765e;font-size:11px}
#jcWheel{display:none;position:fixed;inset:0;z-index:35;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));background:#040810b8;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);pointer-events:auto;touch-action:none}
#jcWheel.open{display:block}
#jcWheel.open{display:flex}
#jcWheel .jc-wheel-panel{width:min(440px,96vw);display:grid;justify-items:center;gap:10px;filter:drop-shadow(0 12px 35px #0009)}
#jcWheel .jc-wheel-title{width:100%;display:flex;justify-content:space-between;align-items:center;margin:0 5px;color:#f4e8cd;letter-spacing:.12em}
#jcWheel .jc-groups{display:flex;justify-content:center;gap:6px;width:100%}
#jcWheel .jc-groups button{min-height:40px;padding:8px 14px;border-radius:22px;background:#111d29;color:#dce7f0;border:1px solid #ffffff28}
#jcWheel .jc-groups button[aria-pressed=true]{background:#90733d70;border-color:#f0d28b;color:#fff1c9}
#jcWheel .jc-list{position:relative;width:min(82vw,370px);height:min(82vw,370px);max-width:calc(100dvh - 210px);max-height:calc(100dvh - 210px);min-width:260px;min-height:260px;border:1px solid #e8c9837a;border-radius:50%;background:radial-gradient(circle,#08121f 0 25%,#111d2ccf 26% 56%,#0b1420e8 57% 100%);box-shadow:inset 0 0 30px #0009,0 0 30px #0008;overflow:hidden}
#jcWheel .jc-list:before{content:"";position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(from -22.5deg,transparent 0deg 44deg,#e8c98335 44.5deg 45deg);mask:radial-gradient(circle,transparent 0 25%,#000 26% 100%);pointer-events:none}
#jcWheel .jc-wheel-slot{position:absolute;left:var(--x);top:var(--y);transform:translate(-50%,-50%);width:26%;height:22%;min-width:54px;min-height:56px;padding:4px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:12px;background:#101b28d9;border:1px solid #ffffff1e;color:#e8edf1;text-align:center;font-size:10px;line-height:1.1;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#jcWheel .jc-wheel-slot.selected{border-color:#ffe293;background:#6c552bde;box-shadow:0 0 18px #ffd77c8c;color:#fff5dd}
#jcWheel .jc-wheel-slot img{width:24px;height:24px;object-fit:contain;pointer-events:none}
#jcWheel .jc-wheel-slot small{font-size:8px;color:#d4c7ac;pointer-events:none}
#jcWheel .jc-wheel-core{position:absolute;left:50%;top:50%;width:37%;height:37%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:50%;background:#08111ce8;border:1px solid #e8c98345;text-align:center;pointer-events:none;padding:7px}
#jcWheel .jc-wheel-core strong{font-size:13px;color:#fff0c8;line-height:1.1}
#jcWheel .jc-wheel-core small{color:#bfcbd7;font-size:9px}
#jcWheel .jc-wheel-nav{display:flex;gap:6px;pointer-events:auto}
#jcWheel .jc-wheel-nav button{padding:5px 10px;border-radius:15px;font-size:10px;background:#182536;border-color:#ffffff30;color:#f4e8cd}
#jcWheel .jc-wheel-title button{border-radius:50%;width:38px;height:38px;padding:0}
#jcSettingsPanel{display:none;position:fixed;z-index:38;left:50%;top:50%;transform:translate(-50%,-50%);width:min(380px,92vw);padding:20px;background:#09131df5;border:1px solid #e8c983;border-radius:12px;color:#fff;pointer-events:auto;box-shadow:0 12px 45px #000c}#jcSettingsPanel.open{display:grid;gap:10px}#jcSettingsPanel h3{margin:0;color:#ffe2a0}#jcSettingsPanel label,#jcSettingsPanel p,#jcSettingsPanel span{font-size:12px;color:#c8d1dc}#jcSettingsPanel input{padding:11px;background:#111d29;border:1px solid #75808d;border-radius:5px;color:#fff}
#jcHud .jc-mini-label{top:127px}
@media(max-width:440px){#jcMinimap{width:122px;height:122px;top:142px}#jcStreetReadout{top:270px;max-width:122px;font-size:9px}#jcHud .jc-mini-label{top:127px}#jcWheel .jc-wheel-panel{gap:8px}#jcWheel .jc-list{width:min(88vw,340px);height:min(88vw,340px);min-width:248px;min-height:248px;max-width:calc(100dvh - 190px);max-height:calc(100dvh - 190px)}#jcWheel .jc-wheel-slot{font-size:9px;min-width:48px;min-height:50px}#jcWheel .jc-wheel-slot img{width:20px;height:20px}#jcWheel .jc-wheel-core strong{font-size:11px}}
#jcPlayReturn{display:none;position:fixed;top:12px;right:12px;z-index:7}
body:not(.jc-playing) #jcPlayReturn{display:block}
#jcHud .jc-mini-label{position:absolute;left:20px;top:129px;color:#e5d5aa;font-size:8px;letter-spacing:.14em;text-shadow:0 1px 4px #000}
@media(max-width:800px),(pointer:coarse){#jcHud .jc-touch{display:grid;bottom:calc(env(safe-area-inset-bottom) + 12px)}#jcHud .jc-hint{display:none}#jcHud .jc-score{font-size:12px}#jcHud .jc-score strong{font-size:15px}#jcHud .jc-ability{top:76px;right:8px;font-size:12px}#jcHud .jc-ability button{min-height:44px}#jcHud .jc-actions{width:min(37vw,146px);max-height:42vh;gap:5px}#jcHud .jc-actions button{padding:7px 5px;font-size:12px;min-height:46px}}
`;
style.textContent += '@media(max-width:800px){#jcMissionPanel{left:12px!important;top:306px!important;max-width:calc(100vw - 24px)}}@media(max-width:440px){#jcHud .jc-top{top:8px;left:8px;right:8px;gap:6px}#jcHud .jc-score{max-width:55vw;padding:7px 9px;font-size:10px;line-height:1.35}#jcHud .jc-score strong{font-size:13px}#jcHud .jc-score button{padding:5px 6px;font-size:9px}#jcHud .jc-ability{top:68px;right:8px;max-width:40vw;padding:7px 8px;font-size:9px}#jcHud .jc-ability button{min-height:34px!important;padding:6px 7px!important;font-size:9px}#jcMinimap{top:132px;width:112px;height:112px}#jcStreetReadout{top:250px;max-width:112px}#jcHud .jc-mini-label{top:117px}#jcNpcReadout{bottom:calc(env(safe-area-inset-bottom) + 118px)!important;max-width:50vw!important;font-size:9px!important;padding:5px 7px!important}}#jcHud,#jcHud *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}#jcTalk input,#jcTalk textarea{-webkit-user-select:text;user-select:text}#jcHud button,#jcStick,#jcLookStick{touch-action:none}';
document.head.append(style);

const hud = document.createElement('div');
hud.id = 'jcHud';
hud.innerHTML = `<div class="jc-top"><div class="jc-score">JC · STRIP RESTORATION<br><strong id="jcScore">0 / 8</strong> LIGHTS &nbsp; GRACE <span id="jcGrace">100</span>%<div id="jcRun">Restore 8 lights · start moving to begin</div><button id="jcRestart" type="button">RESTART RUN</button><button id="jcSettings" type="button">SETTINGS</button><button id="jcCallCar" type="button">CALL CAR</button></div><button id="jcEditor" type="button">CITY EDITOR</button></div><div class="jc-ability">SELECTED MIRACLE<strong id="jcSelected">Light Pulse</strong><span id="jcState">Grounded</span><span id="jcElectric">STORM 0%</span><span id="jcAbilityReady">Ready</span><button id="jcOpenWheel" type="button">OPEN MIRACLE WHEEL</button></div><div class="jc-mini-label">CITY RADAR</div><div id="jcStreetReadout">STREET · LOCATING…</div><div id="jcMinimap" aria-label="Circular minimap with compass"><canvas id="jcMinimapCanvas" width="288" height="288" aria-label="Nearby buildings, people and lights"></canvas><div id="jcCompass"><b>▲</b><span id="jcHeadingReadout">N 000°</span></div></div><div class="jc-hint">WASD move · Drag to look / aim · Right stick look / flight pitch · Shift sprint · Space dash / rise · Ctrl descend · F fly · G boost · V dive · B brake · K building target · L light target · T teleport · Q cast · Tab miracles · H call car · E enter/exit</div><div id="jcFeedback" role="status" aria-live="polite"></div><div id="jcTarget"></div><div id="jcFlight"></div><div class="jc-touch"><div id="jcStick" role="group" aria-label="Left joystick: move"><i></i></div><div id="jcLookStick" role="group" aria-label="Right joystick: look and steer flight pitch"><i></i></div><div class="jc-actions"><button data-move="e" type="button">RISE</button><button data-move="c" type="button">DROP</button><button data-move="b" type="button">BRAKE</button><button data-action="boost" type="button">BOOST</button><button data-action="dive" type="button">DIVE</button><button data-action="fly" type="button">FLY</button><button data-action="land" type="button">LAND</button><button data-action="more" type="button" aria-expanded="false">MORE</button><div class="jc-extras"><button data-action="lock" type="button">TARGET</button><button data-action="teleport" type="button">PORTAL</button><button data-action="cast" type="button">CAST MIRACLE</button><button data-action="wheel" type="button">MIRACLE WHEEL · 44 POWERS</button><button data-action="car" type="button">JC CAR</button><button data-action="preset" type="button">PRESET 1</button><button data-action="preset" type="button">PRESET 2</button><button data-action="preset" type="button">PRESET 3</button><button data-action="preset" type="button">PRESET 4</button><button data-action="edit-presets" type="button">EDIT PRESETS</button></div></div></div><div id="jcSettingsPanel" role="dialog" aria-modal="true"><h3>GAME SETTINGS</h3><label for="jcGroqKey">Groq API key for NPC dialogue</label><input id="jcGroqKey" type="password" autocomplete="new-password" placeholder="gsk_…"><p>Held in memory in this tab only; clear it or reload to remove it.</p><span id="jcKeyStatus">Using game key if configured</span><button id="jcTimeToggle" type="button">SWITCH TO NIGHT</button><button id="jcSoundToggle" type="button">MUTE SOUND</button><label for="jcMasterVolume">Master volume</label><input id="jcMasterVolume" type="range" min="0" max="1" step="0.01"><label for="jcMusicVolume">Ambience</label><input id="jcMusicVolume" type="range" min="0" max="1" step="0.01"><label for="jcEffectsVolume">Sound effects</label><input id="jcEffectsVolume" type="range" min="0" max="1" step="0.01"><button id="jcKeyApply" type="button">USE KEY</button><button id="jcKeyClear" type="button">CLEAR KEY</button><button id="jcSettingsClose" type="button">CLOSE</button></div><div id="jcWheel" role="dialog" aria-label="JC miracles" aria-modal="true"><div class="jc-wheel-panel"><div class="jc-wheel-title"><strong>CHOOSE A MIRACLE</strong><button id="jcWheelClose" type="button" aria-label="Close miracles">✕</button></div><div class="jc-groups" role="tablist" aria-label="Miracle category"></div><div class="jc-list" role="group" aria-label="Miracle selection wheel"><div class="jc-wheel-core"><span id="jcWheelFocus">SELECT AN ABILITY</span><strong>44 MIRACLES · 44 POWERS</strong><small id="jcWheelCost">3 CATEGORIES</small><div class="jc-wheel-nav"><button id="jcWheelPrev" type="button" aria-label="Previous miracles">‹</button><button id="jcWheelNext" type="button" aria-label="Next miracles">›</button></div></div></div></div></div>`;
document.body.append(hud);
style.textContent += '#jcNpcReadout{position:absolute;left:12px;bottom:144px;max-width:min(390px,78vw);padding:7px 10px;background:#091018d9;border-left:2px solid #c4ffee;color:#c4ffee;font-size:11px;letter-spacing:.4px;pointer-events:auto}#jcNpcTalkButton{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 178px);transform:translateX(-50%);display:none;pointer-events:auto;padding:11px 16px;border:1px solid #f1d17e;border-radius:8px;background:#111b2aee;color:#ffe6a4;font-weight:900;box-shadow:0 6px 18px #0009;z-index:2}#jcNpcTalkButton.available{display:block}@media(pointer:fine){#jcNpcTalkButton{display:none!important}}#jcPeople{position:absolute;left:12px;top:48%;z-index:3;pointer-events:auto}#jcPeopleToggle{padding:9px 12px!important;background:#091018eF!important;border:1px solid #f9d878!important;color:#ffe6a4!important}#jcPeoplePanel{display:none;width:min(280px,78vw);max-height:38vh;overflow:auto;margin-top:6px;padding:8px;background:#091018f2;border:1px solid #f9d878;border-radius:8px}#jcPeoplePanel.open{display:block}#jcPeoplePanel button{display:block;width:100%;text-align:left;margin:4px 0;padding:8px!important}#jcPersonMarker{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;pointer-events:none;background:#071018e8;border:1px solid #ffe18c;border-radius:15px;padding:6px 10px;color:#ffe6a4;font-size:13px;text-shadow:0 1px 4px #000;white-space:nowrap;display:none}#jcPersonMarker.visible{display:block}#jcPersonMarker b{font-size:20px;vertical-align:middle;margin-right:5px}';
const npcReadout=document.createElement('div');npcReadout.id='jcNpcReadout';npcReadout.textContent='CITY FOLKS · OBSERVING';hud.append(npcReadout);
const worldStateReadout=document.createElement('div');worldStateReadout.id='jcWorldState';worldStateReadout.textContent='SIN CITY SYSTEMS · INITIALIZING';worldStateReadout.style.cssText='margin-top:6px;max-width:min(520px,82vw);padding:5px 0;color:#ffe9b0;font-size:10px;line-height:1.35;letter-spacing:.35px;pointer-events:none';(hud.querySelector('.jc-score')||hud).append(worldStateReadout);
const livingWorldReadout=document.createElement('div');livingWorldReadout.id='jcLivingWorld';livingWorldReadout.textContent='LIVING WORLD · INITIALIZING';livingWorldReadout.style.cssText='margin-top:3px;max-width:min(560px,84vw);color:#c4ffee;font-size:10px;line-height:1.35;letter-spacing:.3px;pointer-events:none';(hud.querySelector('.jc-score')||hud).append(livingWorldReadout);
  const npcTalkButton=document.createElement('button');npcTalkButton.id='jcNpcTalkButton';npcTalkButton.type='button';npcTalkButton.textContent='TALK';npcTalkButton.setAttribute('aria-label','Talk to nearby character');hud.append(npcTalkButton);
const peopleUI=document.createElement('div');peopleUI.id='jcPeople';peopleUI.innerHTML='<button id=jcPeopleToggle type=button>CONTACTS · 0</button><div id=jcPeoplePanel aria-label=Saved contacts></div>';hud.append(peopleUI);
const worldPrompt=document.createElement('button');worldPrompt.id='jcWorldPrompt';worldPrompt.type='button';worldPrompt.hidden=true;worldPrompt.style.cssText='position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);transform:translateX(-50%);z-index:5;padding:10px 14px;background:#08131ef2;color:#ffe6a4;border:1px solid #f1d17e;border-radius:9px;font-weight:800;pointer-events:auto';worldPrompt.onclick=()=>{const state=explorableWorld?.update(performance.now());if(state?.canTransit)explorableWorld.linkedZone(explorableWorld.catalog.places.get('military:groom-lake'));else if(explorableWorld?.active)explorableWorld.exit();else if(state?.nearby?.kind==='storm-drain-game-access')explorableWorld.enterDrain(state.nearby);else if(state?.canEnter&&state.nearby?.id==='military:nellis')explorableWorld.linkedZone(state.nearby);else if(state?.canEnter)explorableWorld.enter(state.nearby);};hud.append(worldPrompt);

const personMarker=document.createElement('div');personMarker.id='jcPersonMarker';personMarker.setAttribute('aria-live','polite');hud.append(personMarker);
let contacts=[];try{contacts=JSON.parse(localStorage.getItem('jc-saved-people-v1')||'[]');if(!Array.isArray(contacts))contacts=[];}catch{contacts=[];}
let selectedPerson=null;
const settingsPanel=hud.querySelector('#jcSettingsPanel');
hud.querySelector('#jcSettings').onclick=()=>settingsPanel.classList.add('open');
hud.querySelector('#jcSettingsClose').onclick=()=>settingsPanel.classList.remove('open');
const soundToggle=hud.querySelector('#jcSoundToggle'),soundSettings=jcAudio.getSettings();
for(const [key,id] of [['master','jcMasterVolume'],['music','jcMusicVolume'],['effects','jcEffectsVolume']]){const input=hud.querySelector('#'+id);input.value=String(soundSettings[key]);input.oninput=()=>jcAudio.set(key,input.value);}
soundToggle.textContent=soundSettings.muted?'UNMUTE SOUND':'MUTE SOUND';
soundToggle.onclick=()=>{const state=jcAudio.set('muted',!jcAudio.getSettings().muted);soundToggle.textContent=state.muted?'UNMUTE SOUND':'MUTE SOUND';jcAudio.play('ui');};
const timeToggle=hud.querySelector('#jcTimeToggle');
const refreshTimeToggle=()=>{timeToggle.textContent=worldTimeMode==='day'?'SWITCH TO NIGHT':'SWITCH TO DAY';timeToggle.setAttribute('aria-pressed',String(worldTimeMode==='day'));};
refreshTimeToggle();
timeToggle.onclick=()=>{worldTimeMode=worldTimeMode==='day'?'night':'day';try{localStorage.setItem('jc-map-time-of-day',worldTimeMode);}catch{}cinematicLook?.setTimeOfDay(worldTimeMode);for(const group of game?.loaded?.values?.()||[])group.userData.jcThemeApplied=false;wallpaperStrip();refreshTimeToggle();feedback(worldTimeMode==='day'?'DAYLIGHT ACTIVE':'NIGHT ACTIVE');};

hud.querySelector('#jcKeyApply').onclick=()=>{const input=hud.querySelector('#jcGroqKey'),ok=setNpcApiKey(input.value);input.value='';hud.querySelector('#jcKeyStatus').textContent=ok?'Personal Groq key active for this tab':'Enter a Groq key first';};
hud.querySelector('#jcKeyClear').onclick=()=>{clearNpcApiKey();hud.querySelector('#jcGroqKey').value='';hud.querySelector('#jcKeyStatus').textContent='Using game key if configured';};
style.textContent += '@media(max-width:800px),(pointer:coarse){#jcTalk{bottom:calc(env(safe-area-inset-bottom) + 170px)}}#jcTalk{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:min(420px,90vw);padding:12px;background:#08111eF2;border:1px solid #e0bf75;border-radius:10px;color:#f5f0df;display:none;pointer-events:auto;box-shadow:0 10px 35px #000b}#jcTalk.open{display:block}#jcTalkHead{display:flex;align-items:center;gap:10px}#jcTalk img{width:48px;height:58px;object-fit:contain;background:#111a28;border-radius:6px}#jcTalk strong{color:#ffdf94}#jcTalk small{display:block;color:#aebaca;margin-top:4px}#jcTalkLog{max-height:108px;overflow:auto;font-size:12px;line-height:1.45;padding:8px 0}#jcTalk form{display:flex;gap:6px}#jcTalk [data-voice]{min-width:42px;font-size:17px}#jcTalk input{min-width:0;flex:1;background:#111a28;color:white;border:1px solid #566273;border-radius:5px;padding:9px}#jcTalk button{background:#94702e;color:white;border:1px solid #efcf81;border-radius:5px;padding:8px 10px}#jcTalk button.close{margin-left:auto;background:#18212c}';
const talk=document.createElement('section');talk.id='jcTalk';talk.setAttribute('aria-label','Talk to nearby character');talk.innerHTML='<div id=jcTalkHead><img alt=""><div><strong></strong><small></small></div><button class=close type=button aria-label="Close conversation">×</button></div><div id=jcTalkLog role=log aria-live=polite></div><form><input maxlength=180 aria-label="Message to character" placeholder="Say something…"><button data-voice type=button aria-label="Record voice message with Groq Whisper" title="Record a message · Groq Whisper">🎙</button><button data-tts type=button aria-label="Repeat NPC reply aloud" title="Play NPC reply aloud">🔊</button><button type=submit>Send</button></form>';hud.append(talk);
let nearNpc=null;
let game, player, portrait, realisticAvatar, npcSystem, explorableWorld=null, souls = [], grace = 100, redeemed = 0, playerStepPhase=0, jcCar=null, drivingCar=false, carSpeed=0;
const conversation=createNpcConversation({panel:talk,log:talk.querySelector('#jcTalkLog'),worldContext:()=>explorableWorld?.context()||null,onWorldAction:(action,npc,message)=>{const goal=action?.npcAction?npcSystem?.command?.(npc,action,'ai'):npcSystem?.commandFromText?.(npc,message,'player');if(goal){const lines={'follow-player':"I'm with you.",'help-nearest':"I'll help them.",'protect-player':"I've got you.",'investigate-nearby':"I'll check it out.",'patrol-area':"I'll patrol the area.",'calm-nearest':"I'll calm them down.",'corrupt-nearest':"I'll handle them.",'attack-nearest-hostile':"I'm on it.",'flee-area':"I'm getting out."};return (lines[goal.type]||"I'm on it.")+` [${npc.name}: ${goal.type.replace(/-/g,' ')}]`;}const result=action?.itemType&&action?.placeId?explorableWorld?.requestItem(action,npc):null;return result?.direction||null;},onOpen:()=>{resetInput();velocity.set(0,0,0);},onClose:()=>resetInput(),notice:message=>feedback(message)});
function closestNpc(){
  if(!npcSystem||!player)return null;
  const interior=explorableWorld?.personNearby?.();if(interior)return interior;
  let nearest=null,nearestDistance=10;
  for(const npc of npcSystem.npcs){
    if(!npc.sprite)continue;
    const distance=npc.position.distanceTo(player.position);
    if(distance<nearestDistance){nearest=npc;nearestDistance=distance;}
  }
  return nearest;
}
function persistContact(npc){
 if(!npc)return;const id=String(npc.contactId??npc.id??npc.name),entry={id,name:npc.name,faction:npc.faction||'civilian',avatar:npc.avatar||npc.file||null,gender:npc.gender||'male',allegiance:npc.allegiance||'neutral',personality:npc.personality||'',occupation:npc.occupation||'',alignmentScore:npc.alignmentScore||0};
 contacts=[entry,...contacts.filter(c=>String(c.id)!==id)].slice(0,40);try{localStorage.setItem('jc-saved-people-v1',JSON.stringify(contacts));}catch{};renderPeople();
}
let lastNpcObservation=0;
function visibleToNpc(eye,focus){
 const length=eye.distanceTo(focus),steps=Math.ceil(length/5);
 for(let i=1;i<steps;i++){const p=eye.clone().lerp(focus,i/steps);if(blockedAt(p.x,p.y,p.z,.15))return false;}
 return true;
}
function observeNpcPlayer(){
 if(!npcSystem||!player||drivingCar)return;
 const state=hypersonic?'hypersonic':diving||descending?'descending':flying&&flightHeight<9?'hovering':flying?'flying':'grounded';
 const appearance=devilMode?'red devil form with bat wings':'white hooded robe and long dark hair';
 npcSystem.observePlayer({state,appearance});
}
function renderPeople(){const panel=hud.querySelector('#jcPeoplePanel');hud.querySelector('#jcPeopleToggle').textContent=`CONTACTS · ${contacts.length}`;panel.replaceChildren();if(!contacts.length){const p=document.createElement('p');p.textContent='Tap a person in the city to talk and save them here.';p.className='jc-hint';panel.append(p);return;}for(const contact of contacts){const row=document.createElement('button');row.type='button';row.textContent=`${String(contact.id)===String(selectedPerson?.contactId)?'✦ ':''}${contact.name} · ${contact.faction}`;const memories=npcSystem?.memorySummary(contact.id)||[];if(memories.length){const detail=document.createElement('small');detail.style.cssText='display:block;font-size:10px;color:#d8c8a0';detail.textContent='REMEMBERS · '+memories.at(-1);row.append(detail);}row.addEventListener('click',()=>{const npc=npcSystem?.npcs.find(n=>String(n.contactId)===String(contact.id))||contact;selectedPerson=npc;openNpcTalk(npc);});panel.append(row);}}
function openNpcTalk(npc=nearNpc){if(npc&&playing){observeNpcPlayer();persistContact(npc);livingWorld?.onNpcInteraction(npc);selectedPerson=npc;renderPeople();conversation.open(npc);}}
function pickPerson(clientX,clientY){if(!npcSystem||!game?.camera||!game?.renderer)return null;const rect=game.renderer.domElement.getBoundingClientRect(),limit=matchMedia('(pointer:coarse)').matches?48:34;let best=null,bestScore=Infinity;game.camera.updateMatrixWorld();for(const npc of npcSystem.npcs){if(!npc.sprite||npc.collapse)continue;const distance=npc.position.distanceTo(player.position);if(distance>180)continue;const point=npc.position.clone().add(new THREE.Vector3(0,.9,0)).project(game.camera);if(point.z< -1||point.z>1)continue;const x=rect.left+(point.x+1)*rect.width/2,y=rect.top+(1-point.y)*rect.height/2,screenDistance=Math.hypot(x-clientX,y-clientY);if(screenDistance>limit)continue;const score=screenDistance+distance*.035;if(score<bestScore){best=npc;bestScore=score;}}return best;}
hud.querySelector('#jcPeopleToggle').addEventListener('click',()=>hud.querySelector('#jcPeoplePanel').classList.toggle('open'));
renderPeople();
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

let fireSystem=null,pickups=null,electricCharge=0,lastVehicleHit=0;
const carWheels=[];
function createJCCar(scene,x,z,y){const group=new THREE.Group();group.name='JC personal gold-lined touring car';const bodyMat=new THREE.MeshStandardMaterial({color:0x171c20,metalness:.7,roughness:.3}),goldMat=new THREE.MeshStandardMaterial({color:0xdab45d,metalness:.8,roughness:.22}),glassMat=new THREE.MeshStandardMaterial({color:0x192735,metalness:.45,roughness:.12}),tireMat=new THREE.MeshStandardMaterial({color:0x090b0d,roughness:.9}),lampMat=new THREE.MeshBasicMaterial({color:0xffe1a0}),tailMat=new THREE.MeshBasicMaterial({color:0xff2632});const box=(name,size,pos,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.name=name;m.position.set(...pos);group.add(m);return m;};box('armored grand tourer chassis',[4.25,.66,1.85],[0,.65,0],bodyMat);box('gold hood trim',[1.15,.055,1.68],[1.18,1.005,0],goldMat);box('cockpit',[2.05,.8,1.55],[-.35,1.32,0],glassMat);box('roof',[1.3,.15,1.56],[-.4,1.78,0],bodyMat);box('front fascia',[.18,.37,1.75],[2.12,.69,0],goldMat);box('front light left',[.08,.16,.47],[2.22,.83,-.55],lampMat);box('front light right',[.08,.16,.47],[2.22,.83,.55],lampMat);box('tail left',[.08,.19,.42],[-2.14,.79,-.55],tailMat);box('tail right',[.08,.19,.42],[-2.14,.79,.55],tailMat);for(const xWheel of [-1.35,1.35])for(const zWheel of [-.94,.94]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.25,16),tireMat);wheel.rotation.x=Math.PI/2;wheel.position.set(xWheel,.43,zWheel);group.add(wheel);carWheels.push(wheel);}group.position.set(x,y,z);scene.add(group);return group;}
const characterFrames = Array(39).fill(null);
let rearWalkReady=false;
const sheetOverrides=new Set();
let jcAura=null,jcSilhouetteGlow=null,jcGlowLight=null,jcGlowTexture=null,jcGlowBoostUntil=0;

function makeJCGlowTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  const glow=ctx.createRadialGradient(128,128,8,128,128,128);
  glow.addColorStop(0,'rgba(255,255,245,.98)');
  glow.addColorStop(.20,'rgba(255,241,190,.88)');
  glow.addColorStop(.48,'rgba(255,215,112,.48)');
  glow.addColorStop(.78,'rgba(255,196,70,.16)');
  glow.addColorStop(1,'rgba(255,190,55,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,256,256);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  return texture;
}
function syncJCGlowToPose(){
  if(!realisticAvatar||!jcSilhouetteGlow)return;
  if(jcSilhouetteGlow.material.map!==realisticAvatar.material.map){jcSilhouetteGlow.material.map=realisticAvatar.material.map;jcSilhouetteGlow.material.needsUpdate=true;}
  jcSilhouetteGlow.scale.copy(realisticAvatar.scale).multiplyScalar(1.105);
  jcSilhouetteGlow.position.copy(realisticAvatar.position);jcSilhouetteGlow.position.z-=.025;
}
function ensureJCGlow(){
  if(!player||!realisticAvatar)return;
  jcGlowTexture ||= makeJCGlowTexture();
  if(!jcAura){
    jcAura=new THREE.Sprite(new THREE.SpriteMaterial({map:jcGlowTexture,color:0xffdda0,transparent:true,opacity:.80,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false}));
    jcAura.name='JC persistent divine aura';jcAura.renderOrder=2;player.add(jcAura);
  }
  if(!jcSilhouetteGlow){
    jcSilhouetteGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:realisticAvatar.material.map,color:0xffd56d,transparent:true,opacity:.30,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false}));
    jcSilhouetteGlow.name='JC pose-synced silhouette glow';jcSilhouetteGlow.renderOrder=3;player.add(jcSilhouetteGlow);
  }
  if(!jcGlowLight){
    jcGlowLight=new THREE.PointLight(0xffe4a3,1.75,18,2);jcGlowLight.name='JC persistent divine light';jcGlowLight.position.set(0,2.15,.25);player.add(jcGlowLight);
  }
  const visible=!devilMode;
  jcAura.visible=visible;jcSilhouetteGlow.visible=visible;jcGlowLight.visible=visible;
  if(visible)syncJCGlowToPose();
}
function boostJCGlow(ms=1300){if(!devilMode)jcGlowBoostUntil=Math.max(jcGlowBoostUntil,performance.now()+Math.max(0,ms));}
function updateJCGlow(now){
  ensureJCGlow();if(!jcAura||devilMode)return;
  const pulse=Math.sin(now*.0046),boost=now<jcGlowBoostUntil?1:0;
  const bodyHeight=Math.max(3.1,realisticAvatar?.scale?.y||3.63),bodyWidth=Math.max(2.2,realisticAvatar?.scale?.x||2.42);
  jcAura.position.set(realisticAvatar.position.x,realisticAvatar.position.y+.08,-.06);
  jcAura.scale.set(bodyWidth*2.55+(pulse*.10)+(boost*.55),bodyHeight*2.08+(pulse*.14)+(boost*.68),1);
  jcAura.material.opacity=.74+pulse*.06+boost*.16;
  syncJCGlowToPose();
  jcSilhouetteGlow.material.opacity=.25+pulse*.03+boost*.12;
  jcGlowLight.intensity=1.65+pulse*.16+boost*.95;
}
function installPoseSheet(url,columns,rows,indices){
  loadPoseSheet(url,columns,rows,indices.map((_,i)=>i),frames=>{
    frames.forEach((canvas,i)=>{
      const index=indices[i],old=characterFrames[index];
      if(index===0&&sheetOverrides.has(0))return;
      if(index===18&&sheetOverrides.has(18))return;
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
      characterFrames[index]={texture,aspect:canvas.width/canvas.height};sheetOverrides.add(index);
      if(poseIndex===index)applyCharacterFrame(index);
      old?.texture.dispose();
    });
  },rows===3?FLIGHT_CELLS:undefined);
}
function installPoseImage(url,index){
  const image=new Image();
  image.onload=()=>{
    const cleaned=cleanPoseImage(image),texture=new THREE.CanvasTexture(cleaned);
    texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
    const old=characterFrames[index];characterFrames[index]={texture,aspect:cleaned.width/cleaned.height};
    sheetOverrides.add(index);if(poseIndex===index)applyCharacterFrame(index);old?.texture.dispose();
  };
  image.src=url;
}
function loadCharacterFrames(){
  installPoseSheet('./character-art/jc-rear-run-v2.webp',4,2,[31,32,33,34,35,36,37,38]);
  installPoseSheet('./character-art/jc-rear-flight-v2.webp',3,3,[14,15,16,17,18,19,20,21,22]);
  installPoseImage('./character-art/jc-rear-idle-v1.webp',0);
  installPoseImage('./character-art/jc-rear-rise-v1.webp',18);
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
    const obsolete=new Set([...(sheetOverrides.has(0)?[]:[characterFrames[0]]),...characterFrames.slice(23,31)].filter(Boolean));
    frames.forEach((canvas,i)=>{
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
      const frame={texture,aspect:canvas.width/canvas.height};
      characterFrames[23+i]=frame;
    });
    rearWalkReady=true;if(!sheetOverrides.has(0))characterFrames[0]=characterFrames[29];applyCharacterFrame(poseIndex);
    obsolete.forEach(frame=>frame.texture.dispose());
  });
}
function applyCharacterFrame(index){
  if(!realisticAvatar)return;
  ensureJCGlow();
  if(devilMode&&devilTexture){if(realisticAvatar.material.map!==devilTexture){realisticAvatar.material.map=devilTexture;realisticAvatar.material.needsUpdate=true;}return;}
  const frame=characterFrames[index]||characterFrames[0];
  if(!frame)return;
  const material=realisticAvatar.material;
  if(material.map!==frame.texture){material.map=frame.texture;material.needsUpdate=true;}
  const height=index>=14&&index<=22?3.05:3.63;
  realisticAvatar.scale.set(height*frame.aspect,height,1);
  realisticAvatar.position.y=height*.5;
  syncJCGlowToPose();
}
function setFlight(action){
  const next=transitionFlight({flying,hypersonic,glide,diving,height:flightHeight,descending},action);
  flying=next.flying;hypersonic=next.hypersonic;glide=next.glide;diving=next.diving;
  flightHeight=next.height;descending=next.descending;
  poseOverride=-1;poseOverrideUntil=0;castingUntil=0;
  return next;
}
let playing = false, yaw = 0, viewPitch = 0, last = performance.now(), lastGround = 0, terrainY = 0;
let devilMode=false,devilTexture=null;
let devilWings=null;
function createDevilWings(parent){
 const rig=new THREE.Group();rig.name='Animated Devil bat wings';rig.visible=false;parent.add(rig);
 const membrane=new THREE.MeshStandardMaterial({color:0x681d2e,roughness:.7,metalness:.04,side:THREE.DoubleSide,transparent:true,opacity:.93});
 const edgeMaterial=new THREE.MeshStandardMaterial({color:0x21141a,roughness:.46,metalness:.12});
 const ribMaterial=new THREE.MeshStandardMaterial({color:0x4c2b32,roughness:.52,metalness:.16});
 const sides=[];
 for(const sign of [-1,1]){
  const hinge=new THREE.Group();hinge.position.set(sign*.12,2.42,-.18);rig.add(hinge);
  const points=[[0,0],[sign*1.05,1.28],[sign*2.8,2.08],[sign*2.52,.72],[sign*2.05,.15],[sign*2.13,-.52],[sign*1.22,-.14],[sign*.42,-.56]];
  const shape=new THREE.Shape();shape.moveTo(...points[0]);for(let i=1;i<points.length;i++)shape.lineTo(...points[i]);shape.closePath();
  const panel=new THREE.Mesh(new THREE.ShapeGeometry(shape,16),membrane);panel.position.z=-.03;hinge.add(panel);
  const outline=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(([x,y])=>new THREE.Vector3(x,y,.015)).concat([new THREE.Vector3(0,0,.015)])),edgeMaterial);hinge.add(outline);
  for(const index of [1,2,3,4,5]){const [x,y]=points[index],rib=new THREE.Mesh(new THREE.CylinderGeometry(.035,.08,Math.hypot(x,y),6),ribMaterial);rib.position.set(x/2,y/2,.02);rib.rotation.z=Math.atan2(y,x)-Math.PI/2;hinge.add(rib);}
  sides.push({hinge,sign});
 }
 rig.userData.update=(time,flying,boost)=>{rig.visible=devilMode;if(!rig.visible)return;const flap=flying?Math.sin(time*(boost?.022:.017)):0;for(const {hinge,sign}of sides){const folded=flying?0:.63;hinge.rotation.z=sign*(folded+flap*(flying?.28:.045));hinge.rotation.x=flying?Math.cos(time*.012+sign)*.08:0;}};
 return rig;
}
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
  const buildings=[...(game.buildings?.values?.()||[])].filter(ob=>ob.visible),hits=ray.intersectObjects(buildings,true);
  let point=null;
  if(hits.length){let ob=hits[0].object;while(ob&&!ob.userData?.buildingId)ob=ob.parent;if(ob){lockedBuilding=ob;const hit=hits[0].point;point=new THREE.Vector3(hit.x,groundAt(hit.x,hit.z)+Math.max(8,Number(ob.userData.heightMetres)||20)+3,hit.z);}}
  if(!point){const floor=new THREE.Plane(new THREE.Vector3(0,1,0),-terrainY);point=ray.ray.intersectPlane(floor,new THREE.Vector3());}
  if(!point){feedback('Choose a point on the city floor');return;}
  const offset=point.clone().sub(player.position);offset.y=0;if(offset.length()>1500){offset.setLength(1500);point.copy(player.position).add(offset);feedback('Teleport range capped at 1.5 km');}
  const safe=clearSpot(point.x,point.z);
  if(!flying&&Math.hypot(safe[0]-point.x,safe[1]-point.z)>8){feedback('That landing point is blocked');return;}
  const selectedBuilding=typeof lockedBuilding!=='undefined'?lockedBuilding:null;const buildingHeight=selectedBuilding&&hits.length?Math.max(8,Number(selectedBuilding.userData.heightMetres)||20)+3:flightHeight;
  teleportTarget=new THREE.Vector3(safe[0],groundAt(safe[0],safe[1])+buildingHeight,safe[1]);
  clearTeleportMarker();
  teleportMarker=new THREE.Mesh(new THREE.RingGeometry(2,2.4,32),new THREE.MeshBasicMaterial({color:0x9fe8ff,transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false}));
  teleportMarker.rotation.x=-Math.PI/2;teleportMarker.position.set(teleportTarget.x,groundAt(teleportTarget.x,teleportTarget.z)+.14,teleportTarget.z);game.scene.add(teleportMarker);
  teleportAim=false;feedback(selectedBuilding&&hits.length?`BUILDING DESTINATION · ${selectedBuilding.userData.identity?.name||selectedBuilding.userData.buildingId} · CAST TELEPORT`:'DESTINATION LOCKED · click TELEPORT again or press T');
}
function resetInput(){keys.clear();padKeys.clear();analog.x=analog.y=touchStick.x=touchStick.y=touchLookStick.x=touchLookStick.y=0;dragging=false;lookPointer=null;stickPointer=lookStickPointer=null;hud.querySelector('#jcStick i').style.transform='';hud.querySelector('#jcLookStick i').style.transform='';}
function toggleWheel(){
  const opening=!wheel.classList.contains('open');
  if(opening){const catalog=activeMiracles();if(!catalog.some(a=>a.id===selectedAbility))setActiveMiracle(catalog[0].id);const selected=catalog.find(ability=>ability.id===selectedAbility);selectedGroup=selected?.group||'Travel';const groupItems=catalog.filter(ability=>ability.group===selectedGroup),index=groupItems.findIndex(ability=>ability.id===selectedAbility);wheelPage=Math.max(0,Math.floor(index/8));wheelFocusId=selectedAbility;renderWheel();}
  wheel.classList.toggle('open');resetInput();
}
function cycleBuildingTarget(){
  const candidates=nearbyBuildings(90,12);lockedBuilding=candidates[(candidates.indexOf(lockedBuilding)+1)%candidates.length]||null;
  feedback(lockedBuilding?`BUILDING TARGET · ${lockedBuilding.userData.identity?.name||lockedBuilding.userData.buildingId}`:'No building in range');
}
function cycleTarget(){
  const candidates=souls.filter(s=>!s.userData.collected).sort((a,b)=>a.position.distanceToSquared(player.position)-b.position.distanceToSquared(player.position));
  lockedSoul=candidates[(candidates.indexOf(lockedSoul)+1)%candidates.length]||null;
  feedback(lockedSoul?'Light tracked · Q pulse within 18 m':'All lights restored');
}
function resetRun(){
  miracleEffects?.clear();phaseUntil=timeScaleUntil=shieldUntil=graceSurgeUntil=sanctuaryUntil=stasisUntil=revealUntil=sunriseUntil=poseOverrideUntil=castingUntil=0;poseOverride=-1;lockedBuilding=null;
  clearTeleportMarker();teleportAim=false;teleportTarget=null;
  redeemed=0;runTime=0;runActive=false;runFinished=false;chain={count:0,last:0,points:0};lockedSoul=null;
  grace=100;cooldowns.clear();dashCooldown=pulseCooldown=0;flightHeight=0;flying=hypersonic=glide=diving=false;
  descending=0;velocity.set(0,0,0);player.position.copy(spawnPoint);terrainY=spawnPoint.y;
  for(const soul of souls){soul.position.copy(soul.userData.home);soul.userData.baseY=soul.position.y;soul.userData.collected=false;soul.visible=playing;}
  score.textContent='0 / 8';resetInput();feedback('Restore all 8 lights. Chain pickups within 12 seconds.');
}
function blockedAt(x,y,z,radius=1.2){if(explorableWorld?.active)return explorableWorld.blockedAt(x,z,radius);return (collisionCells.get(`${Math.floor(x/cellSize)}:${Math.floor(z/cellSize)}`)||[]).some(b=>x>b.min.x-radius&&x<b.max.x+radius&&z>b.min.z-radius&&z<b.max.z+radius&&y+3.6>b.min.y&&y<b.max.y)||!!game?.environment?.blockedAt(x,y,z,radius);}
function hypersonicBreachAt(x,y,z){const boxes=collisionCells.get(`${Math.floor(x/cellSize)}:${Math.floor(z/cellSize)}`)||[];for(const box of boxes){const ob=footprints.find(f=>f.box===box)?.ob;if(!ob||game.chunks?.has(ob.userData.buildingId)||!box.containsPoint(new THREE.Vector3(x,y+1,z)))continue;const p=ob.getWorldPosition(new THREE.Vector3());game.destroy(ob,'explode');cinematicLook?.impact(p);npcSystem?.signal('hypersonic-impact',p,85);refreshFootprints();return true;}return false;}
function moveSafely(dx,dz,phase=false){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/(typeof hypersonic!=='undefined'&&hypersonic&&typeof flying!=='undefined'&&flying?2.5:.8)));
  for(let i=0;i<steps;i++){
    const x=THREE.MathUtils.clamp(player.position.x+dx/steps,-17490,17490),z=THREE.MathUtils.clamp(player.position.z+dz/steps,-17490,17490);
    if(phase||!blockedAt(x,player.position.y,player.position.z))player.position.x=x;else if(typeof hypersonic!=='undefined'&&hypersonic&&typeof flying!=='undefined'&&flying&&hypersonicBreachAt(x,player.position.y,player.position.z))player.position.x=x;else {if(performance.now()-lastImpact>300){showPose(10,350);feedback('Impact · use Phase Step or rise');lastImpact=performance.now();}velocity.x=0;}
    if(phase||!blockedAt(player.position.x,player.position.y,z))player.position.z=z;else if(typeof hypersonic!=='undefined'&&hypersonic&&typeof flying!=='undefined'&&flying&&hypersonicBreachAt(player.position.x,player.position.y,z))player.position.z=z;else velocity.z=0;
  }
  if(typeof flying!=='undefined'&&!flying&&typeof drivingCar!=='undefined'&&!drivingCar&&performance.now()-(typeof lastVehicleHit==='undefined'?0:lastVehicleHit)>950){const hit=typeof game!=='undefined'?game?.traffic?.vehicleAt?.(player.position.x,player.position.z,1.8):null;if(hit){lastVehicleHit=performance.now();grace=Math.max(0,grace-10);velocity.x+=(player.position.x-hit.x)*1.6;velocity.z+=(player.position.z-hit.z)*1.6;npcSystem?.signal('traffic-impact',player.position,22);feedback('TRAFFIC IMPACT · WATCH THE ROAD');}}
}
let lastCarCall=-Infinity,carApproach=null;
let contactShadow=null;
let flying = false, hypersonic = false, glide = false, diving = false, flightHeight = 0, descending = 0, phaseUntil = 0, timeScaleUntil = 0;
let shieldUntil = 0, graceSurgeUntil = 0, sanctuaryUntil = 0, stasisUntil = 0, revealUntil = 0, sunriseUntil = 0;
let castingUntil = 0, poseIndex = -1, selectedAbility = 'light-pulse', selectedGroup = 'Travel';
const cooldowns = new Map(), redeemedBuildings = new Set();
const miracleTextures = new Map();
let poseOverride = -1, poseOverrideUntil = 0, lastImpact = 0;
// Flight poses are states, not consecutive frames of a looping animation.
const miraclePose = {
  flight:14,hypersonic:20,teleport:7,'beam-down':8,dash:15,hover:14,leap:18,glide:17,'sky-lift':22,skydive:19,'phase-step':7,recall:7,'time-step':7,
  'light-pulse':5,'divine-beam':8,'chain-light':8,'radiance-nova':5,shield:9,heal:9,cleanse:9,reveal:9,sunrise:8,sanctuary:9,restore:9,'grace-surge':9,shockwave:8,
  rain:8,lightning:8,telekinesis:9,crumble:10,rebuild:9,bless:9,exorcise:8,stasis:9,vortex:5,repel:8,attract:9,'slow-time':7,'redemption-wave':12,
  'heavenly-spear':8,'judgment-storm':8,singularity:5,'sonic-boom':20,'answer-prayer':9,'ruin-lives':10
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
  ['World','rebuild','Rebuild',18,3],['World','bless','Bless Building',15,2],['World','exorcise','Exorcise',40,6],['World','stasis','Stasis',22,7],['Light','answer-prayer','Answer Prayer',16,5],
  ['World','vortex','Vortex',26,5],['World','repel','Repel',12,2],['World','attract','Attract',12,2],['World','slow-time','Slow Time',24,8],['World','redemption-wave','Redemption Wave',55,12]
  ,['Light','heavenly-spear','Heavenly Spear',38,7],['Light','judgment-storm','Judgment Storm',48,10],['World','singularity','Singularity',36,9],['Travel','sonic-boom','Sonic Boom',30,6]
].map(([group,id,name,cost,cooldown])=>({group,id,name,cost,cooldown}));
const signatureAbilityIds = ['flight','hypersonic','teleport','dash','hover','leap','glide','sky-lift','skydive','phase-step','light-pulse','divine-beam','chain-light','radiance-nova','shield','heal','lightning','telekinesis','crumble','redemption-wave','heavenly-spear','judgment-storm','singularity','sonic-boom'];
const castableAbilityIds = new Set(['flight','hypersonic','teleport','beam-down','dash','hover','leap','glide','sky-lift','skydive','phase-step','recall','time-step','light-pulse','divine-beam','chain-light','radiance-nova','shield','heal','cleanse','reveal','sunrise','sanctuary','restore','grace-surge','shockwave','rain','lightning','telekinesis','crumble','rebuild','bless','exorcise','stasis','vortex','repel','attract','slow-time','redemption-wave','heavenly-spear','judgment-storm','singularity','sonic-boom','answer-prayer']);
if(signatureAbilityIds.length !== 24 || signatureAbilityIds.some(id => !abilities.some(a => a.id === id) || !castableAbilityIds.has(id))) throw Error('JC signature ability contract failed');
if (abilities.length !== 44) throw Error('JC miracle catalog must contain 44 abilities');

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
      box.userData={building:true};footprints.push({box, ob});
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
  const interiorFloor=explorableWorld?.floorAt(x,z);if(Number.isFinite(interiorFloor))return interiorFloor;
  const mapped=game.roads?.sample(x,z);if(Number.isFinite(mapped))return mapped;
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

let cinematicLook=null;
let miracleEffects=null,craterSystem=null;
function effects(){return miracleEffects||(miracleEffects=createMiracleEffects(game.scene,coarseDevice));}
const abilityArtIds={'heavenly-spear':'divine-beam','judgment-storm':'lightning',singularity:'vortex','sonic-boom':'hypersonic'};
function abilityArt(id){return abilityArtIds[id]||id;}
const vegasTints = [0xffecd0,0xffdeb8,0xfff1cf,0xffb994,0xffd797,0xffffe5,0xffc2a0,0xffe6c4,0xffcf9b,0xffd5b8];


function installVegasNight() {
  if (game.scene.userData.jcVegasNight) return;
  game.scene.userData.jcVegasNight = true;
  cinematicLook=createCinematicLook(game,coarseDevice);
  cinematicLook.setTimeOfDay(worldTimeMode);
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

function buildingIdentity(mesh){
  let owner=mesh;
  while(owner){if(owner.userData?.identity)return owner.userData.identity;owner=owner.parent;}
  return null;
}

function applyBuildingTheme(mesh, ownerId, redeemed = false) {
  if(mesh.material?.userData?.customTexture)return;
  const identity=buildingIdentity(mesh),isCasino=identity?.type==='casino',edit=game.edits?.get(ownerId);
  if(!redeemed&&!isCasino)return;
  if(!mesh.userData.jcMaterialClone){
    mesh.material=cloneBuildingMaterial(mesh.material);
    mesh.userData.jcMaterialClone=true;
  }
  const material=mesh.material,original=material.userData?.original||{};
  if(original.map!==undefined)material.map=original.map||null;
  if(original.color?.isColor)material.color.copy(original.color);
  if(Number.isFinite(original.roughness))material.roughness=original.roughness;
  material.metalness=isCasino?Math.min(.16,material.metalness??.1):0;
  const windowGlow=getFacadeEmissiveMap(material.map);
  const editorGlow=Number.isFinite(edit?.glow)?Math.max(0,edit.glow):0;
  if(material.emissive){
    if(redeemed&&windowGlow){
      material.emissiveMap=windowGlow;
      material.emissive.set(0xffdfaa);
      material.emissiveIntensity=worldTimeMode==='night'?.34:.18;
    }else if(isCasino&&worldTimeMode==='night'&&windowGlow){
      material.emissiveMap=windowGlow;
      material.emissive.set(0xffe3bd);
      material.emissiveIntensity=editorGlow?Math.min(.55,.16+editorGlow*.22):.22;
    }else{
      material.emissiveMap=null;
      material.emissive.set(0x000000);
      material.emissiveIntensity=0;
    }
  }
  material.userData.jcBuildingId=ownerId;
  material.needsUpdate=true;
}

function restoredMap(id) {
  return themedFacade(id, true);
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
  jcAudio.play('collect');
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
    const direction = player.position.clone().sub(soul.position).setY(0);
    const separation=direction.length();direction.normalize();
    const distance = mode === 'repel' ? -25 : mode === 'vortex' ? Math.min(18,separation) : Math.min(25,separation);
    soul.position.addScaledVector(direction, distance);
    soul.userData.baseY = groundAt(soul.position.x, soul.position.z) + 1.6;
    if (soul.position.distanceTo(player.position) < 3) collect(soul);
  }
}

function rainEffect(){effects().rainAt(player.position);const count=fireSystem?.extinguish(player.position,220)||0;if(count)feedback(`MERCY RAIN · ${count} FIRES OUT`);}

function beamDown() {
  if (!flying) return;
  const from=player.position.clone().add(new THREE.Vector3(0,2,0));
  const [x,z]=clearSpot(player.position.x,player.position.z);
  const point=new THREE.Vector3(x,groundAt(x,z),z);
  craterSystem ||= createCraterSystem(game,coarseDevice);
  craterSystem.strike(point);
  terrainHeightCache.clear();terrainY=groundAt(x,z);lastGround=performance.now();
  setFlight('land');flightHeight=0;descending=0;velocity.set(0,0,0);
  player.position.set(x,terrainY,z);
  showPose(8,320);
  effects().beam(from,point,0xffffff,{width:1.35,duration:180});
  effects().beam(from,point,0xffc260,{width:2,duration:300});
  cinematicLook?.impact(point);
  ringAt(point,0xffe5ac,38);ringAt(point,0xffffff,18);
  moveSouls('repel',38);
  for(const ob of nearbyBuildings(18,2))game.destroy(ob,'crumble');
  refreshFootprints();
  npcSystem?.signal('beam-down',point);
  feedback('BEAM DOWN · GROUND IMPACT');
}

function stabilizeAfterTeleport(){
  if(!game||!player)return;
  playing=true;window.JC_MAP_PLAYING=true;document.body.classList.add('jc-playing');player.visible=true;
  if(game.controls)game.controls.enabled=false;
  snapCameraBehindPlayer();
}
function cameraFocus(){return player.position.clone().add(new THREE.Vector3(0,2.3,0));}
function portalGateAt(point){if(!game?.scene)return;const gate=new THREE.Mesh(new THREE.TorusGeometry(2.15,.12,10,32),new THREE.MeshStandardMaterial({color:0x922cff,emissive:0x6513ad,emissiveIntensity:2.2,metalness:.3,roughness:.2,transparent:true,opacity:.95}));gate.name='Devil portal gate';gate.scale.set(.8,1.35,1);gate.position.copy(point).add(new THREE.Vector3(0,1.5,0));game.scene.add(gate);const started=performance.now(),animate=now=>{if(!gate.parent)return;const t=(now-started)/650;gate.material.opacity=Math.max(0,1-t);gate.rotation.y=t*2;gate.scale.y=1.35+Math.sin(t*Math.PI)*.4;if(t<1)requestAnimationFrame(animate);else{game.scene.remove(gate);gate.geometry.dispose();gate.material.dispose();}};requestAnimationFrame(animate);}
function callCar(){
 if(!jcCar||!player)return;
 if(drivingCar){feedback('YOU ARE ALREADY IN JC CAR');return;}
 if(carApproach){feedback('JC CAR IS ON ITS WAY');return;}
 const distance=jcCar.position.distanceTo(player.position);let clear=distance<100;
 for(let i=1;clear&&i<=12;i++){const p=jcCar.position.clone().lerp(player.position,i/12);if(blockedAt(p.x,p.y+1,p.z,3))clear=false;}
 jcCar.visible=true;carApproach={stage:'lift',speed:0,local:clear,cruiseY:clear?Math.max(jcCar.position.y,player.position.y)+1:Math.max(650,jcCar.position.y+30,player.position.y+90)};
 feedback('JC CAR IS COMING · HOVER AUTOPILOT');
}
function updateCarApproach(dt){
 if(!carApproach||!jcCar||!player)return;
 const a=carApproach,target=new THREE.Vector3(player.position.x+Math.cos(yaw)*5,Math.max(groundAt(player.position.x,player.position.z),player.position.y),player.position.z+Math.sin(yaw)*5);
 if(blockedAt(target.x,target.y,target.z,3)){target.x=player.position.x-Math.cos(yaw)*5;target.z=player.position.z-Math.sin(yaw)*5;}
 a.cruiseY=Math.max(a.cruiseY,player.position.y+(a.local?1:90));
 if(a.stage==='lift'){jcCar.position.y=Math.min(a.cruiseY,jcCar.position.y+320*dt);if(jcCar.position.y>=a.cruiseY)a.stage='cruise';return;}
 const dx=target.x-jcCar.position.x,dz=target.z-jcCar.position.z,distance=Math.hypot(dx,dz);
 if(a.stage==='cruise'){
  a.speed=Math.min(a.local?18:1200,a.speed+600*dt,Math.max(12,Math.sqrt(2*600*Math.max(0,distance-6))));
  const step=Math.min(distance,a.speed*dt);if(distance>.01){jcCar.position.x+=dx/distance*step;jcCar.position.z+=dz/distance*step;jcCar.rotation.y=Math.atan2(-dz,dx);}
  jcCar.position.y=Math.max(jcCar.position.y,a.cruiseY);
  if(distance<7)a.stage='settle';return;
 }
 if(distance>20){a.stage='cruise';return;}
 const gap=target.clone().sub(jcCar.position),step=Math.min(gap.length(),80*dt);if(gap.length()>.01)jcCar.position.addScaledVector(gap.normalize(),step);
 if(jcCar.position.distanceTo(target)<.2){jcCar.position.copy(target);jcCar.userData.hoverHeight=Math.max(0,target.y-groundAt(target.x,target.z));carApproach=null;feedback('JC CAR ARRIVED · E / JC CAR TO ENTER');}
}
function toggleCar(){if(!jcCar||!player)return;if(drivingCar){drivingCar=false;player.visible=true;realisticAvatar.visible=true;jcCar.visible=true;player.position.x+=Math.sin(yaw)*2.5;player.position.z-=Math.cos(yaw)*2.5;player.position.y=groundAt(player.position.x,player.position.z)+flightHeight;feedback('EXITED JC CAR');return;}const distance=Math.hypot(player.position.x-jcCar.position.x,player.position.z-jcCar.position.z);if(distance>6){callCar();return;}if(carApproach){feedback('WAIT FOR YOUR CAR TO PARK');return;}drivingCar=true;player.visible=false;realisticAvatar.visible=false;jcCar.visible=true;flightHeight=jcCar.userData.hoverHeight||0;flying=flightHeight>0;player.position.set(jcCar.position.x,jcCar.position.y,jcCar.position.z);velocity.set(0,0,0);feedback('JC CAR · WASD / LEFT STICK TO DRIVE · E TO EXIT');}
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
      const buildingLanding=!!lockedBuilding&&game.buildings?.get(lockedBuilding.userData.buildingId)===lockedBuilding;
      if(!buildingLanding&&!flying&&(!openSpace(chosen.x,chosen.z,2)||blockedAt(chosen.x,chosen.y,chosen.z,2))){teleportTarget=null;clearTeleportMarker();feedback('That destination is blocked');return;}
      const portalEntry=player.position.clone();clearTeleportMarker();teleportTarget=null;if(devilMode)portalGateAt(portalEntry);ringAt(portalEntry,devilMode?0x8428c9:0xaadcfb,11);player.position.x=chosen.x;player.position.z=chosen.z;terrainY=groundAt(chosen.x,chosen.z);flightHeight=Math.max(0,chosen.y-terrainY);lastGround=performance.now();player.position.y=terrainY+flightHeight;velocity.set(0,0,0);if(devilMode)portalGateAt(player.position);ringAt(player.position,devilMode?0xb243ec:0xaadcfb,12);castingUntil=performance.now()+400;stabilizeAfterTeleport();feedback(devilMode?'PORTAL TRAVERSED · ABYSSAL ENTRY':'TELEPORTED · 3D gameplay resumed');return;
    }
    const direction = desired.lengthSq() ? desired.clone().normalize() : forward.clone();
    let point = player.position.clone();
    for (let step=distance;step>3;step-=3) {
      const next = player.position.clone().addScaledVector(direction,step);
      if ((flying ? !blockedAt(next.x,groundAt(next.x,next.z)+flightHeight,next.z,2) : openSpace(next.x,next.z,2)) && Number.isFinite(groundAt(next.x,next.z))) {point=next;break;}
    }
    const portalEntry=player.position.clone();if(devilMode)portalGateAt(portalEntry);ringAt(portalEntry,devilMode?0x8428c9:0xaadcfb,11);player.position.x=point.x;player.position.z=point.z;terrainY=groundAt(point.x,point.z);lastGround=performance.now();player.position.y=terrainY+flightHeight;velocity.set(0,0,0);if(devilMode)portalGateAt(player.position);ringAt(player.position,devilMode?0xb243ec:0xaadcfb,11);castingUntil=performance.now()+400;stabilizeAfterTeleport();
  }catch(error){console.error('JC teleport recovered',error);teleportTarget=null;clearTeleportMarker();stabilizeAfterTeleport();feedback('Teleport recovered · 3D gameplay restored');}
}

function cast(id = selectedAbility) {
  if (!playing || wheel.classList.contains('open')) return;
  const ability = (typeof activeMiracles==='function'?activeMiracles():abilities).find(a=>a.id===id);
  if (!ability) return;
  if((id==='teleport'||id==='portal')&&!teleportTarget){beginTeleportTarget();feedback(devilMode?'PORTAL AIM · choose a clear destination':'TELEPORT AIM · choose a clear destination');return;}
  if((cooldowns.get(id)||0)>performance.now()){feedback('Miracle recharging');return;}
  if(grace<ability.cost){feedback(`Need ${ability.cost} grace · release boost to recover`);return;}
  const soundId=id==='flight'||id==='hypersonic'?'flight':id==='teleport'||id==='portal'?'teleport':id==='dash'?'dash':id==='skydive'?'dive':'cast';
  jcAudio.play(soundId);
  if(id==='skydive'&&(!flying||diving)){feedback(flying?'DIVE ALREADY IN PROGRESS':'TAKE FLIGHT BEFORE DIVING');return;}
  if(id==='beam-down'&&!flying){feedback('Already grounded');return;}
  if(id==='dash'&&dashCooldown>0||id==='light-pulse'&&pulseCooldown>0){feedback('Miracle recharging');return;}
  if(lockedBuilding&&game.buildings?.get(lockedBuilding.userData.buildingId)!==lockedBuilding)lockedBuilding=null;
  const buildingRadii={'divine-beam':110,'chain-light':100,'radiance-nova':56,cleanse:45,reveal:75,restore:60,shockwave:40,lightning:130,telekinesis:40,crumble:55,bless:45,exorcise:65,'redemption-wave':105,'heavenly-spear':105,'judgment-storm':140};
  if(buildingRadii[id]&&!nearbyBuildings(buildingRadii[id],1).length){feedback('No building in range');return;}
  if(id==='rebuild'&&!nearbyRuins()){feedback('No collapsed building in range');return;}
  if(id==='teleport'&&teleportTarget&&(!Number.isFinite(teleportTarget.x)||!Number.isFinite(teleportTarget.z)||(!flying&&!(lockedBuilding&&game.buildings?.get(lockedBuilding.userData.buildingId)===lockedBuilding)&&(!openSpace(teleportTarget.x,teleportTarget.z,2)||blockedAt(teleportTarget.x,teleportTarget.y,teleportTarget.z,2))))){teleportTarget=null;clearTeleportMarker();feedback('Choose a clear landing point');return;}
  feedback(ability.name);
  if((typeof devilMode==='undefined'||!devilMode)&&typeof boostJCGlow==='function')boostJCGlow(['judgment-storm','redemption-wave','divine-beam','radiance-nova'].includes(id)?2200:1300);
  const flightAbilities=new Set(['flight','hypersonic','hover','leap','glide','sky-lift','skydive','beam-down']);
  if(!flightAbilities.has(id))showPose(miraclePose[id] ?? 5, id === 'redemption-wave' ? 2400 : 800);
  spawnMiracleSprite(id);
  if(!runActive&&!runFinished)runActive=true;
  npcSystem?.signal(id,player.position,id==='redemption-wave'?120:85);
  grace-=ability.cost;cityMissions?.usePower(id);systemicWorld?.onAbility(id,player.position,devilMode?'satan':'jc');
  cooldowns.set(id,performance.now()+ability.cooldown*1000);
  if(!flightAbilities.has(id))castingUntil=performance.now()+450;
  const near=(radius=55,count=1)=>nearbyBuildings(radius,count);
  const strike=(radius=55,count=1)=>{for(const ob of near(radius,count)){beamTo(ob.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,ob.userData.heightMetres*.4,0)));redeem(ob);}};
  switch(id) {
    case 'flight':if(flying)beamDown();else setFlight('takeoff');break;
    case 'hypersonic':setFlight('boost');break;
    case 'teleport':teleport();break;
    case 'portal':{ringAt(player.position,0x6b28a8,17);teleport();ringAt(player.position,0x8f43d2,17);feedback('ABYSSAL PORTAL · REALITY TORN');break;}
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
    case 'heal':jcAudio.play('prayer');grace=Math.min(100,grace+45);{const blessed=npcSystem?.answerPrayer?.(player.position,85);ringAt(player.position,0xbaffd8,12);if(blessed)feedback(`PRAYER ANSWERED · ${blessed.name}`);}break;
    case 'answer-prayer':{const blessed=npcSystem?.answerPrayer?.(player.position,110);if(blessed){jcAudio.play('prayer');ringAt(blessed.position,0xffe8aa,14);feedback(`PRAYER ANSWERED · ${blessed.name} RESTORED`);}else feedback('NO UNANSWERED PRAYERS NEARBY · NPCS KEEP LIVING THEIR LIVES');break;}
    case 'ruin-lives':{const n=npcSystem?.ruinLives?.(player.position,75)||0;ringAt(player.position,0x8b1d38,32);feedback(n?`DESPAIR WAVE · ${n} LIVES DISRUPTED`:'NO CIVILIANS IN RANGE');break;}
    case 'cleanse':near(45).forEach(redeem);break;
    case 'reveal':revealUntil=performance.now()+6000;near(75,25).forEach(ob=>{for(const m of ob.children)if(m.material?.name?.endsWith('_walls')){m.material.emissive.set(0xff6666);m.material.emissiveIntensity=.3;setTimeout(()=>{m.material.emissiveIntensity=redeemedBuildings.has(ob.userData.buildingId)?.12:0;},6000);}});break;
    case 'sunrise':sunriseUntil=performance.now()+7000;cinematicLook?.setSunrise(true);ringAt(player.position,0xffda8b,40);break;
    case 'sanctuary':sanctuaryUntil=performance.now()+7000;ringAt(player.position,0xc4ffee,22);break;
    case 'restore':near(60,3).forEach(redeem);break;
    case 'grace-surge':graceSurgeUntil=performance.now()+8000;ringAt(player.position,0xffdfa6,14);break;
    case 'shockwave':near(40,5).forEach(redeem);ringAt(player.position,0xffd18b,42);cinematicLook?.impact(player.position);break;
    case 'rain':rainEffect();break;
    case 'lightning':{electricCharge=Math.min(100,(typeof electricCharge==='undefined'?0:electricCharge)+((typeof devilMode!=='undefined'&&devilMode)?12:38));const count=2+Math.floor(electricCharge/25);if(typeof devilMode!=='undefined'&&devilMode){const targets=near(145,count);for(const ob of targets){const point=ob.getWorldPosition(new THREE.Vector3());point.y+=Number(ob.userData.heightMetres)||12;fireSystem?.ignite(ob.userData.buildingId,point,16000);}npcSystem?.signal('hellfire',player.position,110);feedback(`HELLFIRE · ${targets.length} STRUCTURES BURNING · ${Math.round(electricCharge)}% CHARGE`);}else{strike(130,count);ringAt(player.position,0xaed8ff,24);cinematicLook?.impact(player.position);feedback(`LIGHTNING CHAIN · ${Math.round(electricCharge)}% STORM CHARGE`);}break;}
    case 'telekinesis':{const ob=near(40)[0];if(ob){const p=ob.getWorldPosition(new THREE.Vector3());beamTo(p,0x9bdcff);ringAt(p,0x9bdcff,16);const original=ob.position.y;ob.position.y+=5;refreshFootprints();setTimeout(()=>{ob.position.y=original;refreshFootprints();},900);}break;}
    case 'crumble':{const ob=lockedBuilding||near(55)[0];if(!ob){feedback('No building in range');break;}const point=ob.getWorldPosition(new THREE.Vector3());game.destroy(ob,'crumble');cinematicLook?.impact(point);refreshFootprints();ringAt(point,0xffc38e,26);feedback(`${ob.userData.identity?.name||ob.userData.buildingId} CRUMBLED · debris falling`);lockedBuilding=null;break;}
    case 'rebuild':{const ob=nearbyRuins();if(ob){game.rebuild(ob);refreshFootprints();redeem(ob);feedback(`${ob.userData.identity?.name||ob.userData.buildingId} REBUILT`);lockedBuilding=null;}break;}
    case 'bless':near(45).forEach(redeem);break;
    case 'exorcise':near(65,5).forEach(redeem);break;
    case 'stasis':stasisUntil=performance.now()+6000;ringAt(player.position,0x9fd9ff,25);break;
    case 'vortex':moveSouls('vortex',50);ringAt(player.position,0xaedaff,30);break;
    case 'repel':moveSouls('repel',40);ringAt(player.position,0xffb992,30);break;
    case 'attract':moveSouls('attract',55);ringAt(player.position,0xffe6b0,40);break;
    case 'slow-time':timeScaleUntil=performance.now()+7000;ringAt(player.position,0xb9d8ff,30);break;
    case 'redemption-wave':near(105,8).forEach(redeem);ringAt(player.position,0xffe7b1,105);cinematicLook?.impact(player.position);break;
    case 'heavenly-spear':{const ob=lockedBuilding||near(105)[0];if(!ob){feedback('No building in range');break;}const point=ob.getWorldPosition(new THREE.Vector3());point.y+=Math.max(5,ob.userData.heightMetres*.55);beamTo(point,0xffe6a5);game.destroy(ob,'explode');refreshFootprints();cinematicLook?.impact(point);ringAt(point,0xffe6a5,34);ringAt(player.position,0xfff4ce,17);feedback(`${ob.userData.identity?.name||ob.userData.buildingId} · HEAVENLY SPEAR`);lockedBuilding=null;break;}
    case 'judgment-storm':{const targets=near(140,3);if(!targets.length){feedback('No buildings in range');break;}for(const ob of targets){const point=ob.getWorldPosition(new THREE.Vector3());point.y+=Math.max(5,ob.userData.heightMetres*.45);beamTo(point,0xb6dcff);game.destroy(ob,'crumble');ringAt(point,0xc4e6ff,24);}refreshFootprints();cinematicLook?.impact(player.position);ringAt(player.position,0xaed8ff,55);feedback(`JUDGMENT STORM · ${targets.length} IMPACTS`);break;}
    case 'singularity':moveSouls('vortex',85);timeScaleUntil=performance.now()+1800;ringAt(player.position,0x9bdcff,72);feedback('SINGULARITY · nearby lights pulled inward');break;
    case 'sonic-boom':{setFlight('surge');const direction=desired.lengthSq()?desired.clone().normalize():forward.clone();moveSafely(direction.x*22,direction.z*22,performance.now()<phaseUntil);velocity.addScaledVector(direction,24);const point=player.position.clone();cinematicLook?.impact(point);ringAt(point,0xbceaff,36);npcSystem?.signal('sonic-boom',point,110);feedback('SONIC BOOM · HYPERFLIGHT');break;}
  }
  globalThis.JC_SYSTEMIC_WORLD?.onAbility(id,player.position,devilMode?'satan':'jc');
  livingWorld?.onAbility(id,player.position,devilMode?'satan':'jc');
  graceLabel.textContent=Math.round(grace);
}

let wheelPage=0,wheelFocusId=selectedAbility;
const evilMiracles=[['World','ruin-lives','Ruin Lives',32,7],['Travel','portal','Portal Step',0,1],['Travel','flight','Wicked Flight',0,0],['Travel','hypersonic','Ruin Rush',12,2],['Travel','beam-down','Abyssal Impact',0,1],['World','crumble','Ruin',28,4],['World','lightning','Hellfire',24,3],['World','telekinesis','Soul Grip',18,3],['World','vortex','Demon Vortex',26,5],['World','singularity','Black Sun',36,9],['World','sonic-boom','Sonic Rupture',30,6],['World','repel','Terror Wave',12,2],['World','stasis','Soul Snare',22,7],['World','slow-time','Dead Time',24,8],['World','judgment-storm','Infernal Storm',48,10],['World','heavenly-spear','Abyss Spear',38,7]].map(([group,id,name,cost,cooldown])=>({group,id,name,cost,cooldown}));
const miraclePresets=(()=>{try{const saved=JSON.parse(localStorage.getItem('jc-miracle-presets')||'[]');return Array.from({length:4},(_,i)=>abilities.some(a=>a.id===saved[i])?saved[i]:['light-pulse','flight','teleport','heal'][i]);}catch{return ['light-pulse','flight','teleport','heal'];}})();let assigningPreset=-1;
function activeMiracles(){return typeof devilMode!=='undefined'&&devilMode?evilMiracles:abilities;}
function refreshPresetLabels(){for(const [i,button] of [...hud.querySelectorAll('[data-action="preset"]')].entries()){const item=activeMiracles().find(a=>a.id===miraclePresets[i]);button.textContent=`${i+1} · ${item?.name||'EMPTY'}`;}}
function setActiveMiracle(id){selectedAbility=id;const item=activeMiracles().find(a=>a.id===id)||abilities.find(a=>a.id===id);hud.querySelector('#jcSelected').textContent=item?.name||id;}
function renderWheel(){
  const catalog=activeMiracles(),groups=[...new Set(catalog.map(ability=>ability.group))];
  if(!groups.includes(selectedGroup))selectedGroup=groups[0];
  hud.querySelector('.jc-groups').replaceChildren(...groups.map(group=>{
    const button=document.createElement('button');button.type='button';button.textContent=group.toUpperCase();button.setAttribute('role','tab');button.setAttribute('aria-selected',String(group===selectedGroup));button.setAttribute('aria-pressed',String(group===selectedGroup));
    button.onclick=()=>{selectedGroup=group;wheelPage=0;const first=catalog.find(ability=>ability.group===group);wheelFocusId=first?.id||selectedAbility;renderWheel();};return button;
  }));
  const page=abilityWheelPage(catalog,selectedGroup,wheelPage);
  wheelPage=page.page;
  if(!page.items.some(ability=>ability.id===wheelFocusId))wheelFocusId=page.items[0]?.id||selectedAbility;
  const ring=hud.querySelector('.jc-list'),center=ring.querySelector('.jc-wheel-core');
  ring.replaceChildren(center,...page.items.map((ability,index)=>{
    const angle=(-90+index*360/8)*Math.PI/180,x=50+Math.cos(angle)*34,y=50+Math.sin(angle)*34;
    const button=document.createElement('button');button.type='button';button.className='jc-wheel-slot';button.style.setProperty('--x',`${x}%`);button.style.setProperty('--y',`${y}%`);
    button.dataset.abilityId=ability.id;
    button.classList.toggle('selected',ability.id===wheelFocusId||ability.id===selectedAbility);button.setAttribute('aria-label',`${ability.name}, costs ${ability.cost} grace, ${ability.cooldown} second cooldown`);button.setAttribute('aria-pressed',String(ability.id===selectedAbility));
    const image=document.createElement('img');image.src=`./miracles/${abilityArt(ability.id)}.webp`;image.alt='';image.loading='lazy';
    const name=document.createElement('span');name.textContent=ability.name;
    const cost=document.createElement('small');cost.textContent=`${ability.cost} GRACE`;
    button.append(image,name,cost);button.addEventListener('mouseenter',()=>focusWheelAbility(ability));button.addEventListener('focus',()=>focusWheelAbility(ability));
    button.onclick=()=>{if(assigningPreset>=0){miraclePresets[assigningPreset]=ability.id;localStorage.setItem('jc-miracle-presets',JSON.stringify(miraclePresets));assigningPreset=-1;feedback(`${ability.name.toUpperCase()} SAVED TO PRESET`);}else setActiveMiracle(ability.id);wheelFocusId=ability.id;wheel.classList.remove('open');renderWheel();refreshPresetLabels();};return button;
  }));
  const focus=catalog.find(ability=>ability.id===wheelFocusId)||catalog.find(ability=>ability.id===selectedAbility);
  if(focus){hud.querySelector('#jcWheelFocus').textContent=focus.name.toUpperCase();hud.querySelector('#jcWheelCost').textContent=`${focus.cost} GRACE · ${focus.cooldown}s COOLDOWN`;
    center.querySelector('strong').textContent=`${page.page+1} / ${page.pageCount}`;}
  hud.querySelector('#jcWheelPrev').disabled=page.pageCount<2;hud.querySelector('#jcWheelNext').disabled=page.pageCount<2;
  const pager=direction=>{wheelPage=(page.page+direction+page.pageCount)%page.pageCount;const next=abilityWheelPage(catalog,selectedGroup,wheelPage);wheelFocusId=next.items[0]?.id||selectedAbility;renderWheel();};
  hud.querySelector('#jcWheelPrev').onclick=()=>pager(-1);hud.querySelector('#jcWheelNext').onclick=()=>pager(1);
}
function focusWheelAbility(ability){wheelFocusId=ability.id;const page=abilityWheelPage(activeMiracles(),selectedGroup,wheelPage);const button=[...hud.querySelectorAll('.jc-wheel-slot')].find(slot=>slot.getAttribute('aria-label').startsWith(ability.name+','));
  hud.querySelector('#jcWheelFocus').textContent=ability.name.toUpperCase();hud.querySelector('#jcWheelCost').textContent=`${ability.cost} GRACE · ${ability.cooldown}s COOLDOWN`;
  hud.querySelector('.jc-wheel-core strong').textContent=`${page.page+1} / ${page.pageCount}`;hud.querySelectorAll('.jc-wheel-slot').forEach(slot=>slot.classList.toggle('selected',slot===button));}

let nextMinimapUpdate=0;
function updateStreetReadout(){const label=hud.querySelector('#jcStreetReadout');if(!label||!player)return;const road=game.roads?.nearestRoad?.(player.position.x,player.position.z,95);label.textContent=road?`STREET · ${road.name}`:'STREET · OFF ROAD';}
function updateMinimap(now){
  if(!player||now<nextMinimapUpdate)return;nextMinimapUpdate=now+160;
  updateStreetReadout();
  const canvas=hud.querySelector('#jcMinimapCanvas'),ctx=canvas.getContext('2d'),size=canvas.width,center={x:player.position.x,z:player.position.z},halfRange=150,scale=size/(2*halfRange),heading=compassHeading(yaw);
  ctx.clearRect(0,0,size,size);ctx.save();ctx.beginPath();ctx.arc(size/2,size/2,size/2-2,0,Math.PI*2);ctx.clip();ctx.fillStyle='#101c24';ctx.fillRect(0,0,size,size);
  const centerPoint=minimapPoint(center,center,halfRange,size);
  ctx.strokeStyle='rgba(191,213,213,.08)';ctx.lineWidth=1;
  for(let offset=-120;offset<=120;offset+=30){const x=centerPoint.x+offset*scale,y=centerPoint.y+offset*scale;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,size);ctx.stroke();ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();}
  ctx.strokeStyle='rgba(225,193,123,.18)';ctx.lineWidth=3;for(let offset=-90;offset<=90;offset+=60){const x=centerPoint.x+offset*scale;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,size);ctx.stroke();const y=centerPoint.y+offset*scale;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();}
  for(const {box,ob} of footprints){if(game.chunks?.has(ob.userData.buildingId))continue;const mid={x:(box.min.x+box.max.x)/2,z:(box.min.z+box.max.z)/2},point=minimapPoint(mid,center,halfRange,size);if(point.x<-20||point.x>size+20||point.y<-20||point.y>size+20)continue;
    ctx.fillStyle=redeemedBuildings.has(ob.userData.buildingId)?'#b49758':'#71818a';const w=Math.max(2,(box.max.x-box.min.x)*scale),h=Math.max(2,(box.max.z-box.min.z)*scale);ctx.fillRect(point.x-w/2,point.y-h/2,w,h);}
  for(const soul of souls){if(!soul.visible||soul.userData.collected)continue;const point=minimapPoint(soul.position,center,halfRange,size);if(point.x<0||point.x>size||point.y<0||point.y>size)continue;ctx.fillStyle='#ffd57d';ctx.beginPath();ctx.arc(point.x,point.y,3,0,Math.PI*2);ctx.fill();}
  for(const npc of npcSystem?.npcs||[]){if(!npc.sprite)continue;const point=minimapPoint(npc.position,center,halfRange,size);if(point.x<0||point.x>size||point.y<0||point.y>size)continue;ctx.fillStyle=npc.faction==='demon'?'#ff6c74':'#91ddeb';ctx.beginPath();ctx.arc(point.x,point.y,3,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.translate(size/2,size/2);ctx.rotate(yaw);ctx.fillStyle='#fff1b1';ctx.strokeStyle='#111820';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,8);ctx.lineTo(0,5);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ctx.restore();
  const cardinals=['N','NE','E','SE','S','SW','W','NW'],label=cardinals[Math.round(heading/45)%8];hud.querySelector('#jcHeadingReadout').textContent=`${label} ${String(heading).padStart(3,'0')}°`;hud.querySelector('#jcCompass b').style.transform=`rotate(${yaw}rad)`;
}

function setMode(play) {
  if (play && (!game || !player)) {
    startQueued = true;
    playReturn.textContent = 'LOADING JC...';
    return;
  }
  if (!play) {conversation.close({restoreFocus:false});miracleEffects?.clear();}
  playing = play;window.JC_WORLD_SCALE=1;
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
  miracleEffects?.update(now);
  craterSystem?.update(now);
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
  if(!runActive&&!runFinished&&(desired.lengthSq()>.02||flightHeight>0)){runActive=true;}
  const braking=keys.has('b')||padKeys.has('b');
  const sprint = !flying && (keys.has('Shift')||padKeys.has('Shift')) && grace > 0 && desired.lengthSq() > 0;
  const boost = hypersonic && flying && grace > 0 && !braking;
  window.JC_HYPERFLIGHT=boost;
  grace = THREE.MathUtils.clamp(grace + (boost ? -3 : sprint ? -20 : now < graceSurgeUntil ? 24 : now < sanctuaryUntil ? 19 : now < shieldUntil ? 17 : 12) * dt, 0, 100);
  if (boost && grace <= 0) hypersonic=false;
  if(boost&&desired.lengthSq()<.01)desired.copy(flightForward);
  const speed=(diving?42:boost?1800:flying?75:sprint?9:4.8)*(now<timeScaleUntil?1.5:1),activeSpeed=drivingCar?(desired.lengthSq()>.02?24:0):speed;
  const steering = braking?38:desired.lengthSq()<.01?(flying?10:24):flying?(boost?20:28):32;
  if(!flying||drivingCar)desired.y=0;
  accelerateVelocity(velocity,desired,braking?0:activeSpeed,steering,braking?(flying?3200:28):flying?(boost?1100:110):drivingCar?12:18,dt);
  moveSafely(velocity.x*dt,velocity.z*dt,now<phaseUntil);
  const previousHeight=flightHeight;
  if (flying) {
    if (diving){flightHeight=Math.max(0,flightHeight-110*dt);velocity.y=0;}
    else if (glide&&!riseHeld&&!dropHeld){flightHeight=Math.max(2,flightHeight-2*dt);velocity.y=0;}
    else flightHeight=THREE.MathUtils.clamp(flightHeight+velocity.y*dt,0,2000);
  } else if (flightHeight>0){flightHeight=Math.max(0,flightHeight-(descending?80:28)*dt);velocity.y=0;}
  if(flightHeight===2000&&velocity.y>0)velocity.y=0;
  if(!diving&&flightHeight<previousHeight&&blockedAt(player.position.x,terrainY+flightHeight,player.position.z)){flightHeight=previousHeight;velocity.y=0;}
  if(diving&&flightHeight<=0){setFlight('impact');velocity.multiplyScalar(.28);resolveDiveImpact();}
  else if(shouldTouchDown(flying,previousHeight,flightHeight,velocity.y)){setFlight('touchdown');velocity.y=0;}
  if (flightHeight===0) descending=0;
  if (now - lastGround > (flying ? 400 : 180)) {
    terrainY=groundAt(player.position.x,player.position.z);
    lastGround = now;
  }
  contactShadow ||= createCharacterContact(game.scene);
  contactShadow.update(player,terrainY,flightHeight,playing);
  player.position.y=THREE.MathUtils.lerp(player.position.y,terrainY+flightHeight,Math.min(1,dt*(descending?14:8)));
  updateCarApproach(dt);
  if(jcCar){jcCar.visible=!drivingCar||playing;jcCar.position.set(drivingCar?player.position.x:jcCar.position.x,carApproach?jcCar.position.y:groundAt(drivingCar?player.position.x:jcCar.position.x,drivingCar?player.position.z:jcCar.position.z)+(jcCar.userData.hoverHeight||0),drivingCar?player.position.z:jcCar.position.z);if(drivingCar){jcCar.rotation.y=yaw;carWheels.forEach(w=>w.rotation.z+=Math.hypot(velocity.x,velocity.z)*dt*2.1);}}
  const riseInput=flying&&((keys.has('e')||keys.has('Space')||padKeys.has('Space'))||desired.y>.25||velocity.y>1.1);
  const dropInput=flying&&((keys.has('c')||keys.has('Control')||padKeys.has('Control'))||desired.y<-.25);
  const lateral=desired.dot(right);
  const horizontalSpeed=Math.hypot(velocity.x,velocity.z);
  const flightPose=selectFlightPose({diving,braking,rising:riseInput,descending:dropInput,gliding:glide,lateral,boosting:boost,fast:horizontalSpeed>4});
  if(!flying&&horizontalSpeed>.2)playerStepPhase=advanceGait(playerStepPhase,horizontalSpeed,dt,sprint);
  const locomotionPose=selectGroundPose(horizontalSpeed,playerStepPhase,sprint);
  const basePose=flying?flightPose:locomotionPose;
  const pose=now<poseOverrideUntil?poseOverride:(now<castingUntil?5:basePose);
  if (pose !== poseIndex) poseIndex=pose;
  portrait.userData.character.setPose(pose,playerStepPhase,horizontalSpeed,now,flying);
  applyCharacterFrame(pose);
  updateJCGlow(now);
  if(realisticAvatar){
    const bank=flying?THREE.MathUtils.clamp(-lateral*.16,-.16,.16):0;
    realisticAvatar.material.rotation=THREE.MathUtils.lerp(realisticAvatar.material.rotation,bank,response(8,dt));
    realisticAvatar.position.y=realisticAvatar.scale.y*.5+(flying?Math.sin(now*.004)*.06:0);
  }
  portrait.rotation.y=Math.PI+yaw;
  portrait.position.y = velocity.lengthSq() > 1 && !flying ? Math.sin(now * .014) * .035 : 0;
  devilWings?.userData.update(now,flying,hypersonic);
  for (const s of souls) {
    if (!s.visible) continue;
    if(now>stasisUntil) {s.rotation.y += worldDt * 1.6;s.position.y = s.userData.baseY + Math.sin(worldClock * .002 + s.position.z) * .25;}
    if (s.position.distanceTo(player.position.clone().add(new THREE.Vector3(0,1.6,0))) < 3.4) collect(s);
  }
  if(worldDt>0&&now-lastNpcObservation>700){lastNpcObservation=now;observeNpcPlayer();}
  if(worldDt>0){npcSystem?.update(worldDt,now);systemicWorld?.update(worldDt,now);livingWorld?.update(worldDt,now);}cityMissions?.update(now,playing);fireSystem?.update(now);pickups?.update(now,npcSystem?.npcs||[]);const worldState=explorableWorld?.update(now),worldPrompt=hud.querySelector('#jcWorldPrompt');if(worldPrompt){const site=worldState?.nearby;worldPrompt.hidden=!site&&!explorableWorld?.active;worldPrompt.textContent=worldState?.canTransit||explorableWorld?.active?.venue.id==='military:nellis'?'E · TRAVEL TO AREA 51 · FICTIONAL ROUTE':explorableWorld?.active?'E · EXIT '+explorableWorld.active.venue.name.toUpperCase():site?(site.kind==='storm-drain-game-access'?'E · ENTER MAPPED DRAIN ROUTE · FICTIONAL ACCESS':`E · ENTER ${site.name.toUpperCase()}`):'';}
  if(selectedPerson?.contactId){selectedPerson=npcSystem?.npcs.find(n=>String(n.contactId)===String(selectedPerson.contactId))||selectedPerson;}
  nearNpc=closestNpc();
  if(selectedPerson&&selectedPerson.position){const pos=selectedPerson.position.clone().add(new THREE.Vector3(0,2.1,0)).project(game.camera),d=selectedPerson.position.distanceTo(player.position),markerVisible=pos.z>=-1&&pos.z<=1;personMarker.classList.toggle('visible',playing&&!conversation.isOpen);if(playing&&!conversation.isOpen){const x=(pos.x+1)*innerWidth/2,y=(1-pos.y)*innerHeight/2;personMarker.style.left=`${THREE.MathUtils.clamp(x,90,innerWidth-90)}px`;personMarker.style.top=`${THREE.MathUtils.clamp(y,50,innerHeight-50)}px`;personMarker.style.transform=markerVisible?'translate(-50%,-50%)':'translate(-50%,-50%) rotate(0deg)';personMarker.textContent=`${markerVisible?'✦':(pos.x<0?'◀':'▶')} ${selectedPerson.name} · ${Math.round(d)} m`;}}else personMarker.classList.remove('visible');
  npcTalkButton.classList.toggle('available',coarseDevice&&!!nearNpc&&!talk.classList.contains('open'));npcTalkButton.textContent=nearNpc?`TALK TO ${nearNpc.name.toUpperCase()}`:'TALK';npcReadout.textContent=talk.classList.contains('open')?npcReadout.textContent:(nearNpc?`NEAR ${nearNpc.name.toUpperCase()} · ${(nearNpc.allegiance||nearNpc.faction).toUpperCase()}${nearNpc.prayerPending?' · PRAYER NEEDS AN ANSWER':''} · PRESS C TO TALK`:`${npcSystem?.npcs.length||0} ACTIVE NPCS · JOBS / WALKING / RESPONSES`);
  graceLabel.textContent = Math.round(grace);hud.querySelector('#jcElectric').textContent=`STORM ${Math.round(electricCharge)}%`;
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
    updateMinimap(now);
    if(worldStateReadout)worldStateReadout.textContent=systemicWorld?.hudLine(player.position)||'SIN CITY SYSTEMS · ONLINE';
    if(livingWorldReadout)livingWorldReadout.textContent=livingWorld?.hudLine()||'LIVING WORLD · ONLINE';
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
window.JC_BOOT_STAGE='player-bootstrap';
const imageLoader=new THREE.TextureLoader();
// Gameplay must never wait for cosmetic facade downloads. Start with one small
// in-memory material, then hot-swap the real facade library after JC is playable.
const bootstrapFacade=fallbackFacadeTexture();
const generatedFacades=Array(16).fill(bootstrapFacade);
neutralTexture=bootstrapFacade;
cursedTextures=[bootstrapFacade];
restoredTextures=[bootstrapFacade];
const facadeUpgradePromise=Promise.all(Array.from({length:16},(_,i)=>loadTextureSafe(imageLoader,`./facades/vegas-cell-${String(i).padStart(2,'0')}.webp`,fallbackFacadeTexture)))
  .then(async textures=>{
    for(let i=0;i<textures.length;i++)generatedFacades[i]=textures[i];
    neutralTexture=generatedFacades[7]||bootstrapFacade;
    restoredTextures=generatedFacades.slice(9).filter(Boolean);
    if(!restoredTextures.length)restoredTextures=[neutralTexture];
    const photo=await loadPhotoFacades().catch(()=>null);
    cursedTextures=photo?.length?photo:generatedFacades.slice(0,9).filter(Boolean);
    if(!cursedTextures.length)cursedTextures=[neutralTexture];
    for(const texture of generatedFacades){
      if(!texture)continue;
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
      texture.repeat.set(1,1);
      texture.anisotropy=Math.min(2,game.renderer.capabilities.getMaxAnisotropy());
    }
    for(const group of game.loaded.values())group.userData.jcThemeApplied=false;
    wallpaperStrip();
    window.JC_COSMETICS_READY=true;
  }).catch(error=>console.warn('Facade upgrade stayed on bootstrap materials',error));
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
  player = new THREE.Group();
  portrait = createCharacter3D({faction:'angel',player:true});
  // Use the photoreal JC cutout as the visible in-world avatar. The articulated
  // 3D rig remains attached for collision/pose state, but is hidden so the
  // player never sees the placeholder low-poly body.
  portrait.visible = false;
  player.add(portrait);
  const realisticMaterial = new THREE.SpriteMaterial({map: fallbackMiracleTexture(), transparent:true, depthWrite:false, depthTest:true});
  realisticAvatar = new THREE.Sprite(realisticMaterial);
  loadTextureSafe(imageLoader,'./jc-realistic.webp',fallbackMiracleTexture).then(texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;
    const old=realisticMaterial.map;
    realisticMaterial.map=texture;realisticMaterial.needsUpdate=true;
    ensureJCGlow();syncJCGlowToPose();
    if(old&&old!==bootstrapFacade)old.dispose?.();
  }).catch(error=>console.warn('JC portrait stayed on bootstrap texture',error));
  realisticAvatar.name = 'JC realistic player avatar';
  realisticAvatar.scale.set(2.42, 3.63, 1);
  realisticAvatar.position.set(0, 1.82, 0);
  realisticAvatar.renderOrder = 4;
  player.add(realisticAvatar);
  ensureJCGlow();
  devilWings=createDevilWings(player);
  loadCharacterFrames();
  terrainY=groundAt(x,z);
  player.position.set(x, terrainY, z);
  spawnPoint=player.position.clone();
  game.scene.add(player);
  // Core readiness is city + controllable player. NPC population, audio and
  // cosmetic assets are enhancements and must not trip the startup watchdog.
  window.JC_PLAYER_READY=true;
  window.JC_BOOT_STAGE='player-ready';
  document.getElementById('jcRecovery')?.remove();
  // Commit at least one rendered player-ready frame before optional simulation
  // work. This prevents synchronous NPC/world construction from masquerading
  // as a loading hang on constrained browsers.
  await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  {const [carX,carZ]=clearSpot(x+6,z+3);jcCar=createJCCar(game.scene,carX,carZ,groundAt(carX,carZ));}
  createSouls(x, z);
  fireSystem=createFireSystem(game.scene);pickups=createStreetPickups(game.scene,player,groundAt,clearSpot,{onCharge:amount=>{electricCharge=Math.min(100,electricCharge+amount);feedback(`LIGHTNING CHARGED · ${Math.round(electricCharge)}%`);},onHeal:amount=>{grace=Math.min(100,grace+12);feedback(`FIRST AID · ${amount} HEALTH RESTORED`);},onUse:actor=>{if(actor&&typeof actor==='object')npcSystem?.signal('picked-up-item',actor.position,18);else if(actor==='sidearm'){const target=(npcSystem?.npcs||[]).filter(n=>!n.collapse&&n.faction==='demon'&&n.position.distanceTo(player.position)<55&&(n.position.x-player.position.x)*Math.sin(yaw)-(n.position.z-player.position.z)*Math.cos(yaw)>2).sort((a,b)=>a.position.distanceToSquared(player.position)-b.position.distanceToSquared(player.position))[0];if(target){target.health=Math.max(0,(target.health??100)-30);target.state='fear';target.emotionUntil=performance.now()+2400;target.event={type:'JC-sidearm',position:player.position.clone(),time:performance.now()};npcSystem?.signal('gunfire',player.position,42);feedback(`SIDEARM HIT · ${target.name}`);}else feedback('SIDEARM · NO HOSTILE TARGET IN FRONT');}else npcSystem?.signal('flare',player.position,70);},onStatus:text=>feedback(text)});
  npcSystem=createNpcSystem({scene:game.scene,player,groundAt,canSee:visibleToNpc,findPickup:(npc,options)=>pickups?.nearestFor?.(npc,options)||null,findIncident:(position,max)=>systemicWorld?.nearestIncident?.(position,max)||null,onIncidentResponse:(npc,incidentId)=>{const incident=systemicWorld?.incidents?.find?.(row=>row.id===incidentId);return incident?systemicWorld?.npcResponse?.(incident,npc):null;},isSafe:(x,z,r=2)=>!blockedAt(x,groundAt(x,z)+1.55,z,r),isRoadway:(x,z)=>game.roads?.isRoadway?.(x,z)||false,count:500,crowdCount:(game.stable3D?(game.mobileMap?180:320):500),getInfluencer:()=>devilMode?'satan':'jesus',camera:game.camera,mobile:!!game.mobileMap,vehicleAt:(x,z,r)=>game.traffic?.vehicleAt?.(x,z,r)||null,onVehicleHit:npc=>{pickups?.drop(npc.position);npcSystem?.signal('traffic-impact',npc.position,28);},onReport:text=>{npcReadout.textContent=text;}});
  systemicWorld=createSystemicWorld({player,npcSystem,fireSystem,groundAt,clearSpot,onStatus:text=>feedback(text),getFaction:()=>devilMode?'satan':'jc'});window.JC_SYSTEMIC_WORLD=systemicWorld;
  livingWorld=createLivingWorldDirector({player,npcSystem,systemicWorld,fireSystem,groundAt,clearSpot,onStatus:text=>feedback(text),getFaction:()=>devilMode?'satan':'jc'});window.JC_LIVING_WORLD=livingWorld;
  explorableWorld=createExplorableWorld(game,{scene:game.scene,player,groundAt,clearSpot,onStatus:text=>feedback(text),pickupsRef:()=>pickups,npcRef:()=>npcSystem,velocity,getFlight:()=>({flying,height:flightHeight}),setFlight:(value,height)=>{flying=!!value;flightHeight=height;}});
  addBackgroundMusic(document.body);
  cityMissions=createCityMissions({scene:game.scene,player,npcs:npcSystem.npcs,population:npcSystem.population,onReward:reward=>{grace=Math.min(100,grace+reward);}});
  window.addEventListener('jc:building-destroyed',event=>{const detail=event.detail;if(!playing||!detail)return;systemicWorld?.onDestruction(detail,devilMode?'satan':'jc');livingWorld?.onBuildingDestroyed(detail,devilMode?'satan':'jc');const p=detail.position;const n=npcSystem?.collapseAt({position:p,heightMetres:detail.heightMetres},devilMode?'satan':'jesus');if(n)npcReadout.textContent=devilMode?'INFERNAL COLLAPSE · '+n+' CIVILIANS LOST':'MIRACLE RESCUE · '+n+' CIVILIANS FALLING TO SAFETY';});
  game.player=player;game.npcs=npcSystem;
  npcReadout.textContent=`${npcSystem.npcs.length} LIVING NPCS · MOVE CLOSE TO TALK`;
  const devilButton=document.createElement('button');devilButton.type='button';devilButton.id='jcDevilMode';devilButton.textContent='PLAY AS DEVIL';devilButton.setAttribute('aria-pressed','false');hud.querySelector('.jc-score').append(devilButton);
  devilButton.onclick=async()=>{if(!devilTexture){devilTexture=await loadTextureSafe(imageLoader,'./generated-assets/devil-player-v2.webp',fallbackMiracleTexture);devilTexture.colorSpace=THREE.SRGBColorSpace;devilTexture.minFilter=THREE.LinearFilter;}devilMode=!devilMode;if(devilMode&&!evilMiracles.some(a=>a.id===selectedAbility))setActiveMiracle('portal');else if(!devilMode&&!abilities.some(a=>a.id===selectedAbility))setActiveMiracle('light-pulse');devilButton.textContent=devilMode?'PLAY AS JC':'PLAY AS DEVIL';devilButton.setAttribute('aria-pressed',String(devilMode));refreshPresetLabels();applyCharacterFrame(poseIndex);snapCameraBehindPlayer();renderWheel();feedback(devilMode?'DEVIL FORM · DARK MIRACLES · PORTAL TRAVEL':'JC FORM RESTORED · DIVINE MIRACLES');};
  npcReadout.style.cursor='pointer';npcReadout.setAttribute('role','button');npcReadout.tabIndex=0;npcReadout.onclick=()=>openNpcTalk();npcReadout.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openNpcTalk();}};
  hud.querySelector('#jcEditor').onclick = () => setMode(false);
  playReturn.onclick = () => setMode(true);
  addEventListener('keydown', e => {
    if (conversation.isOpen || !playing || e.target.closest('input,select,textarea')) return;
    if(e.code==='KeyH'&&!e.repeat){e.preventDefault();callCar();return;}
    if(e.code==='KeyJ'&&!e.repeat){e.preventDefault();pickups?.use();return;}
    if(e.code==='KeyE'&&!e.repeat){const state=explorableWorld?.update(performance.now()),near=state?.nearby;if(state?.canTransit){e.preventDefault();explorableWorld.linkedZone(explorableWorld.catalog.places.get('military:groom-lake'));return;}if(explorableWorld?.active){e.preventDefault();explorableWorld.exit();return;}if(near&&state?.canEnter){e.preventDefault();if(near.kind==='storm-drain-game-access')explorableWorld.enterDrain(near);else if(near.id==='military:nellis')explorableWorld.linkedZone(near);else explorableWorld.enter(near);return;}if(jcCar&&Math.hypot(player.position.x-jcCar.position.x,player.position.z-jcCar.position.z)<6){e.preventDefault();toggleCar();return;}}
    if(e.target.closest('button')&&!wheel.contains(e.target)&&(e.code==='Space'||e.code==='Enter'))return;
    if(wheel.classList.contains('open')){
      if(e.code==='Tab'||e.code==='Escape'){e.preventDefault();toggleWheel();return;}
      if(['ArrowRight','PageDown','ArrowLeft','PageUp'].includes(e.code)){e.preventDefault();wheel.querySelector(e.code==='ArrowRight'||e.code==='PageDown'?'#jcWheelNext':'#jcWheelPrev').click();return;}
      if(['ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();const page=abilityWheelPage(activeMiracles(),selectedGroup,wheelPage),index=page.items.findIndex(ability=>ability.id===wheelFocusId),step=e.code==='ArrowDown'?1:-1;wheelFocusId=page.items[(index+step+page.items.length)%page.items.length]?.id||selectedAbility;renderWheel();wheel.querySelector(`[data-ability-id="${wheelFocusId}"]`)?.focus();return;}
      return;
    }
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
    if (e.code === 'KeyT' && !e.repeat) {cast(devilMode?'portal':'teleport');}
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
  let tapStart=null;
  game.renderer.domElement.addEventListener('pointerdown',e=>{tapStart={id:e.pointerId,x:e.clientX,y:e.clientY};});
  game.renderer.domElement.addEventListener('pointerup',e=>{if(!tapStart||tapStart.id!==e.pointerId)return;const start=tapStart;tapStart=null;if(!playing||teleportAim||Math.hypot(e.clientX-start.x,e.clientY-start.y)>12)return;const npc=pickPerson(e.clientX,e.clientY);if(npc){selectedPerson=npc;openNpcTalk(npc);feedback(`${npc.name} ADDED TO PEOPLE`);}});
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
  hud.querySelector('[data-action="teleport"]').onclick=()=>{cast(devilMode?'portal':'teleport');};
  hud.querySelector('[data-action="cast"]').onclick=()=>cast();
  hud.querySelector('[data-action="wheel"]').onclick=()=>toggleWheel();
  hud.querySelectorAll('[data-action="preset"]').forEach((button,index)=>button.onclick=()=>{if(assigningPreset===-2){assigningPreset=index;selectedGroup=activeMiracles()[0]?.group||'Travel';toggleWheel();feedback(`CHOOSE A ${devilMode?'DARK MIRACLE':'MIRACLE'} FOR PRESET ${index+1}`);return;}if(assigningPreset>=0){assigningPreset=index;selectedGroup=activeMiracles()[0]?.group||'Travel';toggleWheel();return;}const id=miraclePresets[index];if(activeMiracles().some(a=>a.id===id))cast(id);else{assigningPreset=index;selectedGroup=activeMiracles()[0]?.group||'Travel';toggleWheel();feedback(`CHOOSE A ${devilMode?'DARK MIRACLE':'MIRACLE'} FOR PRESET ${index+1}`);}});
  hud.querySelector('[data-action="edit-presets"]').onclick=()=>{assigningPreset=-2;feedback('TAP PRESET 1–4 TO SWAP ITS MIRACLE');};
  hud.querySelector('#jcCallCar').onclick=callCar;
  hud.querySelector('[data-action="car"]').onclick=toggleCar;
  refreshPresetLabels();
  const moreButton=hud.querySelector('[data-action="more"]'),extras=hud.querySelector('.jc-extras');
  moreButton.onclick=()=>{const open=extras.classList.toggle('open');moreButton.setAttribute('aria-expanded',String(open));moreButton.textContent=open?'LESS':'MORE';};
  hud.querySelector('#jcWheelClose').onclick=()=>wheel.classList.remove('open');
  hud.querySelector('#jcOpenWheel').onclick=()=>toggleWheel();
  wheel.addEventListener('pointerdown',event=>{if(event.target===wheel)wheel.classList.remove('open');});
  renderWheel();
  playReturn.textContent = 'PLAY AS JC';
  setMode(startQueued || new URLSearchParams(location.search).get('play') === '1');
  window.JC_BOOT_STAGE='gameplay-ready';
  requestAnimationFrame(frame);
}
