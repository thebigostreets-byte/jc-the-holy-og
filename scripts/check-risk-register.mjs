import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const lines=readFileSync(new URL('../qa/risk-register.csv',import.meta.url),'utf8').trimEnd().split(/\r?\n/);
assert.equal(lines.length,1001,'1000 risks plus header');
const rows=lines.slice(1).map(line=>line.split(','));
assert.deepEqual(rows.map(row=>row[0]),Array.from({length:1000},(_,i)=>String(i+1).padStart(4,'0')),'every risk ID must exist once, in order');
for(const [i,row] of rows.entries()){
 assert.equal(row.length,7,'risk '+(i+1)+' must contain 7 fields');
 assert.ok(row[1],'risk category required');
 assert.ok(['UNTRIAGED','P0','P1','P2','P3'].includes(row[2]),'invalid severity for '+row[0]);
 assert.ok(['UNASSESSED','QUEUED','RUNNING','BLOCKED','FAILED','FIXED','VERIFIED','NOT_APPLICABLE'].includes(row[3]),'invalid status for '+row[0]);
 if(row[3]==='VERIFIED')assert.ok(row[4],'VERIFIED requires evidence for '+row[0]);
}
console.log('PASS: 1000 unique ordered risks, valid statuses, evidence for verified items');
