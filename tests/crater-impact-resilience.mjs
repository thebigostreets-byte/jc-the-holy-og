import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../crater-system.js',import.meta.url),'utf8');
const dist=readFileSync(new URL('../dist/client/crater-system.js',import.meta.url),'utf8');
assert.equal(src,dist,'authored and deployable modules are identical');
let checks=1;
const listeners=new Map(),removed=[];
const window={addEventListener(name,fn){listeners.set(name,fn)},removeEventListener(name,fn){removed.push(name);assert.equal(listeners.get(name),fn);checks++}};
const ctx=vm.createContext({window,performance:{now:()=>1000},Math,Number,Array,Float32Array,THREE:{}});
vm.runInContext(src.replace(/^import .*\n/m,'').replace(/export /g,''),ctx);
const depth=ctx.craterDepth;
function eq(a,b,msg){assert.equal(a,b,msg);checks++}
const good={x:0,z:0,radius:12,depth:3.2};
eq(depth(0,0,[good]),3.2,'valid crater center remains 3.2 m');
eq(depth(12,0,[good]),0,'crater edge stays flush');
eq(depth(6,0,[good]),1.8,'valid crater falloff is preserved');
for(const bad of [{...good,depth:NaN},{...good,radius:-12},{...good,radius:0},{...good,depth:Infinity},null,{...good,x:NaN}]){
 eq(depth(0,0,[bad,good]),3.2,'corrupt crater record cannot poison terrain');
}
eq(depth(NaN,0,[good]),0,'corrupt sample coordinate remains flat');
eq(depth(0,0,null),0,'missing crater collection remains flat');
let traversals=0,matrices=0;
const scene={updateMatrixWorld(){matrices++},traverse(fn){traversals++}};
const system=ctx.createCraterSystem({scene},true);
for(const invalid of [null,undefined,{}, {x:NaN,z:0},{x:0,z:Infinity},{x:'0',z:0}]){
 eq(system.strike(invalid),null,'invalid impact is ignored');
}
eq(system.records.length,0,'bad impacts do not consume mobile crater budget');
eq(traversals,0,'bad impacts do not trigger geometry traversal');
const c=system.strike({x:3,z:4});assert.ok(c&&c.x===3&&c.z===4);checks++;
eq(system.records.length,1,'valid impact remains active');
eq(traversals,1,'valid impact triggers geometry update');
system.update(NaN);eq(system.records.length,1,'invalid clock does not alter active impacts');
system.update(10000);eq(system.records.length,0,'expired impacts are removed');
const saved={dispose(){this.disposed=true}},temp={dispose(){this.disposed=true}},mesh={userData:{jcCraterBase:saved,jcCraterVertexColors:false,craterKey:'1',craters:[c]},geometry:temp,material:{vertexColors:true,needsUpdate:false}};
scene.traverse=fn=>{traversals++;fn(mesh)};
system.dispose();eq(mesh.geometry,saved,'dispose restores source geometry');
eq(temp.disposed,true,'temporary impact geometry is freed');
eq(mesh.material.vertexColors,false,'original material setting restored');
eq(mesh.userData.jcCraterBase,undefined,'backup reference released');
eq(mesh.userData.craterKey,undefined,'stale crater cache cleared');
eq(removed.length,2,'load event listeners removed');
system.dispose();eq(removed.length,2,'dispose is idempotent');
eq(system.strike({x:0,z:0}),null,'disposed system cannot create impacts');
console.log(`PASS: ${checks} crater impact resilience assertions`);
