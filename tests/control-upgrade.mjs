import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../three.module.js';
import {stickAxis,standardPadActions,standardPadHolds,response,advancePedal,advanceChain,advanceLook,setFlightForward} from '../jc-control-math.js';

assert.equal(stickAxis(.12),0);
assert.equal(stickAxis(-1),-1);
assert.ok(stickAxis(.5)>.3&&stickAxis(.5)<.5);
assert.equal(stickAxis(.08,.12),0,'touch stick ignores resting thumb drift');
assert.ok(Math.abs(stickAxis(.56,.12)-.5)<1e-9,'touch and gamepad use the same rescaled deadzone');
assert.deepEqual(standardPadActions,[[0,'jump'],[1,'cast'],[2,'hypersonic'],[3,'car'],[4,'flight'],[5,'shield'],[8,'wheel'],[9,'pause']],'face buttons and menu controls match standard Gamepad API indices');
assert.deepEqual(standardPadHolds,[[0,'Space'],[6,'Control'],[7,'Space']],'A rises during flight and triggers control altitude');

const aim=new THREE.Vector3();
setFlightForward(aim,0,0);
assert.ok(aim.distanceTo(new THREE.Vector3(0,0,-1))<1e-9,'neutral aim flies straight');
setFlightForward(aim,Math.PI/2,0);
assert.ok(aim.distanceTo(new THREE.Vector3(1,0,0))<1e-9,'yaw steers in every horizontal direction');
setFlightForward(aim,0,Math.PI/4);
assert.ok(Math.abs(aim.y-Math.SQRT1_2)<1e-9&&Math.abs(aim.length()-1)<1e-9,'pitch steers upward without changing flight speed');

const lookRight=advanceLook(0,0,1,0,1/60),lookLeft=advanceLook(0,0,-1,0,1/60),lookUp=advanceLook(0,0,0,-1,1/60),lookDown=advanceLook(0,0,0,1,1/60);
assert.ok(lookRight.yaw>0&&lookLeft.yaw<0,'right stick turns view both ways');
assert.ok(lookUp.pitch>0&&lookDown.pitch<0,'right stick aims view up and down');
assert.ok(advanceLook(0,0,1,0,1).yaw>=.25,'full right stick turns decisively even when dt is clamped');
assert.equal(advanceLook(0,.72,0,-1,1).pitch,.72,'look pitch cannot flip camera');

function coast(hz){let velocity=72;for(let i=0;i<hz;i++)velocity+=(0-velocity)*response(12,1/hz);return velocity;}
assert.ok(Math.abs(coast(30)-coast(120))<1e-9,'velocity response is frame-rate independent');

function pedal(hz,target,seconds=1){let value=0;for(let i=0;i<hz*seconds;i++)value=advancePedal(value,target,1/hz);return value;}
assert.ok(Math.abs(pedal(30,1)-pedal(120,1))<1e-9,'gas ramp is frame-rate independent');
assert.ok(pedal(60,1,.25)>.94,'gas reaches useful throttle quickly');
assert.ok(pedal(60,-.58,.25)<-.54,'reverse throttle engages quickly');
let pedalValue=pedal(60,1,.25);for(let i=0;i<30;i++)pedalValue=advancePedal(pedalValue,0,1/60);
assert.ok(pedalValue<.02,'released pedal decays cleanly instead of sticking');

let chain={count:0,last:0,points:0};
for(let i=1;i<=8;i++)chain=advanceChain(chain,i*3);
assert.equal(chain.points,3600);
assert.equal(chain.count,8);
assert.equal(advanceChain(chain,40).count,1);

const source=readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
assert.match(source,/controllerPaused/,'Start pauses gameplay and freezes the world');
assert.match(source,/id==='jump'\)\{if\(!flying\)dash\(\);\}/,'A dash-jumps grounded and rises when held during flight');
assert.match(source,/id==='cast'\)cast\(\)/,'B casts the equipped power');
assert.match(source,/advancePedal/,'game imports the tested pedal response');
assert.match(source,/id="jcGas"[^>]+aria-label="Hold gas pedal to move forward"/,'mobile has a dedicated gas pedal');
assert.match(source,/id="jcGasFill"/,'gas pedal exposes visible throttle feedback');
assert.match(source,/BRAKE \/ REV/,'mobile brake doubles as reverse');
assert.match(source,/gasPointerId = null/,'gas owns one pointer independently');
assert.match(source,/brakePointerId = null/,'brake owns one pointer independently');
assert.match(source,/const mobileReverse=coarseDevice&&brakeHeld&&!flying&&!gasHeld&&horizontalMotion<1\.1/,'brake transitions to reverse only after slowing down');
assert.match(source,/throttle=advancePedal\(throttle,throttleTarget,dt\)/,'pedal uses smooth frame-rate-independent throttle');
assert.match(source,/desired\.addScaledVector\(travelForward,throttle\)/,'pedal drives the movement vector directly');
assert.match(source,/const steerAssist=coarseDevice&&\(gasHeld\|\|brakeHeld\|\|drivingCar\)\?1\.18:1/,'right stick gains steering authority while driving');
assert.match(source,/hypersonic && flying && grace > 0 && !braking && \(!coarseDevice\|\|gasHeld\|\|Math\.abs\(throttle\)>\.05\)/,'mobile hyperflight requires active thrust');
assert.match(source,/function openNpcTalk\(npc=nearNpc\)\{if\(npc&&playing\)\{resetInput\(\)/,'opening NPC dialogue cancels held movement');
assert.match(source,/#jcSettings'\)\.onclick=\(\)=>\{resetInput\(\)/,'opening settings cancels held movement');
assert.match(source,/gas\.addEventListener\('lostpointercapture',\(\)=>\{\}/,'capture loss alone does not cancel gas');
assert.match(source,/addEventListener\('pointermove',e=>\{\s*let handled=false;/,'global pointer tracking preserves joystick movement if capture is lost');
assert.match(source,/if\(!pointerEventsSupported\)\{/,'legacy touch path only runs where Pointer Events are unavailable');
assert.match(source,/id="jcLookStick" role="group" aria-label="Right joystick: steer and look"/,'right stick remains independently labeled');
assert.match(source,/setFlightForward\(flightForward,yaw,viewPitch\)/,'aim pitch controls three-dimensional flight direction');

const start=source.indexOf('function blockedAt('),end=source.indexOf('\nlet flying',start);
const player={position:new THREE.Vector3(0,0,0)},velocity=new THREE.Vector3(72,0,0);
const box=new THREE.Box3(new THREE.Vector3(5,-2,-10),new THREE.Vector3(6,10,10));
const collisionCells=new Map([['0:0',[box]],['0:-1',[box]]]);
const context=vm.createContext({
  THREE,player,velocity,collisionCells,cellSize:64,Math,
  performance:{now:()=>1000},lastImpact:0,showPose:()=>{},feedback:()=>{},
  game:null,hypersonic:false,flying:false,lastVehicleHit:0
});
vm.runInContext(source.slice(start,end),context);
context.moveSafely(12,0);
assert.ok(player.position.x<3.9,'dash cannot tunnel through a thin building');
assert.equal(velocity.x,0);
player.position.set(0,12,0);
context.flying=true;
context.moveSafely(12,0);
assert.ok(Math.abs(player.position.x-12)<1e-9,'flight clears roofs');
context.flying=false;
player.position.set(0,0,0);
context.moveSafely(12,0,true);
assert.ok(Math.abs(player.position.x-12)<1e-9,'phase ability preserves deliberate collision bypass');
player.position.set(0,0,0);
context.moveSafely(12,5);
assert.ok(player.position.z>4.9,'movement slides along a wall');

assert.equal(readFileSync(new URL('../dist/client/jc-map-game.js',import.meta.url),'utf8'),source,'deployed game source must match authored source');
assert.equal(readFileSync(new URL('../dist/client/jc-control-math.js',import.meta.url),'utf8'),readFileSync(new URL('../jc-control-math.js',import.meta.url),'utf8'),'deployed control math must match authored source');

console.log('PASS: resilient gas pedal, progressive throttle, brake/reverse, steering assist, modal cancellation, pointer ownership, flight thrust, collision safety, deployed parity');
