import assert from 'node:assert/strict';
import {selectCityTileWindow,selectDetailedTiles} from '../city-tile-window.js';

const sections=Array.from({length:35*35},(_,i)=>({id:`C${String(i%35).padStart(2,'0')}_R${String(Math.floor(i/35)).padStart(2,'0')}`,column:i%35,row:Math.floor(i/35)}));
let checked=0;
for(let row=0;row<35;row++)for(let column=0;column<35;column++){
  const center={column,row};
  const window=selectCityTileWindow(sections,center,10);
  assert.equal(window.length,100,`window coverage at ${column},${row}`);
  assert.equal(new Set(window.map(s=>s.id)).size,100,`duplicate sections at ${column},${row}`);
  assert.ok(window.some(s=>s.column===column&&s.row===row),`missing center at ${column},${row}`);
  assert.ok(window.every(s=>s.column>=0&&s.column<35&&s.row>=0&&s.row<35));
  const distances=window.map(s=>Math.abs(s.column-column)+Math.abs(s.row-row));
  assert.ok(distances.every((d,i)=>i===0||distances[i-1]<=d),`unstable distance ordering at ${column},${row}`);
  const desktop=selectDetailedTiles(window,center);
  const mobile=selectDetailedTiles(window,center,{lowSpec:true});
  const legacy=selectDetailedTiles(window,center,{legacySpec:true});
  assert.ok(desktop.length<=25&&desktop.length>=9,`desktop budget at ${column},${row}`);
  assert.ok(mobile.length<=9&&mobile.length>=4,`mobile budget at ${column},${row}`);
  assert.equal(legacy.length,1,`legacy budget at ${column},${row}`);
  assert.ok(mobile.every(s=>desktop.includes(s))&&legacy.every(s=>mobile.includes(s)),`detail tiers must nest at ${column},${row}`);
  checked++;
}
assert.deepEqual(selectCityTileWindow([],{column:0,row:0},10),[]);
for(const size of [0,-1,1.5,NaN])assert.throws(()=>selectCityTileWindow(sections,{column:0,row:0},size),RangeError);
for(const center of [null,{column:Infinity,row:0},{column:0,row:NaN}])assert.throws(()=>selectCityTileWindow(sections,center,10),TypeError);
console.log(`PASS: ${checked} city centers, coverage, order, nested detail budgets and invalid inputs`);
