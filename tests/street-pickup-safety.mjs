import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Vector3 {
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x,y,z){Object.assign(this,{x,y,z});return this;}
 copy(p){return this.set(p.x,p.y,p.z);}
 clone(){return new Vector3(this.x,this.y,this.z);}
 distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z);}
}
class Disposable {constructor(){this.disposals=0;}dispose(){this.disposals++;}}
class Object3D {constructor(){this.position=new Vector3();this.rotation={set(){}};this.scale={setScalar(){}};this.matrix={};}updateMatrix(){}}
class InstancedMesh {constructor(geometry,material,count){Object.assign(this,{geometry,material,count,instanceMatrix:{needsUpdate:false},matrixWrites:0});}setColorAt(){}setMatrixAt(){this.matrixWrites++;}}
const THREE={Vector3,OctahedronGeometry:class extends Disposable{},MeshStandardMaterial:class extends Disposable{},InstancedMesh,Object3D,Color:class {constructor(value){this.value=value;}}};
const source=fs.readFileSync(new URL('../street-pickups.js',import.meta.url),'utf8').replace(/^import .*\n/,'').replace('export function createStreetPickups','function createStreetPickups');
const ctx=vm.createContext({THREE,Math,Number,Map,Array,performance:{now:()=>10000}});
vm.runInContext(source+'\nthis.createStreetPickups=createStreetPickups;',ctx);
function setup(){
 const scene={children:[],add(x){this.children.push(x);},remove(x){this.children=this.children.filter(y=>y!==x);this.removals=(this.removals||0)+1;}};
 const player={position:new Vector3()},messages=[];
 const pickups=ctx.createStreetPickups(scene,player,()=>0,(x,z)=>[x,z],{onStatus:x=>messages.push(x)});
 return {scene,player,pickups,messages,mesh:scene.children[0]};
}
{
 const {player,pickups,mesh}=setup();
 assert.equal(pickups.grantItem('battery',Infinity),false,'nonfinite grants rejected');
 assert.equal(pickups.grantItem('battery',-3),false,'negative grants rejected');
 assert.equal(pickups.grantItem('battery',0),false,'zero grants rejected');
 assert.equal(pickups.grantItem('battery',1.9),true,'finite fractional grants truncated');
 assert.match(pickups.held(),/STORM CELL ×1/);
 assert.equal(pickups.grantItem('battery',100000),true,'large finite grants capped');
 assert.match(pickups.held(),/STORM CELL ×99/);
 assert.equal(pickups.grantItem('battery',1),false,'full inventory refuses grant');
 player.position.set(13,0,0);pickups.update(100,[]);
 assert.equal(pickups.count,0,'full inventory does not consume ground pickup');
 assert.equal(pickups.use(),true);
 pickups.update(101,[]);
 assert.equal(pickups.count,1,'ground pickup fills freed inventory slot');
 assert.match(pickups.held(),/STORM CELL ×99/);
 assert.equal(pickups.drop({x:NaN,y:0,z:0}),false,'bad impact positions rejected');
 assert.equal(pickups.drop({x:3,y:0,z:4}),false,'unexpired pickup cannot be reactivated');
 const writes=mesh.matrixWrites;pickups.update(Infinity,[]);pickups.update(NaN,[]);pickups.update(-10,[]);
 assert.equal(mesh.matrixWrites,writes,'invalid frame times cannot corrupt transforms');
 pickups.dispose();pickups.dispose();
 assert.equal(mesh.geometry.disposals,1,'geometry disposed once');
 assert.equal(mesh.material.disposals,1,'material disposed once');
 assert.equal(pickups.grantItem('medkit'),false,'no mutation after dispose');
 pickups.update(1000);assert.equal(mesh.matrixWrites,writes,'no mesh writes after dispose');
 assert.equal(pickups.use(),false,'no use after dispose');
}
{
 const {pickups}=setup();
 const invalidNpc={position:new Vector3(13,0,0),inventory:{length:0}};
 pickups.update(1000,[invalidNpc]);
 assert.equal(pickups.count,0,'malformed NPC inventory does not crash update');
 const npc={position:new Vector3(13,0,0),inventory:[]};
 pickups.update(1200,[npc]);
 assert.equal(npc.lastPickup,1200,'NPC collects after scan interval');
 const other={position:new Vector3(),inventory:['medkit'],health:NaN,nextItemUse:Infinity};
 pickups.update(1300,[other]);
 assert.equal(other.health,100,'invalid health and item-use timestamp recover');
 assert.equal(other.inventory.length,0);
 assert.equal(pickups.nearestFor({position:{x:Infinity,y:0,z:0}}),null,'invalid NPC location rejected');
}
{
 const {pickups}=setup();
 const npc={position:new Vector3(13,0,0),inventory:[]};
 pickups.update(1000,[]);pickups.update(500,[npc]);
 assert.equal(npc.lastPickup,500,'NPC scans resume after clock rollback');
}
console.log('PASS: bounded inventory, invalid grants, full pickup handling, frame guard, NPC corruption recovery, clock rollback, lifecycle cleanup.');
