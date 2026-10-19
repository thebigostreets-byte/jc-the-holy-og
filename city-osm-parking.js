import * as THREE from './three.module.js';

// Real-world OpenStreetMap surface parking, geometrically clipped offline to
// the project's EPSG:32611 city tiles. Geometry follows the existing terrain.
// No fake parking lots are placed where data has not confirmed a surface lot.
export function buildMappedParking(game,tile,features,sample,materials,{lowSpec=false}={}){
 if(!materials?.parking||!Array.isArray(features)||!features.length)return null;
 const vertices=[],uv=[],lots=[];
 const origin=game.origin;
 const limit=lowSpec?80:240;
 for(const feature of features){
  if(lots.length>=limit)break;
  const coords=feature.points;
  if(!Array.isArray(coords)||coords.length<3||coords.length>500)continue;
  const path=coords.map(([east,north])=>new THREE.Vector2(east-origin[0],origin[1]-north));
  if(!path.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)))continue;
  // ShapeUtils expects boundary points and may change their winding.
  let indices;
  try{indices=THREE.ShapeUtils.triangulateShape(path,[]);}
  catch{continue;}
  if(!indices.length)continue;
  const surface=path.map(p=>{
   const y=sample(p.x,p.y);
   return Number.isFinite(y)?[p.x,y+.115,p.y]:null;
  });
  if(surface.some(x=>!x))continue;
  let faces=0;
  for(const indices3 of indices){
   const [a,b,c]=indices3;
   if(!surface[a]||!surface[b]||!surface[c])continue;
   for(const i of [a,b,c]){vertices.push(...surface[i]);uv.push(path[i].x/4,path[i].y/4);}
   faces++;
  }
  if(faces)lots.push({id:feature.id||null,name:feature.name||"",vertices:faces*3});
 }
 if(!vertices.length)return null;
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.computeVertexNormals();geo.computeBoundingSphere();
 const mesh=new THREE.Mesh(geo,materials.parking);
 mesh.name='OSM ground-level parking surfaces '+tile;
 mesh.userData.parkingLots=lots.length;
 return mesh;
}
