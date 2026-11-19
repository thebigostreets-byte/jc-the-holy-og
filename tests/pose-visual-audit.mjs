// Real-browser, all-pose QA: extracts every authored image and renders all
// 139 articulated configurations. Artifacts are reviewable front-view sheets.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base='http://127.0.0.1:8865';
const server=spawn('python3',['-m','http.server','8865','--bind','127.0.0.1','--directory','dist/client'],{stdio:'ignore'});
const errors=[];
let browser;
try{
 let started=false;
 for(let i=0;i<40;i++){
  try{const r=await fetch(base+'/poses/pose-0.webp',{method:'HEAD'});if(r.ok){started=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(started,'hydrated pose sprites are served over HTTP');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1800,height:2600},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push('page: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
 await page.route('**/pose-audit.html',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#202832;color:white;font:12px Arial"></body></html>'}));
 await page.goto(base+'/pose-audit.html',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{
  const {cleanPoseImage}=await import('/pose-cleanup.js');
  const {jcJointPose}=await import('/jc-pose-kinematics.js');
  const {createCharacter3D}=await import('/jc-character3d.js');
  const THREE=await import('/three.module.js');
  const metrics=[];
  const original=document.createElement('canvas');
  original.id='jc-39-artwork-sheet';original.width=8*160;original.height=5*215;
  const out=original.getContext('2d');
  document.body.append(original);
  function image(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Missing pose: '+url));img.src=url;});}
  for(let i=0;i<39;i++){
   const img=await image('/poses/pose-'+i+'.webp');
   const src=document.createElement('canvas');src.width=img.naturalWidth;src.height=img.naturalHeight;
   const sc=src.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0);
   const rgba=sc.getImageData(0,0,src.width,src.height).data;
   let visible=0,minX=src.width,minY=src.height,maxX=-1,maxY=-1;
   for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
    if(rgba[(y*src.width+x)*4+3]<8)continue;
    visible++;minX=Math.min(minX,x);minY=Math.min(minY,y);
    maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
   }
   const cleaned=cleanPoseImage(img);
   if(!cleaned.poseHasPixels)throw new Error('Blank source pose '+i);
   const opaqueFraction=visible/(src.width*src.height);
   const bounds=[minX,minY,maxX,maxY];
   const edgeClip=minX===0||minY===0||maxX===src.width-1||maxY===src.height-1;
   metrics.push({id:i,width:src.width,height:src.height,coverage:+opaqueFraction.toFixed(3),bounds,edgeClip,displayHeight:+cleaned.poseDisplayHeight.toFixed(2)});
   const x=i%8*160,y=Math.floor(i/8)*215;
   out.fillStyle='#17212e';out.fillRect(x,y,160,215);
   out.fillStyle='#f8f4e8';out.fillText('JC PHOTO '+i,x+8,y+15);
   out.drawImage(cleaned,x+17,y+20,126,186);
   if(edgeClip||opaqueFraction>.97){out.fillStyle='#ec8950';out.fillRect(x+134,y+4,15,15);}
  }
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x2a3440);
  scene.add(new THREE.HemisphereLight(0xffffff,0x313c50,2.1));
  const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(3,5,6);scene.add(light);
  const actor=createCharacter3D({faction:'angel',player:true});scene.add(actor);
  const camera=new THREE.PerspectiveCamera(35,144/170,.1,100);
  camera.position.set(0,2.9,9.8);camera.lookAt(0,1.85,0);
  const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(144,170);
  const sheet=document.createElement('canvas');sheet.id='jc-139-articulated-sheet';
  sheet.width=12*150;sheet.height=12*200;document.body.append(sheet);
  const sctx=sheet.getContext('2d');
  for(let i=0;i<139;i++){
   const pose=jcJointPose(i);
   actor.userData.character.setPose(i,0,5,500+i*250,false);
   actor.position.y=pose.rootY*actor.scale.y;
   renderer.render(scene,camera);
   const x=i%12*150,y=Math.floor(i/12)*200;
   sctx.fillStyle='#0e141e';sctx.fillRect(x,y,150,200);
   sctx.drawImage(renderer.domElement,x+3,y+3,144,170);
   sctx.fillStyle='#f8f4e8';sctx.font='11px Arial';
   sctx.fillText(i+' '+pose.name.slice(0,18),x+5,y+187);
  }
  renderer.dispose();actor.userData.dispose?.();
  return {artwork:metrics.length,articulated:139,metrics,renderAPI:renderer.capabilities.isWebGL2?'WebGL 2':'WebGL 1'};
 });
 assert.equal(result.artwork,39);
 assert.equal(result.articulated,139);
 assert.ok(result.metrics.every(m=>m.coverage>0&&m.width>0&&m.height>0&&Number.isFinite(m.displayHeight)));
 await mkdir('artifacts',{recursive:true});
 await page.locator('#jc-39-artwork-sheet').screenshot({path:'artifacts/jc-39-pose-visual-audit.png',timeout:45000});
 await page.locator('#jc-139-articulated-sheet').screenshot({path:'artifacts/jc-all-139-articulated-poses.png',timeout:45000});
 await writeFile('artifacts/jc-pose-metrics.json',JSON.stringify(result,null,2));
 console.log('POSE AUDIT SUMMARY:',JSON.stringify({artwork:result.artwork,articulated:result.articulated,renderAPI:result.renderAPI,edgeClipped:result.metrics.filter(x=>x.edgeClip).map(x=>x.id),opaqueFrames:result.metrics.filter(x=>x.coverage>.97).map(x=>x.id)}));
 assert.equal(errors.filter(x=>/Shader Error|TypeError|Unhandled/.test(x)).length,0,'no shader or JS exceptions during 139 renders');
 console.log('PASS: 39 original artwork files analyzed and all 139 articulated rigs GPU-rendered; sheets saved.');
 // Integration smoke: use the actual Las Vegas game on a mobile-sized viewport.
 // Verify every representative pose class can be selected in live play.
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/map.html?play=1&quality=mobile&photoCutouts=off',{
   waitUntil:'domcontentloaded',timeout:45000
 });
 await page.waitForFunction(
   ()=>window.JC_BOOT_STAGE==='gameplay-ready'||window.JC_BOOT_FAILED===true,
   {timeout:65000}
 );
 const state=await page.evaluate(()=>({
   ready:window.JC_BOOT_STAGE==='gameplay-ready',
   failed:!!window.JC_BOOT_FAILED,
   active:document.getElementById('loading')?.style.display,
   total:window.JC_POSE_BANK?.all?.().length,
   runtimeError:window.JC_RUNTIME_ERROR||null
 }));
 assert.equal(state.ready,true,'Pose changes must not block city startup');
 assert.equal(state.failed,false,'No 3D startup fatal error');
 assert.equal(state.total,139,'All 139 poses selectable inside the live game');
 assert.equal(state.runtimeError,null,'Pose startup must not cause a frame exception');
 for(const id of [0,5,14,19,23,31,39,51,67,91,121,138]){
   const played=await page.evaluate(id=>window.JC_POSE_BANK?.play(id,750),id);
   assert.equal(played,true,'JC pose '+id+' is playable in the running city');
   await page.waitForTimeout(90);
 }
 await page.screenshot({path:'artifacts/jc-pose-in-game-mobile.png',timeout:30000});
 const after=await page.evaluate(()=>window.JC_RUNTIME_ERROR||null);
 assert.equal(after,null,'Live pose switching keeps the game frame loop stable');
 assert.ok(!errors.some(x=>/Shader Error|Cannot read properties|Cannot set properties/.test(x)),
   'No shader or 3D character errors during live pose audition');
 console.log('PASS: actual mobile-sized Las Vegas startup and 12 representative poses complete without gameplay frame errors.');

}finally{await browser?.close();server.kill();}
