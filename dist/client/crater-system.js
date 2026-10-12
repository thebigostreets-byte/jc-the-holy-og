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
 const p=base.getAttribute('position'),uv=base.getAttribute('uv'),uv1=base.getAttribute('uv1'),sourceColor=base.getAttribute('color'),ix=base.index;
 if(!p||!Number.isSafeInteger(p.count)||p.count<3)throw new RangeError('Invalid crater position buffer');
 // A partially streamed tile can have a singular or nonfinite transform.
 // Reject it before inversion so NaN positions never reach the GPU.
 if(matrix?.elements){
  if(matrix.elements.length!==16||!Array.from(matrix.elements).every(Number.isFinite)
     ||typeof matrix.determinant!=='function'||!Number.isFinite(matrix.determinant())
     ||Math.abs(matrix.determinant())<1e-12){
   throw new RangeError('Invalid crater mesh world transform');
  }
 }
 const colorSize=sourceColor?.itemSize===4?4:3;
 const out=[],outUV=[],outUV1=[],colors=[],inverse=matrix.clone().invert();
 const count=ix?.count??p.count;
 // Every split adds three triangles. Reject already-over-budget or malformed
 // source meshes before allocating any expanded geometry on low-end phones.
 const budget=Number.isSafeInteger(maxTriangles)&&maxTriangles>0?maxTriangles:18000;
 if(!Number.isSafeInteger(count)||count<3||count%3!==0||count/3>budget){
  throw new RangeError('Crater source triangle count exceeds budget or is invalid');
 }
 let triangleCount=count/3;
 const vertex=i=>{
  // Never submit out-of-range indices or nonfinite positions to WebGL.
  if(!Number.isSafeInteger(i)||i<0||i>=p.count)throw new RangeError('Invalid crater vertex index');
  const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix);
  if(![v.x,v.y,v.z].every(Number.isFinite))throw new RangeError('Nonfinite crater vertex position');
  // Bad optional UV/tint data must not poison otherwise valid terrain.
  const safe=(attr,method,fallback)=>{
   const value=attr?.[method]?.(i);
   return Number.isFinite(value)?value:fallback;
  };
  return [v.x,v.y,v.z,safe(uv,'getX',0),safe(uv,'getY',0),safe(uv1,'getX',0),safe(uv1,'getY',0),
   safe(sourceColor,'getX',1),safe(sourceColor,'getY',1),safe(sourceColor,'getZ',1),
   colorSize===4?safe(sourceColor,'getW',1):1];
 };
 function emit(tri,level=0){
  const near=craters.some(c=>c.x+c.radius>=Math.min(...tri.map(v=>v[0]))&&c.x-c.radius<=Math.max(...tri.map(v=>v[0]))&&c.z+c.radius>=Math.min(...tri.map(v=>v[2]))&&c.z-c.radius<=Math.max(...tri.map(v=>v[2])));
  const length=Math.max(...tri.map((a,i)=>Math.hypot(a[0]-tri[(i+1)%3][0],a[2]-tri[(i+1)%3][2])));
  if(near&&length>2.5&&level<6&&triangleCount+3<=budget){
   triangleCount+=3;
   const [a,b,c]=tri,mid=(a,b)=>a.map((v,i)=>(v+b[i])/2),ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
   for(const t of [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]])emit(t,level+1);return;
  }
  for(const v of tri){const q=new THREE.Vector3(v[0],v[1]-craterDepth(v[0],v[2],craters),v[2]).applyMatrix4(inverse);out.push(q.x,q.y,q.z);outUV.push(v[3],v[4]);outUV1.push(v[5],v[6]);const shade=1-Math.min(.68,craterDepth(v[0],v[2],craters)*.22);
   // Preserve original per-vertex RGB tint (and optional alpha) instead of
   // painting the entire textured tile gray when an impact occurs.
   colors.push(v[7]*shade,v[8]*shade,v[9]*shade);
   if(colorSize===4)colors.push(v[10]);}
 }
 for(let i=0;i<count;i+=3)emit([0,1,2].map(k=>vertex(ix?ix.getX(i+k):i+k)));
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(outUV,2));if(uv1)g.setAttribute('uv1',new THREE.Float32BufferAttribute(outUV1,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,colorSize));g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();return g;
}
export function createCraterSystem(game,mobile=false){
 const records=[],tracked=new Set(),limit=mobile?4:8,lifetime=8500;let serial=0,disposed=false,lastSignature='';
 // Geometry identity includes mutable public record coordinates and size.
 const geometrySignature=()=>records.map(c=>[c.id,c.x,c.z,c.radius,c.depth].join(':')).join('|');
 // The records array is exposed for HUD use; tolerate stale or externally
 // corrupted entries without letting one bad record block healthy impacts.
 function sanitizeRecords(){
  let changed=false;
  const seen=new Set();
  for(let i=records.length-1;i>=0;i--){
   const c=records[i];
   if(!c||!Number.isSafeInteger(c.id)||c.id<=0||seen.has(c.id)||
      ![c.x,c.z,c.radius,c.depth,c.expires].every(Number.isFinite)||
      c.radius<=0||c.depth<=0){records.splice(i,1);changed=true;}
   else seen.add(c.id);
  }
  if(records.length>limit){records.splice(0,records.length-limit);changed=true;}
  return changed;
 }
 function restore(mesh){
  const base=mesh.userData?.jcCraterBase;
  if(!base)return;
  // Disposal callbacks can throw on broken streamed resources. Restore
  // ownership and continue cleaning other meshes even if one callback fails.
  // The streamer may reuse a mesh with brand-new shared geometry/material.
  // Release only crater-owned resources; never dispose or overwrite replacements.
  const craterGeometry=mesh.userData.jcCraterAppliedGeometry;
  if(craterGeometry){
   if(mesh.geometry===craterGeometry)mesh.geometry=base;
   try{craterGeometry.dispose?.();}catch{}
  }else{
   // Compatibility with an in-memory crater from an older runtime revision.
   if(mesh.geometry!==base){try{mesh.geometry?.dispose?.();}catch{}}
   mesh.geometry=base;
  }
  const originalMaterial=mesh.userData.jcCraterMaterial;
  const craterMaterial=mesh.userData.jcCraterAppliedMaterial;
  if(originalMaterial){
   if(craterMaterial){
    if(mesh.material===craterMaterial)mesh.material=originalMaterial;
    try{craterMaterial.dispose?.();}catch{}
   }else{
    if(mesh.material!==originalMaterial){try{mesh.material?.dispose?.();}catch{}}
    mesh.material=originalMaterial;
   }
  }else if(mesh.material&&'jcCraterVertexColors' in mesh.userData){
   mesh.material.vertexColors=mesh.userData.jcCraterVertexColors;
   mesh.material.needsUpdate=true;
  }
  delete mesh.userData.jcCraterBase;
  delete mesh.userData.jcCraterMaterial;
  delete mesh.userData.jcCraterAppliedGeometry;
  delete mesh.userData.jcCraterAppliedMaterial;
  delete mesh.userData.jcCraterVertexColors;
  delete mesh.userData.craterKey;
  delete mesh.userData.craters;
  tracked.delete(mesh);
 }
 function apply(){
  if(disposed)return;
  sanitizeRecords();
  // No active craters: only previously altered meshes need restoration.
  // Avoid traversing every streamed Vegas road/ground tile on expiry.
  if(!records.length){for(const mesh of [...tracked])restore(mesh);lastSignature='';return;}
  // Streamed scenes can temporarily fail to update during context recovery.
  // Keep the impact queued for the next tile event rather than crashing combat.
  try{game.scene.updateMatrixWorld(true);}catch{return;}
  const visible=new Set();
  try{game.scene.traverse(mesh=>{
   if(!mesh.isMesh||!(mesh.parent?.name==='ground_inferred'||mesh.parent?.name?.startsWith('Mapped roads ')))return;
   visible.add(mesh);
   // Bounds calculation can throw on a partially streamed or corrupt tile.
   // Isolate that tile so a single broken mesh cannot cancel the impact pass.
   let near;
   try{
    const bounds=new THREE.Box3().setFromObject(mesh);
    if(![bounds.min?.x,bounds.min?.z,bounds.max?.x,bounds.max?.z].every(Number.isFinite)
       ||bounds.min.x>bounds.max.x||bounds.min.z>bounds.max.z){restore(mesh);return;}
    near=records.filter(c=>c.x+c.radius>=bounds.min.x&&c.x-c.radius<=bounds.max.x&&c.z+c.radius>=bounds.min.z&&c.z-c.radius<=bounds.max.z);
   }catch{restore(mesh);return;}
   if(!near.length){restore(mesh);return;}
   // A streamed tile can rebind geometry or material on the same Mesh object.
   // Drop stale crater ownership before comparing keys or carving new assets.
   if(mesh.userData.jcCraterBase &&
      (mesh.geometry!==mesh.userData.jcCraterAppliedGeometry ||
       mesh.material!==mesh.userData.jcCraterAppliedMaterial))restore(mesh);
   const key=near.map(c=>[c.id,c.x,c.z,c.radius,c.depth].join(':')).join('|');
   if(mesh.userData.jcCraterBase&&mesh.userData.craterKey===key)return;
   // Carving creates non-indexed triangles without material groups. Never
   // apply it to grouped/multi-material geometry (or malformed meshes).
   if(Array.isArray(mesh.material)||mesh.geometry?.groups?.length||!mesh.material||typeof mesh.material.clone!=='function'||!mesh.geometry?.getAttribute?.('position')){
    restore(mesh);return;
   }
   const base=mesh.userData.jcCraterBase||mesh.geometry;
   let next=null,clonedMaterial=null;
   try{
    // Build before touching the visible mesh: a bad tile cannot prevent
    // subsequent meshes from receiving impacts or corrupt shared assets.
    next=carveGeometry(base,mesh.matrixWorld,near,mobile?6000:18000);
    if(!next.getAttribute('color')){
     const color=new Float32Array(next.getAttribute('position').count*3);
     color.fill(1);next.setAttribute('color',new THREE.BufferAttribute(color,3));
    }
    if(!mesh.userData.jcCraterBase){
     clonedMaterial=mesh.material.clone();
     clonedMaterial.vertexColors=true;clonedMaterial.needsUpdate=true;
     mesh.userData.jcCraterBase=base;
     mesh.userData.jcCraterMaterial=mesh.material;
     mesh.userData.jcCraterAppliedMaterial=clonedMaterial;
     tracked.add(mesh);
     mesh.material=clonedMaterial;
    }else{
     mesh.material.vertexColors=true;mesh.material.needsUpdate=true;
    }
    const previous=mesh.geometry;
    mesh.geometry=next;mesh.userData.jcCraterAppliedGeometry=next;
    mesh.userData.craters=near;mesh.userData.craterKey=key;
    if(previous!==base)previous.dispose();
   }catch{
    // Restore this mesh alone and let other city tiles continue loading.
    if(next&&mesh.geometry!==next)next.dispose();
    if(clonedMaterial&&mesh.material!==clonedMaterial)clonedMaterial.dispose();
    restore(mesh);
   }
  });}catch{return;}
  // Only sweep detached tiles after a complete traversal; a partial traversal
  // must not release still-visible terrain resources.
  // Streamed-out tiles are no longer in scene.traverse: release them too.
  for(const mesh of [...tracked])if(!visible.has(mesh))restore(mesh);
  lastSignature=geometrySignature();
 }
 window.addEventListener('jc-tiles-loaded',apply);window.addEventListener('jc-roads-loaded',apply);
 return {strike(point){
  if(disposed||!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return null;
  // A broken clock must not create an impact with an unexpirable NaN or
  // infinite deadline, especially on browsers recovering a suspended tab.
  let now;try{now=performance.now();}catch{return null;}
  if(!Number.isFinite(now)||now<0||now>Number.MAX_SAFE_INTEGER-lifetime)return null;
  sanitizeRecords();
  // External record insertion must not reuse an existing cache identity.
  for(const entry of records)serial=Math.max(serial,entry.id);
  if(serial>=Number.MAX_SAFE_INTEGER)return null;
  const c={id:++serial,x:point.x,z:point.z,radius:12,depth:3.2,expires:now+lifetime};records.push(c);if(records.length>limit)records.shift();apply();return c;
 },update(now=performance.now()){
  if(disposed||!Number.isFinite(now))return;
  const invalid=sanitizeRecords();
  const expired=records.some(c=>now>=c.expires);if(expired){for(let i=records.length-1;i>=0;i--)if(now>=records[i].expires)records.splice(i,1);}
  if(invalid||expired||geometrySignature()!==lastSignature)apply();
 },records,dispose(){
  if(disposed)return;
  disposed=true;
  window.removeEventListener('jc-tiles-loaded',apply);window.removeEventListener('jc-roads-loaded',apply);
  records.length=0;
  for(const mesh of [...tracked])restore(mesh);
  // A damaged scene graph must not make shutdown throw after resources are released.
  try{game.scene.traverse(mesh=>restore(mesh));}catch{}
 }};
}
