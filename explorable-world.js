import * as THREE from './three.module.js';
import {ITEM_TYPES,WORLD_SAVE_KEY,buildingVenue,createWorldCatalog,hashId} from './world-catalog.js';
import {projectToUTM11} from './city-environment.js';

const ORIGIN=[666449.782,4001061.814];
const REAL_PLACES=[
 {id:'church:little-west',name:'Little Church of the West',kind:'church',lon:-115.17194,lat:36.08611,source:'publicly mapped landmark; in-game interior is an original playable interpretation'},
 {id:'church:joan-arc',name:'Historic St. Joan of Arc Church',kind:'church',lon:-115.14554,lat:36.16775,source:'public street location; in-game interior is an original playable interpretation'},
 {id:'military:nellis',name:'Nellis Air Force Base',kind:'base',lon:-114.9933101,lat:36.2436209,source:'U.S. Census Bureau TIGERweb 2025 installation point'},
 {id:'military:groom-lake',name:'Groom Lake · Area 51 game zone',kind:'fictional-base',lon:-115.80833,lat:37.23333,source:'publicly mapped Groom Lake area; game zone is not an installation survey'}
];
const styleColors=[0x59d8ff,0xffbe5a,0xc887ff,0xff697a,0x83e5a0,0xe9efff];
const v3=p=>new THREE.Vector3(p.x,p.y,p.z);

function makeRoom(scene,venue){
 const root=new THREE.Group();root.name='JC enterable original interior · '+venue.name;
 const h=hashId(venue.id),casino=venue.kind==='casino',base=venue.kind==='base'||venue.kind==='fictional-base';
 const width=casino?46:base?54:32,depth=casino?34:base?42:28,height=casino?10:base?8:9;
 const floorY=venue.interiorY??0,metal=new THREE.MeshStandardMaterial({color:base?0x26323a:casino?0x2c2020:0x70614a,roughness:casino?.48:.87,metalness:base?.55:.06}),wall=new THREE.MeshStandardMaterial({color:casino?styleColors[h%styleColors.length]:base?0x4d5a60:0xd1c3a7,roughness:casino?.68:.94}),trim=new THREE.MeshStandardMaterial({color:styleColors[(h>>>4)%styleColors.length],emissive:styleColors[(h>>>4)%styleColors.length],emissiveIntensity:casino?.26:.04,roughness:.36,metalness:.3}),glass=new THREE.MeshStandardMaterial({color:0x91d7eb,emissive:0x276277,emissiveIntensity:.4,roughness:.22,metalness:.25});
 const floor=new THREE.Mesh(new THREE.BoxGeometry(width,.5,depth),metal);floor.position.set(0,floorY-.25,0);root.add(floor);
 const ceiling=new THREE.Mesh(new THREE.BoxGeometry(width,.45,depth),wall);ceiling.position.set(0,floorY+height,0);root.add(ceiling);
 for(const [x,z,sx,sz] of [[-width/2,0,.6,depth],[width/2,0,.6,depth],[0,-depth/2,width,.6],[0,depth/2,width,.6]]){
  const wallMesh=new THREE.Mesh(new THREE.BoxGeometry(sx,height,sz),wall);wallMesh.position.set(x,floorY+height/2,z);root.add(wallMesh);
 }
 const doorway=new THREE.Mesh(new THREE.BoxGeometry(5,7,.7),new THREE.MeshBasicMaterial({color:0x101419}));doorway.position.set(0,floorY+3.5,depth/2-.2);root.add(doorway);
 const sign=labelMesh(venue.name,casino?styleColors[(h>>>4)%styleColors.length]:base?0xb9d8e2:0xffedca);sign.position.set(0,floorY+height-1, -depth/2+.5);root.add(sign);
 // A different repeatable column, window rhythm and feature piece gives every
 // authored room its own identity while using a bounded count of shared meshes.
 for(let i=0;i<8;i++){
  const x=-width*.42+i*width*.12;
  if(casino&&i%2===0){const panel=new THREE.Mesh(new THREE.BoxGeometry(2.2,height*.44,.28),glass);panel.position.set(x,floorY+height*.67,-depth/2+.45);root.add(panel);}
  const pillar=new THREE.Mesh(new THREE.BoxGeometry(.7,height*.78,.8),i%3===h%3?trim:wall);pillar.position.set(x,floorY+height*.4,-depth/2+.9);root.add(pillar);
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(2,.12,1.4),new THREE.MeshBasicMaterial({color:casino?styleColors[(h+i)%styleColors.length]:base?0xcfefff:0xffe1a0}));lamp.position.set(x,floorY+height-.7,0);root.add(lamp);
 }
 if(venue.kind==='church'){
  const altar=new THREE.Mesh(new THREE.BoxGeometry(8,1.2,3),trim);altar.position.set(0,floorY+1,-depth*.34);root.add(altar);
  for(let row=0;row<5;row++)for(let side of [-1,1]){const pew=new THREE.Mesh(new THREE.BoxGeometry(8,.65,1),metal);pew.position.set(side*7,floorY+.6,-depth*.13+row*3.1);root.add(pew);}
  const window=new THREE.Mesh(new THREE.PlaneGeometry(8,5),new THREE.MeshBasicMaterial({color:0x6db6e9,emissive:0x21578f,emissiveIntensity:.75,side:THREE.DoubleSide}));window.position.set(0,floorY+height*.68,-depth/2+.4);root.add(window);
 }else if(base){
  for(let i=-3;i<=3;i++){const console=new THREE.Mesh(new THREE.BoxGeometry(3,.9,2),metal);console.position.set(i*5,floorY+.7,-depth*.2);root.add(console);const screen=new THREE.Mesh(new THREE.BoxGeometry(2.3,1.5,.1),new THREE.MeshBasicMaterial({color:i%2?0x67cdf1:0xa7ea9f,emissive:i%2?0x1f7187:0x367a3b}));screen.position.set(i*5,floorY+2,-depth*.2-1);root.add(screen);}
 }
 const light=new THREE.PointLight(casino?styleColors[(h>>>4)%styleColors.length]:base?0x8fcfff:0xffedce,casino?100:55,85,2);light.position.set(0,floorY+height-1,0);root.add(light);
 scene.add(root);return {root,width,depth,height,floorY};
}
function labelMesh(text,color){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#07111cec';c.fillRect(0,0,768,128);c.strokeStyle='#f1d17e';c.lineWidth=5;c.strokeRect(3,3,762,122);c.fillStyle='#'+new THREE.Color(color).getHexString();c.font='bold 38px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(String(text).slice(0,32).toUpperCase(),384,64);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(15,2.5),new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide,depthWrite:false}));m.userData.texture=t;return m;
}

export function createExplorableWorld(game,{scene,player,groundAt,clearSpot,onStatus=()=>{},pickupsRef=()=>null,npcRef=()=>null,getFlight=()=>false,setFlight=()=>{},velocity=null}={}){
 const catalog=createWorldCatalog(),root=new THREE.Group();root.name='Vegas undercity and venue access';scene.add(root);
 const portals=[],itemsMeshes=[],venueRooms=new Map(),venueObjects=new Map(),hidden=[],temporaryNpcs=[];
 let active=null,outdoor=null,geoReady=false,channels=[],lastLookup=0,objectiveMarker=null;
 const entryGeo=new THREE.TorusGeometry(1.6,.13,7,26),entryMat=new THREE.MeshStandardMaterial({color:0xffd46b,emissive:0x875911,emissiveIntensity:.8,roughness:.3}),itemGeo=new THREE.OctahedronGeometry(.6,1),itemMat=ITEM_TYPES.map(k=>new THREE.MeshStandardMaterial({color:k.color,emissive:k.color,emissiveIntensity:.5,roughness:.24}));
 function local(lon,lat){const [e,n]=projectToUTM11(lon,lat);return {x:e-ORIGIN[0],z:ORIGIN[1]-n};}
 function addStaticPlaces(){
  for(const row of REAL_PLACES){
   const {x,z}=local(row.lon,row.lat),surface=groundAt(x,z);const y=Number.isFinite(surface)?surface:0;
   const size=row.kind==='base'?130:row.kind==='fictional-base'?180:14,venue={...row,entry:{x,y,z},spawn:{x,y,z:z-5},size};
   catalog.registerPlace(venue);addPortal(venue);
  }
 }
 function addPortal(venue){
  const mesh=new THREE.Mesh(entryGeo,entryMat);mesh.name='ENTER · '+venue.name;mesh.rotation.x=Math.PI/2;mesh.position.set(venue.entry.x,venue.entry.y+1.2,venue.entry.z);mesh.userData.worldVenue=venue;mesh.visible=false;root.add(mesh);portals.push({venue,mesh});
 }
 addStaticPlaces();
 function syncBuildings(){
  for(const group of game.loaded.values()){
   group.updateWorldMatrix(true,true);
   for(const ob of group.children){
    const identity=ob.userData.identity;if(!identity||venueObjects.has(ob)||buildingVenue(identity)!=='casino')continue;
    const box=ob.userData.collider;if(!box?.min||!box?.max)continue;
    ob.updateWorldMatrix(true,true);const bounds=new THREE.Box3(new THREE.Vector3(...box.min),new THREE.Vector3(...box.max)).applyMatrix4(ob.matrixWorld),center=bounds.getCenter(new THREE.Vector3());
    const sx=Math.max(8,bounds.max.x-bounds.min.x),sz=Math.max(8,bounds.max.z-bounds.min.z);
    let x=center.x,z=center.z;
    // Pick the closest facade to a street edge without moving the access point
    // onto the roof footprint.
    const sides=[{x:center.x,z:bounds.min.z-sz*.15},{x:bounds.max.x+sx*.15,z:center.z},{x:center.x,z:bounds.max.z+sz*.15},{x:bounds.min.x-sx*.15,z:center.z}];
    const road=sides.map(p=>({p,d:game.roads?.nearestRoad?.(p.x,p.z,80)?.distance??Infinity})).sort((a,b)=>a.d-b.d)[0];if(road&&Number.isFinite(road.d)){x=road.p.x;z=road.p.z;}
    const y=groundAt(x,z),id='casino:'+String(identity.name).toLowerCase().replace(/[^a-z0-9]+/g,'-')+':'+ob.userData.buildingId;
    const venue={id,name:identity.name,kind:'casino',entry:{x,y,z},spawn:{x,y,z},buildingId:ob.userData.buildingId,size:Math.max(sx,sz)};
    if(!Number.isFinite(y))continue;venueObjects.set(ob,venue);catalog.registerPlace(venue);addPortal(venue);
   }
  }
 }
 function createVenueRoom(venue){
  if(venueRooms.has(venue.id))return venueRooms.get(venue.id);
  const surface=groundAt(venue.entry.x,venue.entry.z),base=Number.isFinite(surface)?surface:venue.entry.y;
  const config=makeRoom(scene,venue);config.root.position.set(venue.entry.x,base,venue.entry.z);
  const rec={...config,venue,base};venueRooms.set(venue.id,rec);return rec;
 }
 function box3(x0,y0,z0,x1,y1,z1,out){
  const faces=[[0,2,3,1],[4,5,7,6],[0,1,5,4],[2,6,7,3]];
  const p=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
  for(const f of faces){const a=p[f[0]],b=p[f[1]],c=p[f[2]],d=p[f[3]];out.push(...a,...b,...d,...b,...c,...d);}
 }
 async function loadChannels(){
  try{
   const [a,b]=await Promise.all(['./data/vegas-flood-conveyances.geojson','./data/nellis-flood-conveyances.geojson'].map(path=>fetch(path,{signal:AbortSignal.timeout(18000)}).then(r=>r.ok?r.json():null).catch(()=>null)));
   channels=[a,b].filter(Boolean).flatMap(data=>data.features||[]);const positions=[];
   for(const feature of channels){
    const coords=feature.geometry?.type==='LineString'?[feature.geometry.coordinates]:feature.geometry?.coordinates||[];
    for(const path of coords)for(let i=1;i<path.length;i++){
     const [ax,an]=path[i-1],[bx,bn]=path[i],aX=ax-ORIGIN[0],aZ=ORIGIN[1]-an,bX=bx-ORIGIN[0],bZ=ORIGIN[1]-bn;
     const dx=bX-aX,dz=bZ-aZ,length=Math.hypot(dx,dz);if(length<.25)continue;
     const nx=dz/length,nz=-dx/length,p=feature.properties||{},width=Math.max(3,Math.min(16,(Number(p.W_FT)||20)*.3048)),height=Math.max(2.1,Math.min(5,(Number(p.D_H_FT)||12)*.3048));
     const ground=(x,z)=>{const y=game.roads?.sample(x,z);return Number.isFinite(y)?y:0;};
     const y0=ground(aX,aZ)-10,y1=ground(bX,bZ)-10,w=width/2;
     const p0={x:aX+nx*w,y:y0,z:aZ+nz*w},p1={x:bX+nx*w,y:y1,z:bZ+nz*w},p2={x:bX-nx*w,y:y1,z:bZ-nz*w},p3={x:aX-nx*w,y:y0,z:aZ-nz*w};
     const ceiling=height;
     positions.push(p0.x,p0.y,p0.z,p1.x,p1.y,p1.z,p0.x,p0.y+ceiling,p0.z,p1.x,p1.y+ceiling,p1.z);
     positions.push(p1.x,p1.y,p1.z,p2.x,p2.y,p2.z,p1.x,p1.y+ceiling,p1.z,p2.x,p2.y+ceiling,p2.z);
     positions.push(p2.x,p2.y,p2.z,p3.x,p3.y,p3.z,p2.x,p2.y+ceiling,p2.z,p3.x,p3.y+ceiling,p3.z);
     positions.push(p3.x,p3.y,p3.z,p0.x,p0.y,p0.z,p3.x,p3.y+ceiling,p3.z,p0.x,p0.y+ceiling,p0.z);
     positions.push(p0.x,p0.y+ceiling,p0.z,p1.x,p1.y+ceiling,p1.z,p3.x,p3.y+ceiling,p3.z,p1.x,p1.y+ceiling,p1.z,p2.x,p2.y+ceiling,p2.z,p3.x,p3.y+ceiling,p3.z);
     positions.push(p3.x,p3.y,p3.z,p2.x,p2.y,p2.z,p0.x,p0.y,p0.z,p2.x,p2.y,p2.z,p1.x,p1.y,p1.z,p0.x,p0.y,p0.z);
    }
   }
   if(positions.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();const m=new THREE.MeshStandardMaterial({color:0x5d6265,roughness:.98,side:THREE.DoubleSide});const mesh=new THREE.Mesh(g,m);mesh.name='Mapped Clark County flood conveyances · playable interpretation';mesh.userData.source='Clark County Regional Flood Control District';mesh.visible=false;root.add(mesh);geoReady=true;createDrainEntrances();}
  }catch(e){console.warn('Mapped drainage routes unavailable',e);}
 }
 function createDrainEntrances(){
  // GIS endpoints are aligned to the public channel centerlines; the game-only
  // portals below are access points invented for play, not surveyed manholes.
  const ends=new Map();
  for(const feature of channels){const paths=feature.geometry?.type==='LineString'?[feature.geometry.coordinates]:feature.geometry?.coordinates||[];
   for(const path of paths){for(const pair of [path[0],path.at(-1)])if(pair){const x=pair[0]-ORIGIN[0],z=ORIGIN[1]-pair[1],key=Math.round(x/110)+':'+Math.round(z/110);if(ends.has(key))continue;ends.set(key,true);const y=game.roads?.sample(x,z);if(!Number.isFinite(y))continue;
    const venue={id:'drain:'+key,name:'Mapped drainage route · fictional game access',kind:'storm-drain-game-access',entry:{x,y,z},spawn:{x,y,z},size:3,source:'public line geometry; entrance and walkable passage are fictional'};
    catalog.registerPlace(venue);const mesh=new THREE.Mesh(entryGeo,entryMat);mesh.name=venue.name;mesh.rotation.x=Math.PI/2;mesh.position.set(x,y+.65,z);mesh.scale.setScalar(.72);mesh.userData.worldVenue=venue;mesh.visible=false;root.add(mesh);portals.push({venue,mesh});
   }}
  }
 }
 function addItemMesh(record){
  const kindIndex=ITEM_TYPES.findIndex(k=>k.id===record.type),place=catalog.places.get(record.placeId);if(kindIndex<0||!place)return;
  const inside=venueRooms.get(record.placeId);const parent=inside?.root||root;
  let pos;if(inside){pos=new THREE.Vector3(0,inside.floorY+.8,-inside.depth*.2);}
  else pos=new THREE.Vector3(place.entry.x,place.entry.y+1.05,place.entry.z);
  const mesh=new THREE.Mesh(itemGeo,itemMat[kindIndex]);mesh.position.copy(pos);mesh.name=record.name+' · '+place.name;mesh.userData.worldItem=record.id;parent.add(mesh);itemsMeshes.push({mesh,record,place});
 }
 function syncItems(){
  for(const place of catalog.places.values())if(place.kind==='casino'||place.kind==='church'||place.kind==='base'||place.kind==='fictional-base'){
    if(!catalog.available(place.id).length){const kind=ITEM_TYPES[hashId(place.id)%ITEM_TYPES.length];catalog.ensureItem(kind.id,place.id,{source:'world inventory'});}
  }
  for(const row of catalog.available())if(!itemsMeshes.some(r=>r.record.id===row.id))addItemMesh(row);
 }
 function currentVenue(){let best=null,d=Infinity;for(const portal of portals){const p=portal.venue.entry,dist=Math.hypot(player.position.x-p.x,player.position.z-p.z);if(dist<d){best=portal.venue;d=dist;}}return best&&d<13?{venue:best,distance:d}:null;}
 function outdoorsVisible(value){
  if(value){while(hidden.length){const [object,visible]=hidden.pop();object.visible=visible;}return;}
  for(const group of game.loaded.values())if(group.visible){hidden.push([group,true]);group.visible=false;}
  const terrain=scene.getObjectByName('Connected 35 km terrain');if(terrain?.visible){hidden.push([terrain,true]);terrain.visible=false;}
  if(game.environment?.setVisible){hidden.push([game.environment,true]);game.environment.setVisible(false);}
  for(const npc of npcRef()?.npcs||[])if(npc.sprite?.visible){hidden.push([npc.sprite,true]);npc.sprite.visible=false;}
  npcRef()?.setVisible(false);game.roads?.setVisible?.(false);
 }
 function enter(venue){
  if(active||!venue)return false;
  outdoor={position:player.position.clone(),flying:getFlight().flying,h:getFlight().height};const rec=createVenueRoom(venue);
  outdoorsVisible(false);active={kind:'venue',venue,rec,entry:outdoor};player.position.set(venue.entry.x,rec.base+1.6,venue.entry.z);setFlight(false,0);velocity?.set(0,0,0);
  rec.root.visible=true;for(const item of itemsMeshes)if(item.record.placeId===venue.id){if(item.mesh.parent!==rec.root){item.mesh.parent?.remove(item.mesh);item.mesh.position.set(0,rec.floorY+.8,-rec.depth*.2);rec.root.add(item.mesh);}item.mesh.visible=true;}
  syncItems();onStatus('ENTERED · '+venue.name.toUpperCase()+' · E TO EXIT');return true;
 }
 function enterDrain(venue){
  if(active||!geoReady||!venue)return false;
  const nearest=channels.flatMap(feature=>{const paths=feature.geometry?.type==='LineString'?[feature.geometry.coordinates]:feature.geometry?.coordinates||[];return paths.flatMap(path=>path.map(p=>({x:p[0]-ORIGIN[0],z:ORIGIN[1]-p[1]})));}).sort((a,b)=>Math.hypot(a.x-venue.entry.x,a.z-venue.entry.z)-Math.hypot(b.x-venue.entry.x,b.z-venue.entry.z))[0];
  if(!nearest)return false;
  outdoor={position:player.position.clone(),flying:getFlight().flying,h:getFlight().height};outdoorsVisible(false);active={kind:'drain',venue,entry:outdoor};player.position.set(nearest.x,-10,nearest.z);setFlight(false,0);velocity?.set(0,0,0);
  const route=root.children.find(o=>o.name.startsWith('Mapped Clark'));if(route)route.visible=true;
  onStatus('ENTERED FLOOD-CONTROL ROUTE · GAME ACCESS ONLY · E TO EXIT');return true;
 }
 function linkedZone(venue){
  if(venue.kind!=='base'&&venue.kind!=='fictional-base')return false;
  if(venue.id==='military:groom-lake'){
   if(active?.venue.id==='military:nellis'){
    active.kind='fictional-zone';active.venue=venue;active.rec?.root&&(active.rec.root.visible=false);
   }else{outdoor={position:player.position.clone(),flying:getFlight().flying,h:getFlight().height};outdoorsVisible(false);active={kind:'fictional-zone',venue,entry:outdoor};}
   const rec=createVenueRoom(venue);active.rec=rec;rec.root.visible=true;player.position.set(venue.entry.x,rec.base+1.6,venue.entry.z);setFlight(false,0);velocity?.set(0,0,0);onStatus('GROOM LAKE · AREA 51 GAME ZONE · NELLIS ROUTE IS FICTIONAL');return true;
  }
  if(venue.id==='military:nellis'){
   if(active?.venue.id==='military:groom-lake'){active.rec?.root&&(active.rec.root.visible=false);active.venue=venue;active.kind='venue';active.rec=createVenueRoom(venue);active.rec.root.visible=true;player.position.set(venue.entry.x,active.rec.base+1.6,venue.entry.z);return true;}
   if(!enter(venue))return false;
   onStatus('NELLIS AFB · E TO TRAVEL THROUGH THE FICTIONAL UNDERGROUND MISSION ROUTE TO GROOM LAKE');return true;
  }
  return false;
 }
 function exit(){
  if(!active)return false;const rec=active.rec;if(rec){scene.remove(rec.root);rec.root.traverse(o=>{o.geometry?.dispose?.();if(o.material&&!Array.isArray(o.material))o.material.dispose?.();if(o.userData.texture)o.userData.texture.dispose();});venueRooms.delete(active.venue.id);}
  const route=root.children.find(o=>o.name.startsWith('Mapped Clark'));if(route)route.visible=false;
  if(active.kind==='fictional-zone'&&active.entry)return exitToSurface();
  player.position.copy(active.entry.position);setFlight(active.entry.flying,active.entry.h);active=null;outdoorsVisible(true);npcRef()?.setVisible(true);game.roads?.setVisible?.(true);syncItems();return true;
 }
 function exitToSurface(){
  const entry=active.entry;for(const rec of venueRooms.values()){scene.remove(rec.root);rec.root.traverse(o=>{o.geometry?.dispose?.();if(o.material&&!Array.isArray(o.material))o.material.dispose?.();if(o.userData.texture)o.userData.texture.dispose();});}venueRooms.clear();
  player.position.copy(entry.position);setFlight(entry.flying,entry.h);active=null;outdoorsVisible(true);npcRef()?.setVisible(true);game.roads?.setVisible?.(true);return true;
 }
 function blockedAt(x,z,r=1){
  if(!active||active.kind==='drain')return false;
  const a=active.venue.entry,room=active.rec,w=room.width/2,d=room.depth/2;
  return Math.abs(x-a.x)>w/2-r||Math.abs(z-a.z)>d/2-r;
 }
 function floorAt(x,z){return active&&active.kind!=='drain'?active.rec.base:active?.kind==='drain'?-10:null;}
 function update(now){
  if(now-lastLookup>850){lastLookup=now;syncBuildings();syncItems();}
  const near=currentVenue();for(const portal of portals)portal.mesh.visible=!active&&Math.hypot(player.position.x-portal.venue.entry.x,player.position.z-portal.venue.entry.z)<170;
  for(const row of itemsMeshes){const room=venueRooms.get(row.record.placeId);row.mesh.visible=!row.record.collected&&(!active||room?.root===active.rec?.root||row.place.kind==='storm-drain-game-access'&&active.kind==='drain');row.mesh.rotation.y=now*.001;row.mesh.position.y+=(Math.sin(now*.003+hashId(row.record.id))*.001);}
  for(const row of itemsMeshes){if(row.record.collected||!row.mesh.visible)continue;const p=new THREE.Vector3();row.mesh.getWorldPosition(p);if(player.position.distanceTo(p)<2){const collected=catalog.collect(row.record.id);if(collected){row.record.collected=true;pickupsRef()?.grantItem?.(collected.type);onStatus('COLLECTED '+collected.name.toUpperCase()+' · PRESS J TO USE');}}}
  return {nearby:near?.venue||null,canEnter:!!near&&near.distance<7,objective:catalog.objective,canTransit:active?.venue.id==='military:nellis'};
 }
 function requestItem(action,npc){const result=catalog.promiseItem(action,npc);if(!result)return null;syncItems();return result;}
 function personNearby(){if(!active||!active.rec)return null;const venue=active.venue;return {id:'guide:'+venue.id,contactId:'guide:'+venue.id,name:venue.kind==='church'?'Local church caretaker':venue.kind==='casino'?'Casino floor host':venue.id==='military:nellis'?'Nellis operations guide':venue.name+' guide',faction:venue.kind==='church'?'civilian':'authority',gender:'male',position:player.position.clone(),avatar:null,kind:'world-guide',placeId:venue.id};}
 function context(){return catalog.knowledge(player.position,active?.venue.id);}
 function routeToBase(){
  const base=catalog.places.get('military:nellis'),groom=catalog.places.get('military:groom-lake');
  return base&&groom?{start:base.entry,end:groom.entry,kind:'fictional underground mission route'}:null;
 }
 loadChannels();setTimeout(syncBuildings,1500);
 return {catalog,root,update,currentVenue,enter,enterDrain,linkedZone,exit,blockedAt,floorAt,context,requestItem,personNearby,get active(){return active;},get objective(){return catalog.objective;},routeToBase,dispose(){for(const [o,v]of hidden)o.visible=v;scene.remove(root);entryGeo.dispose();entryMat.dispose();itemGeo.dispose();itemMat.forEach(m=>m.dispose());for(const room of venueRooms.values()){scene.remove(room.root);} }};
}
