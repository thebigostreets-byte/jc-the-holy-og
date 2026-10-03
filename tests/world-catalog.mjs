import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITEM_TYPES,createWorldCatalog} from '../world-catalog.js';

const values=new Map();
const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
const catalog=createWorldCatalog(storage),place={id:'casino:test',name:'Test Casino',kind:'casino',entry:{x:1,y:0,z:2},spawn:{x:1,y:0,z:2}};
catalog.registerPlace(place);
const action={itemType:'medkit',placeId:place.id};
const first=catalog.promiseItem(action,{id:'host-1'});
assert.ok(first,'registered place and item type produce a physical promise');
assert.equal(catalog.inventory.get('medkit')||0,0,'promising an item does not grant inventory');
assert.equal(catalog.promiseItem(action,{id:'host-1'}).item.id,first.item.id,'repeat dialogue reuses the same promise');
assert.equal(catalog.collect(first.item.id).type,'medkit','pickup credits the requested item');
assert.equal(catalog.collect(first.item.id),null,'a physical item can only be collected once');
assert.equal(catalog.inventory.get('medkit'),1);
assert.equal(catalog.promiseItem(action,{id:'host-1'}),null,'one NPC cannot farm repeated copies of a completed promise');
assert.equal(catalog.promiseItem({itemType:'unknown',placeId:place.id},{id:'other'}),null);
assert.equal(catalog.promiseItem({itemType:'battery',placeId:'unregistered'},{id:'other'}),null);
const restored=createWorldCatalog(storage);restored.registerPlace(place);
assert.equal(restored.inventory.get('medkit'),1,'inventory persists across reloads');
assert.equal(restored.items.get(first.item.id).collected,true,'collected world items persist');

for(const file of ['data/vegas-flood-conveyances.geojson','data/nellis-flood-conveyances.geojson']){
 const data=JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
 assert.equal(data.crs.properties.name,'EPSG:32611');
 assert.ok(data.features.length>0);
 assert.match(data.metadata.important,/fictional/i,'GIS alignments are clearly distinguished from playable access');
}
assert.ok(ITEM_TYPES.some(item=>item.id==='medkit'));
console.log('PASS: item promises, physical collection, anti-farming, persistence, and mapped route disclosures.');
