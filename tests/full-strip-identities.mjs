import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../physical-building-materials.js',import.meta.url),'utf8')
  .replace("import * as THREE from './three.module.js';","const THREE = {};")
  .replace("import {generatedBuildingKind} from './generated-materials.js';","const generatedBuildingKind=()=>null;")
  .replace("import {identityPalette} from './building-identities.js';","const identityPalette=()=>null;")
  .replace(/export /g,'')+
  '\n globalThis.__testExports={CASINO_PROPERTIES,classifyBuilding};';
const context=vm.createContext({setTimeout,clearTimeout});
vm.runInContext(source,context);
const {CASINO_PROPERTIES,classifyBuilding}=context.__testExports;

assert.ok(CASINO_PROPERTIES.length >= 25,'casino identity coverage spans the full Strip');
for(const [name,longitude,latitude] of CASINO_PROPERTIES){
  const result=classifyBuilding({longitude,latitude,heightMetres:80});
  assert.equal(result.type,'casino',name+' is recognized as a casino property');
  assert.equal(result.name,name,name+' retains its specific identity');
}
assert.equal(classifyBuilding({longitude:-115.1564,latitude:36.1425,heightMetres:80}).name,'Sahara Las Vegas');
assert.equal(classifyBuilding({longitude:-115.1757,latitude:36.0919,heightMetres:80}).name,'Mandalay Bay');
assert.equal(classifyBuilding({longitude:-115.205,latitude:36.13,heightMetres:8}).type,'residential');
assert.notEqual(classifyBuilding({longitude:-115.18,latitude:36.13,heightMetres:8}).type,'casino');
console.log('PASS: full-Strip casino identities and matte neighborhood classification');
