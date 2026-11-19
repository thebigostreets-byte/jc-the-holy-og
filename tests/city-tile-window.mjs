import assert from 'node:assert/strict';
import {selectCityTileWindow,selectDetailedTiles} from '../city-tile-window.js';
const sections=Array.from({length:35*35},(_,i)=>({id:'C'+String(i%35).padStart(2,'0')+'_R'+String(Math.floor(i/35)).padStart(2,'0'),column:i%35,row:Math.floor(i/35)}));
for(const [col,row] of [[17,17],[0,0],[34,34],[0,34],[34,0],[2,30],[31,3]]) {
  const center={column:col,row},window=selectCityTileWindow(sections,center,10);
  assert.equal(window.length,100,'10x10 window always covers 100 sections, even on edges');
  assert.equal(new Set(window.map(x=>x.id)).size,100,'window has no duplicates');
  assert.ok(window.some(x=>x.column===col&&x.row===row),'window includes requested center');
  assert.equal(Math.max(...window.map(x=>x.column))-Math.min(...window.map(x=>x.column))+1,10);
  assert.equal(Math.max(...window.map(x=>x.row))-Math.min(...window.map(x=>x.row))+1,10);
}
const middle=selectCityTileWindow(sections,{column:17,row:17},10);
assert.equal(selectDetailedTiles(middle,{column:17,row:17}).length,25,'desktop renders max 5x5 near detail');
assert.equal(selectDetailedTiles(middle,{column:17,row:17},{lowSpec:true}).length,9,'mobile renders max 3x3 near detail');
assert.equal(selectDetailedTiles(middle,{column:17,row:17},{legacySpec:true}).length,1,'low-memory renders one 3D tile');
const near=selectCityTileWindow(sections,{column:0,row:0},10);
assert.equal(selectDetailedTiles(near,{column:0,row:0}).length,9,'near city edge fewer 3D groups are needed');
assert.equal(selectCityTileWindow(sections,{column:17,row:17},5).length,25,'legacy 5x5 window remains available');
assert.equal(selectCityTileWindow(sections.filter(s=>s.id!=='C17_R17'),{column:17,row:17},10).length,99,'missing source tiles cannot become invented data');
console.log('PASS: 10x10 grid coverage, edge shifting, no duplicates, near-detail budgets and sparse sections.');
