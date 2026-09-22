import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function getGame(){
  for(let i=0;i<120;i++){
    if(window.JC_GAME?.scene && window.JC_GAME?.player) return window.JC_GAME;
    await wait(100);
  }
  return null;
}

const game = await getGame();
if(!game) throw new Error('JC master upgrade could not attach to game runtime');

const {scene,camera,renderer,player,state} = game;
state.faction ||= 'jc';
state.board ||= false;
state.boardHover ||= false;
state.cameraMode ||= 0;
state.inVehicle ||= false;
state.vehicleSpeed ||= 0;
state.dayNight ||= 'day';
state.cityHope ??= 50;
state.cityCorruption ??= 50;
state.contract ||= 1;
state.contractGoal ||= 6;
state.lockTarget ||= null;

const style = document.createElement('style');
style.textContent = ':root{--hudglass:rgba(5,10,17,.68)}'+
'.brand,.stats,#power,#perf,#jcMission,#jcFlight,#jcMini{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 10px 28px #0006}'+
'#jcMission{position:absolute;left:12px;top:86px;width:min(270px,48vw);padding:10px 12px;background:var(--hudglass);border:1px solid #ffffff22;border-left:3px solid var(--gold);border-radius:0 12px 12px 0;font-size:10px}'+
'#jcMission b{display:block;color:var(--gold);letter-spacing:.08em;margin-bottom:4px}#jcMission small{display:block;color:#aeb9c7;margin-top:4px}'+
'#jcFlight{position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:6px 10px;background:#050911b8;border:1px solid #ffffff20;border-radius:999px;font-size:9px;letter-spacing:.08em}'+
'#jcMini{position:absolute;right:12px;top:108px;width:178px;height:118px;border:1px solid #ffffff2a;border-radius:14px;background:#050911d8}'+
'#jcLock{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);font-size:10px;color:var(--gold);text-shadow:0 2px 7px #000}'+
'.jc-factions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:12px 0}.jc-factions button{min-width:145px}'+
'body[data-faction=satan]{--gold:#ff6538}body[data-faction=satan] .screen{background:radial-gradient(circle at 50% 35%,#2b0d0c,#07090d 66%)}'+
'@media(max-width:850px),(pointer:coarse){#jcMini{width:104px;height:70px;top:88px}#jcMission{top:82px;width:49vw;font-size:8px;padding:7px 8px}#jcFlight{top:7px;font-size:7px}.stats{font-size:8px}.brand{font-size:9px}.mobile-actions{bottom:168px}}';
document.head.appendChild(style);

const hud = $('hud');
if(hud){
  const mission = document.createElement('div'); mission.id='jcMission'; mission.innerHTML='<b>CONTRACT 1</b><span id="jcMissionText">Restore 6 souls</span><small id="jcCityState">HOPE 50 · CORRUPTION 50</small>'; hud.appendChild(mission);
  const flight = document.createElement('div'); flight.id='jcFlight'; hud.appendChild(flight);
  const mini = document.createElement('canvas'); mini.id='jcMini'; mini.width=356; mini.height=236; hud.appendChild(mini);
  const lock = document.createElement('div'); lock.id='jcLock'; hud.appendChild(lock);
}

const menuCard = $('menu')?.querySelector('.card');
let originalStart = $('start')?.onclick || null;
if(menuCard && !$('startSatan')){
  const oldActions = menuCard.querySelector('.actions');
  const row = document.createElement('div'); row.className='jc-factions';
  const jc = $('start'); if(jc){jc.textContent='PLAY AS JC';row.appendChild(jc)}
  const satan = document.createElement('button'); satan.id='startSatan'; satan.className='primary'; satan.textContent='PLAY AS SATAN'; row.appendChild(satan);
  const powers = $('powers'); if(powers) row.appendChild(powers);
  oldActions?.replaceWith(row);
}

const jcAbilityNames = ['Divine Light','Heal','Halo Shield','Teleport','Flight Burst','Lightning','Holy Beam','Telekinesis','Throw','Ground Slam','Mercy Rain','Divine Awareness','Time Slow','Angel Summon','Purify','Resurrection','Halo Dash','Judgment','Grace Wave','Sonic Boom'];
const satanAbilityNames = ['Soul Taker','Infernal Mend','Hell Shield','Shadow Step','Hellflight Burst','Hell Lightning','Hell Beam','Possession Grip','Hurl','Quake','Ash Storm','Predator Sight','Time Snare','Demon Summon','Mass Corruption','Second Coming','Shadow Dash','Damnation','Hell Wave','Sonic Rupture'];
const originalAbilityNames = game.abilities.map(a => a[0]);
function applyFaction(faction){
  state.faction = faction;
  document.body.dataset.faction = faction;
  const satan = faction === 'satan';
  document.documentElement.style.setProperty('--gold', satan ? '#ff6538' : '#ffd45a');
  const names = satan ? satanAbilityNames : jcAbilityNames;
  game.abilities.forEach((a,i) => { if(names[i]) a[0]=names[i]; });
  const buttons = Array.from($('abilityGrid')?.children || []);
  buttons.forEach((b,i) => { const title=b.querySelector('b'); if(title && game.abilities[i]) title.textContent=String(i+1).padStart(2,'0')+' · '+game.abilities[i][0]; });
  const power = $('power'); if(power && game.abilities[state.selected]) power.textContent=game.abilities[state.selected][0].toUpperCase()+' · X / RT';
  const brand = document.querySelector('.brand'); if(brand) brand.childNodes[0].nodeValue = satan ? 'SATAN • SIN CITY ' : 'JC • SIN CITY ';
  const body=player.children?.[0];const halo=player.children?.[2];if(body?.material?.color)body.material.color.setHex(satan?0x351010:0xf2f0e8);if(halo?.material?.color)halo.material.color.setHex(satan?0xff3f24:0xffd45a);
}

const oldStart = $('start')?.onclick;
if($('start')) $('start').onclick = () => { applyFaction('jc'); if(oldStart) oldStart(); setTimeout(()=>{const n=$('notice');if(n){n.textContent='RESTORE THE LOST · TAKE BACK THE STRIP';n.style.opacity=1}},0); };
if($('startSatan')) $('startSatan').onclick = () => { applyFaction('satan'); if(oldStart) oldStart(); setTimeout(()=>{const n=$('notice');if(n){n.textContent='CLAIM SOULS · CORRUPT THE STRIP';n.style.opacity=1}},0); };

const car = new THREE.Group();
const carBody = new THREE.Mesh(new THREE.BoxGeometry(2.1,.72,4.2),new THREE.MeshLambertMaterial({color:0xeee6ce})); carBody.position.y=.82; car.add(carBody);
const wheels=[];
for(const x of [-1,1]) for(const z of [-1.38,1.38]){ const w=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.26,12),new THREE.MeshLambertMaterial({color:0x111111}));w.rotation.z=Math.PI/2;w.position.set(x,.42,z);car.add(w);wheels.push(w); }
const carHalo = new THREE.Mesh(new THREE.TorusGeometry(1.35,.055,8,28),new THREE.MeshBasicMaterial({color:0xffd45a}));carHalo.rotation.x=Math.PI/2;carHalo.position.y=1.85;car.add(carHalo);car.position.set(11,0,130);scene.add(car);

const board = new THREE.Mesh(new THREE.BoxGeometry(1.7,.11,.46),new THREE.MeshLambertMaterial({color:0xd9bd65}));board.position.y=-.05;board.visible=false;player.add(board);

const npcGroup = new THREE.Group();scene.add(npcGroup);const npcs=[];
const npcCount = Math.max(16,Math.min(56,(navigator.hardwareConcurrency||4)*4));
for(let i=0;i<npcCount;i++){
  const n=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.75,3,5),new THREE.MeshLambertMaterial({color:i%5===0?0xe2b27d:0x728399}));
  n.position.set((Math.random()-.5)*900,.72,(Math.random()-.5)*1200);n.userData.dir=Math.random()*Math.PI*2;n.userData.next=0;npcGroup.add(n);npcs.push(n);
}
window.JC_CITY_SIM = {citizens:10000,highDetailNPCs:npcCount,deepAISlots:25,hope:state.cityHope,corruption:state.cityCorruption};
window.JC_NPC_AI={
  provider:null,
  setProvider(fn){this.provider=typeof fn==='function'?fn:null;},
  async talk(index=0){
    const npc=npcs[index%npcs.length];if(!npc)return null;
    const payload={faction:state.faction,hope:state.cityHope,corruption:state.cityCorruption,position:npc.position.toArray()};
    if(this.provider)return this.provider(payload);
    return state.faction==='jc'?'The city is watching what you do.':'Sin City is listening.';
  }
};

const destructible=[];
for(let i=0;i<18;i++){
  const h=55+Math.random()*110,w=32+Math.random()*48,d=28+Math.random()*42;
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:0x8f765e}));
  const side=i%2?1:-1;m.position.set(side*(105+Math.random()*115),h/2,-900+i*105);m.userData.hp=100;m.userData.collapsed=false;m.userData.destructible=true;scene.add(m);destructible.push(m);
}

const debris=[];
function spawnDebris(pos,color){
  for(let i=0;i<7;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(.5+Math.random(),.5+Math.random(),.5+Math.random()),new THREE.MeshLambertMaterial({color}));
    m.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*5,1+Math.random()*5,(Math.random()-.5)*5));m.userData.v=new THREE.Vector3((Math.random()-.5)*7,4+Math.random()*6,(Math.random()-.5)*7);m.userData.life=performance.now()+1500;scene.add(m);debris.push(m);
  }
}
function nearestBuilding(max=85){let best=null,d=max;for(const m of destructible){if(m.userData.collapsed)continue;const q=player.position.distanceTo(m.position);if(q<d){d=q;best=m}}return best}
function hitBuilding(amount){const m=nearestBuilding();if(!m)return;m.userData.hp-=amount;if(m.userData.hp<=0){m.userData.collapsed=true;spawnDebris(m.position,m.material.color.getHex());m.scale.y=.08;m.position.y=2;state.score=(state.score||0)+500;const msg=state.faction==='jc'?'BUILDING COLLAPSED · CIVILIAN RISK':'STRUCTURE DESTROYED';const el=$('notice');if(el){el.textContent=msg;el.style.opacity=1;setTimeout(()=>el.style.opacity=0,1700)}}}
function manipulateBuilding(kind){
  const m=nearestBuilding(110);if(!m)return;
  if(kind==='lift'){m.position.y+=8;m.userData.lifted=true;}
  if(kind==='throw'){m.position.x+=Math.sin(state.yaw||0)*72;m.position.z-=Math.cos(state.yaw||0)*72;m.rotation.z+=.75;m.userData.hp-=45;}
}

const keyState={};let boostUntil=0,last=performance.now(),npcTick=0,miniTick=0,saveTick=0,lastSoulCount=state.souls||0;
let upgradePadButtons=[];
function pollUpgradeGamepad(){
  const gp=navigator.getGamepads?.()[0];if(!gp)return;
  const p=i=>!!gp.buttons[i]?.pressed,edge=i=>p(i)&&!upgradePadButtons[i];
  if(edge(12))toggleBoard();
  if(edge(13))enterExitCar();
  if(edge(8))toggleCamera();
  if(p(1)&&state.inVehicle)state.vehicleSpeed*=.92;
  upgradePadButtons=gp.buttons.map(b=>b.pressed);
}
function enterExitCar(){
  if(state.inVehicle){state.inVehicle=false;state.paused=false;player.visible=true;player.position.copy(car.position).add(new THREE.Vector3(2.4,0,0));return}
  if(player.position.distanceTo(car.position)<9){state.inVehicle=true;state.paused=true;player.visible=false;state.board=false;board.visible=false;}
}
function toggleBoard(){if(state.inVehicle)return;state.board=!state.board;board.visible=state.board;}
function toggleCamera(){state.cameraMode=(state.cameraMode+1)%3;}

addEventListener('keydown',e=>{
  keyState[e.code]=true;
  if(e.repeat)return;
  if(e.code==='KeyE') enterExitCar();
  if(e.code==='KeyK') toggleBoard();
  if(e.code==='KeyC'){ if(state.board) state.boardHover=!state.boardHover; else toggleCamera(); }
  if(e.code==='KeyQ') boostUntil=performance.now()+1500;
  if(e.code==='KeyT'){state.dayNight=state.dayNight==='day'?'night':'day'; const night=state.dayNight==='night'; scene.background?.setHex(night?0x060817:0x8fa8bc); if(scene.fog) scene.fog.color.setHex(night?0x060817:0x8fa8bc);}
  if(e.code==='KeyI') state.lockTarget=state.lockTarget?null:nearestBuilding(140);
  if(e.code==='KeyV') hitBuilding(48);
  if(e.code==='KeyX'){
    const code=game.abilities[state.selected]?.[3];
    if(code==='beam'||code==='judgment') hitBuilding(55);
    if(code==='lightning') hitBuilding(32);
    if(code==='telekinesis') manipulateBuilding('lift');
    if(code==='throw') manipulateBuilding('throw');
    if(code==='slam'||code==='wave'||code==='sonic') hitBuilding(38);
  }
});
addEventListener('keyup',e=>keyState[e.code]=false);

function updateVehicle(dt,t){
  if(!state.inVehicle)return;
  const throttle=(keyState.KeyW?1:0)-(keyState.KeyS?1:0);
  const steer=(keyState.KeyD?1:0)-(keyState.KeyA?1:0);
  state.vehicleSpeed += throttle*28*dt;
  state.vehicleSpeed *= Math.pow((keyState.KeyB||keyState.Space)?0.9:0.986,dt*60);
  state.vehicleSpeed=clamp(state.vehicleSpeed,-12,t<boostUntil?72:42);
  car.rotation.y -= steer*dt*(1.15+Math.abs(state.vehicleSpeed)*.02);
  car.position.x += Math.sin(car.rotation.y)*state.vehicleSpeed*dt;
  car.position.z -= Math.cos(car.rotation.y)*state.vehicleSpeed*dt;
  wheels.forEach(w=>w.rotation.x-=state.vehicleSpeed*dt/.4);
  player.position.copy(car.position);
  const d=state.cameraMode===2?7.5:state.cameraMode===1?17:11;
  const h=state.cameraMode===2?4:state.cameraMode===1?8:5.5;
  const target=new THREE.Vector3(car.position.x-Math.sin(car.rotation.y)*d,car.position.y+h,car.position.z+Math.cos(car.rotation.y)*d);
  camera.position.lerp(target,.16);camera.lookAt(car.position.x,car.position.y+1.2,car.position.z);
}
let flightFxTick=0;
function flightShockwave(){
  const ring=new THREE.Mesh(
    new THREE.RingGeometry(1.1,1.55,32),
    new THREE.MeshBasicMaterial({color:state.faction==='satan'?0xff6a3d:0xe7f7ff,transparent:true,opacity:.9,side:THREE.DoubleSide})
  );
  ring.position.copy(player.position);ring.position.y+=2;ring.rotation.x=Math.PI/2;scene.add(ring);
  const born=performance.now();
  (function animate(){
    const age=(performance.now()-born)/650;
    ring.scale.setScalar(1+age*18);ring.material.opacity=Math.max(0,1-age);
    if(age>=1){scene.remove(ring);ring.geometry.dispose();ring.material.dispose();return;}
    requestAnimationFrame(animate);
  })();
}
function updateFlight(dt,t){
  if(!state.flight||state.inVehicle){
    player.rotation.x=THREE.MathUtils.lerp(player.rotation.x,0,.12);
    return;
  }
  const moving=keyState.KeyW||keyState.KeyA||keyState.KeyS||keyState.KeyD;
  const boosted=keyState.ShiftLeft||t<boostUntil||t<(state.speedBoost||0);
  player.rotation.x=THREE.MathUtils.lerp(player.rotation.x,moving?-.30:0,.09);
  player.rotation.z=THREE.MathUtils.lerp(player.rotation.z,(keyState.KeyA?.16:0)+(keyState.KeyD?-.16:0),.10);
  if(boosted&&t>flightFxTick){flightShockwave();flightFxTick=t+720;}
}
function updateBoard(dt,t){
  if(!state.board||state.inVehicle)return;
  const speed=state.boardHover?(keyState.ShiftLeft?30:20):(keyState.ShiftLeft?23:15);
  if(keyState.KeyW){player.position.x+=Math.sin(state.yaw||0)*speed*dt;player.position.z-=Math.cos(state.yaw||0)*speed*dt;}
  board.rotation.z=Math.sin(t*.008)*.05;
}
function updateNPCs(t){
  if(t<npcTick)return;npcTick=t+220;
  for(const n of npcs){if(t>n.userData.next){n.userData.dir+=(Math.random()-.5)*1.8;n.userData.next=t+700+Math.random()*1800}if(n.position.distanceTo(player.position)<160){n.position.x+=Math.sin(n.userData.dir)*.35;n.position.z+=Math.cos(n.userData.dir)*.35}}
}
function updateDebris(dt,t){for(let i=debris.length-1;i>=0;i--){const d=debris[i];d.position.addScaledVector(d.userData.v,dt);d.userData.v.y-=18*dt;d.rotation.x+=dt*3;d.rotation.z+=dt*2;if(t>d.userData.life){scene.remove(d);d.geometry.dispose();d.material.dispose();debris.splice(i,1)}}}
function updateMission(){
  const delta=(state.souls||0)-lastSoulCount;
  if(delta>0){
    if(state.faction==='jc'){
      state.cityHope=clamp(state.cityHope+delta*1.2,0,100);
      state.cityCorruption=clamp(state.cityCorruption-delta*.7,0,100);
    }else{
      state.cityCorruption=clamp(state.cityCorruption+delta*1.2,0,100);
      state.cityHope=clamp(state.cityHope-delta*.7,0,100);
    }
    lastSoulCount=state.souls||0;
  }
  const goal=state.contract*state.contractGoal;
  if((state.souls||0)>=goal){state.contract++;state.score=(state.score||0)+1500;if(state.faction==='jc'){state.cityHope=clamp(state.cityHope+7,0,100);state.cityCorruption=clamp(state.cityCorruption-4,0,100)}else{state.cityCorruption=clamp(state.cityCorruption+7,0,100);state.cityHope=clamp(state.cityHope-4,0,100)}}
  const need=Math.max(0,state.contract*state.contractGoal-(state.souls||0));
  if($('jcMission')) $('jcMission').querySelector('b').textContent='CONTRACT '+state.contract;
  if($('jcMissionText')) $('jcMissionText').textContent=(state.faction==='jc'?'Restore ':'Claim ')+need+' souls';
  if($('jcCityState')) $('jcCityState').textContent='HOPE '+Math.round(state.cityHope)+' · CORRUPTION '+Math.round(state.cityCorruption);
  window.JC_CITY_SIM.hope=state.cityHope;window.JC_CITY_SIM.corruption=state.cityCorruption;
}
function drawMini(t){
  if(t<miniTick)return;miniTick=t+140;const c=$('jcMini');if(!c)return;const g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);g.fillStyle='#07101a';g.fillRect(0,0,w,h);g.strokeStyle='#2f3a48';g.lineWidth=3;for(let x=36;x<w;x+=54){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}for(let y=24;y<h;y+=44){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}g.fillStyle=state.faction==='jc'?'#ffd45a':'#ff6538';g.beginPath();g.arc(w/2,h/2,7,0,Math.PI*2);g.fill();g.fillStyle='#b4c3d7';for(let i=0;i<Math.min(12,npcs.length);i++){const dx=(npcs[i].position.x-player.position.x)*.08,dz=(npcs[i].position.z-player.position.z)*.08;if(Math.abs(dx)<w/2&&Math.abs(dz)<h/2)g.fillRect(w/2+dx-2,h/2+dz-2,4,4)}}
function save(t){if(t<saveTick)return;saveTick=t+5000;try{localStorage.setItem('jc-master-upgrade',JSON.stringify({faction:state.faction,score:state.score,souls:state.souls,contract:state.contract,hope:state.cityHope,corruption:state.cityCorruption}))}catch{}}
function loop(t){requestAnimationFrame(loop);const dt=Math.min(.05,(t-last)/1000);last=t;pollUpgradeGamepad();updateVehicle(dt,t);updateFlight(dt,t);updateBoard(dt,t);updateNPCs(t);updateDebris(dt,t);updateMission();drawMini(t);save(t);if($('jcFlight')){$('jcFlight').textContent=state.inVehicle?'HALO CAR · '+Math.round(Math.abs(state.vehicleSpeed)*2.237)+' MPH':state.board?(state.boardHover?'HOVERBOARD':'BOARD'):(state.flight?'FLIGHT · ALT '+Math.round(player.position.y)+'m':'')}if($('jcLock'))$('jcLock').textContent=state.lockTarget?'TARGET LOCK':'';carBody.material.color.setHex(state.faction==='jc'?0xeee6ce:0x2c0808);carHalo.material.color.setHex(state.faction==='jc'?0xffd45a:0xff3f24)}
requestAnimationFrame(loop);

try{const saved=JSON.parse(localStorage.getItem('jc-master-upgrade')||'null');if(saved){state.faction=saved.faction||'jc';state.score=saved.score||state.score;state.souls=saved.souls||state.souls;state.contract=saved.contract||1;state.cityHope=saved.hope??50;state.cityCorruption=saved.corruption??50;applyFaction(state.faction)}}catch{}

const mobileActions=document.querySelector('.mobile-actions');
if(mobileActions){
  const ride=document.createElement('button');ride.id='mRideUpgrade';ride.textContent='RIDE';ride.onclick=enterExitCar;mobileActions.appendChild(ride);
  const skate=document.createElement('button');skate.id='mBoardUpgrade';skate.textContent='BOARD';skate.onclick=toggleBoard;mobileActions.appendChild(skate);
  const cam=document.createElement('button');cam.id='mCameraUpgrade';cam.textContent='CAM';cam.onclick=()=>{if(state.board)state.boardHover=!state.boardHover;else toggleCamera()};mobileActions.appendChild(cam);
}

window.JC_MASTER_UPGRADE={version:'2026.09.21-master-v4',vehicle:car,board,npcs,destructible,citySim:window.JC_CITY_SIM,applyFaction};
console.info('JC master upgrade attached',window.JC_MASTER_UPGRADE.version);
