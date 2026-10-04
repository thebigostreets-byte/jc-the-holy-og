import * as THREE from './three.module.js';
import {craterDepth} from './crater-system.js';
import {loadGeneratedMaterials} from './generated-materials.js';
// The shipped terrain uses a regular grid, triangulated along b--c.
// Sample its triangles rather than nearby building foundations.
export function terrainSampler(group){
 const ground=group.children.find(o=>o.name==='ground_inferred');
 const mesh=ground?.children.find(o=>o.isMesh),p=(mesh?.userData.jcCraterBase||mesh?.geometry)?.getAttribute('position');
 if(!p)return null;
 const n=Math.round(Math.sqrt(p.count));if(n*n!==p.count||n<2)return null;
 const dx=p.getX(1)-p.getX(0),dz=p.getZ(n)-p.getZ(0);if(!dx||!dz)return null;
 const ox=group.position.x+ground.position.x,oy=group.position.y+ground.position.y,oz=group.position.z+ground.position.z;
 return (x,z)=>{
  const u=(x-ox-p.getX(0))/dx,v=(z-oz-p.getZ(0))/dz;
  if(u<-.001||v<-.001||u>n-1+.001||v>n-1+.001)return NaN;
  const ix=Math.max(0,Math.min(n-2,Math.floor(u))),iz=Math.max(0,Math.min(n-2,Math.floor(v))),a=iz*n+ix;
  const fx=Math.max(0,Math.min(1,u-ix)),fz=Math.max(0,Math.min(1,v-iz));
  return oy+(fx+fz<=1?p.getY(a)*(1-fx-fz)+p.getY(a+1)*fx+p.getY(a+n)*fz:p.getY(a+n+1)*(fx+fz-1)+p.getY(a+1)*(1-fz)+p.getY(a+n)*(1-fx))-craterDepth(x,z,mesh.userData.craters||[]);
 };
}
export function roadWidth(kind){return ({FREEWAY:13,INTERSTATE:13,'MAJOR STREET':18,COLLECTOR:12,'COUNTY HIGHWAY':12,RAMP:7,LOCAL:8,ALLEY:4,'PRIVATE STREET':7})[kind]||7;}
export function isPointWithinRoadway(segment,x,z,margin=1.4){const dx=segment.x2-segment.x1,dz=segment.z2-segment.z1,length=dx*dx+dz*dz,t=length?THREE.MathUtils.clamp(((x-segment.x1)*dx+(z-segment.z1)*dz)/length,0,1):0;return Math.hypot(x-(segment.x1+t*dx),z-(segment.z1+t*dz))<segment.width/2+margin;}
export async function buildRoadGeometry(records,sample,{origin=[0,0],yieldEvery=32}={}){
 const layers=[[],[],[],[]],uvs=[[],[],[],[]];let quads=0;
 function strip(a,b,half,offset,layer,height=.1){
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.05)return;
  const nx=-dz/length,nz=dx/length;
  const points=[[a[0]+nx*(offset-half),a[1]+nz*(offset-half)],[a[0]+nx*(offset+half),a[1]+nz*(offset+half)],[b[0]+nx*(offset-half),b[1]+nz*(offset-half)],[b[0]+nx*(offset+half),b[1]+nz*(offset+half)]];
  const ys=points.map(p=>sample(p[0],p[1]));
  const mid=sample((a[0]+b[0])/2,(a[1]+b[1])/2);if(!Number.isFinite(mid))return;
  for(const i of [0,1,2,1,3,2]){const p=points[i];layers[layer].push(p[0],(Number.isFinite(ys[i])?ys[i]:mid)+height,p[1]);uvs[layer].push(p[0]/4,p[1]/4);}
  quads++;
 }
 function sidewalkSlab(a,b,half,offset,height=.19,thickness=.18){
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.05)return;
  const nx=-dz/length,nz=dx/length;
  const points=[[a[0]+nx*(offset-half),a[1]+nz*(offset-half)],[a[0]+nx*(offset+half),a[1]+nz*(offset+half)],[b[0]+nx*(offset-half),b[1]+nz*(offset-half)],[b[0]+nx*(offset+half),b[1]+nz*(offset+half)]];
  const sampled=points.map(p=>sample(p[0],p[1])),mid=sample((a[0]+b[0])/2,(a[1]+b[1])/2);if(!Number.isFinite(mid))return;
  const top=sampled.map(y=>(Number.isFinite(y)?y:mid)+height),bottom=top.map(y=>y-thickness),push=(index,y)=>{const p=points[index];layers[1].push(p[0],y,p[1]);uvs[1].push(p[0]/3,p[1]/3);};
  for(const i of [0,1,2,1,3,2])push(i,top[i]);
  for(const edge of [[0,2],[1,3]]){const [u,v]=edge;for(const [i,y] of [[u,top[u]],[u,bottom[u]],[v,top[v]],[v,top[v]],[u,bottom[u]],[v,bottom[v]]])push(i,y);}
  quads+=3;
 }
 for(let r=0;r<records.length;r++){
  const road=records[r],width=roadWidth(road.kind);let travelled=0;
  const points=road.points.map(p=>[p[0]-origin[0],origin[1]-p[1]]);
  const total=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(len/10);
   for(let j=0;j<steps;j++){
    const lerp=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],p=lerp(j/steps),q=lerp((j+1)/steps),d=travelled+(j+.5)*len/steps;
    strip(p,q,width/2,0,0);
    // Junction approaches remain clear of painted lines and sidewalk strips.
    if(d>10&&d<total-10){
     if(!['FREEWAY','INTERSTATE','RAMP','ALLEY'].includes(road.kind)){
      for(const side of [-1,1])sidewalkSlab(p,q,1.15,side*(width/2+1.2),.20,.18);
     }
     if(['MAJOR STREET','COLLECTOR','COUNTY HIGHWAY'].includes(road.kind)){
      for(const side of [-1,1])strip(p,q,.07,side*.2,2,.125);
      // Broken white lane dividers follow measured road distance, so each
      // streamed segment preserves dash spacing instead of restarting at bends.
      if(d%9<4.2)for(const side of [-1,1])strip(p,q,.065,side*Math.min(3.2,width*.22),3,.14);
     }
    }
   }
   travelled+=len;
  }
  if(yieldEvery&&r%yieldEvery===yieldEvery-1)await new Promise(resolve=>setTimeout(resolve,0));
 }
 return {layers:layers.map((positions,i)=>({positions:new Float32Array(positions),uv:new Float32Array(uvs[i])})),quads};
}
export function createRoadNetwork(game){
 const active=new Map(),pending=new Set(),samplers=new WeakMap(),roadCells=new Map(),roadTileCells=new Map(),cellSize=48;let revision=0,disposed=false;
 const mats=[new THREE.MeshStandardMaterial({color:0x343638,roughness:.96,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({color:0x99938a,roughness:1,side:THREE.DoubleSide}),new THREE.MeshBasicMaterial({color:0xe5ba50,side:THREE.DoubleSide}),new THREE.MeshBasicMaterial({color:0xe8e7dd,side:THREE.DoubleSide})];
 loadGeneratedMaterials().then(maps=>{if(disposed)return;for(const [i,key]of [[0,'asphalt'],[1,'sidewalk']]){if(!maps[key])continue;const map=maps[key].clone();map.needsUpdate=true;mats[i].map=map;mats[i].color.set('#ffffff');mats[i].roughness=i===0?.94:1;mats[i].needsUpdate=true;}}).catch(()=>{});
 function sample(x,z){for(const group of game.loaded.values()){let fn=samplers.get(group);if(!fn){fn=terrainSampler(group);if(fn)samplers.set(group,fn);}const value=fn?.(x,z);if(Number.isFinite(value))return value;}return NaN;}
 function removeRoadTile(id){const cells=roadTileCells.get(id);if(!cells)return;for(const [key,segments] of cells){const all=roadCells.get(key);if(!all)continue;const keep=all.filter(segment=>!segments.includes(segment));if(keep.length)roadCells.set(key,keep);else roadCells.delete(key);}roadTileCells.delete(id);}
 function indexRoads(id,rows){removeRoadTile(id);const tileCells=new Map();for(const road of rows){const points=road.points;if(!Array.isArray(points)||points.length<2)continue;const width=roadWidth(road.kind);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(!Array.isArray(a)||!Array.isArray(b))continue;const s={x1:a[0]-game.origin[0],z1:game.origin[1]-a[1],x2:b[0]-game.origin[0],z2:game.origin[1]-b[1],width,name:String(road.name||'Unnamed street').trim()||'Unnamed street',kind:road.kind};if(![s.x1,s.z1,s.x2,s.z2].every(Number.isFinite))continue;const pad=width/2+2;for(let ix=Math.floor((Math.min(s.x1,s.x2)-pad)/cellSize);ix<=Math.floor((Math.max(s.x1,s.x2)+pad)/cellSize);ix++)for(let iz=Math.floor((Math.min(s.z1,s.z2)-pad)/cellSize);iz<=Math.floor((Math.max(s.z1,s.z2)+pad)/cellSize);iz++){const key=`${ix}:${iz}`;if(!roadCells.has(key))roadCells.set(key,[]);if(!tileCells.has(key))tileCells.set(key,[]);roadCells.get(key).push(s);tileCells.get(key).push(s);}}}roadTileCells.set(id,tileCells);}
 function isRoadway(x,z){const candidates=roadCells.get(`${Math.floor(x/cellSize)}:${Math.floor(z/cellSize)}`)||[];return candidates.some(segment=>isPointWithinRoadway(segment,x,z));}
 function nearestRoad(x,z,maxDistance=90){const ix=Math.floor(x/cellSize),iz=Math.floor(z/cellSize),candidates=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)candidates.push(...(roadCells.get(`${ix+dx}:${iz+dz}`)||[]));let best=null,bestDistance=maxDistance;for(const segment of candidates){const dx=segment.x2-segment.x1,dz=segment.z2-segment.z1,len=dx*dx+dz*dz,t=len?THREE.MathUtils.clamp(((x-segment.x1)*dx+(z-segment.z1)*dz)/len,0,1):0,d=Math.hypot(x-(segment.x1+t*dx),z-(segment.z1+t*dz));if(d<bestDistance){bestDistance=d;best={name:segment.name,kind:segment.kind,distance:d};}}return best;}
 async function sync(){
  if(disposed)return;
  const token=++revision;
  for(const [id,root]of active)if(game.loaded.get(id)!==root.userData.sourceGroup){game.scene.remove(root);root.children.forEach(m=>m.geometry.dispose());active.delete(id);removeRoadTile(id);}
  for(const [id,group]of game.loaded){
   if(active.has(id)||pending.has(id))continue;
   pending.add(id);
   try{
    const response=await fetch(`./data/roads/${id}.json.gz`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Road tile '+response.status);
    let bytes=new Uint8Array(await response.arrayBuffer());if(bytes[0]===31&&bytes[1]===139)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());const rows=JSON.parse(new TextDecoder().decode(bytes));const fn=terrainSampler(group);if(!fn)continue;
    const geometry=await buildRoadGeometry(rows,(x,z)=>{const value=sample(x,z);for(const group of game.loaded.values()){const mesh=group.children.find(o=>o.name==='ground_inferred')?.children.find(o=>o.isMesh);if(mesh?.userData.craters?.length&&Number.isFinite(terrainSampler(group)?.(x,z)))return value+craterDepth(x,z,mesh.userData.craters);}return value;},{origin:game.origin});
    if(disposed||game.loaded.get(id)!==group)continue;
    indexRoads(id,rows);
    const root=new THREE.Group();root.name='Mapped roads '+id;
    geometry.layers.forEach((layer,i)=>{if(!layer.positions.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(layer.positions,3));g.setAttribute('uv',new THREE.BufferAttribute(layer.uv,2));g.computeVertexNormals();g.computeBoundingSphere();root.add(new THREE.Mesh(g,mats[i]));});
    root.userData.sourceGroup=group;root.userData.roadRecords=rows.length;game.scene.add(root);active.set(id,root);window.dispatchEvent(new CustomEvent('jc-roads-loaded',{detail:{tile:id,records:rows}}));
   }catch(error){console.warn('Mapped roads unavailable for '+id,error.message);}finally{pending.delete(id);}
   if(token!==revision)break;
  }
 }
 const timer=setInterval(sync,1500);window.addEventListener('jc-tiles-loaded',sync);sync();
 return {sample,sync,isRoadway,nearestRoad,setVisible(value){for(const group of active.values())group.visible=!!value;},stats:()=>({tiles:active.size,roads:[...active.values()].reduce((n,g)=>n+g.userData.roadRecords,0),drawCalls:[...active.values()].reduce((n,g)=>n+g.children.length,0)}),dispose(){disposed=true;clearInterval(timer);window.removeEventListener('jc-tiles-loaded',sync);revision++;for(const root of active.values()){game.scene.remove(root);root.children.forEach(m=>m.geometry.dispose());}active.clear();roadCells.clear();roadTileCells.clear();mats[0].map?.dispose();mats[1].map?.dispose();mats.forEach(m=>m.dispose());}};
}
