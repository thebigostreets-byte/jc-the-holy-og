import assert from 'node:assert/strict';
import {createPhotorealDetailMaps,applyPhotorealMaterial,applyCasinoMirrorMaterial,createCityMirrorMap} from '../photorealism-pbr.js';
class DataTexture {
  constructor(data,width,height,format){Object.assign(this,{data,width,height,format});}
}
const THREE={DataTexture,RGBAFormat:'rgba',RepeatWrapping:'repeat',LinearFilter:'linear',LinearMipmapLinearFilter:'mipmap',NoColorSpace:'none'};
const maps=createPhotorealDetailMaps(THREE);
assert.equal(maps.bump.width,128);
assert.equal(maps.roughness.width,128);
assert.equal(maps.bump.wrapS,'repeat');
assert.equal(maps.roughness.colorSpace,'none');
const home={roughness:.35,metalness:.7};
applyPhotorealMaterial(THREE,home,maps,{casino:false,buildingHeight:8});
assert.equal(home.bumpMap,maps.bump);
assert.equal(home.roughnessMap,maps.roughness);
assert.equal(home.roughness,.78);
assert.equal(home.metalness,0);
assert.equal(home.bumpScale,.04);
const casino={roughness:.5,metalness:.1};
applyPhotorealMaterial(THREE,casino,maps,{casino:true,buildingHeight:90});
assert.equal(casino.roughness,.5);
assert.equal(casino.metalness,.1);
assert.equal(casino.bumpScale,.012);
const groundMirror={id:'strip-aerial-reflection'};
const casinoTower={roughness:.8,metalness:0,userData:{},map:{id:'building-photo'}};
applyCasinoMirrorMaterial(casinoTower,groundMirror,{casino:true,height:65});
assert.equal(casinoTower.envMap,groundMirror);
assert.equal(casinoTower.map.id,'building-photo','building texture must remain intact');
assert.ok(casinoTower.metalness>=.43);
assert.ok(casinoTower.roughness<=.25);
assert.equal(casinoTower.userData.jcMirrorFacade,true);
const ordinary={roughness:.85,metalness:0,userData:{}};
applyCasinoMirrorMaterial(ordinary,groundMirror,{casino:false,height:70});
assert.equal(ordinary.envMap,undefined,'non-casino buildings stay matte');
assert.equal(createCityMirrorMap(THREE,{enabled:false}),null,'fallback should skip reflection');
console.log('PASS: PBR maps, casino mirror treatment, matte buildings and fallback');
