// Lightweight rooftop equipment adds scale cues without replacing the original city meshes.
const assetCache = new WeakMap();

function assetsFor(THREE) {
  let assets=assetCache.get(THREE);
  if(assets)return assets;
  assets={
    box:new THREE.BoxGeometry(1,1,1),
    cylinder:new THREE.CylinderGeometry(.5,.5,1,8),
    housing:new THREE.MeshStandardMaterial({color:0x9a9da0,roughness:.9,metalness:.04}),
    grille:new THREE.MeshStandardMaterial({color:0x343a40,roughness:.94,metalness:.02}),
    vent:new THREE.MeshStandardMaterial({color:0x73787c,roughness:.92,metalness:.06}),
    antenna:new THREE.MeshStandardMaterial({color:0x555b61,roughness:.7,metalness:.25})
  };
  assetCache.set(THREE,assets);
  return assets;
}

function hashId(id) {
  let hash=2166136261;
  for(const char of String(id))hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return hash>>>0;
}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Pure planner kept separate so deterministic placement can be regression-tested.
export function buildRooftopPlan(buildings) {
  const housings=[],grilles=[],vents=[],antennas=[];
  for(const building of buildings||[]) {
    const {id,min,max}=building;
    if(!id||!min||!max)continue;
    const width=max.x-min.x,depth=max.z-min.z,height=max.y-min.y;
    if(width<7||depth<7||height<10||width>500||depth>500||height>500)continue;
    const hash=hashId(id),count=1+(hash%3);
    const unitWidth=clamp(width*.09,1.4,3.2),unitDepth=clamp(depth*.09,1.2,2.8),unitHeight=clamp(height*.014,1.1,2.1);
    for(let i=0;i<count;i++) {
      const fx=count===1 ? .5 : .22+(((hash>>>(i*5+2))&63)/100);
      const fz=.24+(((hash>>>(i*7+4))&47)/100);
      const x=min.x+width*clamp(fx,.2,.8),z=min.z+depth*clamp(fz,.2,.8);
      housings.push({x,y:max.y+unitHeight/2+.06,z,sx:unitWidth,sy:unitHeight,sz:unitDepth});
      grilles.push({x,y:max.y+unitHeight+.095,z,sx:unitWidth*.72,sy:.07,sz:unitDepth*.72});
    }
    if(hash%2===0) {
      const x=min.x+width*(.28+((hash>>>9)&31)/70),z=min.z+depth*(.3+((hash>>>14)&31)/70);
      vents.push({x,y:max.y+.65,z,sx:.42,sy:1.3,sz:.42});
    }
    if(height>45&&hash%3===0) {
      const mastHeight=clamp(height*.055,2.5,8);
      antennas.push({x:min.x+width*.5,y:max.y+mastHeight/2+.08,z:min.z+depth*.5,sx:.12,sy:mastHeight,sz:.12});
    }
  }
  return {housings,grilles,vents,antennas};
}

export function decorateBuildingRooftops(THREE,tileGroup,buildings) {
  if(!tileGroup||!buildings)return null;
  tileGroup.updateWorldMatrix?.(true,true);
  const entries=[];
  for(const [id,building] of buildings) {
    let ancestor=building;
    while(ancestor&&ancestor!==tileGroup)ancestor=ancestor.parent;
    if(ancestor!==tileGroup)continue;
    building.updateWorldMatrix?.(true,true);
    const box=new THREE.Box3().setFromObject(building);
    if(box.isEmpty?.())continue;
    entries.push({id,min:{x:box.min.x,y:box.min.y,z:box.min.z},max:{x:box.max.x,y:box.max.y,z:box.max.z}});
  }
  if(!entries.length)return null;
  const plan=buildRooftopPlan(entries),count=plan.housings.length+plan.vents.length+plan.antennas.length;
  if(!count)return {root:null,count:0};
  const assets=assetsFor(THREE),root=new THREE.Group();
  root.name='JC rooftop HVAC and antenna details';
  const dummy=new THREE.Object3D();
  const makeInstances=(items,geometry,material,name)=>{
    if(!items.length)return;
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);
    mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;
    for(let i=0;i<items.length;i++) {
      const item=items[i],position=new THREE.Vector3(item.x,item.y,item.z);
      tileGroup.worldToLocal(position);
      dummy.position.copy(position);dummy.rotation.set(0,0,0);dummy.scale.set(item.sx,item.sy,item.sz);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
  };
  makeInstances(plan.housings,assets.box,assets.housing,'Rooftop HVAC housings');
  makeInstances(plan.grilles,assets.box,assets.grille,'Rooftop HVAC grilles');
  makeInstances(plan.vents,assets.cylinder,assets.vent,'Rooftop exhaust vents');
  makeInstances(plan.antennas,assets.cylinder,assets.antenna,'Rooftop antenna masts');
  root.userData.equipmentCount=count;
  root.userData.buildingCount=entries.length;
  tileGroup.add(root);
  return {root,count,buildingCount:entries.length};
}
