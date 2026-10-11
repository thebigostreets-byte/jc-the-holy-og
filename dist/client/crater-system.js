import * as THREE from './three.module.js';
export function craterDepth(x,z,craters){
 if(!Number.isFinite(x)||!Number.isFinite(z)||!Array.isArray(craters))return 0;
 let depth=0;
 for(const c of craters){
  if(!c||![c.x,c.z,c.radius,c.depth].every(Number.isFinite)||c.radius<=0||c.depth<=0)continue;
  const t=Math.hypot(x-c.x,z-c.z)/c.radius;
  if(t<1)depth=Math.max(depth,c.depth*(1-t*t)**2);
 }
 return depth;
}
// Locally subdivide the source surface so a crater is real geometry even on
// the city's coarse 50 m terrain. Preserve original photographic UVs.
export function carveGeometry(base,matrix,craters,maxTriangles=18000){
 const p=base.getAttribute('position'),uv=base.getAttribute('uv'),uv1=base.getAttribute('uv1'),ix=base.index;
 const out=[],outUV=[],outUV1=[],colors=[],inverse=matrix.clone().invert();
 const count=ix?.count??p.count;
 // Every split adds three triangles. Keep deformation cost bounded on phones.
 const budget=Number.isSafeInteger(maxTriangles)&&maxTriangles>0?maxTriangles:18000;
 let triangleCount=Math.ceil(count/3);
 const vertex=i=>{const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix);return [v.x,v.y,v.z,uv?.getX(i)||0,uv?.getY(i)||0,uv1?.getX(i)||0,uv1?.getY(i)||0];};
 function emit(tri,level=0){
  const near=craters.some(c=>c.x+c.radius>=Math.min(...tri.map(v=>v[0]))&&c.x-c.radius<=Math.max(...tri.map(v=>v[0]))&&c.z+c.radius>=Math.min(...tri.map(v=>v[2]))&&c.z-c.radius<=Math.max(...tri.map(v=>v[2])));
  const length=Math.max(...tri.map((a,i)=>Math.hypot(a[0]-tri[(i+1)%3][0],a[2]-tri[(i+1)%3][2])));
  if(near&&length>2.5&&level<6&&triangleCount+3<=budget){
   triangleCount+=3;
   const [a,b,c]=tri,mid=(a,b)=>a.map((v,i)=>(v+b[i])/2),ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
   for(const t of [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]])emit(t,level+1);return;
  }
  for(const v of tri){const q=new THREE.Vector3(v[0],v[1]-craterDepth(v[0],v[2],craters),v[2]).applyMatrix4(inverse);out.push(q.x,q.y,q.z);outUV.push(v[3],v[4]);outUV1.push(v[5],v[6]);const shade=1-Math.min(.68,craterDepth(v[0],v[2],craters)*.22);colors.push(shade,shade,shade);}
 }
 for(let i=0;i<count;i+=3)emit([0,1,2].map(k=>vertex(ix?ix.getX(i+k):i+k)));
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(outUV,2));if(uv1)g.setAttribute('uv1',new THREE.Float32BufferAttribute(outUV1,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();return g;
}
export function createCraterSystem(game,mobile=false){
 const records=[],tracked=new Set(),limit=mobile?4:8,lifetime=8500;let serial=0,disposed=false;
 function restore(mesh){
  const base=mesh.userData?.jcCraterBase;
  if(!base)return;
  if(mesh.geometry!==base)mesh.geometry.dispose();
  mesh.geometry=base;
  const originalMaterial=mesh.userData.jcCraterMaterial;
  if(originalMaterial){
   if(mesh.material!==originalMaterial)mesh.material.dispose();
   mesh.material=originalMaterial;
  }else if(mesh.material&&'jcCraterVertexColors' in mesh.userData){
   mesh.material.vertexColors=mesh.userData.jcCraterVertexColors;
   mesh.material.needsUpdate=true;
  }
  delete mesh.userData.jcCraterBase;
  delete mesh.userData.jcCraterMaterial;
  delete mesh.userData.jcCraterVertexColors;
  delete mesh.userData.craterKey;
  delete mesh.userData.craters;
  tracked.delete(mesh);
 }
 function apply(){
  if(disposed)return;
  game.scene.updateMatrixWorld(true);
  const visible=new Set();
  game.scene.traverse(mesh=>{
   if(!mesh.isMesh||!(mesh.parent?.name==='ground_inferred'||mesh.parent?.name?.startsWith('Mapped roads ')))return;
   visible.add(mesh);
   const bounds=new THREE.Box3().setFromObject(mesh),near=records.filter(c=>c.x+c.radius>=bounds.min.x&&c.x-c.radius<=bounds.max.x&&c.z+c.radius>=bounds.min.z&&c.z-c.radius<=bounds.max.z);
   if(!near.length){restore(mesh);return;}
   const key=near.map(c=>c.id).join(',');if(mesh.userData.craterKey===key)return;
   if(!mesh.userData.jcCraterBase){
    // Retain the original geometry: other streamed meshes may share it.
    mesh.userData.jcCraterBase=mesh.geometry;
    tracked.add(mesh);
    mesh.userData.jcCraterMaterial=mesh.material;
    // Never enable vertex colors on a material shared with unrelated meshes.
    mesh.material=mesh.material.clone();
   }
   const next=carveGeometry(mesh.userData.jcCraterBase,mesh.matrixWorld,near,mobile?6000:18000);
   if(!next.getAttribute('color')){const color=new Float32Array(next.getAttribute('position').count*3);color.fill(1);next.setAttribute('color',new THREE.BufferAttribute(color,3));}
   mesh.material.vertexColors=true;mesh.material.needsUpdate=true;
   if(mesh.geometry!==mesh.userData.jcCraterBase)mesh.geometry.dispose();
   mesh.geometry=next;mesh.userData.craters=near;mesh.userData.craterKey=key;
  });
  // Streamed-out tiles are no longer in scene.traverse: release them too.
  for(const mesh of [...tracked])if(!visible.has(mesh))restore(mesh);
 }
 window.addEventListener('jc-tiles-loaded',apply);window.addEventListener('jc-roads-loaded',apply);
 return {strike(point){
  if(disposed||!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return null;
  const c={id:++serial,x:point.x,z:point.z,radius:12,depth:3.2,expires:performance.now()+lifetime};records.push(c);if(records.length>limit)records.shift();apply();return c;
 },update(now=performance.now()){
  if(disposed||!Number.isFinite(now))return;
  const expired=records.some(c=>now>=c.expires);if(expired){for(let i=records.length-1;i>=0;i--)if(now>=records[i].expires)records.splice(i,1);apply();}
 },records,dispose(){
  if(disposed)return;
  disposed=true;
  window.removeEventListener('jc-tiles-loaded',apply);window.removeEventListener('jc-roads-loaded',apply);
  records.length=0;
  for(const mesh of [...tracked])restore(mesh);
  game.scene.traverse(mesh=>restore(mesh));
 }};
}
