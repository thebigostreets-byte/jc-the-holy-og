import * as THREE from './three.module.js';

let pending;

// Casino identity is intentionally explicit. Everything else defaults to matte
// residential/commercial treatment instead of receiving "Strip" gloss by height.
const CASINO_PROPERTIES = [
  ['Bellagio', -115.1767, 36.1126, 260],
  ['Caesars Palace', -115.1745, 36.1162, 330],
  ['Paris Las Vegas', -115.1707, 36.1125, 210],
  ['MGM Grand', -115.1697, 36.1025, 300],
  ['New York-New York', -115.1745, 36.1022, 220],
  ['Excalibur', -115.1756, 36.0987, 260],
  ['Luxor', -115.1761, 36.0955, 260],
  ['Mandalay Bay', -115.1757, 36.0919, 320],
  ['The Venetian / Palazzo', -115.1697, 36.1212, 330],
  ['Wynn / Encore', -115.1657, 36.1269, 360],
  ['Resorts World', -115.1658, 36.1354, 320],
  ['Circus Circus', -115.1659, 36.1372, 300],
  ['Fontainebleau Las Vegas', -115.1583, 36.1377, 270],
  ['The STRAT', -115.1566, 36.1475, 220]
];

const toRad = value => value * Math.PI / 180;
function distanceMetres(lon1,lat1,lon2,lat2){
  const p1=toRad(lat1),p2=toRad(lat2),dp=toRad(lat2-lat1),dl=toRad(lon2-lon1);
  const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(a)));
}

export function classifyBuilding(meta={}){
  if(typeof meta==='number') meta={heightMetres:meta};
  const longitude=Number(meta.longitude),latitude=Number(meta.latitude),height=Number(meta.heightMetres)||0;
  if(Number.isFinite(longitude)&&Number.isFinite(latitude)){
    let best=null;
    for(const [name,lon,lat,radius] of CASINO_PROPERTIES){
      const distance=distanceMetres(longitude,latitude,lon,lat);
      if(distance<=radius&&(!best||distance<best.distance))best={type:'casino',name,confidence:'landmark-proximity',distance};
    }
    if(best)return best;
  }
  const inStripCorridor=Number.isFinite(longitude)&&Number.isFinite(latitude)&&longitude>-115.186&&longitude<-115.154&&latitude>36.086&&latitude<36.151;
  if(height<=11&&!inStripCorridor)return {type:'residential',name:'Neighborhood residence',confidence:'inferred-form'};
  if(height<=16&&!inStripCorridor)return {type:'low-rise-commercial',name:'Low-rise building',confidence:'inferred-form'};
  return {type:'commercial',name:inStripCorridor?'Strip commercial building':'Commercial building',confidence:'inferred-form'};
}

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

// Appearance remains an art layer. Identity-aware rules prevent ordinary homes and
// businesses from inheriting reflective casino treatment.
export function buildingSurface(id,meta,photos,physical){
 const h=buildingHash(id),identity=classifyBuilding(meta),height=typeof meta==='number'?meta:(Number(meta?.heightMetres)||0);
 const paint=['#efe8dc','#ddd2c3','#cdbda9','#e5ddd0','#c7b7a3','#f1ede5'];
 let map,scale,roughness=.9,metalness=0,color='#ffffff',kind='facade';

 if(identity.type==='casino'){
  map=photos[h%Math.max(1,photos.length)];
  scale=height>=40?[10,13]:[7,8];
  roughness=.34+(h%4)*.04;
  metalness=.12+(h%3)*.04;
  kind='casino glass / illuminated facade';
 } else if(identity.type==='residential'){
  const choices=[0,0,0,2,3],index=choices[h%choices.length];
  map=physical[index]||photos[(2+h%2)%Math.max(1,photos.length)];
  scale=index===0?[2.2,2.2]:index===2?[3,3]:[3.5,3.5];
  color=index===0?paint[h%paint.length]:'#ffffff';
  roughness=.94;
  metalness=0;
  kind=index===0?'residential stucco':index===2?'residential brick':'residential stone';
 } else if(identity.type==='low-rise-commercial'){
  const index=[0,1,2,5][h%4];
  map=physical[index]||photos[(2+h%2)%Math.max(1,photos.length)];
  scale=index===0?[2.5,2.5]:index===2?[3.2,3.2]:[4,4];
  color=index===0?paint[h%paint.length]:'#ffffff';
  roughness=index===5?.72:.88;
  metalness=index===5?.04:0;
  kind='matte low-rise commercial';
 } else {
  map=height>=24?photos[(2+h%2)%Math.max(1,photos.length)]:(physical[[0,1,2,5][h%4]]||photos[(2+h%2)%Math.max(1,photos.length)]);
  scale=height>=24?[7,8]:[4,4];
  color=height>=24?'#ffffff':paint[h%paint.length];
  roughness=height>=24?.72:.86;
  metalness=height>=24?.04:0;
  kind='matte commercial facade';
 }
 return {map,scale,roughness,metalness,color,kind,identity};
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
