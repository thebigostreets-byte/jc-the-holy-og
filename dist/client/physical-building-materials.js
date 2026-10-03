import * as THREE from './three.module.js';
import {generatedBuildingKind} from './generated-materials.js';
import {identityPalette} from './building-identities.js';
let pending;
export function loadPhysicalMaterials(){
 return pending ||= new Promise((resolve,reject)=>{
  const image=new Image(),timer=setTimeout(()=>reject(Error('Material download timed out')),8000);
  image.onerror=()=>{clearTimeout(timer);reject(Error('Materials unavailable'));};
  image.onload=()=>{clearTimeout(timer);try{
   const maps=[];
   for(let i=0;i<6;i++){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    canvas.getContext('2d').drawImage(image,(i%3)*image.width/3,Math.floor(i/3)*image.height/2,image.width/3,image.height/2,0,0,512,512);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=2;
    if(i===4){map.channel=1;map.colorSpace=THREE.NoColorSpace;}
    maps.push(map);
   }
   resolve(maps);
  }catch(error){reject(error);}};
  image.src='./facades/physical-materials-v1.webp';
 });
}
export function buildingHash(id){let hash=2166136261;for(const c of id){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
const LANDMARK_FACADES=[
 [/Bellagio/i,0xe3d5b5,0xd8bc75,0],
 [/Caesars/i,0xe5dfcd,0x73b5d2,2],
 [/Paris/i,0xe4d3b4,0xe47a5d,1],
 [/Luxor/i,0x8b7965,0xf1b64f,3],
 [/MGM Grand/i,0x93b5a2,0xd8c46a,1],
 [/Venetian|Palazzo/i,0xdec9a5,0xe6bc73,0],
 [/Wynn|Encore/i,0xd6c094,0xc68c45,2],
 [/Flamingo/i,0xe7c6cf,0xff83ba,3],
 [/Cosmopolitan/i,0xaabac9,0xa07ed5,2],
 [/New York New York/i,0xb97c71,0x94bdd7,1],
 [/Excalibur/i,0xd2b98f,0xb684db,3],
 [/Circus Circus/i,0xa4b77a,0xf1675a,0],
 [/Resorts World/i,0x8b4144,0xeea56d,2],
 [/Treasure Island/i,0x8d9ca1,0x75e3c7,1],
 [/Strat/i,0xbebbb3,0xffd265,3],
];
export function facadeTraits(id,identity={}){
 const signature=buildingHash(String(id)+':identity');
 const landmark=LANDMARK_FACADES.find(([pattern])=>pattern.test(identity?.name||''));
 const accents=[0x61cce7,0xe7b75e,0xbd8ee1,0xe88486,0x82ce9d,0xd5d9e8,0x72aaa8,0xe49f70];
 return {signature,accent:landmark?.[2]??accents[(signature>>>9)%accents.length],pattern:landmark?.[3]??(signature%4),verticalFrequency:1+((signature>>>4)%3),horizontalFrequency:1+((signature>>>7)%3),detailFrequency:2+((signature>>>12)%4),landmark:!!landmark};
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
 if(generatedKind&&generated[generatedKind]){map=generated[generatedKind];scale=generatedKind==='casino'?[9,10]:[8,9];roughness=generatedKind==='casino'?.65:.96;metalness=0;color='#ffffff';kind='generated '+generatedKind;}
 const isCasino=identity?.type==='casino';
 if(isCasino){roughness=.48;metalness=.12;}
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
