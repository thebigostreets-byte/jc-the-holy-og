// Visual acceptance smoke: real WebGL city, georeferenced landmark mesh, signs and Hell sprite.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const base='http://127.0.0.1:8766';
const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1','--directory','dist/client'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let online=false;
 for(let i=0;i<48;i++){try{if((await fetch(base+'/map.html')).ok){online=true;break;}}catch{}await sleep(250);}
 assert.ok(online,'landmark smoke HTTP server starts');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({...devices['iPhone 13'],browserName:undefined});
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/map.html?quality=mobile&photoCutouts=off',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.JC_CITY_READY&&window.studio?.landmarkVariants?.root,{timeout:90000});
 const landmarks=await page.evaluate(()=>{
  const variants=window.studio.landmarkVariants,root=variants.root;
  const luxor=root.getObjectByName('Luxor'),stadium=root.getObjectByName('Angelic Stadium'),hell=root.getObjectByName('END OF HIM');
  return {stats:variants.stats(),luxor:!!luxor,whitePyramid:!!luxor?.getObjectByName('White Luxor pyramid · 183 m base'),
   beamCount:luxor?.children.filter(x=>x.name==='Luxor heavenly sky beam').length||0,
   stadium:!!stadium,stadiumSigns:stadium?.children.filter(x=>x.name==='ANGELIC STADIUM sign').length||0,
   speedway:!!root.getObjectByName('Sin City Motor Speedway'),
   hell:!!hell,hellInitiallyHidden:hell?.visible===false,cutout:!!hell?.getObjectByName('END OF HIM authored Hell sprite impostor')};
 });
 assert.equal(landmarks.stats.landmarks,4,'all four authored landmarks present');
 assert.equal(landmarks.speedway,true,'Sin City Motor Speedway mesh present');
 assert.equal(landmarks.stats.luxorBeamMetres,3800);
 assert.equal(landmarks.luxor,true);assert.equal(landmarks.whitePyramid,true);
 assert.equal(landmarks.beamCount,2,'beam uses two non-shadow-casting shafts');
 assert.equal(landmarks.stadium,true);assert.equal(landmarks.stadiumSigns,2);
 assert.equal(landmarks.hell,true);assert.equal(landmarks.hellInitiallyHidden,true);
 assert.equal(landmarks.cutout,true);
 await mkdir('artifacts',{recursive:true});
 const frameAt=async(name,dx,dz)=>{
  await page.evaluate(({name,dx,dz})=>{
   const studio=window.studio,subject=studio.landmarkVariants.root.getObjectByName(name);
   studio.controls.target.set(subject.position.x,subject.position.y+65,subject.position.z);
   studio.camera.position.set(subject.position.x+dx,subject.position.y+260,subject.position.z+dz);
   studio.controls.update();
  },{name,dx,dz});
  await page.waitForTimeout(850);
  await page.screenshot({path:'artifacts/'+name.toLowerCase().replace(/\s+/g,'-')+'-mobile.png'});
 };
 await frameAt('Luxor',400,500);
 await frameAt('Angelic Stadium',420,520);
 await page.evaluate(()=>{window.JC_HELL_WORLD=true;window.studio.landmarkVariants.update();});
 await page.waitForFunction(()=>window.studio.landmarkVariants.stats().endOfHimActive===true);
 await frameAt('END OF HIM',600,750);
 await page.waitForFunction(()=>{
   const art=window.studio.landmarkVariants.root.getObjectByName('END OF HIM authored Hell sprite impostor')?.material?.map?.image;
   return !!art&&art.naturalWidth>0;
 },{timeout:20000});
 assert.ok(!errors.some(s=>/landmark-variants|Cannot read properties/i.test(s)),'no landmark runtime errors');
 console.log('PASS: actual mobile WebGL scene contains white Luxor with two heavenly beams, two Angelic Stadium signs, and a loaded Hell-only END OF HIM cutout.',landmarks);
}finally{await browser?.close();server.kill();}
