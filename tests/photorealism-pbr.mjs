import assert from 'node:assert/strict';
import {createPhotorealDetailMaps,applyPhotorealMaterial} from '../photorealism-pbr.js';
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
console.log('PASS: shared photoreal PBR maps and building-specific material tuning');
