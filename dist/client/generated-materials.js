import * as THREE from './three.module.js';
let pending;
export function loadGeneratedMaterials(){
 return pending ||= Promise.all(['casino','residential','apartment','asphalt','roof','entrance','sidewalk'].map(async name=>{
  try {
   const image=await new Promise((resolve,reject)=>{const im=new Image(),timer=setTimeout(()=>reject(Error('Texture timeout')),8000);im.onload=()=>{clearTimeout(timer);resolve(im);};im.onerror=()=>{clearTimeout(timer);reject(Error('Texture unavailable'));};im.src=`./facades/generated-v2/${name}.webp`;});
   const map=new THREE.Texture(image);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=2;map.needsUpdate=true;return [name,map];
  }catch{return [name,null];}
 })).then(Object.fromEntries);
}
export function generatedBuildingKind(identity,height){
 const name=identity?.name||'';
 if(identity?.type==='casino'||/Bellagio|Caesars|Venetian|Palazzo|Paris|MGM|New York|Excalibur|Luxor|Mandalay|Wynn|Encore|Flamingo|Cosmopolitan|Resorts World|Circus Circus|Treasure Island|STRAT|Palms|Holy Crown|Kingdom/i.test(name))return 'casino';
 // Keep known commercial landmarks and taller buildings on their existing skins.
 if(!name&&height>0&&height<=8)return 'residential';
 if(!name&&height>8&&height<=28)return 'apartment';
 return null;
}
// Ground-floor doorway overlay follows wall UVs, leaving upper floors intact.
export function addCasinoEntrance(material,texture){
 if(!texture)return;
 material.onBeforeCompile=shader=>{
  shader.uniforms.jcEntrance={value:texture};
  shader.fragmentShader='uniform sampler2D jcEntrance;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
#ifdef USE_MAP
 if(vMapUv.y >= 0.0 && vMapUv.y < 0.1666667){
  vec4 entry=texture2D(jcEntrance,vec2(fract(vMapUv.x * 4.0),vMapUv.y * 6.0));
  diffuseColor.rgb=diffuse*entry.rgb;
 }
#endif`);
 };
 material.customProgramCacheKey=()=> 'jc-entrance-v2';
}
