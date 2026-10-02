import * as THREE from './three.module.js';

function prepareRoute(route) {
  let total=0;
  const cumulative=[0];
  for(let i=0;i<route.points.length-1;i++){
    total+=Math.hypot(route.points[i+1][0]-route.points[i][0],route.points[i+1][1]-route.points[i][1]);
    cumulative.push(total);
  }
  return {...route,cumulative,total};
}

function sampleRoute(car) {
  const route=car.route,distance=Math.max(0,Math.min(route.total,car.distance));
  let index=0;
  while(index<route.cumulative.length-2&&route.cumulative[index+1]<distance)index++;
  const a=route.points[index],b=route.points[index+1],segmentLength=Math.max(.001,route.cumulative[index+1]-route.cumulative[index]);
  const t=(distance-route.cumulative[index])/segmentLength,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;
  const lane=car.direction>0?-car.lane:car.lane;
  return {x:a[0]+dx*t-dz/length*lane,z:a[1]+dz*t+dx/length*lane,yaw:Math.atan2(dx,dz)+(car.direction<0?Math.PI:0)};
}

export function createTrafficSystem({scene,network,groundAt,mobile=false,count}={}) {
  const routes=(network?.routes||[]).filter(route=>(route.kind==='arterial'||route.kind==='freeway')&&route.points.length>1).map(prepareRoute).filter(route=>route.total>900);
  const size=Math.max(0,Math.min(40,Math.round(count??(mobile?10:24))));
  const root=new THREE.Group();root.name='JC independent city traffic';root.visible=false;scene.add(root);
  if(!size||!routes.length)return {count:0,update(){},setVisible(){},dispose(){scene.remove(root);}};
  const bodyGeometry=new THREE.BoxGeometry(4.6,1.25,2.05),roofGeometry=new THREE.BoxGeometry(2.1,.72,1.65);
  const bodyMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.48,metalness:.16});
  const roofMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.52,metalness:.08});
  const bodies=new THREE.InstancedMesh(bodyGeometry,bodyMaterial,size),roofs=new THREE.InstancedMesh(roofGeometry,roofMaterial,size);
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);roofs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bodies.frustumCulled=false;roofs.frustumCulled=false;root.add(bodies,roofs);
  const palette=[0xe8e5dc,0x26384a,0x9e352b,0x7d8a92,0x15191f,0xc7a34f,0x466c58,0x9b9da2];
  const cars=Array.from({length:size},(_,index)=>{
    const route=routes[index%routes.length];
    const car={index,route,distance:Math.random()*route.total,direction:index%2?1:-1,lane:2.7,speed:8+Math.random()*7,playerCooldown:0};
    bodies.setColorAt(index,new THREE.Color(palette[index%palette.length]));
    roofs.setColorAt(index,new THREE.Color(palette[(index+3)%palette.length]));
    return car;
  });
  bodies.instanceColor.needsUpdate=true;roofs.instanceColor.needsUpdate=true;
  const dummy=new THREE.Object3D();let lastMatrixUpdate=0;
  function update(dt,now=performance.now(),player,npcs=[],onPlayerImpact=()=>{},onNpcImpact=()=>{}) {
    if(!root.visible||!player||now-lastMatrixUpdate<45)return;
    lastMatrixUpdate=now;
    const step=Math.min(.08,Math.max(0,dt));
    for(const car of cars){
      car.distance+=car.speed*step*car.direction;
      if(car.distance<0){car.distance=0;car.direction=1;}
      else if(car.distance>car.route.total){car.distance=car.route.total;car.direction=-1;}
      const point=sampleRoute(car),ground=groundAt(point.x,point.z);
      car.x=point.x;car.z=point.z;car.y=ground+.72;car.yaw=point.yaw;
      dummy.position.set(car.x,car.y,car.z);dummy.rotation.set(0,car.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();bodies.setMatrixAt(car.index,dummy.matrix);
      dummy.position.y=car.y+.92;dummy.updateMatrix();roofs.setMatrixAt(car.index,dummy.matrix);
      const pd=Math.hypot(car.x-player.position.x,car.z-player.position.z);
      if(pd<3.6&&now>=car.playerCooldown){car.playerCooldown=now+1700;onPlayerImpact(car);}
      for(const npc of npcs){
        if(!npc?.position||now<(npc.trafficCooldownUntil||0))continue;
        if(Math.hypot(car.x-npc.position.x,car.z-npc.position.z)<2.4){npc.trafficCooldownUntil=now+4000;onNpcImpact(npc,car);break;}
      }
    }
    bodies.instanceMatrix.needsUpdate=true;roofs.instanceMatrix.needsUpdate=true;
  }
  return {
    count:size,cars,update,
    setVisible(value){root.visible=!!value;},
    dispose(){scene.remove(root);bodyGeometry.dispose();roofGeometry.dispose();bodyMaterial.dispose();roofMaterial.dispose();}
  };
}
