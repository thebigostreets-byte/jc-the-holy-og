window.JC_BOOT_FAILED=false;
window.jcOpenLiteFallback=function(reason){
 const url=new URL('./play-lite.html',location.href);
 url.searchParams.set('from','full3d');
 url.searchParams.set('reason',String(reason||'graphics').slice(0,80));
 url.searchParams.set('v','playerfirst-20261003j');
 location.replace(url.href);
};
window.jcReleaseGraphics=function(){
 try{
  window.studio?.renderer?.forceContextLoss?.();
  window.studio?.renderer?.dispose?.();
 }catch(error){console.warn('Graphics cleanup skipped',error);}
 for(const canvas of document.querySelectorAll('canvas')){
  try{canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}
  try{canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}
 }
};
window.jcCanOpenGraphics=function(){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=1;
 try{
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:false})||canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:false});
  if(!gl)return false;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
 }catch{return false;}
};
window.jcLoadingRecovery=function(message){
 // The live canvas is authoritative: never cover playable 3D with a startup modal.
 if(window.JC_PLAYER_READY || window.JC_CITY_READY){
  console.warn('JC background failure (3D retained):',message);
  document.getElementById('jcRecovery')?.remove();
  window.JC_BOOT_FAILED=false;
  return;
 }
 const fatalGraphics=/lost its graphics connection|WebGL 2 and WebGL 1 are unavailable|could not start WebGL/i.test(String(message));
 if(!fatalGraphics&&(window.JC_PLAYER_READY||window.JC_CITY_READY)){
  console.warn('Suppressed stale 3D startup overlay after scene initialized:',message);
  document.getElementById('jcRecovery')?.remove();
  window.JC_BOOT_FAILED=false;
  return;
 }
 window.JC_BOOT_FAILED=true;
 let recovery=document.getElementById('jcRecovery');if(recovery){recovery.querySelector('p').textContent=message;const fallback=recovery.querySelector('[data-lite-fallback]');if(fallback)fallback.onclick=()=>window.jcOpenLiteFallback(message);return;}
 recovery=document.createElement('div');recovery.id='jcRecovery';recovery.style.cssText='position:fixed;inset:0;z-index:999;background:#091018ed;color:white;display:grid;place-content:center;padding:24px;text-align:center;font:16px Arial;gap:16px';
 const text=document.createElement('p');text.textContent=message;recovery.append(text);
 const retry=document.createElement('button');retry.textContent='Close 3D context and retry';retry.onclick=()=>{window.jcReleaseGraphics();const url=new URL(location.href);url.searchParams.set('retry3d',Date.now().toString());url.searchParams.set('v','playerfirst-20261003j');location.replace(url.href);};recovery.append(retry);const lite=document.createElement('button');lite.dataset.liteFallback='1';lite.textContent='Open mobile/lite play mode';lite.style.marginLeft='8px';lite.onclick=()=>window.jcOpenLiteFallback(message);recovery.append(lite);if(/WebGL|graphics|3D graphics|context/i.test(message)){setTimeout(()=>{if(window.JC_BOOT_FAILED&&!window.JC_PLAYER_READY&&!window.JC_CITY_READY)window.jcOpenLiteFallback(message);},1800);}
 document.body.append(recovery);
};
// Optional textures, audio and secondary scripts must not kill an already rendered game.
addEventListener('error',event=>{
 const target=event.target;
 if(target&&target!==window){console.warn('Nonfatal asset load failure',target.src||target.href||target.tagName);return;}
 const message=event.error?.message||event.message||'Unknown startup error';
 if(window.JC_PLAYER_READY||window.JC_CITY_READY){console.warn('Runtime error after 3D initialized',message);return;}
 console.error('JC preboot exception:',message);
 // Do not interrupt initialization for unrelated asynchronous errors.
},true);
addEventListener('unhandledrejection',event=>{
 const message=event.reason?.message||String(event.reason||'Unknown rejection');
 if(window.JC_PLAYER_READY||window.JC_CITY_READY){console.warn('Nonfatal background task failure',message);event.preventDefault();return;}
 console.error('JC preboot rejection:',message);
});
setTimeout(()=>{if(window.JC_BOOT_FAILED)return;const play=new URLSearchParams(location.search).get('play')==='1';if(!window.JC_CITY_READY||(play&&!window.JC_PLAYER_READY)){const stage=window.JC_BOOT_STAGE||(!window.JC_CITY_READY?'city':'player');window.jcLoadingRecovery('Full 3D startup is taking too long at '+stage+'. You can retry full 3D or choose lite mode.');}},90000);

// An earlier asynchronous startup failure must not permanently obscure a later successful scene.
const jcRecoveryCleanup=setInterval(()=>{
 if(window.JC_PLAYER_READY||window.JC_CITY_READY){
  const recovery=document.getElementById('jcRecovery');
  if(recovery&&!/lost its graphics connection|could not start WebGL/i.test(recovery.textContent||'')){
   recovery.remove();window.JC_BOOT_FAILED=false;
  }
  clearInterval(jcRecoveryCleanup);
 }
},500);
setTimeout(()=>clearInterval(jcRecoveryCleanup),120000);
