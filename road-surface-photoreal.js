import * as THREE from './three.module.js';

// Deterministic lightweight PBR textures for streamed roads and paved areas.
// These are generated locally, so gameplay never waits on a map API or image server.
function seeded(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
function clamp(v,min=0,max=255){return Math.max(min,Math.min(max,v));}
function makePavement(kind,size){
 const rng=seeded(kind==='road'?92147:kind==='lot'?40133:87655);
 const diffuse=document.createElement('canvas'),relief=document.createElement('canvas'),rough=document.createElement('canvas');
 for(const c of [diffuse,relief,rough]){c.width=size;c.height=size;}
 const a=diffuse.getContext('2d'),b=relief.getContext('2d'),c=rough.getContext('2d');
 const pixels=a.createImageData(size,size),height=b.createImageData(size,size),rgh=c.createImageData(size,size);
 const road=kind==='road',lot=kind==='lot',base=road?51:lot?63:147;
 const shadow=[];
 for(let j=0;j<17;j++)shadow.push({x:rng()*size,y:rng()*size,r:10+rng()*size*.23,v:(rng()-.5)*19});
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,n=(rng()+rng()+rng()-1.5)*27;
  let v=base+n;
  for(const patch of shadow){const dx=Math.min(Math.abs(x-patch.x),size-Math.abs(x-patch.x)),dy=Math.min(Math.abs(y-patch.y),size-Math.abs(y-patch.y));const d=(dx*dx+dy*dy)/(patch.r*patch.r);if(d<1)v+=patch.v*(1-d)*(1-d);}
  if(road){const track=Math.min(Math.abs(x-size*.28),Math.abs(x-size*.73));v-=Math.max(0,1-track/15)*4;}
  if(lot){v+=Math.sin(x*.021+y*.008)*3.5;}
  if(!road&&!lot){v+=Math.sin(x*.045)*1.8+Math.sin(y*.054)*1.8;}
  const grain=clamp(v),p=pixels.data,q=height.data,h=rgh.data;
  p[i]=clamp(grain+(road?1:lot?0:7));p[i+1]=clamp(grain+(road?2:lot?1:5));p[i+2]=clamp(grain+(road?3:lot?3:2));p[i+3]=255;
  const depth=clamp(124+n*.62);q[i]=q[i+1]=q[i+2]=depth;q[i+3]=255;
  const r=clamp(road?227+n*.25:lot?218+n*.3:246+n*.12);h[i]=h[i+1]=h[i+2]=r;h[i+3]=255;
 }
 a.putImageData(pixels,0,0);b.putImageData(height,0,0);c.putImageData(rgh,0,0);
 // Subtle tar repairs, fine cracks, aggregates and aged stains.
 const stroke=(ctx,x,y,x2,y2,width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();};
 a.save();b.save();
 for(let i=0;i<(kind==='sidewalk'?23:66);i++){
  const x=rng()*size,y=rng()*size,rad=1+rng()*4;
  a.fillStyle=kind==='sidewalk'?'rgba(76,73,66,.11)':'rgba(12,13,14,.11)';
  a.beginPath();a.ellipse(x,y,rad*2,rad*.65,rng()*Math.PI,0,Math.PI*2);a.fill();
 }
 for(let i=0;i<(road?20:lot?25:12);i++){
  let x=rng()*size,y=rng()*size,angle=rng()*Math.PI*2;
  for(let j=0;j<2+Math.floor(rng()*5);j++){
   const nx=x+Math.cos(angle)*(3+rng()*15),ny=y+Math.sin(angle)*(3+rng()*15);
   stroke(a,x,y,nx,ny,.45+rng()*.7,kind==='sidewalk'?'rgba(68,68,68,.18)':'rgba(8,10,12,.33)');
   stroke(b,x,y,nx,ny,1,'rgba(33,33,33,.27)');
   x=nx;y=ny;angle+=(rng()-.5)*.75;
  }
 }
 if(kind==='sidewalk'){
  for(let i=0;i<4;i++){const p=i*size/4;stroke(a,p,0,p,size,1.3,'rgba(53,54,56,.15)');stroke(a,0,p,size,p,1.3,'rgba(53,54,56,.15)');}
 }
 a.restore();b.restore();
 const texture=(canvas,color=false)=>{
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=2;map.needsUpdate=true;return map;
 };
 return {diffuse:texture(diffuse,true),bump:texture(relief),rough:texture(rough)};
}
export function createPhotorealPavementMaterials({lowSpec=false}={}){
 const n=lowSpec?256:512,road=makePavement('road',n),lot=makePavement('lot',n),concrete=makePavement('sidewalk',n);
 function material(data,roughness,bumpScale){
  return new THREE.MeshStandardMaterial({map:data.diffuse,roughnessMap:lowSpec?null:data.rough,
   bumpMap:lowSpec?null:data.bump,bumpScale:lowSpec?0:bumpScale,color:0xffffff,
   roughness,metalness:.025,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
 }
 const materials={
  road:material(road,.92,.021),parking:material(lot,.94,.015),
  sidewalk:material(concrete,.98,.014),
  yellow:new THREE.MeshStandardMaterial({color:0xf0c35b,roughness:.96,side:THREE.DoubleSide}),
  white:new THREE.MeshStandardMaterial({color:0xe2e1d6,roughness:.96,side:THREE.DoubleSide}),
  parkingLine:new THREE.MeshStandardMaterial({color:0xb5b4ab,transparent:true,opacity:.84,roughness:1,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})
 };
 const maps=[...Object.values(road),...Object.values(lot),...Object.values(concrete)];
 return {materials,dispose(){maps.forEach(t=>t.dispose());Object.values(materials).forEach(m=>m.dispose());}};
}
