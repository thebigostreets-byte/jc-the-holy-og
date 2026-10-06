import assert from 'node:assert/strict';
import {createNpcAutonomy,localActionFromText} from '../npc-autonomy.js';

class V {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
}
const player={position:new V(0,0,0)};
const a={id:'authority:a',name:'Ari',faction:'authority',position:new V(0,1.55,0),target:new V(0,1.55,0),state:'idle',emotionUntil:0};
const c={id:'civilian:c',name:'Cam',faction:'civilian',position:new V(2,1.55,0),target:new V(2,1.55,0),state:'fear',emotionUntil:0,health:40,prayerPending:true};
const d={id:'demon:d',name:'Dax',faction:'demon',position:new V(4,1.55,0),target:new V(4,1.55,0),state:'idle',emotionUntil:0};
const remembered=[],reports=[];
const sys=createNpcAutonomy({npcs:[a,c,d],player,groundAt:()=>0,isSafe:()=>true,remember:(npc,text)=>remembered.push([npc.id,text]),onReport:t=>reports.push(t)});

assert.equal(localActionFromText('Come with me'),'follow-player');
assert.equal(localActionFromText('Help that person'),'help-nearest');
assert.equal(localActionFromText('Patrol this area'),'patrol-area');
assert.equal(localActionFromText('just saying hello'),null);

const goal=sys.command(a,'help-nearest','player');
assert.equal(goal.type,'help-nearest');
a.position.copy(a.target);
sys.update(1000);
const finish=a.goal.performUntil+1;
sys.update(finish);
assert.ok(c.health>40,'scripted help changes NPC state without an AI call');
assert.equal(c.prayerPending,false);
assert.ok(reports.some(x=>/HELPED/.test(x)));

const corrupt=sys.command(d,'corrupt-nearest','script');
assert.equal(corrupt.type,'corrupt-nearest');
d.position.copy(d.target);
sys.update(finish+1000);
const corruptFinish=d.goal.performUntil+1;
sys.update(corruptFinish);
assert.ok(c.alignmentScore<0,'demon corruption is deterministic local gameplay');
assert.ok(remembered.length>=2);

const follow=sys.commandFromText(a,'follow me','player');
assert.equal(follow.type,'follow-player');
player.position.x=20;
sys.update(corruptFinish+2000);
assert.ok(a.target.x>10,'follow routine retargets toward player');
console.log('PASS: deterministic NPC autonomy executes help, corruption and follow actions without per-frame AI.');
