import {loadGeneratedMaterials,generatedBuildingKind,addCasinoEntrance} from './generated-materials.js';
import {createDistantCity} from './distant-city.js';
import {decodeCityTile} from './city-tile-decoder.js';
import {loadPhotoFacades} from './photo-facades.js';
import {createRoadNetwork} from './city-roads.js';
import {createCityTraffic} from './city-traffic.js';
import {createCityEnvironment} from './city-environment.js';
import {loadBuildingIdentities,resolveBuildingIdentity} from './building-identities.js';
import {loadPhysicalMaterials,buildingSurface,wallUV} from './physical-building-materials.js';
import * as THREE from './three.module.js';
import { OrbitControls } from './map-controls.js';
import {createBuildingImpostors} from './building-impostors.js';
import {decodeGlbAttribute} from './ground-sampling.js';
import {predictTravel,createPrefetchCache,corridorPoints} from './predictive-streaming.js?v=3d-20261003';
import {createPhotorealDetailMaps,applyPhotorealMaterial} from './photorealism-pbr.js';
const photorealDetailMaps=createPhotorealDetailMaps(THREE);
import {PACKAGED_CITY_TILE_IDS,PACKAGED_CITY_TILE_COUNT} from './city-tile-index.js';
const $=id=>document.getElementById(id);
const statusText=message=>{$('loading').textContent=message;};
statusText('Opening the city…');
async function fetchBytes(url){
 let failure;
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch(url,{signal:controller.signal});
   if(!response.ok){const error=Error('Download failed: '+url+' ('+response.status+').');error.permanent=response.status>=400&&response.status<500&&response.status!==408&&response.status!==429;throw error;}
   return new Uint8Array(await response.arrayBuffer());
  }catch(error){failure=error;if(error.permanent)throw error;}finally{clearTimeout(timer);}
 }
 throw failure;
}
const payload=JSON.parse(new TextDecoder().decode(await fetchBytes('./city-manifest.json')));
const scene=new THREE.Scene();scene.background=new THREE.Color('#080c1b');scene.fog=new THREE.Fog('#080c1b',18000,76000);
const mobileMap=matchMedia('(pointer:coarse), (max-width:800px)').matches || navigator.maxTouchPoints>1 || new URLSearchParams(location.search).get('quality')==='mobile';
const params=new URLSearchParams(location.search);
const deviceMemory=Number(navigator.deviceMemory)||8,hardwareThreads=Number(navigator.hardwareConcurrency)||8;
const maxQuality=params.get('quality')==='max';
const lowSpec=mobileMap||deviceMemory<=4||hardwareThreads<=4;
const stable3D=!maxQuality;
const startInPlay=params.get('play')==='1';
let renderer;
try{
 const canvas=$('scene'),contextOptions={alpha:false,antialias:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:false};
 let context=null;
 try{context=canvas.getContext('webgl2',contextOptions);}catch{}
 if(!context){try{context=canvas.getContext('webgl',contextOptions)||canvas.getContext('experimental-webgl',contextOptions);}catch{}}
 if(!context)throw Error('WebGL 2 and WebGL 1 are unavailable.');
 renderer=new THREE.WebGLRenderer({canvas,context,antialias:false,alpha:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:false});
 window.JC_RENDERER_API=renderer.capabilities.isWebGL2?'WebGL 2':'WebGL 1';
}catch(error){
 window.jcLoadingRecovery(`JC could not start WebGL 2 or WebGL 1. ${error?.message||'Turn on graphics acceleration and retry.'}`);
 throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,stable3D?.68:(lowSpec?.78:1)));
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.jcLoadingRecovery('The 3D scene lost its graphics connection. Close other game tabs and retry.');});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
const camera=new THREE.PerspectiveCamera(42,1,.5,90000), controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=8;controls.maxDistance=65000;
scene.add(new THREE.HemisphereLight(0x6078b0,0x15131d,.72));const sun=new THREE.DirectionalLight(0x9ab5ff,.48);sun.position.set(-1800,5000,1800);scene.add(sun);
const world=new THREE.Group();scene.add(world);const buildings=new Map(),chunks=new Map(),edits=new Map(),files=new Map();const loaded=new Map();let selected=null,box=null,loading=false,tileRevision=0;
const base=payload.manifest.boundsEPSG32611, origin=[(base[0]+base[2])/2,(base[1]+base[3])/2], sections=payload.manifest.sections,byId=new Map(sections.map(s=>[s.id,s]));let current='C15_R14';
let last=performance.now();const particles=[],particleCap=stable3D?48:(mobileMap?72:180);const status=t=>$('status').textContent=t;const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const locKey='illco-vegas-building-edits-v1';try{for(const [k,v] of Object.entries(JSON.parse(localStorage.getItem(locKey)||'{}')))edits.set(k,v);}catch{}
function persist(){try{localStorage.setItem(locKey,JSON.stringify(Object.fromEntries(edits)));}catch{}}
async function loadBytes(name){
 if(name==='assets/generated_stucco.png')name='assets/generated_stucco.webp';
 if(files.has(name))return new Uint8Array(await files.get(name).arrayBuffer());
 const request=(async()=>{
  const url=/^tiles\/C\d{2}_R\d{2}\.glb$/.test(name)?name+'.gz':payload.resources[name]||name;
  const data=await fetchBytes(url);
  // Hosts may already decode Content-Encoding: gzip. Inspect bytes before inflating.
  if(data[0]===31&&data[1]===139){
   if(!('DecompressionStream' in window))throw Error('Update this browser to load compressed city tiles.');
   return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  return /^tiles\/C\d{2}_R\d{2}\.glb$/.test(name)?decodeCityTile(data):data;
 })();
 return request;
}
const prefetchedBytes=createPrefetchCache(loadBytes,{maxBytes:(stable3D?24:lowSpec?48:deviceMemory<=8?96:144)*1024*1024,maxEntries:stable3D?6:lowSpec?12:deviceMemory<=8?24:36,maxConcurrent:stable3D?1:lowSpec?1:3});
function bytes(name){return prefetchedBytes.get(name);}
function pathRelative(basePath,path){const a=(basePath.slice(0,basePath.lastIndexOf('/')+1)+path).split('/'),o=[];for(const s of a){if(s==='..')o.pop();else if(s!=='.')o.push(s);}return o.join('/');}
async function textureFrom(data,mime,sampler){
 const url=URL.createObjectURL(new Blob([data],{type:mime}));
 try{
  const t=await new THREE.TextureLoader().loadAsync(url);
  const limit=mobileMap?512:1024;
  if(Math.max(t.image.width,t.image.height)>limit){
   const ratio=limit/Math.max(t.image.width,t.image.height),c=document.createElement('canvas');c.width=Math.max(1,Math.round(t.image.width*ratio));c.height=Math.max(1,Math.round(t.image.height*ratio));c.getContext('2d').drawImage(t.image,0,0,c.width,c.height);t.image=c;t.needsUpdate=true;
  }
  t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.wrapS=sampler?.wrapS===10497?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;t.wrapT=sampler?.wrapT===10497?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;t.anisotropy=1;if(!renderer.capabilities.isWebGL2){t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;}return t;
 }finally{URL.revokeObjectURL(url);}
}
const facadePromise=loadPhotoFacades().catch(()=>Promise.all([0,3,7].map(async id=>{
 const data=await bytes('facades/vegas-cell-'+String(id).padStart(2,'0')+'.webp');
 return textureFrom(data,'image/webp',{wrapS:10497,wrapT:10497});
}))).catch(error=>{console.warn('Facade loading failed',error);return [];});
const generatedPromise=loadGeneratedMaterials();
const identityPromise=loadBuildingIdentities();
const physicalPromise=loadPhysicalMaterials().catch(error=>{console.warn('Physical materials unavailable',error);return [];});
async function parseGLB(raw,name){const dv=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);if(dv.getUint32(0,true)!==0x46546c67)throw Error('Invalid GLB');const jl=dv.getUint32(12,true),g=JSON.parse(new TextDecoder().decode(raw.subarray(20,20+jl))),binStart=28+jl,cache=new Map();
 function acc(i){if(cache.has(i))return cache.get(i);const a=g.accessors[i],v=g.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];const ty={5120:[Int8Array,1,'getInt8'],5122:[Int16Array,2,'getInt16'],5126:[Float32Array,4,'getFloat32'],5125:[Uint32Array,4,'getUint32'],5123:[Uint16Array,2,'getUint16'],5121:[Uint8Array,1,'getUint8']}[a.componentType],stride=v.byteStride||n*ty[1],off=binStart+(v.byteOffset||0)+(a.byteOffset||0);let out=decodeGlbAttribute(raw,off,a.count,n,ty[0],ty[1],stride,ty[2]);const e=a.extras;if(e?.jcEncoding){const packed=out;out=new Float32Array(packed.length);for(let j=0;j<out.length;j++){const k=j%n;out[j]=e.jcEncoding==='normal8'?packed[j]/127:e.sourceMin[k]+packed[j]/65535*(e.sourceMax[k]-e.sourceMin[k]);}}const z=new THREE.BufferAttribute(out,n);cache.set(i,z);return z;}
 const textures=await Promise.all((g.textures||[]).map(async t=>{const im=g.images[t.source],sa=g.samplers?.[t.sampler];if(im.uri)return textureFrom(await bytes(pathRelative(name,im.uri)),im.uri.endsWith('generated_stucco.png')?'image/webp':im.uri.endsWith('.png')?'image/png':'image/jpeg',sa);const v=g.bufferViews[im.bufferView];return textureFrom(raw.subarray(binStart+(v.byteOffset||0),binStart+(v.byteOffset||0)+v.byteLength),im.mimeType,sa);}));
 const [facadeMaps,physicalMaps,identities,generated]=await Promise.all([facadePromise,physicalPromise,identityPromise,generatedPromise]);
 const heights=new Map(g.nodes.map(n=>[n.name,n.extras?.heightMetres||0]));
 const resolvedIdentities=new Map(g.nodes.map(n=>[n.name,resolveBuildingIdentity(n.name,n.extras||{},identities)]));
 const mats=g.materials.map(m=>{
  const p=m.pbrMetallicRoughness||{},f=p.baseColorFactor||[1,1,1,1],isWall=m.name.endsWith('_walls');
  const id=m.name.replace(/_(walls|roof)$/,''),identity=resolvedIdentities.get(id),surface=isWall?buildingSurface(id,heights.get(id)||0,facadeMaps,physicalMaps,identity,generated):null;
  const ma=new THREE.MeshStandardMaterial({name:m.name,color:surface?.map?new THREE.Color(surface.color):new THREE.Color(f[0],f[1],f[2]),map:surface?.map||textures[p.baseColorTexture?.index]||null,roughness:surface?.roughness??.94,metalness:surface?.metalness??0,side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide});
  if(surface){
   applyPhotorealMaterial(THREE,ma,photorealDetailMaps,{casino:identity?.type==='casino',buildingHeight:heights.get(id)||12});
   const accent=new THREE.Color(surface.accent);
   ma.onBeforeCompile=shader=>{
    shader.uniforms.jcFacadeAccent={value:accent};
    shader.uniforms.jcFacadePattern={value:surface.pattern};
    shader.uniforms.jcFacadeV={value:surface.verticalFrequency};
    shader.uniforms.jcFacadeH={value:surface.horizontalFrequency};
    shader.uniforms.jcFacadeDetail={value:surface.detailFrequency};
    shader.fragmentShader='uniform vec3 jcFacadeAccent;\nuniform float jcFacadePattern;\nuniform float jcFacadeV;\nuniform float jcFacadeH;\nuniform float jcFacadeDetail;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    #ifdef USE_MAP
      float jcU=fract(vMapUv.x),jcY=fract(vMapUv.y);
      float jcVCell=fract(jcU*jcFacadeV),jcHCell=fract(jcY*jcFacadeH);
      float jcVertical=1.0-step(0.055,min(jcVCell,1.0-jcVCell));
      float jcHorizontal=1.0-step(0.035,min(jcHCell,1.0-jcHCell));
      float jcFine=1.0-step(0.022,min(fract(vMapUv.x*jcFacadeDetail),1.0-fract(vMapUv.x*jcFacadeDetail)));
      float jcDiag=step(0.84,fract(jcU*jcFacadeV+jcY*jcFacadeH));
      float jcChecker=step(0.5,fract(floor(jcU*jcFacadeV)+floor(jcY*jcFacadeH))*0.5);
      float jcPattern=jcFacadePattern<0.5?jcHorizontal:
        jcFacadePattern<1.5?jcVertical:
        jcFacadePattern<2.5?max(jcVertical,jcHorizontal):
        jcFacadePattern<3.5?mix(jcVertical,jcHorizontal,step(0.5,fract(vMapUv.y*0.5))):
        jcFacadePattern<4.5?max(jcHorizontal,jcFine):
        jcFacadePattern<5.5?max(jcVertical,jcFine):
        jcFacadePattern<6.5?jcDiag:max(max(jcVertical,jcHorizontal),jcChecker*0.32);
      float jcDetail=jcFacadePattern>2.5?jcFine:0.0;
      diffuseColor.rgb=mix(diffuseColor.rgb,jcFacadeAccent,clamp(jcPattern*0.075+jcDetail*0.035,0.0,0.15));
    #endif`);
   };
   ma.customProgramCacheKey=()=>`jc-building-facade-${surface.pattern}-${surface.verticalFrequency}-${surface.horizontalFrequency}-${surface.detailFrequency}-${surface.accent}`;
  }
  const generatedRoof=m.name.endsWith('_roof')&&generatedBuildingKind(identity,heights.get(id)||0)==='residential'&&generated.roof;
  if(generatedRoof){ma.map=generated.roof;ma.color.set('#ffffff');ma.roughness=.95;ma.userData.generatedRoof=true;}
  if(surface?.kind==='generated casino')addCasinoEntrance(ma,generated.entrance);
  if(!isWall&&!generatedRoof&&!mobileMap&&!stable3D&&physicalMaps[4]){ma.bumpMap=physicalMaps[4];ma.bumpScale=.025;}
  ma.userData.original={color:ma.color.clone(),map:ma.map,bumpMap:ma.bumpMap,roughness:ma.roughness};
  ma.userData.wallpapered=!!surface?.map;
  if(surface?.map){ma.userData.physicalSurface=surface.kind;ma.userData.surfaceScale=surface.scale;ma.userData.identitySignature=surface.signature;}
  return ma;
 });
 const group=new THREE.Group();group.userData.origin=g.asset.extras;group.userData.textures=textures;let built=0;for(const n of g.nodes){built++;if(built%8===0||built===g.nodes.length){statusText('Preparing buildings '+built+' / '+g.nodes.length+'…');await new Promise(resolve=>setTimeout(resolve,0));}if(n.mesh===undefined)continue;const ob=new THREE.Group();ob.name=n.name;ob.userData={...n.extras};const identity=resolvedIdentities.get(n.name);if(identity)ob.userData.identity=identity;ob.position.fromArray(n.translation||[0,0,0]);for(const p of g.meshes[n.mesh].primitives){const geom=new THREE.BufferGeometry();for(const [key,i]of Object.entries(p.attributes)){const map={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'};if(map[key])geom.setAttribute(map[key],acc(i));}if(p.indices!==undefined)geom.setIndex(acc(p.indices));if(mats[p.material].userData.generatedRoof){const pos=geom.getAttribute('position'),uv=new Float32Array(pos.count*2);for(let i=0;i<pos.count;i++){uv[i*2]=pos.getX(i)/3;uv[i*2+1]=pos.getZ(i)/3;}geom.setAttribute('uv',new THREE.BufferAttribute(uv,2));}const scale=mats[p.material].userData.surfaceScale;if(!stable3D&&scale&&geom.getAttribute('normal'))geom.setAttribute('uv',new THREE.BufferAttribute(wallUV(geom.getAttribute('position'),geom.getAttribute('normal'),...scale),2));if(!stable3D&&mats[p.material].bumpMap){const pos=geom.getAttribute('position'),detail=new Float32Array(pos.count*2);for(let i=0;i<pos.count;i++){detail[i*2]=pos.getX(i)/2;detail[i*2+1]=pos.getZ(i)/2;}geom.setAttribute('uv1',new THREE.BufferAttribute(detail,2));}geom.computeBoundingSphere();const mesh=new THREE.Mesh(geom,mats[p.material]);mesh.userData.owner=ob;ob.add(mesh);}group.add(ob);}const e=g.asset.extras;group.position.set(e.originEasting-origin[0],0,origin[1]-e.originNorthing);return group;}
function setAppearance(ob,e){const casino=ob.userData.identity?.type==='casino';for(const m of ob.children){if(!m.isMesh)continue;const mat=m.material,isRoof=mat.name.endsWith('_roof');const color=isRoof?e.roofColor:e.wallColor;if(color)mat.color.set(color);else mat.color.copy(mat.userData.original.color);mat.map=e.surface==='plain'?null:(mat.userData.customTexture||mat.userData.original.map);mat.bumpMap=e.surface==='plain'?null:mat.userData.original.bumpMap||null;mat.roughness=e.roughness??mat.userData.original.roughness;mat.emissive.copy(mat.color);mat.emissiveIntensity=casino?(e.glow||0):0;mat.needsUpdate=true;}}
function updateEdit(){if(!selected)return;const id=selected.userData.buildingId,e={...(edits.get(id)||{}),wallColor:$('wallColor').value,roofColor:$('roofColor').value,surface:$('materialMode').value,roughness:+$('roughness').value,glow:+$('glow').value};edits.set(id,e);setAppearance(selected,e);persist();}
function select(ob){selected=ob;queueMicrotask(()=>window.dispatchEvent(new Event('jc-building-selected')));if(box){scene.remove(box);box.geometry.dispose();box.material.dispose();box=null;}if(!ob){$('selectedName').textContent='Click a building';$('coords').textContent='Each object has a permanent source ID.';$('buildingList').value='';status(`${PACKAGED_CITY_TILE_COUNT.toLocaleString()} detailed tiles packaged · ${loaded.size} active tiles · ${buildings.size.toLocaleString()} editable features`);return;}ob.updateWorldMatrix(true,true);if(!chunks.has(ob.userData.buildingId)){box=new THREE.BoxHelper(ob,0x9cffe1);scene.add(box);}const e=ob.userData;$('selectedName').textContent=e.identity?.name||e.buildingId;$('coords').textContent=`${e.longitude.toFixed(6)}, ${e.latitude.toFixed(6)} · ${e.heightMetres.toFixed(1)} m high${e.identity?' · '+e.identity.address+' · county record '+e.identity.sourceUpdated:''}`;$('buildingList').value=e.buildingId;const ed=edits.get(e.buildingId)||{},wall=ob.children.find(m=>m.material?.name.endsWith('_walls')),roof=ob.children.find(m=>m.material?.name.endsWith('_roof'));$('wallColor').value=ed.wallColor||'#'+(wall?.material.color.getHexString()||'dbcdb8');$('roofColor').value=ed.roofColor||'#'+(roof?.material.color.getHexString()||'ffffff');$('materialMode').value=ed.surface||'textured';$('roughness').value=ed.roughness??.88;$('glow').value=ed.glow||0;$('glow').disabled=e.identity?.type!=='casino';}
function disposeParticle(p){world.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();const i=particles.indexOf(p);if(i>=0)particles.splice(i,1);}
function clearChunks(id){const a=chunks.get(id);if(a){for(const x of [...a])disposeParticle(x);chunks.delete(id);}}
function rebuild(ob,save=true){if(!ob)return;clearChunks(ob.userData.buildingId);ob.children.forEach(m=>m.visible=true);if(save){const e=edits.get(ob.userData.buildingId)||{};delete e.state;edits.set(ob.userData.buildingId,e);persist();}if(selected===ob)select(ob);status('Rebuilt '+ob.userData.buildingId);}
function roofFaces(ob){let tris=[];for(const m of ob.children){if(!m.material?.name.endsWith('_roof'))continue;const p=m.geometry.getAttribute('position'),ix=m.geometry.index;for(let i=0;i<ix.count;i+=3){const t=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,ix.getX(i+k)));if(new THREE.Vector3().subVectors(t[1],t[0]).cross(new THREE.Vector3().subVectors(t[2],t[0])).length()>.1)tris.push(t);}}
 if(!tris.length){const c=ob.userData.collider,a=c.min,b=c.max;tris=[[new THREE.Vector3(a[0],b[1],a[2]),new THREE.Vector3(b[0],b[1],a[2]),new THREE.Vector3(a[0],b[1],b[2])],[new THREE.Vector3(b[0],b[1],a[2]),new THREE.Vector3(b[0],b[1],b[2]),new THREE.Vector3(a[0],b[1],b[2])]];}
 while(tris.length<110){let longest=0,ti=-1,edge=0;for(let i=0;i<tris.length;i++)for(let j=0;j<3;j++){const len=tris[i][j].distanceTo(tris[i][(j+1)%3]);if(len>longest){longest=len;ti=i;edge=j;}}if(longest<18)break;const t=tris[ti],a=t[edge],b=t[(edge+1)%3],c=t[(edge+2)%3],m=a.clone().add(b).multiplyScalar(.5);tris.splice(ti,1,[a,m,c],[m,b,c]);}return tris;}
function destroy(ob,mode,save=true){if(!ob)return;rebuild(ob,false);const id=ob.userData.buildingId,roof=roofFaces(ob),layers=Math.min(4,Math.max(1,Math.ceil(ob.userData.heightMetres/20))),worldPos=ob.getWorldPosition(new THREE.Vector3()),frags=[];window.dispatchEvent(new CustomEvent('jc:building-destroyed',{detail:{buildingId:id,position:{x:worldPos.x,y:worldPos.y,z:worldPos.z},heightMetres:ob.userData.heightMetres||20,mode}}));let seed=Number(id.replace(/\D/g,''))||1;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 for(const t of roof)for(let layer=0;layer<layers;layer++){if(frags.length>=500||particles.length>=particleCap)break;const top=t.map(v=>new THREE.Vector3(v.x,v.y*(layer+1)/layers,v.z)),bot=t.map(v=>new THREE.Vector3(v.x,v.y*layer/layers,v.z)),v=[...top,...bot],center=v.reduce((s,a)=>s.add(a),new THREE.Vector3()).multiplyScalar(1/6),verts=v.map(a=>a.clone().sub(center)),idx=[0,1,2,5,4,3,0,3,1,1,3,4,1,4,2,2,4,5,2,5,0,0,5,3],geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(idx.flatMap(i=>verts[i].toArray()),3));geom.computeVertexNormals();geom.computeBoundingBox();const color=ob.children.find(m=>m.material?.name.endsWith('_walls'))?.material.color||new THREE.Color('#d6c1a0'),mat=new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}),mesh=new THREE.Mesh(geom,mat);mesh.position.copy(worldPos).add(center);world.add(mesh);const radial=new THREE.Vector3(center.x,.1,center.z).normalize(),speed=mode==='explode'?18+rand()*28:1+rand()*3,vel=radial.multiplyScalar(speed);vel.y=mode==='explode'?12+rand()*30:rand()*2;const f={mesh,vel,spin:new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(mode==='explode'?2:.6),floor:worldPos.y-geom.boundingBox.min.y,age:0,sleep:false,buildingId:id};particles.push(f);frags.push(f);}
 ob.children.forEach(m=>m.visible=false);chunks.set(id,frags);if(save){const e=edits.get(id)||{};e.state=mode;edits.set(id,e);persist();}if(selected===ob&&box){scene.remove(box);box.geometry.dispose();box.material.dispose();box=null;}status(`${id} · ${mode} · ${frags.length} moving fragments`);return frags.length;}
function tick(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];if(p.sleep){const owned=chunks.get(p.buildingId),index=owned?.indexOf(p)??-1;if(index>=0)owned.splice(index,1);disposeParticle(p);continue;}p.age+=dt;p.vel.y-=9.81*dt;p.mesh.position.addScaledVector(p.vel,dt);p.mesh.rotation.x+=p.spin.x*dt;p.mesh.rotation.y+=p.spin.y*dt;p.mesh.rotation.z+=p.spin.z*dt;if(p.mesh.position.y<p.floor){p.mesh.position.y=p.floor;p.vel.y=-p.vel.y*.2;p.vel.x*=.75;p.vel.z*=.75;p.spin.multiplyScalar(.65);if(p.vel.length()<.5||p.age>12)p.sleep=true;}if(p.age>25)p.sleep=true;}}
function disposeLoaded(){select(null);for(const id of chunks.keys())clearChunks(id);for(const group of loaded.values()){world.remove(group);group.traverse(x=>{if(x.isMesh){x.geometry.dispose();x.material.dispose();}});group.userData.textures?.forEach(t=>t.dispose());}loaded.clear();buildings.clear();}
let streamEnabled=true,streamRadius=stable3D?0:(mobileMap?0:1),loadQueue=Promise.resolve(),desiredRequest=0,lastWanted='',retryAt=0,contextGround=null,contextPromise=null,lastStreamCheck=0,streamHeading=null;
const keys=new Set();
function sectionAt(x,z){const e=origin[0]+x,n=origin[1]-z,c=Math.max(0,Math.min(34,Math.floor((e-base[0])/1000))),r=Math.max(0,Math.min(34,Math.floor((n-base[1])/1000)));return `C${String(c).padStart(2,'0')}_R${String(r).padStart(2,'0')}`;}
function centerSection(){return sectionAt(controls.target.x,controls.target.z);}
let streamSample=null;
function available(name){if(payload.resources[name]||files.has(name))return true;const match=/^tiles\/(C\d{2}_R\d{2})\.glb$/.exec(name);return location.protocol!=='file:'&&!!match&&PACKAGED_CITY_TILE_IDS.has(match[1]);}
function removeTile(id){const group=loaded.get(id);if(!group)return;if(selected?.parent===group){select(null);$('selectedName').textContent='Click a building';$('coords').textContent='Each object has a permanent source ID.';}for(const ob of group.children){const bid=ob.userData.buildingId;if(bid){clearChunks(bid);buildings.delete(bid);}}world.remove(group);group.traverse(x=>{if(x.isMesh){x.geometry.dispose();if(Array.isArray(x.material))x.material.forEach(m=>m.dispose());else x.material?.dispose?.();}});group.userData.textures?.forEach(t=>t.dispose());loaded.delete(id);tileRevision++;}
function sectionCenter(section){const b=section.boundsEPSG32611||section.bounds||base;const x=(b[0]+b[2])/2-origin[0],z=origin[1]-(b[1]+b[3])/2;return {x:Number.isFinite(x)?x:0,z:Number.isFinite(z)?z:0};}
function applyTileLod(position){
 const centerId=sectionAt(position.x,position.z),detailDistance=lowSpec?1150:1650;
 for(const [id,group] of loaded){
  const section=byId.get(id);if(!section)continue;
  const c=sectionCenter(section),distance=Math.hypot(c.x-position.x,c.z-position.z);
  const visible=id===centerId||distance<=detailDistance;
  if(group.visible!==visible)group.visible=visible;
  group.userData.jcLod=visible?'detail':'distant-city';
 }
}
function seeded(id){let h=2166136261;for(let i=0;i<id.length;i++){h^=id.charCodeAt(i);h=Math.imul(h,16777619);}return ()=>((h=Math.imul(h^h>>>15,2246822507),h=Math.imul(h^h>>>13,3266489909),(h^h>>>16)>>>0)/4294967295);}
function createMissingTileFallback(section){const group=new THREE.Group();group.name='Generated fallback '+section.id;group.userData.generatedFallback=true;const center=sectionCenter(section);group.position.set(center.x,0,center.z);const rng=seeded(section.id),groundMat=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.095+rng()*.035,.18,.16+rng()*.08),roughness:.92,metalness:.02});const ground=new THREE.Mesh(new THREE.PlaneGeometry(998,998,1,1),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.35;ground.receiveShadow=true;group.add(ground);const roadMat=new THREE.MeshStandardMaterial({color:0x151820,roughness:.88,metalness:.01}),lineMat=new THREE.MeshBasicMaterial({color:0xd8c47a});for(const rot of [0,Math.PI/2]){const road=new THREE.Mesh(new THREE.BoxGeometry(86,.08,998),roadMat);road.rotation.y=rot;road.position.y=.02;group.add(road);const stripe=new THREE.Mesh(new THREE.BoxGeometry(4,.09,900),lineMat);stripe.rotation.y=rot;stripe.position.y=.08;group.add(stripe);}const colors=[0x806342,0x7d8792,0x9a7340,0x4f6685,0x6f4d45,0x9d8c6d];for(let i=0;i<18;i++){const w=38+rng()*90,d=38+rng()*90,h=22+rng()*180;const mat=new THREE.MeshStandardMaterial({color:colors[Math.floor(rng()*colors.length)],roughness:.66,metalness:.08,emissive:0x181018,emissiveIntensity:.25+rng()*.35});const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);b.position.set((rng()-.5)*850,h/2,(rng()-.5)*850);b.rotation.y=(rng()-.5)*.16;b.name=`${section.id} generated building ${i+1}`;b.userData={buildingId:`${section.id}_GEN_${i}`,sourceId:`${section.id}_GEN_${i}`,heightMetres:h,identity:{name:b.name,type:'generated city fill'},generatedFallback:true};group.add(b);buildings.set(b.userData.buildingId,b);}return group;}
let buildingListDirty=true;
function updateBuildingList(force=false){
 const list=$('buildingList');buildingListDirty=true;
 if(!force&&document.activeElement!==list)return;
 const id=selected?.userData.buildingId,sorted=[...buildings].sort((a,b)=>b[1].userData.heightMetres-a[1].userData.heightMetres);
 list.replaceChildren(new Option('Choose a building…',''),...sorted.map(([bid,ob])=>new Option(`${ob.userData.identity?.name||bid} · ${ob.userData.heightMetres.toFixed(0)} m`,bid)));
 if(id&&buildings.has(id))list.value=id;buildingListDirty=false;
}
$('buildingList').addEventListener('focus',()=>{if(buildingListDirty)updateBuildingList(true);});
async function ensureContext(){if(contextGround||!available('assets/connected_terrain.glb'))return;if(contextPromise)return contextPromise;contextPromise=(async()=>{try{const g=await parseGLB(await bytes('assets/connected_terrain.glb'),'assets/connected_terrain.glb');g.name='Connected 35 km terrain';world.add(g);contextGround=g;}catch(e){status('City terrain could not load: '+e.message);}finally{contextPromise=null;}})();return contextPromise;}
function loadArea(tile,radius=streamRadius,resetCamera=true){const req=++desiredRequest;loadQueue=loadQueue.catch(()=>{}).then(async()=>{if(req!==desiredRequest)return;loading=true;try{const center=byId.get(tile);if(!center)throw Error('Outside the 35 km city boundary.');const wanted=sections.filter(s=>Math.abs(s.column-center.column)<=radius&&Math.abs(s.row-center.row)<=radius).sort((a,b)=>Math.abs(a.column-center.column)+Math.abs(a.row-center.row)-Math.abs(b.column-center.column)-Math.abs(b.row-center.row));if(!available(center.uri))status(`Tile ${tile} is generated fill until its 3D source is packaged.`);if(!stable3D&&window.JC_HYPERFLIGHT&&streamHeading){const length=Math.hypot(streamHeading.x,streamHeading.z);if(length>1)for(const d of [1000,2000,3000,4000,5000]){const next=byId.get(sectionAt(controls.target.x+streamHeading.x/length*d,controls.target.z+streamHeading.z/length*d));if(next&&!wanted.includes(next))wanted.push(next);}}const keep=new Set(wanted.map(s=>s.id));lastWanted=tile;current=tile;$('tile').value=tile;if(resetCamera)view('south',radius);status(`Connecting ${tile} · ${wanted.length} nearby tiles…`);if(!loaded.size){$('loading').style.display='flex';$('loading').textContent='Connecting city tiles…';}for(const s of wanted){if(req!==desiredRequest)break;if(loaded.has(s.id))continue;let g;if(available(s.uri)){g=await parseGLB(await bytes(s.uri),s.uri);}else{g=createMissingTileFallback(s);}if(req!==desiredRequest){g.traverse(x=>{if(x.isMesh){x.geometry.dispose();if(Array.isArray(x.material))x.material.forEach(m=>m.dispose());else x.material?.dispose?.();}});g.userData.textures?.forEach(t=>t.dispose());break;}loaded.set(s.id,g);tileRevision++;world.add(g);g.updateWorldMatrix(true,true);for(const ob of g.children)if(ob.userData.buildingId){buildings.set(ob.userData.buildingId,ob);const e=edits.get(ob.userData.buildingId)||{};setAppearance(ob,e);if(e.state)destroy(ob,e.state,false);}for(const id of [...loaded.keys()])if(!keep.has(id)&&loaded.size>wanted.length)removeTile(id);await new Promise(resolve=>setTimeout(resolve,0));}if(req===desiredRequest){for(const id of [...loaded.keys()])if(!keep.has(id))removeTile(id);updateBuildingList();status(`${PACKAGED_CITY_TILE_COUNT.toLocaleString()} detailed tiles available · ${loaded.size} detailed tiles active · ${buildings.size.toLocaleString()} editable features`);retryAt=0;if(!contextGround&&!contextPromise)setTimeout(()=>ensureContext(),2500);}}catch(e){retryAt=performance.now()+5000;window.JC_TILE_LOAD_ERROR=e.message;status(e.message);}finally{loading=false;$('loading').style.display='none';window.ready=true;window.dispatchEvent(new Event('jc-tiles-loaded'));}});return loadQueue;}
function movement(dt){if(window.JC_MAP_PLAYING||!keys.size)return;const forward=controls.target.clone().sub(camera.position);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)),delta=new THREE.Vector3(),speed=Math.max(120,camera.position.distanceTo(controls.target)*.7)*(keys.has('Shift')?3:1);if(keys.has('w')||keys.has('ArrowUp'))delta.add(forward);if(keys.has('s')||keys.has('ArrowDown'))delta.sub(forward);if(keys.has('d')||keys.has('ArrowRight'))delta.add(right);if(keys.has('a')||keys.has('ArrowLeft'))delta.sub(right);if(delta.lengthSq()){delta.normalize().multiplyScalar(speed*dt);const next=controls.target.clone().add(delta);next.x=THREE.MathUtils.clamp(next.x,base[0]-origin[0]+1,base[2]-origin[0]-1);next.z=THREE.MathUtils.clamp(next.z,origin[1]-base[3]+1,origin[1]-base[1]-1);delta.copy(next).sub(controls.target);camera.position.add(delta);controls.target.copy(next);}}
function streamingTick(t,dt){
 movement(dt);if(!window.JC_CITY_READY||!streamEnabled||t<retryAt||t-lastStreamCheck<400)return;lastStreamCheck=t;
 const position={x:controls.target.x,z:controls.target.z},ahead=predictTravel(position,streamSample,streamSample?t-streamSample.t:0,16);streamHeading={x:ahead.x-position.x,z:ahead.z-position.z};streamSample={...position,t};
 applyTileLod(position);
 const id=centerSection();if(id!==lastWanted&&!loading)loadArea(id,window.JC_HYPERFLIGHT?0:streamRadius,false);
 const connection=navigator.connection;
 if(connection?.saveData||['slow-2g','2g'].includes(connection?.effectiveType))return;
 const seen=new Set();
 for(const point of corridorPoints(position,ahead,950)){const predicted=sectionAt(point.x,point.z);if(predicted===id||seen.has(predicted))continue;seen.add(predicted);const section=byId.get(predicted);if(section&&!loaded.has(predicted)&&available(section.uri))void prefetchedBytes.prefetch(section.uri);}
}
window.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,button'))return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift'].includes(k)){keys.add(k);e.preventDefault();}});window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>keys.clear());
$('autoStream').onchange=e=>{streamEnabled=e.target.checked;if(streamEnabled){lastWanted='';retryAt=0;}};$('streamRange').onchange=e=>{streamRadius=Number(e.target.value);lastWanted='';retryAt=0;loadArea(centerSection(),streamRadius,false);};
$('cityView').onclick=()=>{controls.target.set(0,200,0);camera.position.set(4000,38000,42000);controls.update();status('Whole-city terrain overview. Buildings load around your view center; zoom in to edit.');};
$('fullRender').onclick=()=>{$('renderOverlay').style.display='flex';};$('closeRender').onclick=()=>{$('renderOverlay').style.display='none';};
async function connectFolder(event){prefetchedBytes.clear();streamSample=null;files.clear();const all=[...event.target.files],manifestFile=all.find(f=>f.webkitRelativePath.endsWith('/manifest.json'));if(!manifestFile){status('Choose the extracted city folder containing manifest.json.');return;}const prefix=manifestFile.webkitRelativePath.slice(0,-'manifest.json'.length);for(const f of all)if(f.webkitRelativePath.startsWith(prefix))files.set(f.webkitRelativePath.slice(prefix.length),f);const found=sections.filter(s=>files.has(s.uri)).length;let center=centerSection();const centerTile=byId.get(center);if(!found){status('No city tile files found in that folder. Keep the manifest.json and tiles folder together.');return;}if(!files.has(centerTile?.uri)){const nearest=sections.filter(s=>files.has(s.uri)).sort((a,b)=>Math.abs(a.column-centerTile.column)+Math.abs(a.row-centerTile.row)-Math.abs(b.column-centerTile.column)-Math.abs(b.row-centerTile.row))[0];if(!nearest){status(`${found.toLocaleString()}/1,225 city tiles found. Choose a map position covered by those tiles.`);return;}center=nearest.id;}retryAt=0;lastWanted='';await ensureContext();await loadArea(center,streamRadius,false);status(`${found.toLocaleString()} supplied tiles connected · ${sections.length.toLocaleString()} mapped city sections`);}

function view(direction,radius=loaded.size>1?1:0){const s=byId.get(current),x=(s.bounds[0]+s.bounds[2])/2-origin[0],z=origin[1]-(s.bounds[1]+s.bounds[3])/2,y=80,dist=radius?3300:1450;controls.target.set(x,y,z);const delta={south:[.23,.8,1],north:[-.3,.75,-1],east:[1,.7,.08],top:[0,1.5,.001]}[direction]||[.3,.8,1];camera.position.set(x+delta[0]*dist,y+delta[1]*dist,z+delta[2]*dist);controls.update();}
function focus(){if(!selected)return;const p=selected.getWorldPosition(new THREE.Vector3()),h=selected.userData.heightMetres,bb=selected.userData.collider,d=Math.max(h*2.8,(bb.max[0]-bb.min[0])*2,150);p.y+=h*.35;controls.target.copy(p);camera.position.copy(p).add(new THREE.Vector3(.65*d,.6*d,d));controls.update();}
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const meshes=[...buildings.values()].filter(o=>!chunks.has(o.userData.buildingId)).flatMap(o=>o.children);const hit=ray.intersectObjects(meshes,false)[0];if(hit)select(hit.object.userData.owner);});
for(const e of document.querySelectorAll('[data-view]'))e.onclick=()=>view(e.dataset.view);$('focus').onclick=focus;for(const id of ['wallColor','roofColor','roughness','glow','materialMode'])$(id).addEventListener('input',updateEdit);$('crumble').onclick=()=>destroy(selected,'crumble');$('explode').onclick=()=>destroy(selected,'explode');$('rebuild').onclick=()=>rebuild(selected);$('resetLook').onclick=()=>{if(!selected)return;const id=selected.userData.buildingId,state=edits.get(id)?.state;edits.set(id,state?{state}:{});setAppearance(selected,edits.get(id));persist();select(selected);};$('buildingList').onchange=e=>select(buildings.get(e.target.value));
for(const s of [...sections].sort((a,b)=>a.id.localeCompare(b.id)))$('tile').add(new Option(`${s.id} · ${s.buildings.toLocaleString()} objects${available(s.uri)?'':' · tile missing'}`,s.id));$('loadTile').onclick=()=>loadArea($('tile').value,streamRadius);$('neighbors').onclick=()=>loadArea($('tile').value,2);
const places={strip:'C15_R14',downtown:'C15_R21',houses:'C21_R21'};for(const b of document.querySelectorAll('[data-place]'))b.onclick=()=>loadArea(places[b.dataset.place]);
function nearestGeo(lon,lat){let best=null,d=Infinity;for(const s of sections){const corners=s.cornersLonLat,l=corners.reduce((a,p)=>a+p[0],0)/4,la=corners.reduce((a,p)=>a+p[1],0)/4,n=((l-lon)*Math.cos(lat*Math.PI/180))**2+(la-lat)**2;if(n<d){d=n;best=s;}}if(Math.sqrt(d)>.012)throw Error('Coordinates are outside the project.');return best.id;}
$('goGeo').onclick=()=>{try{const a=$('geo').value.trim().split(/[,\s]+/).map(Number);if(a.length!==2||!a.every(Number.isFinite))throw Error('Enter longitude, latitude.');loadArea(nearestGeo(...a));}catch(e){status(e.message);}};
$('map').src=payload.resources['assets/overview.jpg'];$('map').onclick=e=>{const r=e.target.getBoundingClientRect(),c=Math.min(34,Math.max(0,Math.floor((e.clientX-r.left)/r.width*35))),y=Math.min(34,Math.max(0,34-Math.floor((e.clientY-r.top)/r.height*35)));loadArea(`C${String(c).padStart(2,'0')}_R${String(y).padStart(2,'0')}`);};
$('openFolder').onclick=()=>$('folder').click();$('folder').onchange=connectFolder;
function exportEdits(){return {format:'illco-vegas-building-edits',version:1,source:'NGA_Los_Vegas_Buildings_2014',crs:'EPSG:32611',edits:Object.fromEntries(edits)};}function importEdits(obj){if(obj.format!=='illco-vegas-building-edits'||!obj.edits||Array.isArray(obj.edits))throw Error('Not a valid city edit file.');for(const [id,e]of Object.entries(obj.edits)){if(!/^NGA14-\d+$/.test(id))continue;const clean={};for(const k of ['wallColor','roofColor'])if(/^#[0-9a-f]{6}$/i.test(e[k]||''))clean[k]=e[k];if(['plain','textured'].includes(e.surface))clean.surface=e.surface;if(Number.isFinite(e.roughness))clean.roughness=Math.max(0,Math.min(1,e.roughness));if(Number.isFinite(e.glow))clean.glow=Math.max(0,Math.min(2,e.glow));if(['crumble','explode'].includes(e.state))clean.state=e.state;edits.set(id,clean);const ob=buildings.get(id);if(ob){rebuild(ob,false);setAppearance(ob,clean);if(clean.state)destroy(ob,clean.state,false);}}persist();if(selected)select(selected);status('Saved building edits applied.');}
$('save').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(exportEdits(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Vegas_Building_Edits.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};$('loadEdits').onclick=()=>$('editsFile').click();$('editsFile').onchange=async e=>{try{importEdits(JSON.parse(await e.target.files[0].text()));}catch(err){status(err.message);}};
function resize(){const r=$('viewport').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe($('viewport'));resize();if(mobileMap) $('streamRange').value='0';
function animate(t){requestAnimationFrame(animate);const dt=Math.min((t-last)/1000,.04);last=t;if(!window.studio?.paused){tick(dt*Math.max(0,Math.min(1,window.JC_WORLD_SCALE??1)));streamingTick(t,dt);}if(!window.JC_MAP_PLAYING)controls.update();window.studio?.distantCity?.update();window.studio?.environment?.update(t,dt);window.studio?.traffic?.update(dt);window.studio?.buildingViews?.update(t,dt,document.body.classList.contains('jc-playing'));if(!mobileMap||!startInPlay||window.JC_PLAYER_READY){if(window.studio?.renderFrame)window.studio.renderFrame();else renderer.render(scene,camera);}}requestAnimationFrame(animate);
window.studio={sections,cityBounds:base,mobileMap,lowSpec,stable3D,deviceMemory,scene,camera,renderer,controls,buildings,chunks,edits,loaded,origin,centerSection,ensureContext,streamingTick,streamInfo:()=>({enabled:streamEnabled,radius:streamRadius,loading,current,lastWanted,context:!!contextGround,availableFiles:files.size,lowSpec,stable3D,deviceMemory}),tileRevision:()=>tileRevision,prefetchInfo:()=>prefetchedBytes.stats(),loadArea,select,focus,view,destroy,rebuild,updateEdit,exportEdits,importEdits,tick,stats:()=>({buildings:buildings.size,tiles:loaded.size,visibleTiles:[...loaded.values()].filter(g=>g.visible).length,chunks:particles.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),proof:()=>{document.body.classList.add('proof');resize();}};
window.studio.roads=createRoadNetwork(window.studio);
window.studio.traffic=createCityTraffic(window.studio);
window.studio.distantCity=createDistantCity(window.studio);
window.studio.environment=createCityEnvironment(window.studio,{mobile:mobileMap});
window.studio.buildingViews=createBuildingImpostors(window.studio,{mobile:mobileMap,enabled:params.get('buildingViews')==='on'&&!stable3D});
$('fullCityProof').src=payload.fullCityProof;
window.studio.ready=loadArea('C15_R14',0);
await window.studio.ready;
lastWanted='';
if(!loaded.has('C15_R14'))throw Error('The Strip tile could not load: '+(window.JC_TILE_LOAD_ERROR||'No city geometry was returned.'));
window.JC_CITY_READY=true;
