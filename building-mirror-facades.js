import * as THREE from './three.module.js';
import {cloneBuildingMaterial} from './map-materials.js';
import {createCityMirrorMap,applyCasinoMirrorMaterial} from './photorealism-pbr.js';

// Attach to the existing source renderer. Do not create any new scene or
// per-building reflection cameras; the packaged ground tile is shared.
const studio=window.studio;
if(studio?.buildings&&studio?.renderer){
  const enabled=!!studio.renderer.capabilities.isWebGL2&&!studio.legacySpec;
  const sharedReflection=createCityMirrorMap(THREE,{enabled,lowSpec:studio.lowSpec});
  let enhanced=0;
  function reflectBuilding(building){
    if(!sharedReflection||building?.userData?.identity?.type!=='casino')return;
    const height=Number(building.userData.heightMetres)||0;
    if(height<24)return;
    building.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.material?.name?.endsWith('_walls')||mesh.userData.jcMirrorFacade)return;
      // Existing city materials can be shared; copy before changing this wall.
      if(!mesh.userData.jcMaterialClone){
        mesh.material=cloneBuildingMaterial(mesh.material);
        mesh.userData.jcMaterialClone=true;
      }
      const material=mesh.material;
      applyCasinoMirrorMaterial(material,sharedReflection,{casino:true,height,lowSpec:studio.lowSpec});
      material.userData.original ||= {};
      material.userData.original.roughness=material.roughness;
      material.userData.original.metalness=material.metalness;
      // Game modes can theme the building again. Keep the specular strength
      // without changing edited color, original photo maps, or other effects.
      const previous=mesh.onBeforeRender;
      const targetMetalness=material.metalness;
      mesh.onBeforeRender=function(...args){
        if(previous)previous.apply(this,args);
        if(this.material?.userData?.jcMirrorFacade&&this.material.metalness<targetMetalness)
          this.material.metalness=targetMetalness;
      };
      mesh.userData.jcMirrorFacade=true;
      enhanced++;
    });
  }
  for(const building of studio.buildings.values())reflectBuilding(building);
  const originalSet=studio.buildings.set;
  studio.buildings.set=function(id,building){
    const result=originalSet.call(this,id,building);
    reflectBuilding(building);
    return result;
  };
  window.JC_BUILDING_REFLECTIONS={enabled:!!sharedReflection,facades:()=>enhanced,shared:true,source:'assets/imagery/C15_R14.jpg'};
}
