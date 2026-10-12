// Browser-level startup verification for the real built JC client.
// Runs separately from Node tests because city rendering requires WebGL.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';

const base='http://127.0.0.1:8765';
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1','--directory','dist/client'],{stdio:'ignore'});
const diagnostics=[];
function note(text){diagnostics.push(String(text).slice(0,500));}
const timeout=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try {
 let up=false;
 for(let attempt=0;attempt<40;attempt++){
  try{const r=await fetch(base+'/map.html');if(r.ok){up=true;break;}}catch{}
  await timeout(250);
 }
 assert.ok(up,'Built client HTTP server starts');
 for(const asset of ['/city-manifest.json','/map-engine.js','/map-startup.js','/tiles/C15_R14.glb.gz']){
  const response=await fetch(base+asset,{method:'HEAD'});
  assert.ok(response.ok,asset+' is served with HTTP '+response.status);
 }
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
  '--enable-unsafe-swiftshader','--disable-dev-shm-usage'
 ]});
 const context=await browser.newContext({...devices['iPhone 13'],browserName:undefined});
 const page=await context.newPage();
 page.on('pageerror',e=>note('JS '+e.message));
 page.on('console',m=>{if(m.type()==='error')note('Console '+m.text());});
 page.on('response',response=>{if(response.status()>=400)note('HTTP '+response.status()+' '+response.url().split('/').pop());});
 await page.goto(base+'/map.html?play=1&quality=mobile&photoCutouts=off',{waitUntil:'domcontentloaded',timeout:45000});
 const graphics=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');
  try{return Boolean(canvas.getContext('webgl2')||canvas.getContext('webgl'));}catch{return false;}
 });
 if(!graphics)throw Error('Browser runner does not support WebGL; cannot assert city startup.');
 let outcome='timeout';
 try{
  await page.waitForFunction(()=>window.JC_BOOT_STAGE==='gameplay-ready'||window.JC_BOOT_FAILED===true,{timeout:65000});
  outcome=await page.evaluate(()=>window.JC_BOOT_STAGE==='gameplay-ready'?'gameplay-ready':'boot-failed');
  // Wait for at least a few real frames to catch errors after player spawn.
  if(outcome==='gameplay-ready')await page.waitForTimeout(900);
 }catch{}
 const status=await page.evaluate(()=>({
  stage:window.JC_BOOT_STAGE||null,cityReady:!!window.JC_CITY_READY,
  playerReady:!!window.JC_PLAYER_READY,failed:!!window.JC_BOOT_FAILED,
  error:window.JC_TILE_LOAD_ERROR||null,runtimeError:window.JC_RUNTIME_ERROR||null,
  loadingVisible:getComputedStyle(document.getElementById('loading')).display!=='none',
  recoveryVisible:!!document.getElementById('jcRecovery'),
  buildings:window.JC_CITY_BOOT_BUILDINGS||0,renderer:window.JC_RENDERER_API||null
 }));
 console.log('Browser startup state:',JSON.stringify({outcome,status,diagnostics:diagnostics.slice(-16)}));
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/jc-startup-mobile.png',timeout:15000}).catch(e=>note(e.message));
 assert.equal(outcome,'gameplay-ready','JC must finish gameplay bootstrap on mobile viewport');
 assert.equal(status.runtimeError,null,'first gameplay frames must not throw');
 assert.ok(!diagnostics.some(s=>/Shader Error|Fragment shader is not compiled|runtime frame recovered/.test(s)),'WebGL compilation and the runtime loop must stay healthy');
 assert.equal(status.loadingVisible,false,'Opening the city overlay must disappear');
 assert.equal(status.recoveryVisible,false,'Recovery overlay must disappear on success');
 console.log('PASS: JC loaded past Opening the city in real headless browser.');
}finally{
 await browser?.close();
 server.kill();
}
