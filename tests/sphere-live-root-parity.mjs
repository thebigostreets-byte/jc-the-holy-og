import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const root=get('city-environment.js'),dist=get('dist/client/city-environment.js');
for(const [name,src] of [['root',root],['dist',dist]]){
 const sphere=src.slice(src.indexOf('function addSphere('),src.indexOf('function addWater('));
 assert.match(sphere,/terrainSampler\(game\.loaded\.get\(tileAt\(feature\.lon,feature\.lat\)\)\)/,name+' terrain sampler');
 assert.match(sphere,/Number\.isFinite\(terrainY\)\?terrainY:Number\.isFinite\(roadY\)\?roadY:0/,name+' fallback');
 assert.match(sphere,/globe\.position\.set\(x,y\+95,z\)/,name+' globe placement');
 assert.match(sphere,/base\.position\.set\(x,y\+13,z\)/,name+' base placement');
}
assert.match(get('map-engine.js'),/from '\.\/city-environment\.js\?v=sphere-terrain-20261120'/);
assert.match(get('map.html'),/\.\/map-engine\.js\?v=sphere-terrain-20261120/);
console.log('Sphere Pages root/dist parity and cache bust checks passed');
