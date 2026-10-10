import * as THREE from './three.module.js';
import {generatedBuildingKind} from './generated-materials.js';
import {identityPalette} from './building-identities.js';
let pending;
export function loadPhysicalMaterials(){
 return pending ||= new Promise((resolve,reject)=>{
  const image=new Image();
  let settled=false;
  const fail=error=>{if(settled)return;settled=true;clearTimeout(timer);reject(error);};
  const timer=setTimeout(()=>fail(Error('Material download timed out')),8000);
  image.onerror=()=>fail(Error('Materials unavailable'));
  image.onload=()=>{if(settled)return;settled=true;clearTimeout(timer);
   const maps=[];
   try{
   for(let i=0;i<6;i++){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    canvas.getContext('2d').drawImage(image,(i%3)*image.width/3,Math.floor(i/3)*image.height/2,image.width/3,image.height/2,0,0,512,512);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=2;
    if(i===4){map.channel=1;map.colorSpace=THREE.NoColorSpace;}
    maps.push(map);
   }
   resolve(maps);
  }catch(error){for(const map of maps)map.dispose?.();reject(error);}};
  image.src='./facades/physical-materials-v1.webp';
 }).catch(error=>{pending=undefined;throw error;});
}
export function buildingHash(id){let hash=2166136261;for(const c of id){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
const LANDMARK_FACADES=[
 [/Blood Bay|Mandalay Bay/i,0x482024,0xe73548,3],
 [/Obsidian Pyramid|Luxor/i,0x191a20,0xe41f3b,3],
 [/666|MGM Grand/i,0x401318,0xff2c43,0],
 [/Psalms|Palms/i,0xa5b7c2,0x79b8dc,2],
 [/Bellagio/i,0xe3d5b5,0xd8bc75,0],
 [/Caesars/i,0xe5dfcd,0x73b5d2,2],
 [/Paris/i,0xe4d3b4,0xe47a5d,1],
 [/Luxor/i,0x8b7965,0xf1b64f,3],
 [/MGM Grand/i,0x93b5a2,0xd8c46a,1],
 [/Venetian|Palazzo/i,0xdec9a5,0xe6bc73,0],
 [/Wynn|Encore/i,0xd6c094,0xc68c45,2],
 [/Flamingo/i,0xe7c6cf,0xff83ba,3],
 [/Cosmopolitan/i,0xaabac9,0xa07ed5,2],
 [/New York[- ]New York/i,0xb97c71,0x94bdd7,1],
 [/Excalibur/i,0xd2b98f,0xb684db,3],
 [/Circus Circus/i,0xa4b77a,0xf1675a,0],
 [/Resorts World/i,0x8b4144,0xeea56d,2],
 [/Treasure Island/i,0x8d9ca1,0x75e3c7,1],
 [/Strat/i,0xbebbb3,0xffd265,3],
 [/Palms/i,0xa9b9c6,0x79b8dc,2],
 [/Sphere/i,0x5f6570,0x74b8ff,3],
 [/Allegiant/i,0x171b20,0xb9c2ca,2],
 [/T-Mobile/i,0x9ba6b1,0x7aa7cc,1],
];
export function facadeTraits(id,identity={}){
 const signature=buildingHash(String(id)+':identity');
 const landmark=LANDMARK_FACADES.find(([pattern])=>pattern.test(identity?.name||''));
 const accents=[0x61cce7,0xe7b75e,0xbd8ee1,0xe88486,0x82ce9d,0xd5d9e8,0x72aaa8,0xe49f70];
 // More facade signatures than the four shared atlas cells: mullion spacing,
 // floor banding and accent placement vary per footprint while remaining stable.
 return {signature,accent:landmark?.[2]??accents[(signature>>>9)%accents.length],pattern:landmark?.[3]??(signature%8),verticalFrequency:2+((signature>>>4)%7),horizontalFrequency:2+((signature>>>7)%9),detailFrequency:4+((signature>>>12)%9),landmark:!!landmark};
}
// Appearance is a fictional, deterministic art assignment, not surveyed paint.
export function buildingSurface(id,height,photos,physical,identity=null,generated={}){
 const h=buildingHash(id),paint=['#f1eee7','#ddd5c8','#c8c4bc','#d8d0c0','#c6b9a6','#e2deda'];
 let map,scale,roughness=.86,metalness=0,color='#ffffff',kind='facade';
 if(height>=24){map=photos[(h%2)%photos.length];scale=[9,10];roughness=h%2?.74:.33;metalness=h%2?0:.18;}
 else if(height>=8 || !physical.length || h%5!==0){map=photos[(2+h%2)%photos.length];scale=[8,9];color=paint[h%paint.length];}
 else {
  const index=[0,0,1,2,3,5][h%6];map=physical[index];
  kind=['painted stucco','concrete','brick','stone','roof aggregate','painted metal'][index];
  scale=index===0?[2,2]:index===2?[3,3]:[4,4];
  color=index===0?paint[h%paint.length]:'#ffffff';roughness=index===5?.58:.94;metalness=index===5?.22:0;
 }
 const traits=facadeTraits(id,identity),signature=traits.signature,palette=identityPalette(identity?.name);
 if(palette&&photos.length){map=photos[palette.photo%photos.length];color=palette.color;roughness=palette.roughness;kind='landmark facade';scale=[9,10];}
 const generatedKind=generatedBuildingKind(identity,height);
 if(generatedKind==='casino'){
  if(identity?.type==='casino'&&photos.length){
   const photoIndex=palette?.photo??((h>>>11)%photos.length);
   map=photos[photoIndex%photos.length];scale=[8.5,8.5];
   roughness=palette?.roughness??.58;metalness=.10;color=palette?.color||'#ffffff';
   kind='casino photographic facade';
  }else if(generated.casino){
   map=generated.casino;scale=[8.5,8.5];roughness=.58;metalness=.10;
   color=palette?.color||'#ffffff';kind='generated casino';
  }
 }
 // Generated residential is intentionally reserved for low homes. Named
 // properties and normal commercial buildings keep their own deterministic
 // facade signature instead of collapsing onto one shared generated skin.
 if(generatedKind==='residential'&&generated.residential&&!palette){map=generated.residential;scale=[3.4,2.8];roughness=.96;metalness=0;color=paint[(h>>>5)%paint.length];kind='generated residential';}
 if(generatedKind==='apartment'&&generated.apartment&&!palette){map=generated.apartment;scale=[5.4,4.2];roughness=.93;metalness=0;color=paint[(h>>>7)%paint.length];kind='generated apartment';}
 const isCasino=identity&&identity.type==='casino';
 if(isCasino){roughness=kind==='generated casino'?.58:.52;metalness=kind==='generated casino'?.10:.16;}
 else {roughness=.93;metalness=0;}
 const tint=new THREE.Color(color);tint.offsetHSL(((signature>>>4)%17-8)/900,((signature>>>10)%13-6)/500,((signature>>>17)%17-8)/600);
 color='#'+tint.getHexString();
 scale=[scale[0]*(.88+((signature>>>8)%25)/100),scale[1]];
 return {map,scale,roughness,metalness,color,kind,signature:signature.toString(16).padStart(8,'0'),accent:traits.accent,pattern:traits.pattern,verticalFrequency:traits.verticalFrequency,horizontalFrequency:traits.horizontalFrequency,detailFrequency:traits.detailFrequency};
}
// Meter-based projection avoids stretching windows over an entire skyscraper.
// Only walls are remapped; original aerial roof photographs keep their UVs.
export function wallUV(positions,normals,width,height){
 const result=new Float32Array(positions.count*2);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i),nx=normals.getX(i),nz=normals.getZ(i);
  const length=Math.hypot(nx,nz)||1;
  result[i*2]=(x*nz-z*nx)/(length*width);
  result[i*2+1]=positions.getY(i)/height;
 }
 return result;
}
