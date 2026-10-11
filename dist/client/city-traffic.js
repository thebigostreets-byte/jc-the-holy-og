import * as THREE from './three.module.js';

// Small, deterministic moving traffic batches share four GPU meshes per streamed tile.
// Advance along road segments while safely skipping zero-length sections.
// A bounded step prevents a suspended tab from teleporting traffic.
export function advanceTrafficCar(car,dt){
  if(!car||!Array.isArray(car.pts)||car.pts.length<2||!Number.isFinite(dt)||dt<0)return false;
  const count=car.pts.length-1;
  let seg=Number.isInteger(car.seg)?((car.seg%count)+count)%count:0;
  let t=Number.isFinite(car.t)?Math.max(0,Math.min(1,car.t)):0;
  let distance=Math.max(0,Number.isFinite(car.speed)?car.speed:0)*Math.min(dt,.1);
  const lengthAt=i=>{const a=car.pts[i],b=car.pts[i+1];return a&&b&&[...a,...b].every(Number.isFinite)?Math.hypot(b[0]-a[0],b[1]-a[1]):0;};
  let length=lengthAt(seg);
  for(let i=0;i<=count*2;i++){
    if(length<=.001){seg=(seg+1)%count;t=0;length=lengthAt(seg);continue;}
    const remaining=(1-t)*length;
    if(distance<remaining){t+=distance/length;distance=0;break;}
    distance-=remaining;seg=(seg+1)%count;t=0;length=lengthAt(seg);
    if(distance===0&&length>.001)break;
  }
  if(length<=.001||!Number.isFinite(length))return false;
  car.seg=seg;car.t=t;car.length=length;
  return true;
}

export function createCityTraffic(game){
  const active=new Map(),listeners=[],vehicleCells=new Map(),dummy=new THREE.Object3D();let disposed=false,accumulator=0;
  const bodyGeo=new THREE.BoxGeometry(4.5,1.35,2.05),roofGeo=new THREE.BoxGeometry(2.25,.8,1.8),lampGeo=new THREE.BoxGeometry(.16,.2,.32);
  const bodyMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.42,metalness:.32}),roofMat=new THREE.MeshStandardMaterial({color:0x18232d,roughness:.25,metalness:.24}),lampMat=new THREE.MeshBasicMaterial({color:0xffdf9c});
  function remove(id){const v=active.get(id);if(!v)return;game.scene.remove(v.group);active.delete(id);}
  function add({detail}){if(disposed||!detail?.tile||!Array.isArray(detail.records)||!Array.isArray(game.origin)||!game.origin.slice(0,2).every(Number.isFinite))return;remove(detail.tile);const candidates=detail.records.filter(r=>['MAJOR STREET','COLLECTOR','COUNTY HIGHWAY','LOCAL'].includes(r?.kind)&&Array.isArray(r.points)&&r.points.length>1&&r.points.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])));if(!candidates.length)return;
    const cars=[];for(let i=0;i<Math.min(9,candidates.length*2);i++){const road=candidates[(i*7+Math.floor(i/3))%candidates.length],pts=road.points.map(p=>[p[0]-game.origin[0],game.origin[1]-p[1]]),seg=(i*3)%Math.max(1,pts.length-1),a=pts[seg],b=pts[seg+1];if(!a||!b)continue;const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<15)continue;cars.push({pts,seg,length,t:(i*.271)%1,lane:(i%2?1:-1)*(road.kind==='LOCAL'?1.2:2.5),speed:5+(i%5)*1.7,color:[0xd94d56,0xe5d9c2,0x3976a3,0x252b34,0xc1a53f,0x42a18d][i%6]});}
    if(!cars.length)return;const group=new THREE.Group();group.name=`Las Vegas moving traffic · ${detail.tile}`;const cap=cars.length,body=new THREE.InstancedMesh(bodyGeo,bodyMat,cap),roof=new THREE.InstancedMesh(roofGeo,roofMat,cap),lamps=new THREE.InstancedMesh(lampGeo,lampMat,cap*2);body.count=roof.count=cap;lamps.count=cap*2;body.frustumCulled=roof.frustumCulled=lamps.frustumCulled=false;
    for(let i=0;i<cap;i++){body.setColorAt(i,new THREE.Color(cars[i].color));}
    group.add(body,roof,lamps);game.scene.add(group);active.set(detail.tile,{group,cars,body,roof,lamps});
  }
  function update(dt){if(disposed||!active.size||!Number.isFinite(dt)||dt<=0)return;accumulator+=Math.min(dt,.08);if(accumulator<.05)return;const step=accumulator;accumulator=0;vehicleCells.clear();for(const [id,v]of active){if(!game.loaded.has(id)){remove(id);continue;}let li=0;for(let i=0;i<v.cars.length;i++){const c=v.cars[i];if(!advanceTrafficCar(c,step))continue;
      const a=c.pts[c.seg],b=c.pts[c.seg+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.max(.01,Math.hypot(dx,dz)),x=a[0]+dx*c.t-dz/len*c.lane,z=a[1]+dz*c.t+dx/len*c.lane,y=game.roads.sample(x,z);if(!Number.isFinite(y))continue;const yaw=Math.atan2(dx,dz);c.x=x;c.z=z;c.y=y;c.yaw=yaw;c.worldTime=performance.now();const key=`${Math.floor(x/12)},${Math.floor(z/12)}`;if(!vehicleCells.has(key))vehicleCells.set(key,[]);vehicleCells.get(key).push(c);
      dummy.position.set(x,y+1.05,z);dummy.rotation.set(0,yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();v.body.setMatrixAt(i,dummy.matrix);
      dummy.position.set(x,y+2.08,z);dummy.scale.set(1,1,1);dummy.updateMatrix();v.roof.setMatrixAt(i,dummy.matrix);
      for(const side of [-1,1]){dummy.position.set(x+Math.sin(yaw)*2.08+Math.cos(yaw)*1.45*side,y+1.1,z+Math.cos(yaw)*2.08-Math.sin(yaw)*1.45*side);dummy.scale.set(1,1,1);dummy.updateMatrix();v.lamps.setMatrixAt(li++,dummy.matrix);}
    }v.body.instanceMatrix.needsUpdate=v.roof.instanceMatrix.needsUpdate=v.lamps.instanceMatrix.needsUpdate=true;}}
  const onRoads=e=>add(e);window.addEventListener('jc-roads-loaded',onRoads);listeners.push(['jc-roads-loaded',onRoads]);const timer=setInterval(()=>{for(const id of active.keys())if(!game.loaded.has(id))remove(id);},1800);
  function vehicleAt(x,z,radius=3){if(disposed||!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<0)return null;radius=Math.min(radius,120);const cx=Math.floor(x/12),cz=Math.floor(z/12),reach=Math.ceil((radius+2.2)/12);for(let a=-reach;a<=reach;a++)for(let b=-reach;b<=reach;b++)for(const c of vehicleCells.get(`${cx+a},${cz+b}`)||[])if(Math.hypot(c.x-x,c.z-z)<radius+2.2)return {x:c.x,z:c.z,speed:c.speed};return null;}
  return {update,vehicleAt,stats:()=>({tiles:active.size,vehicles:[...active.values()].reduce((n,v)=>n+v.cars.length,0)}),dispose(){disposed=true;clearInterval(timer);for(const [event,fn]of listeners)window.removeEventListener(event,fn);for(const v of active.values())game.scene.remove(v.group);active.clear();bodyGeo.dispose();roofGeo.dispose();lampGeo.dispose();bodyMat.dispose();roofMat.dispose();lampMat.dispose();}};
}
