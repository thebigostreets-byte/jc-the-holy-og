import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isolatePose,POSE_FRAME_WIDTH,POSE_FRAME_HEIGHT,POSE_FRAME_BOTTOM_PADDING} from '../pose-cleanup.js';

const width=100,height=100,data=new Uint8ClampedArray(width*height*4);
function rect(x0,y0,x1,y1,alpha=255){
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)data[(y*width+x)*4+3]=alpha;
}
// One body plus two nearby disconnected shoes, and a remote fragment from
// another pose that must not survive extraction.
rect(40,20,60,70);
rect(42,73,47,79);
rect(53,73,58,79);
rect(4,8,15,19);
const result=isolatePose(data,width,height);
assert.equal(result.components,4,'fixture contains body, two shoes, and one remote pose fragment');
assert.equal(result.keptComponents,3,'body and both nearby shoes are retained');
assert.ok(data[(75*width+44)*4+3]>0,'left shoe remains visible');
assert.ok(data[(75*width+55)*4+3]>0,'right shoe remains visible');
assert.equal(data[(12*width+9)*4+3],0,'remote pose fragment is removed');
assert.equal(POSE_FRAME_WIDTH,256);
assert.equal(POSE_FRAME_HEIGHT,384);
assert.ok(POSE_FRAME_BOTTOM_PADDING>=8,'frame leaves a safe bottom gutter');

const cleanup=readFileSync(new URL('../pose-cleanup.js',import.meta.url),'utf8');
const atlas=readFileSync(new URL('../rear-walk.js',import.meta.url),'utf8');
const game=readFileSync(new URL('../jc-map-game.js',import.meta.url),'utf8');
assert.match(cleanup,/const drawY=POSE_FRAME_HEIGHT-bottomPadding-drawHeight/,'silhouette is fitted above the safe bottom gutter');
assert.match(atlas,/ctx\.drawImage\(image,rect\[0\],rect\[1\],rect\[2\],rect\[3\],0,0,tile\.width,tile\.height\)/,'each pose is cropped to its own atlas cell');
assert.match(atlas,/const frame=cleanPoseImage\(tile\)/,'each cropped cell is isolated and normalized');
assert.match(game,/POSE_FRAME_BOTTOM_PADDING\/POSE_FRAME_HEIGHT/,'sprite plane is anchored so shoes meet the ground');
console.log('PASS: both feet survive cleanup, remote pose fragments are removed, and all frames share a safe full-body canvas and ground anchor.');
