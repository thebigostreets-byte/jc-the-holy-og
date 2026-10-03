import * as THREE from './three.module.js';
export function tilePlacement(section,origin,bounds){
 const [west,south,east,north]=section.bounds;
 return {x:(west+east)/2-origin[0],z:origin[1]-(south+north)/2,u:(west-bounds[0])/(bounds[2]-bounds[0]),v:(south-bounds[1])/(bounds[3]-bounds[1])};
}
export function createDistantCity(game){
 const root=new THREE.Group();root.name='Georeferenced Las Vegas satellite preview';game.scene.add(root);
 const loader=new THREE.TextureLoader(),overview=loader.load('./assets/overview.jpg');overview.colorSpace=THREE.SRGBColorSpace;
 const geometry=new THREE.PlaneGeometry(1000,1000),cells=new Float32Array(game.sections.length*2);
 const material=new THREE.MeshBasicMaterial({map:overview,depthWrite:false,polygonOffset:true,polygonOffsetFactor:2});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec2 cityCell;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv=(vMapUv/35.0)+cityCell;\n#endif');
 };
 geometry.setAttribute('cityCell',new THREE.InstancedBufferAttribute(cells,2));
 const tiles=new THREE.InstancedMesh(geometry,material,game.sections.length);tiles.name='Actual satellite locations';tiles.frustumCulled=false;root.add(tiles);
 const highDetail=new Map(),detailIds=['C14_R13','C14_R14','C14_R15','C15_R13','C15_R14','C15_R15','C16_R13','C16_R14','C16_R15','C15_R21','C21_R21'];
 for(const id of detailIds){const section=game.sections.find(s=>s.id===id);if(!section)continue;const p=tilePlacement(section,game.origin,game.cityBounds),texture=loader.load(`./assets/imagery/${id}.jpg`);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshBasicMaterial({map:texture,depthWrite:false}));mesh.position.set(p.x,131.1,p.z);mesh.rotation.x=-Math.PI/2;root.add(mesh);highDetail.set(id,mesh);
 }
 const dummy=new THREE.Object3D();let revision=-1;
 function update(){const next=game.tileRevision();if(next===revision)return;revision=next;
  game.sections.forEach((section,i)=>{const p=tilePlacement(section,game.origin,game.cityBounds);cells[i*2]=p.u;cells[i*2+1]=p.v;
   dummy.position.set(p.x,131,p.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(game.loaded.has(section.id)||highDetail.has(section.id)?0:1);dummy.updateMatrix();tiles.setMatrixAt(i,dummy.matrix);
  });tiles.instanceMatrix.needsUpdate=true;geometry.attributes.cityCell.needsUpdate=true;
  for(const [id,mesh]of highDetail)mesh.visible=!game.loaded.has(id);
 }
 update();return {update,dispose(){game.scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});}};
}
