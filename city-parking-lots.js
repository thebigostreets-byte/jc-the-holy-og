import * as THREE from './three.module.js';

// Decorative parking surfaces are placed only on plausible open, gently graded
// parcels next to mapped streets. They are not surveyed parking boundaries.
export function buildProceduralParking(game,tile,records,sample,isRoadway,{lowSpec=false,maxLots=6}={}){
 if(!Array.isArray(records)||!records.length||game.loaded.get(tile)?.userData.generatedFallback)return null;
 const group=game.loaded.get(tile),section=game.sections?.find(s=>s.id===tile);
 if(!group||!section)return null;
 const bounds=section.boundsEPSG32611||section.bounds;
 if(!bounds)return null;
 const origin=game.origin;
 const obstacles=[];
 for(const ob of group.children){
  if(!ob.userData?.buildingId||!ob.userData.collider)continue;
  const box=ob.userData.collider,mid=ob.getWorldPosition(new THREE.Vector3());
  const rx=Math.max(5,Math.abs(box.max[0]-box.min[0])*.5+3);
  const rz=Math.max(5,Math.abs(box.max[2]-box.min[2])*.5+3);
  obstacles.push({x:mid.x,z:mid.z,rx,rz});
 }
 const positions=[],uvs=[],lines=[],lineUvs=[],lots=[];
 const uv=(x,z)=>[x/4,z/4];
 function triangle(dest,tex,A,B,C){
  for(const p of [A,B,C]){dest.push(p[0],p[1],p[2]);tex.push(...uv(p[0],p[2]));}
 }
 function emitQuad(dest,tex,a,b,c,d){triangle(dest,tex,a,b,c);triangle(dest,tex,b,d,c);}
 function makePoint(cx,cz,dx,dz,ux,uz,vx,vz,yOffset){
  const x=cx+ux*dx+vx*dz,z=cz+uz*dx+vz*dz,ground=sample(x,z);
  return [x,Number.isFinite(ground)?ground+yOffset:0,z];
 }
 function clear(cx,cz,ux,uz,vx,vz,w,h){
  const points=[];
  for(const fx of [-.47,0,.47])for(const fz of [-.47,0,.47]){
   const x=cx+ux*w*fx+vx*h*fz,z=cz+uz*w*fx+vz*h*fz;
   const y=sample(x,z);if(!Number.isFinite(y)||isRoadway(x,z))return false;
   if(x+origin[0]<bounds[0]+6||x+origin[0]>bounds[2]-6||origin[1]-z<bounds[1]+6||origin[1]-z>bounds[3]-6)return false;
   for(const ob of obstacles)if(Math.abs(x-ob.x)<ob.rx+2&&Math.abs(z-ob.z)<ob.rz+2)return false;
   points.push(y);
  }
  return Math.max(...points)-Math.min(...points)<1.6;
 }
 function paintLine(cx,cz,ux,uz,vx,vz,u1,v1,u2,v2){
  const half=.075,ax=cx+ux*u1+vx*v1,az=cz+uz*u1+vz*v1,bx=cx+ux*u2+vx*v2,bz=cz+uz*u2+vz*v2;
  const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);if(len<.1)return;
  const nx=-dz/len*half,nz=dx/len*half;
  const p=(x,z)=>[x,(sample(x,z)||0)+.24,z];
  emitQuad(lines,lineUvs,p(ax+nx,az+nz),p(ax-nx,az-nz),p(bx+nx,bz+nz),p(bx-nx,bz-nz));
 }
 function addLot(cx,cz,ux,uz,vx,vz){
  const w=32,h=29,nx=4,nz=4;
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
   const point=(u,v)=>makePoint(cx,cz,u,v,ux,uz,vx,vz,.13);
   const u0=(i/nx-.5)*w,u1=((i+1)/nx-.5)*w,v0=(j/nz-.5)*h,v1=((j+1)/nz-.5)*h;
   emitQuad(positions,uvs,point(u0,v0),point(u1,v0),point(u0,v1),point(u1,v1));
  }
  const slots=8,step=3.7;
  for(const side of [-1,1]){
   const vA=side*(h/2-1),vB=side*4;
   for(let k=0;k<=slots;k++){
    const u=(k-slots/2)*step;
    paintLine(cx,cz,ux,uz,vx,vz,u,vA,u,vB);
   }
   paintLine(cx,cz,ux,uz,vx,vz,-slots*step/2,vA,slots*step/2,vA);
  }
  lots.push({x:cx,z:cz,width:w,depth:h});
 }
 let processed=0;
 const allowance=lowSpec?Math.min(maxLots,2):maxLots;
 for(let i=0;i<records.length&&lots.length<allowance;i++){
  const road=records[i];
  if(!['LOCAL','COLLECTOR','COUNTY HIGHWAY','PRIVATE STREET','MAJOR STREET'].includes(road.kind)||!Array.isArray(road.points))continue;
  for(let j=1;j<road.points.length&&lots.length<allowance;j++){
   if(++processed>500)break;
   const a=road.points[j-1],b=road.points[j];
   if(!Array.isArray(a)||!Array.isArray(b))continue;
   const ax=a[0]-origin[0],az=origin[1]-a[1],bx=b[0]-origin[0],bz=origin[1]-b[1];
   const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
   if(len<28)continue;
   const ux=dx/len,uz=dz/len,vx=-uz,vz=ux;
   const width=({'MAJOR STREET':18,COLLECTOR:12,'COUNTY HIGHWAY':12})[road.kind]||8;
   for(let k=0;k<Math.min(3,Math.floor(len/95)+1)&&lots.length<allowance;k++){
    const t=(k+1)/(Math.min(3,Math.floor(len/95)+1)+1),side=((i+j+k)%2)?1:-1;
    const x=ax+dx*t+vx*side*(width/2+27),z=az+dz*t+vz*side*(width/2+27);
    if(lots.some(lot=>Math.hypot(x-lot.x,z-lot.z)<55))continue;
    if(!clear(x,z,ux,uz,vx,vz,32,29))continue;
    addLot(x,z,ux,uz,vx,vz);
   }
  }
 }
 if(!lots.length)return null;
 const root=new THREE.Group();root.name='Paved parking areas (approximate) '+tile;
 function mesh(vertices,coords,material){
  if(!vertices.length)return;
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices),3));
  geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(coords),2));
  geo.computeVertexNormals();geo.computeBoundingSphere();
  root.add(new THREE.Mesh(geo,material));
 }
 const surfaces=game.roads?.surfaceMaterials;
 if(!surfaces)return null;
 mesh(positions,uvs,surfaces.parking);
 mesh(lines,lineUvs,surfaces.parkingLine);
 root.userData.parkingLots=lots.length;
 return root;
}
