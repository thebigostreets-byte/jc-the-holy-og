import * as THREE from './three.module.js';
import {roadWidth,terrainSampler} from './city-roads.js';

// Real-world anchors use WGS84 coordinates. OSM-derived roads provide planting
// corridors; palms are gameplay landscaping, not a surveyed tree inventory.
const FEATURES={
  sphere:{lon:-115.162069,lat:36.1212,tile:'C16_R15'},
  bellagio:{lon:-115.17670,lat:36.11280,tile:'C15_R14'},
  flamingo:{lon:-115.17155,lat:36.11530,tile:'C15_R14'},
  wynn:{lon:-115.16008,lat:36.12650,tile:'C16_R15'}
};
const BRIDGES=[
  {lon:-115.17280,lat:36.10970,tile:'C15_R13'},
  {lon:-115.17415,lat:36.11315,tile:'C15_R14'},
  {lon:-115.17395,lat:36.11630,tile:'C15_R14'},
  {lon:-115.17170,lat:36.12040,tile:'C15_R15'}
];
const A=6378137,F=1/298.257223563,E2=F*(2-F),EP2=E2/(1-E2),K=.9996;
function utm(lon,lat){
 const p=lat*Math.PI/180,l=lon*Math.PI/180,l0=-117*Math.PI/180,s=Math.sin(p),c=Math.cos(p),t=Math.tan(p),n=A/Math.sqrt(1-E2*s*s),T=t*t,C=EP2*c*c,d=c*(l-l0);
 const m=A*((1-E2/4-3*E2**2/64-5*E2**3/256)*p-(3*E2/8+3*E2**2/32+45*E2**3/1024)*Math.sin(2*p)+(15*E2**2/256+45*E2**3/1024)*Math.sin(4*p)-(35*E2**3/3072)*Math.sin(6*p));
 return [500000+K*n*(d+(1-T+C)*d**3/6+(5-18*T+T*T+72*C-58*EP2)*d**5/120),K*(m+n*t*(d*d/2+(5-T+9*C+4*C*C)*d**4/24+(61-58*T+T*T+600*C-330*EP2)*d**6/720))];
}
function local(game,lon,lat){const [e,n]=utm(lon,lat);return [e-game.origin[0],game.origin[1]-n];}
function tileAt(lon,lat){const [e,n]=utm(lon,lat);return `C${String(Math.floor((e-648949.782)/1000)).padStart(2,'0')}_R${String(Math.floor((n-3983561.814)/1000)).padStart(2,'0')}`;}
function seeded(s){const x=Math.sin(s*127.1+311.7)*43758.5453;return x-Math.floor(x);}
function addSphere(game,root,feature){
 const [x,z]=local(game,feature.lon,feature.lat),y=(game.roads?.sample(x,z)||0);
 const shell=new THREE.SphereGeometry(1,48,32),skin=new THREE.MeshStandardMaterial({emissive:0xffffff,emissiveIntensity:1.7,roughness:.34,metalness:.12});
 const globe=new THREE.Mesh(shell,skin);globe.name='Sphere · rotating eye / demon / Earth display';globe.position.set(x,y+82,z);globe.scale.setScalar(57);root.add(globe);
 const skins=['eye','demon','earth'].map(name=>new THREE.TextureLoader().load(`./generated-assets/sphere-${name}-v${name==='demon'?'2':'1'}.webp`,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;}));
 let current=Math.floor(Math.random()*skins.length),gazeTarget=null,nextGaze=0,skinTimer=null;
 const setSkin=()=>{if(root.userData.disposed)return;if(skins.every(t=>t.image)){let next=current;while(next===current)next=Math.floor(Math.random()*skins.length);current=next;skin.map=skins[current];skin.emissiveMap=skins[current];skin.needsUpdate=true;globe.userData.theme=['EYE','DEMON','EARTH'][current];}skinTimer=setTimeout(setSkin,14000+Math.random()*42000);};
 const applySkin=()=>{if(!skin.map&&skins[current].image){skin.map=skins[current];skin.emissiveMap=skins[current];skin.needsUpdate=true;globe.userData.theme=['EYE','DEMON','EARTH'][current];}};applySkin();skinTimer=setTimeout(setSkin,18000+Math.random()*30000);
 const faceAxis=new THREE.Vector3(1,0,0),desiredRotation=new THREE.Quaternion(),targetPosition=new THREE.Vector3(),roll=new THREE.Quaternion();
 globe.userData.animate=(time)=>{
  applySkin();
  if(time>=nextGaze||!gazeTarget){nextGaze=time+1800+Math.random()*2200;const player=game.player?.position,npcs=game.npcs?.npcs||[];let best=player?.clone?.()||null,bestD=best?globe.position.distanceToSquared(best):Infinity;
   for(let i=0;i<Math.min(npcs.length,500);i++){const npc=npcs[i];if(!npc.position||npc.state==='falling'||npc.state==='dead')continue;const d=globe.position.distanceToSquared(npc.position);if(d<bestD){bestD=d;best=npc.position.clone();}}
   if(best)gazeTarget=best.add(new THREE.Vector3(0,1.5,0));
  }
  if(gazeTarget){targetPosition.copy(gazeTarget).sub(globe.position).normalize();desiredRotation.setFromUnitVectors(faceAxis,targetPosition);roll.setFromAxisAngle(targetPosition,Math.sin(time*.0012)*.025);desiredRotation.premultiply(roll);globe.quaternion.slerp(desiredRotation,Math.min(1,.045));}
 };
 root.userData.timers=(root.userData.timers||[]).concat(skinTimer);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(51,58,24,48,1,false),new THREE.MeshStandardMaterial({color:0x272a2e,roughness:.48,metalness:.58}));base.position.set(x,y+13,z);root.add(base);
 const belt=new THREE.Mesh(new THREE.CylinderGeometry(53,53,2.2,48),new THREE.MeshStandardMaterial({color:0xa58d68,metalness:.72,roughness:.25,emissive:0x39200c,emissiveIntensity:.45}));belt.position.set(x,y+27,z);root.add(belt);
 root.userData.sphereCollision={x,y,z};
 root.userData.disposeTextures=(root.userData.disposeTextures||[]).concat(skins);
}
function addWater(game,root,feature,rx,rz,kind){
 const [x,z]=local(game,feature.lon,feature.lat),ground=game.roads?.sample(x,z),y=(Number.isFinite(ground)?ground:0)+.7;
 const group=new THREE.Group();group.name=kind;group.position.set(x,y,z);root.add(group);
 const stone=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshStandardMaterial({color:0xb7ad9d,roughness:.82,side:THREE.DoubleSide}));stone.rotation.x=-Math.PI/2;stone.scale.set(rx+3,rz+3,1);group.add(stone);
 const water=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshPhysicalMaterial({color:0x4eafbf,roughness:.16,metalness:.18,clearcoat:.9,clearcoatRoughness:.08,transparent:true,opacity:.88,side:THREE.DoubleSide}));water.rotation.x=-Math.PI/2;water.scale.set(rx,rz,1);water.position.y=.22;group.add(water);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(1,.025,6,96),new THREE.MeshStandardMaterial({color:0xd4c7a9,roughness:.4,metalness:.32}));rim.rotation.x=Math.PI/2;rim.scale.set(rx+1.5,rz+1.5,1);rim.position.y=.26;group.add(rim);
 if(kind.includes('Bellagio')){
  const jetGeo=new THREE.ConeGeometry(.36,18,7),jetMat=new THREE.MeshBasicMaterial({color:0xbaf7ff,transparent:true,opacity:.49,depthWrite:false});
  const jets=[];for(let i=0;i<29;i++){const a=i*Math.PI*2/29,r=i===0?0:.28+(i%4)*.13,jet=new THREE.Mesh(jetGeo,jetMat);jet.position.set(Math.cos(a)*rx*r,4,Math.sin(a)*rz*r);jet.scale.y=.12;jet.rotation.z=Math.cos(a)*.18;jet.rotation.x=-Math.sin(a)*.18;group.add(jet);jets.push({jet,phase:i*.41,height:8+(i%7)*2.1});}
  group.userData.animate=(time)=>{for(const {jet,phase,height}of jets){const wave=(Math.sin(time*.00165+phase)+1)*.5;jet.scale.y=.18+wave*.9;jet.position.y=4+wave*height;}};
  const center=new THREE.Mesh(new THREE.CylinderGeometry(4.8,5.5,1.4,20),new THREE.MeshStandardMaterial({color:0x98866e,roughness:.5}));center.position.y=.35;group.add(center);
 }
}
function addGolfTurf(game,root,feature){
 const [ax,az]=local(game,feature.lon,feature.lat),group=new THREE.Group();group.name='Wynn golf course · fairway, green and bunkers';root.add(group);
 const lawn=new THREE.CanvasTexture((()=>{const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#366b37';ctx.fillRect(0,0,256,256);for(let i=0;i<18000;i++){const v=seeded(i+834)*100;ctx.fillStyle=`rgba(${24+v*.16|0},${65+v*.35|0},${24+v*.12|0},${.15+seeded(i+12)*.25})`;ctx.fillRect(seeded(i+8)*256,seeded(i+9)*256,1+seeded(i+10)*2,1+seeded(i+11)*2);}const tctx=ctx;return c;})());lawn.colorSpace=THREE.SRGBColorSpace;lawn.wrapS=lawn.wrapT=THREE.RepeatWrapping;lawn.repeat.set(4,2);
 const grass=new THREE.MeshStandardMaterial({map:lawn,color:0x9cbe83,roughness:1,side:THREE.DoubleSide}),green=new THREE.MeshStandardMaterial({color:0x39834b,roughness:1,side:THREE.DoubleSide}),sand=new THREE.MeshStandardMaterial({color:0xbda978,roughness:1,side:THREE.DoubleSide});
 const patches=[{x:300,z:-120,w:150,h:48,m:grass},{x:440,z:-78,w:58,h:45,m:green},{x:200,z:-188,w:94,h:42,m:grass},{x:510,z:-196,w:25,h:13,m:sand},{x:385,z:-30,w:21,h:12,m:sand}];
 for(const p of patches){const x=ax+p.x,z=az+p.z,y=game.roads?.sample(x,z);if(!Number.isFinite(y))continue;const shape=new THREE.Shape();shape.moveTo(-p.w*.5,-p.h*.25);shape.quadraticCurveTo(-p.w*.42,-p.h*.65,0,-p.h*.5);shape.quadraticCurveTo(p.w*.53,-p.h*.35,p.w*.5,0);shape.quadraticCurveTo(p.w*.4,p.h*.55,-p.w*.08,p.h*.5);shape.quadraticCurveTo(-p.w*.55,p.h*.42,-p.w*.5,-p.h*.25);const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape,16),p.m);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y+.5,z);group.add(mesh);}
 root.userData.disposeTextures=(root.userData.disposeTextures||[]).concat(lawn);root.userData.golfMaterials=[grass,green,sand];
}
function addBridge(game,root,b){
 const [x,z]=local(game,b.lon,b.lat),ground=game.roads?.sample(x,z);if(!Number.isFinite(ground))return;
 const g=new THREE.Group();g.name='Las Vegas Strip pedestrian bridge';g.position.set(x,ground+7,z);root.add(g);
 const steel=new THREE.MeshStandardMaterial({color:0x777b7e,metalness:.62,roughness:.38}),deck=new THREE.MeshStandardMaterial({color:0xc6bba8,roughness:.76}),glass=new THREE.MeshStandardMaterial({color:0x8fc1cc,metalness:.18,roughness:.15,transparent:true,opacity:.34});
 const slab=new THREE.Mesh(new THREE.BoxGeometry(38,.72,5.2),deck);slab.position.y=0;g.add(slab);
 for(const side of [-1,1]){
  const rail=new THREE.Mesh(new THREE.BoxGeometry(38,1.4,.16),glass);rail.position.set(0,1,side*2.52);g.add(rail);
  for(const xx of [-15,15]){const leg=new THREE.Mesh(new THREE.BoxGeometry(1.2,7.3,1.2),steel);leg.position.set(xx,-3.65,side*2.45);g.add(leg);}
  const arch=new THREE.Mesh(new THREE.TorusGeometry(17,.2,6,48,Math.PI),steel);arch.scale.y=.28;arch.rotation.y=side*.08;arch.position.set(0,.15,side*2.35);g.add(arch);
 }
 for(const xx of [-11,-6,0,6,11]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.15,.12,.15),new THREE.MeshBasicMaterial({color:0xffe8b0}));lamp.position.set(xx,.46,0);g.add(lamp);}
 for(const side of [-1,1]){const ramp=new THREE.Mesh(new THREE.BoxGeometry(17,.58,4.2),deck);ramp.position.set(side*27,-3.1,0);ramp.rotation.z=-side*.37;g.add(ramp);for(const railSide of [-1,1]){const rail=new THREE.Mesh(new THREE.BoxGeometry(17,.1,.12),steel);rail.position.set(side*27,-2.45,railSide*2.02);rail.rotation.z=-side*.37;g.add(rail);}}
}
function treeGeometry(){
 const trunk=new THREE.CylinderGeometry(.18,.43,7.5,7,3);trunk.translate(0,3.75,0);
 const vertices=[],indices=[],steps=8;
 for(let i=0;i<=steps;i++){const t=i/steps,z=t*4.8,y=Math.sin(t*Math.PI*.65)*.75-t*t*1.25,w=Math.sin(t*Math.PI)*.52+.025;vertices.push(-w,y,z,w,y,z);if(i<steps){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));leaf.setIndex(indices);leaf.computeVertexNormals();return {trunk,leaf};
}
export function addRoadsidePalms(game,group,root,tileId,mobile){
 const roads=group.userData._roadRecords;if(!roads?.length)return 0;
 const candidates=[],obs=[];group.updateWorldMatrix(true,true);
 for(const b of group.children){const c=b.userData.collider;if(!c?.min||!c?.max)continue;obs.push(new THREE.Box3(new THREE.Vector3(...c.min),new THREE.Vector3(...c.max)).applyMatrix4(b.matrixWorld));}
 const exclusions=Object.values(FEATURES).map(f=>local(game,f.lon,f.lat));
 const limit=mobile?35:72;
 for(const road of roads){
  if(!['MAJOR STREET','COLLECTOR','LOCAL','COUNTY HIGHWAY'].includes(road.kind))continue;
  const pts=road.points.map(p=>[p[0]-game.origin[0],game.origin[1]-p[1]]),spacing=road.kind==='MAJOR STREET'?54:86,w=roadWidth(road.kind)/2+7;let distance=0;
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<1)continue;
   for(let d=spacing-distance%spacing;d<len;d+=spacing){
    const t=d/len,cx=a[0]+(b[0]-a[0])*t,cz=a[1]+(b[1]-a[1])*t,ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
    for(const side of [-1,1]){
     const px=cx-Math.sin(ang)*w*side,pz=cz+Math.cos(ang)*w*side;
     if(exclusions.some(([ex,ez])=>Math.hypot(px-ex,pz-ez)<115))continue;
     const py=game.roads.sample(px,pz);if(!Number.isFinite(py))continue;
     const p=new THREE.Vector3(px,py,pz);if(obs.some(box=>box.distanceToPoint(p)<3))continue;
     if(candidates.some(q=>Math.hypot(q.x-px,q.z-pz)<25))continue;
     candidates.push({x:px,y:py,z:pz,seed:road.id+d*13+side*7});if(candidates.length>=limit)break;
    }
    if(candidates.length>=limit)break;
   }
   distance+=len;if(candidates.length>=limit)break;
  }
  if(candidates.length>=limit)break;
 }
 if(!candidates.length)return 0;const {trunk,leaf}=treeGeometry(),trunkMat=new THREE.MeshStandardMaterial({color:0x806149,roughness:.9}),leafMat=new THREE.MeshStandardMaterial({color:0x287b4d,roughness:.88,side:THREE.DoubleSide});
 const trunks=new THREE.InstancedMesh(trunk,trunkMat,candidates.length),leaves=new THREE.InstancedMesh(leaf,leafMat,candidates.length*6),dummy=new THREE.Object3D();let li=0;
 candidates.forEach((p,i)=>{const h=6.2+seeded(p.seed)*2,scale=.82+seeded(p.seed+1)*.42;dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=seeded(p.seed+2)*Math.PI*2;dummy.scale.setScalar(scale);dummy.scale.y=scale*h/7.5;dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);for(let j=0;j<6;j++){dummy.position.set(p.x,p.y+h*.78,p.z);dummy.rotation.set((seeded(p.seed+j+5)-.5)*.28,j*Math.PI/3+seeded(p.seed+j+9)*.2,seeded(p.seed+j+12)*.2);dummy.scale.set(scale,scale,scale*(.86+seeded(p.seed+j+18)*.3));dummy.updateMatrix();leaves.setMatrixAt(li++,dummy.matrix);}});
 trunks.instanceMatrix.needsUpdate=true;leaves.instanceMatrix.needsUpdate=true;root.add(trunks,leaves);root.userData.treeGeometry=[trunk,leaf];root.userData.treeMaterials=[trunkMat,leafMat];root.userData.treeCount=candidates.length;return candidates.length;
}
export function createCityEnvironment(game,{mobile=matchMedia('(pointer:coarse), (max-width:800px)').matches}={}){
 const active=new Map(),pending=new Set(),processed=new WeakSet(),listeners=[],animated=[];let disposed=false;
 async function sync(){if(disposed)return;for(const [id,root]of active)if(game.loaded.get(id)!==root.userData.source){game.scene.remove(root);root.traverse(o=>{o.geometry?.dispose?.();if(o.material&&!Array.isArray(o.material))o.material.dispose?.();});root.userData.disposeTextures?.forEach(t=>t.dispose());root.userData.treeMaterials?.forEach(m=>m.dispose());root.userData.treeGeometry?.forEach(g=>g.dispose());active.delete(id);}
  for(const [id,group]of game.loaded){if(active.has(id)||pending.has(id)||processed.has(group))continue;pending.add(id);try{const response=await fetch(`./data/roads/${id}.json.gz`,{signal:AbortSignal.timeout(12000)});if(!response.ok)continue;let data=new Uint8Array(await response.arrayBuffer());if(data[0]===31&&data[1]===139)data=new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());const records=JSON.parse(new TextDecoder().decode(data));group.userData._roadRecords=records;const root=new THREE.Group();root.name='City details '+id;root.userData.source=group;
   if(id===tileAt(FEATURES.sphere.lon,FEATURES.sphere.lat))addSphere(game,root,FEATURES.sphere);
   if(id===tileAt(FEATURES.bellagio.lon,FEATURES.bellagio.lat))addWater(game,root,FEATURES.bellagio,192,60,'Bellagio Fountains');
   if(id===tileAt(FEATURES.flamingo.lon,FEATURES.flamingo.lat))addWater(game,root,FEATURES.flamingo,42,24,'Flamingo Wildlife Habitat ponds');
   if(id===tileAt(FEATURES.wynn.lon,FEATURES.wynn.lat)){addWater(game,root,FEATURES.wynn,67,31,'Wynn Lake of Dreams');addGolfTurf(game,root,FEATURES.wynn);}
   for(const bridge of BRIDGES)if(tileAt(bridge.lon,bridge.lat)===id)addBridge(game,root,bridge);
   const trees=addRoadsidePalms(game,group,root,id,mobile);processed.add(group);if(root.children.length){root.userData.treeCount=trees;root.traverse(o=>{if(o.userData.animate)animated.push(o);});game.scene.add(root);active.set(id,root);window.dispatchEvent(new CustomEvent('jc-city-details-loaded',{detail:{tile:id,objects:root.children.length,trees}}));}
  }catch(e){console.warn('City detail stream unavailable for '+id,e.message);}finally{pending.delete(id);}await new Promise(resolve=>setTimeout(resolve,0));}}
 const listener=()=>sync();window.addEventListener('jc-tiles-loaded',listener);window.addEventListener('jc-roads-loaded',listener);listeners.push(['jc-tiles-loaded',listener],['jc-roads-loaded',listener]);const timer=setInterval(sync,2000);sync();
 return {sync,update(t){if(disposed)return;for(let i=animated.length-1;i>=0;i--){const object=animated[i];if(!object.parent||!object.userData.animate){animated.splice(i,1);continue;}object.userData.animate(t);}},stats:()=>({tiles:active.size,features:[...active.values()].reduce((n,r)=>n+r.children.length,0),trees:[...active.values()].reduce((n,r)=>n+(r.userData.treeCount||0),0)}),blockedAt(x,y,z,radius=1.2){for(const root of active.values()){const s=root.userData.sphereCollision;if(!s)continue;const dx=(x-s.x)/(57+radius),dy=(y+1.8-(s.y+82))/(57+radius),dz=(z-s.z)/(57+radius);if(dx*dx+dy*dy+dz*dz<1)return true;if(Math.hypot(x-s.x,z-s.z)<59+radius&&y<s.y+26&&y>s.y-2)return true;}return false;},dispose(){disposed=true;clearInterval(timer);for(const [e,f]of listeners)window.removeEventListener(e,f);for(const root of active.values()){root.userData.disposed=true;root.userData.timers?.forEach(clearTimeout);game.scene.remove(root);root.traverse(o=>{o.geometry?.dispose?.();if(o.material&&!Array.isArray(o.material))o.material.dispose?.();});root.userData.disposeTextures?.forEach(t=>t.dispose());root.userData.treeMaterials?.forEach(m=>m.dispose());root.userData.treeGeometry?.forEach(g=>g.dispose());}active.clear();animated.length=0;}};
}
export const cityFeatureAnchors=FEATURES;
export {utm as projectToUTM11,tileAt as cityTileAt};
