import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../landmark-variants.js',import.meta.url),'utf8');
const deployed=readFileSync(new URL('../dist/client/landmark-variants.js',import.meta.url),'utf8');
const specs=source.slice(source.indexOf('export const LANDMARK_SPECS'),source.indexOf('export function localLandmarkPoint'));

test('landmark source and Pages deployment are identical',()=>assert.equal(source,deployed));
test('four distinct landmark specs and coordinates exist',()=>{
 for(const id of ['luxor','angelic','speedway','endOfHim'])assert.ok(specs.includes(id+': Object.freeze('));
 assert.equal((specs.match(/longitude:/g)||[]).length,4);
});
test('Angelic Stadium keeps its player-facing name and entrance signs',()=>{
 assert.ok(specs.includes("name:'Angelic Stadium'"));
 assert.ok(source.includes("addSign(stadium,'ANGELIC STADIUM'"));
 assert.ok(source.includes("for(const side of [-1,1])addSign(stadium"));
});
test('white Luxor and 3800m heavenly beam remain',()=>{
 assert.ok(specs.includes('beamMetres:3800'));
 assert.ok(source.includes('White Luxor pyramid'));
 assert.ok(source.includes('material(0xf8f7f0'));
 assert.ok(source.includes('Luxor heavenly sky beam'));
});
test('END OF HIM is Hell-only with the original distant cutout',()=>{
 assert.ok(specs.includes("name:'END OF HIM'"));
 assert.ok(specs.includes('hellOnly:true'));
 assert.ok(source.includes('hell.visible=hellMode'));
 assert.ok(source.includes('end-of-him-distant.webp'));
});
test('geographic anchors remain in Las Vegas area',()=>{
 const matches=[...specs.matchAll(/longitude:([-\d.]+),latitude:([\d.]+)/g)];
 assert.equal(matches.length,4);
 for(const m of matches){const lon=Number(m[1]),lat=Number(m[2]);assert.ok(lon>-115.5&&lon<-114.9&&lat>35.9&&lat<36.4);}
});
