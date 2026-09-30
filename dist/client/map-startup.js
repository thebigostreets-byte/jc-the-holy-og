window.JC_BOOT_FAILED=false;
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
 window.JC_BOOT_FAILED=true;
 let recovery=document.getElementById('jcRecovery');if(recovery){recovery.querySelector('p').textContent=message;return;}
 recovery=document.createElement('div');recovery.id='jcRecovery';recovery.style.cssText='position:fixed;inset:0;z-index:999;background:#091018ed;color:white;display:grid;place-content:center;padding:24px;text-align:center;font:16px Arial;gap:16px';
 const text=document.createElement('p');text.textContent=message;recovery.append(text);
 const retry=document.createElement('button');retry.textContent='Close 3D context and retry';retry.onclick=()=>{window.jcReleaseGraphics();const url=new URL(location.href);url.searchParams.set('retry3d',Date.now().toString());location.replace(url.href);};recovery.append(retry);
 document.body.append(recovery);
};
addEventListener('error',event=>{if(event.error||event.target?.tagName==='SCRIPT')window.jcLoadingRecovery(event.message?.includes('WebGL')?'This browser could not open its 3D graphics connection. Close other game tabs and retry.':'The 3D game could not start. Please retry.');},true);
addEventListener('unhandledrejection',event=>{window.jcLoadingRecovery(event.reason?.message||'The city could not finish loading. Please retry.');});
setTimeout(()=>{if(window.JC_BOOT_FAILED)return;const play=new URLSearchParams(location.search).get('play')==='1';if(!window.JC_CITY_READY||(play&&!window.JC_PLAYER_READY))window.jcLoadingRecovery('The city is still loading. Check your connection and retry full 3D.');},45000);
