import * as THREE from './three.module.js';
import {cloneBuildingMaterial} from './map-materials.js';

// Eight compass captures and one roof capture. Ground views deliberately cover
// only low elevations: intermediate flight angles retain the original mesh.
export function buildingViewIndex(dx,dy,dz,previous=-1){
  const horizontal=Math.hypot(dx,dz);
  if(dy>horizontal*2)return 8;
  if(Math.abs(dy)>horizontal*.65)return -1;
  const angle=(Math.atan2(dx,dz)+Math.PI*2)%(Math.PI*2);
  if(previous>=0&&previous<8){
    const delta=Math.atan2(Math.sin(angle-previous*Math.PI/4),Math.cos(angle-previous*Math.PI/4));
    if(Math.abs(delta)<Math.PI/8+.035)return previous;
  }
  return Math.round(angle/(Math.PI/4))%8;
}

export function createBuildingImpostors(game,{mobile=false,enabled=true}={}){
  const {renderer,scene,camera,buildings,chunks}=game;
  const records=new Map(),limit=mobile?4:8,tileSize=mobile?128:192;
  const planeGeometry=new THREE.PlaneGeometry(1,1);
  const direction=new THREE.Vector3(),viewport=new THREE.Vector4(),scissor=new THREE.Vector4();
  let nextScan=0,nextCaptureAt=0,failed=false,bakedFrames=0,lastLighting='',captureLights=null;
  const captureScene=new THREE.Scene();
  const captureCamera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000);
  function signature(ob){
    return ob.children.filter(m=>m.isMesh).map(m=>{
      const a=m.material;
      return [m.visible,m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),a.uuid,a.map?.uuid,a.color?.getHex(),a.emissive?.getHex(),a.emissiveIntensity,a.roughness,a.metalness].join(':');
    }).join('|');
  }
  function restore(r){if(r.hidden){r.ob.visible=true;r.hidden=false;}r.plane.visible=false;}
  function release(r){
    restore(r);scene.remove(r.plane);r.plane.material.dispose();r.target.dispose();
    r.capture.children.forEach(m=>m.material.dispose());records.delete(r.id);
  }
  function lightsForCapture(){
    if(!captureLights){captureLights=[];scene.traverse(o=>{if(o.isDirectionalLight||o.isHemisphereLight||o.isAmbientLight)captureLights.push(o);});}
    return captureLights;
  }
  function make(id,ob){
    const capture=new THREE.Group();
    for(const m of ob.children){
      if(!m.isMesh||!m.visible||Array.isArray(m.material))continue;
      const copy=new THREE.Mesh(m.geometry,cloneBuildingMaterial(m.material));
      copy.position.copy(m.position);copy.quaternion.copy(m.quaternion);copy.scale.copy(m.scale);capture.add(copy);
    }
    if(!capture.children.length)return;
    const box=new THREE.Box3().setFromObject(capture),center=box.getCenter(new THREE.Vector3());
    const radius=Math.max(1,box.getSize(new THREE.Vector3()).length()*.52);
    capture.position.sub(center);
    const target=new THREE.WebGLRenderTarget(tileSize*3,tileSize*3,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false});
    target.texture.generateMipmaps=false;
    const material=new THREE.MeshBasicMaterial({map:target.texture,transparent:false,alphaTest:.08,side:THREE.DoubleSide});
    const plane=new THREE.Mesh(planeGeometry,material);plane.visible=false;plane.scale.setScalar(radius*2);scene.add(plane);
    const r={id,ob,capture,center,radius,target,plane,frame:0,view:-1,hidden:false,signature:signature(ob),transform:ob.matrixWorld.elements.join(',')};
    records.set(id,r);
  }
  function bake(r){
    captureScene.clear();captureScene.add(r.capture);
    for(const light of lightsForCapture())captureScene.add(light.clone());
    captureScene.environment=scene.environment;captureScene.environmentIntensity=scene.environmentIntensity;
    const i=r.frame,angle=i*Math.PI/4,R=r.radius;
    captureCamera.left=captureCamera.bottom=-R;captureCamera.right=captureCamera.top=R;
    captureCamera.near=.1;captureCamera.far=R*10;captureCamera.updateProjectionMatrix();
    captureCamera.up.set(0,i===8?0:1,i===8?-1:0);
    captureCamera.position.set(i===8?0:Math.sin(angle)*R*4,i===8?R*4:R*.6,i===8?0:Math.cos(angle)*R*4);
    captureCamera.lookAt(0,0,0);
    const oldTarget=renderer.getRenderTarget(),oldClear=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
    const oldTone=renderer.toneMapping,oldAuto=renderer.autoClear,oldScissor=renderer.getScissorTest();
    renderer.getViewport(viewport);renderer.getScissor(scissor);
    try{
      renderer.toneMapping=THREE.NoToneMapping;renderer.autoClear=true;renderer.setRenderTarget(r.target);
      renderer.setViewport((i%3)*tileSize,Math.floor(i/3)*tileSize,tileSize,tileSize);
      renderer.setScissor((i%3)*tileSize,Math.floor(i/3)*tileSize,tileSize,tileSize);renderer.setScissorTest(true);
      renderer.setClearColor(0x000000,0);renderer.render(captureScene,captureCamera);
      r.frame++;bakedFrames++;
    }finally{
      renderer.setRenderTarget(oldTarget);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(oldScissor);
      renderer.setClearColor(oldClear,oldAlpha);renderer.toneMapping=oldTone;renderer.autoClear=oldAuto;
    }
  }
  function scan(now){
    if(now<nextScan)return;nextScan=now+1800;
    const lighting=[scene.environment?.uuid,scene.environmentIntensity,...lightsForCapture().flatMap(o=>[o.color.getHex(),o.intensity])].join(':');
    if(lastLighting&&lighting!==lastLighting)for(const r of [...records.values()])release(r);
    lastLighting=lighting;
    for(const r of records.values()){
      if(buildings.get(r.id)!==r.ob||chunks.has(r.id)||signature(r.ob)!==r.signature||r.ob.matrixWorld.elements.join(',')!==r.transform)release(r);
    }
    if(records.size>=limit)return;
    const candidates=[];
    for(const [id,ob] of buildings)if(ob.parent?.userData.jcThemeApplied&&ob.userData.heightMetres>=20&&!chunks.has(id)&&ob.children.every(m=>m.visible))candidates.push([id,ob]);
    candidates.sort((a,b)=>(b[1].userData.heightMetres||0)-(a[1].userData.heightMetres||0));
    for(const [id,ob] of candidates){if(records.size>=limit)break;if(!records.has(id)){ob.updateWorldMatrix(true,true);make(id,ob);}}
  }
  function update(now,dt,playing=true){
    if(!enabled||failed||!playing){for(const r of records.values())restore(r);return;}
    scan(now);let workDone=false;
    try{
      for(const r of records.values()){
        if(buildings.get(r.id)!==r.ob||chunks.has(r.id)){release(r);continue;}
        if(r.frame<9){if(!workDone&&dt<.035&&now>=nextCaptureAt){bake(r);nextCaptureAt=now+(mobile?160:60);workDone=true;}continue;}
        r.plane.position.copy(r.center);r.ob.localToWorld(r.plane.position);
        direction.subVectors(camera.position,r.plane.position);
        const view=buildingViewIndex(direction.x,direction.y,direction.z,r.view),distance=direction.length();
        const threshold=Math.max(240,r.radius*10)*(r.hidden?.9:1.1);
        if(view<0||distance<threshold){restore(r);continue;}
        r.view=view;r.target.texture.repeat.set(1/3,1/3);r.target.texture.offset.set((view%3)/3,Math.floor(view/3)/3);
        r.plane.quaternion.copy(camera.quaternion);r.plane.visible=true;r.ob.visible=false;r.hidden=true;
      }
    }catch(error){failed=true;for(const r of records.values())restore(r);console.warn('Building views disabled; original geometry retained',error);}
  }
  return {update,setEnabled(value){enabled=!!value;if(!enabled)for(const r of records.values())restore(r);},
    stats:()=>({enabled,failed,buildings:records.size,ready:[...records.values()].filter(r=>r.frame===9).length,visible:[...records.values()].filter(r=>r.hidden).length,bakedFrames,viewsPerBuilding:9,textureBytes:records.size*tileSize*tileSize*9*4}),
    dispose(){for(const r of [...records.values()])release(r);planeGeometry.dispose();}};
}
