import * as THREE from './three.module.js';
import {projectToUTM11} from './city-environment.js';

// Fictional art overlays anchored to real Las Vegas locations, not arbitrary map tiles.
// Each object is separate from source meshes so building collisions remain intact.
export const LANDMARK_SPECS = Object.freeze({
 luxor: Object.freeze({name:'Luxor',longitude:-115.1761,latitude:36.0955,baseMetres:183,heightMetres:107,beamMetres:3800}),
 angelic: Object.freeze({name:'Angelic Stadium',longitude:-115.183952,latitude:36.090794,footprintMetres:[300,245]}),
 speedway: Object.freeze({name:'Sin City Motor Speedway',longitude:-115.0105,latitude:36.2723,footprintMetres:[1150,780]}),
 endOfHim: Object.freeze({name:'END OF HIM',longitude:-115.1697,latitude:36.1025,hellOnly:true})
});

export function localLandmarkPoint(spec,origin) {
 if(!Number.isFinite(spec?.longitude)||!Number.isFinite(spec?.latitude)||!Array.isArray(origin)||!origin.every(Number.isFinite))throw Error('Invalid landmark anchor');
 const [east,north]=projectToUTM11(spec.longitude,spec.latitude);
 return {x:east-origin[0],z:origin[1]-north};
}

export function createLandmarkVariants(game,{mobile=false}={}) {
 const root=new THREE.Group();root.name='Authored landmark variants';game.scene.add(root);
 const materials=new Set(),geometries=new Set(),textures=new Set();
 const owned=(geometry,material)=>{geometries.add(geometry);if(Array.isArray(material)){for(const m of material)materials.add(m);}else if(material)materials.add(material);return new THREE.Mesh(geometry,material);};
 const material=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.45,metalness:.08,...options});
 const groundAt=(x,z)=>{const v=game.roads?.sample?.(x,z);return Number.isFinite(v)?v:0;};
 const anchor=(spec)=>{const p=localLandmarkPoint(spec,game.origin),g=new THREE.Group();g.name=spec.name;g.position.set(p.x,groundAt(p.x,p.z),p.z);root.add(g);return g;};
 // Reuse GPU textures for repeated facade labels without changing their geometry.
 const signMaterialCache=new Map();
 const makeSign=(text,color='#f9d578',bg='#18202b')=>{
  const key=JSON.stringify([text,color,bg,mobile]);
  if(signMaterialCache.has(key))return signMaterialCache.get(key);
  const canvas=document.createElement('canvas');canvas.width=mobile?512:1024;canvas.height=mobile?96:192;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  if(mobile)ctx.scale(.5,.5); // Preserve sign geometry while quartering mobile texture pixels.
  ctx.fillStyle=bg;ctx.fillRect(0,0,1024,192);
  ctx.strokeStyle=color;ctx.lineWidth=12;ctx.strokeRect(10,10,1004,172);
  ctx.font='bold 102px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor=color;ctx.shadowBlur=14;ctx.fillStyle=color;ctx.fillText(text,512,96,970);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;textures.add(tex);
  const signMaterial=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  materials.add(signMaterial); // Cached sign materials must be released with the scene.
  signMaterialCache.set(key,signMaterial);
  return signMaterial;
 };
 const addSign=(group,text,width,height,x,y,z,angle,color,bg)=>{
  const mat=makeSign(text,color,bg);if(!mat)return null;
  const s=owned(new THREE.PlaneGeometry(width,height),mat);s.name=text+' sign';s.position.set(x,y,z);s.rotation.y=angle;group.add(s);return s;
 };
 // Luxor receives a real white geometric shell instead of its old black/dark card.
 // Source tile remains loaded, with its existing physical collision intact.
 const pyramid=anchor(LANDMARK_SPECS.luxor),white=material(0xf8f7f0,{roughness:.37,metalness:.09});
 const cap=owned(new THREE.ConeGeometry(129.4,107,4),white);cap.name='White Luxor pyramid · 183 m base';cap.rotation.y=Math.PI/4;cap.position.y=53.5;pyramid.add(cap);
 const podium=owned(new THREE.BoxGeometry(185,2.4,185),material(0xe7d6ad,{roughness:.4,metalness:.3}));podium.position.y=1.2;pyramid.add(podium);
 const apex=owned(new THREE.SphereGeometry(3.4,mobile?8:12,8),new THREE.MeshBasicMaterial({color:0xffffff}));apex.position.y=107;pyramid.add(apex);
 const beamMaterials=[],beamShafts=[];
 for(const [diameter,opacity,length,color] of [[2,.68,3800,0xffffff],[14,.16,3800,0xfff3c3]]){
  const beamMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true});
  const shaft=owned(new THREE.CylinderGeometry(diameter*.65,diameter,length,mobile?6:10,1,true),beamMat);
  shaft.name='Luxor heavenly sky beam';shaft.position.y=107+length*.5;shaft.frustumCulled=false;pyramid.add(shaft);beamMaterials.push(beamMat);beamShafts.push(shaft);
 }
 addSign(pyramid,'LUXOR',98,18,0,17,94,0,'#ffefbd','#f3f3f0');

 // Distinct oval white/gold Angelic Stadium, kept at its geographical footprint.
 const stadium=anchor(LANDMARK_SPECS.angelic);
 const bowl=owned(new THREE.CylinderGeometry(1,1,24,mobile?20:36),material(0xf7f5ea,{roughness:.48}));bowl.scale.set(150,1,122);bowl.position.y=12;stadium.add(bowl);
 const roof=owned(new THREE.SphereGeometry(1,mobile?20:36,mobile?8:12,0,Math.PI*2,0,Math.PI/2),material(0xfffcf4,{metalness:.2,roughness:.4}));roof.scale.set(150,23,122);roof.position.y=24;stadium.add(roof);
 const goldRim=owned(new THREE.TorusGeometry(1,.02,4,mobile?32:64),new THREE.MeshBasicMaterial({color:0xf2d28d}));goldRim.rotation.x=Math.PI/2;goldRim.scale.set(151,125,1);goldRim.position.y=25;stadium.add(goldRim);
 for(const side of [-1,1])addSign(stadium,'ANGELIC STADIUM',108,19,0,22,side*126,side<0?Math.PI:0,'#fbd47f','#16202c');
 
 // Speedway is a distinct oval landmark, not a generic stadium or Hell resort.
 // Low-poly infield, paved racing loop and two grandstands share the geographic anchor.
 const speedway=anchor(LANDMARK_SPECS.speedway);
 const infield=owned(new THREE.CylinderGeometry(1,1,.35,mobile?48:96),material(0x596347,{roughness:1}));
 infield.scale.set(520,1,350);infield.position.y=.25;speedway.add(infield);
 const track=owned(new THREE.TorusGeometry(1,.13,mobile?6:8,mobile?64:128),material(0x292d34,{roughness:.94}));
 track.rotation.x=Math.PI/2;track.scale.set(540,365,1);track.position.y=1.2;speedway.add(track);
 const stripe=owned(new THREE.TorusGeometry(1,.006,3,mobile?64:128),new THREE.MeshBasicMaterial({color:0xf5e8cf}));
 stripe.rotation.x=Math.PI/2;stripe.scale.set(540,365,1);stripe.position.y=1.8;speedway.add(stripe);
 for(const side of [-1,1]){
  const stand=owned(new THREE.BoxGeometry(370,17,38),material(0xc5bfae,{roughness:.82}));
  stand.position.set(side*300,11,side*295);stand.rotation.y=side*.12;speedway.add(stand);
 }
 addSign(speedway,'SIN CITY MOTOR SPEEDWAY',240,28,0,27,-390,0,'#f7d978','#202631');

 // Original generated Hell casino façade: a distance-only transparent impostor,
 // never substituted for close-range building collision or source roof geometry.
 const hell=anchor(LANDMARK_SPECS.endOfHim);
 addSign(hell,'END OF HIM',135,25,-118,39,0,-Math.PI/2,'#ff6637','#1b0308');
 addSign(hell,'END OF HIM',135,25,0,39,118,0,'#ff6637','#1b0308');
 // Do not decode/upload the Hell-only distant cutout during normal-world startup.
 let hellArt=null,hellArtReady=false,hellArtFailed=false;
 const cardMaterial=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.025,depthWrite:false,side:THREE.DoubleSide});
 const card=owned(new THREE.PlaneGeometry(330,104),cardMaterial);
 card.name='END OF HIM authored Hell sprite impostor';card.position.y=83;card.frustumCulled=false;hell.add(card);
 let disposed=false;
 function update(){
  if(disposed)return;
  const night=window.JC_WORLD_TIME_MODE==='night';
  beamMaterials[0].opacity=night?.82:.55;beamMaterials[1].opacity=night?.25:.14;
  const hellMode=window.JC_HELL_WORLD===true||document.getElementById('jcDevilMode')?.getAttribute('aria-pressed')==='true';
  hell.visible=hellMode;
  if(hellMode&&game.camera){
   const cam=game.camera.position,dx=cam.x-hell.position.x,dz=cam.z-hell.position.z,dist=Math.hypot(dx,dz);
   const withinImpostorRange=dist>400&&dist<6500;
   // Avoid decoding the distant Hell façade when the player is outside its visible LOD.
   if(withinImpostorRange&&!hellArt&&!hellArtFailed){
    hellArt=new THREE.TextureLoader().load('./assets/building-cutouts/end-of-him-distant.webp',()=>{if(!disposed)hellArtReady=true;},undefined,()=>{if(!disposed)hellArtFailed=true;});
    hellArt.colorSpace=THREE.SRGBColorSpace;hellArt.anisotropy=2;textures.add(hellArt);
    cardMaterial.map=hellArt;cardMaterial.needsUpdate=true;
   }
   card.visible=withinImpostorRange&&hellArtReady&&!hellArtFailed;
   if(card.visible)card.lookAt(cam.x-hell.position.x,card.position.y,cam.z-hell.position.z);
  }else card.visible=false;
  // Small far-field drawing budget; beam does not cast shadows or use point lights.
  if(game.camera){const cam=game.camera.position,dist=Math.hypot(cam.x-pyramid.position.x,cam.z-pyramid.position.z);pyramid.visible=dist<20000;
   // On mobile, keep the 3,800 m bright core visible at long range, but skip
   // the additive outer glow pass until close enough to contribute pixels.
   beamShafts[1].visible=!mobile||dist<2500;
  }
 }
 update();
 return {root,update,stats:()=>({landmarks:4,luxorBeamMetres:3800,endOfHimActive:hell.visible}),dispose(){
  if(disposed)return;disposed=true;game.scene.remove(root);
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
 }};
}
