import * as THREE from './three.module.js';

export const NPC_CUTOUT_ANGLES = 8;
export const NPC_CUTOUT_PROFILE_COUNTS = Object.freeze({civilian:128,authority:32,angel:16,demon:16});
const PROFILE_START = Object.freeze({civilian:0,authority:128,angel:160,demon:176});
const TOTAL_PROFILES = 192;
const ATLAS_COLS = 32;
const atlasCache = new Map();

const SKINS=['#f0c8ae','#dfaa88','#ca8f6e','#b67859','#9b634b','#7b4a37','#5d392e','#3f2924'];
const HAIR=['#171514','#2c211b','#473329','#604536','#8d6a45','#b9a071','#4b4b51'];
const TOPS=['#25354c','#384b5d','#5b4b42','#355348','#52384d','#6b513a','#39405e','#6a5960','#2c5259','#6b6848','#7a4048','#3d3a39'];
const PANTS=['#171d26','#26303a','#2d2726','#34383c','#1f2f34','#3b3340','#40372f'];
const ACCENTS=['#d6ad62','#c16b5f','#6aa0bf','#77a274','#a67bc0','#d1d1ce','#c98752'];

function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function randomFactory(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function shade(hex,amount){const c=new THREE.Color(hex);c.offsetHSL(0,0,amount);return '#'+c.getHexString();}

export function npcCutoutProfileIndex(faction='civilian',ordinal=0){
  const key=PROFILE_START[faction]===undefined?'civilian':faction;
  const count=NPC_CUTOUT_PROFILE_COUNTS[key];
  return PROFILE_START[key]+(((Math.trunc(ordinal)%count)+count)%count);
}
export function quantizeNpcCutoutDirection(relativeYaw=0){
  const step=Math.PI/4;
  return ((Math.round(relativeYaw/step)%NPC_CUTOUT_ANGLES)+NPC_CUTOUT_ANGLES)%NPC_CUTOUT_ANGLES;
}

function factionForProfile(index){
  if(index>=176)return 'demon';
  if(index>=160)return 'angel';
  if(index>=128)return 'authority';
  return 'civilian';
}
function profileFor(index){
  const faction=factionForProfile(index),r=randomFactory(hash(`jc-cutout:${index}:${faction}`));
  const gender=r()<.48?'woman':r()<.93?'man':'androgynous';
  const hoodie=r()<.27,coat=!hoodie&&r()<.24,hat=r()<.17,hairStyle=Math.floor(r()*6);
  return {index,faction,gender,skin:SKINS[Math.floor(r()*SKINS.length)],hair:HAIR[Math.floor(r()*HAIR.length)],top:TOPS[Math.floor(r()*TOPS.length)],pants:PANTS[Math.floor(r()*PANTS.length)],accent:ACCENTS[Math.floor(r()*ACCENTS.length)],hoodie,coat,hat,hairStyle,height:.91+r()*.18,build:.84+r()*.32,leg:.9+r()*.18,shoe:r()<.5?'#171a1f':'#39312c'};
}
function gradient(ctx,color,x1,y1,x2,y2){const g=ctx.createLinearGradient(x1,y1,x2,y2);g.addColorStop(0,shade(color,.09));g.addColorStop(.48,color);g.addColorStop(1,shade(color,-.09));return g;}
function line(ctx,x1,y1,x2,y2,width,color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function ellipse(ctx,x,y,rx,ry,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}

function drawPerson(ctx,p,direction,x,y,w,h){
  const angle=direction*Math.PI/4,front=Math.cos(angle),side=Math.sin(angle),back=Math.max(0,-front),frontVisible=Math.max(0,front);
  const mirror=side<0?-1:1,sideAmount=Math.abs(side),bodyW=(.68+.32*Math.abs(front))*p.build;
  const cx=x+w*.5,feet=y+h*.94,unit=h/100;
  ctx.save();ctx.translate(cx,0);ctx.scale(mirror,1);ctx.translate(-cx,0);
  ctx.lineJoin='round';ctx.lineCap='round';
  ctx.strokeStyle='rgba(10,12,16,.58)';ctx.lineWidth=Math.max(1,1.4*unit);

  const hipY=feet-31*unit*p.height,shoulderY=feet-63*unit*p.height,headY=feet-79*unit*p.height;
  const shoulder=15*unit*bodyW,hip=9.5*unit*bodyW,legGap=(3.1+3.7*(1-sideAmount))*unit;
  const walk=(p.index%5-2)*.45;
  line(ctx,cx-legGap,hipY,cx-legGap-walk,feet-4*unit,7.3*unit*p.leg,p.pants);
  line(ctx,cx+legGap,hipY,cx+legGap+walk,feet-4*unit,7.3*unit*p.leg,shade(p.pants,-.03));
  line(ctx,cx-legGap-walk,feet-3.7*unit,cx-legGap-walk-2*unit,feet-2.4*unit,6.7*unit,p.shoe);
  line(ctx,cx+legGap+walk,feet-3.7*unit,cx+legGap+walk+2*unit,feet-2.4*unit,6.7*unit,p.shoe);

  ctx.fillStyle=gradient(ctx,p.top,cx-shoulder,shoulderY,cx+shoulder,hipY);
  ctx.beginPath();ctx.moveTo(cx-shoulder,shoulderY);ctx.quadraticCurveTo(cx,shoulderY-4*unit,cx+shoulder,shoulderY);ctx.lineTo(cx+hip,hipY);ctx.quadraticCurveTo(cx,hipY+2*unit,cx-hip,hipY);ctx.closePath();ctx.fill();ctx.stroke();
  const armSpread=(12+5*(1-sideAmount))*unit*bodyW,armForward=side*4.2*unit;
  line(ctx,cx-armSpread,shoulderY+3*unit,cx-armSpread+armForward,hipY-1*unit,6.2*unit,p.top);
  line(ctx,cx+armSpread,shoulderY+3*unit,cx+armSpread+armForward,hipY-1*unit,6.2*unit,shade(p.top,-.035));
  ellipse(ctx,cx-armSpread+armForward,hipY+1*unit,3.2*unit,3.8*unit,p.skin);
  ellipse(ctx,cx+armSpread+armForward,hipY+1*unit,3.2*unit,3.8*unit,p.skin);

  if(p.coat){line(ctx,cx,shoulderY+3*unit,cx,hipY-2*unit,1.25*unit,p.accent);}
  if(p.hoodie){ctx.strokeStyle=p.accent;ctx.lineWidth=1.2*unit;ctx.beginPath();ctx.arc(cx,shoulderY+1*unit,8.5*unit,Math.PI*.15,Math.PI*.85);ctx.stroke();}
  if(p.faction==='authority'){
    ctx.fillStyle=p.accent;ctx.fillRect(cx-5*unit,shoulderY+7*unit,10*unit,2.2*unit);
    ctx.fillStyle='#d7e4ef';ctx.fillRect(cx+(sideAmount<.75?4:-1)*unit,shoulderY+3*unit,2.8*unit,3.6*unit);
  }

  const neckY=headY+11*unit;
  line(ctx,cx,neckY,cx,shoulderY+1*unit,5.2*unit,p.skin);
  const faceRx=(10.1-3.5*sideAmount)*unit,faceRy=12.6*unit;
  ellipse(ctx,cx+side*1.3*unit,headY,faceRx,faceRy,gradient(ctx,p.skin,cx-faceRx,headY-faceRy,cx+faceRx,headY+faceRy));
  const hairY=headY-5*unit;
  ctx.fillStyle=p.hair;
  if(p.hairStyle===0)ellipse(ctx,cx-side*1.2*unit,hairY,faceRx*1.02,faceRy*.56,p.hair);
  else if(p.hairStyle===1){ellipse(ctx,cx-side*1.2*unit,hairY,faceRx*1.06,faceRy*.6,p.hair);line(ctx,cx-faceRx*.84,headY,cx-faceRx*.92,headY+15*unit,3.2*unit,p.hair);line(ctx,cx+faceRx*.84,headY,cx+faceRx*.92,headY+15*unit,3.2*unit,p.hair);}
  else if(p.hairStyle===2){for(let k=-2;k<=2;k++)ellipse(ctx,cx+k*2.8*unit,hairY-Math.abs(k)*.5*unit,3.8*unit,4.7*unit,p.hair);}
  else if(p.hairStyle===3){ellipse(ctx,cx-side*1.1*unit,hairY,faceRx*1.12,faceRy*.7,p.hair);ellipse(ctx,cx+7*unit,headY-1*unit,4.2*unit,10*unit,p.hair);}
  else if(p.hairStyle===4){ctx.fillRect(cx-faceRx*.9,headY-faceRy*.88,faceRx*1.8,5.5*unit);}
  else {ellipse(ctx,cx-side*1.2*unit,headY-faceRy*.9,faceRx*.78,4.1*unit,p.hair);}
  if(p.hat){ctx.fillStyle=shade(p.top,-.2);ctx.fillRect(cx-faceRx*1.08,headY-faceRy*.98,faceRx*2.16,3.5*unit);ctx.fillRect(cx-faceRx*.75,headY-faceRy*1.14,faceRx*1.5,5.5*unit);}

  if(frontVisible>.12){
    const eyeY=headY-1.2*unit,eyeSep=(4.3-2.2*sideAmount)*unit,faceShift=side*3.0*unit;
    if(sideAmount<.92){ellipse(ctx,cx-eyeSep+faceShift,eyeY,1.05*unit,.85*unit,'#171819');ellipse(ctx,cx+eyeSep+faceShift,eyeY,1.05*unit,.85*unit,'#171819');}
    else ellipse(ctx,cx+faceShift,eyeY,1.1*unit,.9*unit,'#171819');
    line(ctx,cx+faceShift,headY+4.2*unit,cx+faceShift+(sideAmount>.7?2.8:0)*unit,headY+4.5*unit,1.05*unit,shade(p.skin,-.18));
    line(ctx,cx-3*unit+faceShift,headY+7.2*unit,cx+3*unit+faceShift,headY+7.2*unit,.9*unit,'#704942');
  } else if(back>.25){
    line(ctx,cx,headY-5*unit,cx,headY+8*unit,1*unit,shade(p.hair,-.12));
  }

  if(p.faction==='angel'){
    ctx.strokeStyle='rgba(255,239,176,.95)';ctx.lineWidth=2*unit;ctx.beginPath();ctx.ellipse(cx,headY-17*unit,8.5*unit,2.7*unit,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(248,242,218,.88)';ctx.beginPath();ctx.moveTo(cx-shoulder*.75,shoulderY+2*unit);ctx.quadraticCurveTo(cx-26*unit,shoulderY+12*unit,cx-18*unit,hipY+4*unit);ctx.quadraticCurveTo(cx-9*unit,hipY-8*unit,cx-shoulder*.35,shoulderY+4*unit);ctx.fill();ctx.beginPath();ctx.moveTo(cx+shoulder*.75,shoulderY+2*unit);ctx.quadraticCurveTo(cx+26*unit,shoulderY+12*unit,cx+18*unit,hipY+4*unit);ctx.quadraticCurveTo(cx+9*unit,hipY-8*unit,cx+shoulder*.35,shoulderY+4*unit);ctx.fill();
  } else if(p.faction==='demon'){
    ctx.fillStyle=p.accent;ctx.beginPath();ctx.moveTo(cx-6*unit,headY-10*unit);ctx.lineTo(cx-10*unit,headY-21*unit);ctx.lineTo(cx-2*unit,headY-12*unit);ctx.fill();ctx.beginPath();ctx.moveTo(cx+6*unit,headY-10*unit);ctx.lineTo(cx+10*unit,headY-21*unit);ctx.lineTo(cx+2*unit,headY-12*unit);ctx.fill();
  }
  ctx.restore();
}

function buildAtlas(mobile=false){
  const cellW=mobile?36:48,cellH=mobile?72:96,totalFrames=TOTAL_PROFILES*NPC_CUTOUT_ANGLES,rows=Math.ceil(totalFrames/ATLAS_COLS);
  const canvas=document.createElement('canvas');canvas.width=ATLAS_COLS*cellW;canvas.height=rows*cellH;
  const ctx=canvas.getContext('2d',{alpha:true});ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let profileIndex=0;profileIndex<TOTAL_PROFILES;profileIndex++){
    const profile=profileFor(profileIndex);
    for(let direction=0;direction<NPC_CUTOUT_ANGLES;direction++){
      const frame=profileIndex*NPC_CUTOUT_ANGLES+direction,col=frame%ATLAS_COLS,row=Math.floor(frame/ATLAS_COLS);
      drawPerson(ctx,profile,direction,col*cellW,row*cellH,cellW,cellH);
    }
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  return {texture,cols:ATLAS_COLS,rows,cellW,cellH,totalProfiles:TOTAL_PROFILES};
}
export function getNpcCutoutAtlas({mobile=false}={}){const key=mobile?'mobile':'desktop';if(!atlasCache.has(key))atlasCache.set(key,buildAtlas(mobile));return atlasCache.get(key);}

function interactiveMaterial(atlas,frame){return new THREE.RawShaderMaterial({uniforms:{atlas:{value:atlas.texture},frame:{value:frame},atlasCols:{value:atlas.cols},atlasRows:{value:atlas.rows}},vertexShader:`precision highp float;attribute vec3 position;attribute vec2 uv;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;uniform float frame;uniform float atlasCols;uniform float atlasRows;varying vec2 vUv;void main(){float col=mod(frame,atlasCols);float row=floor(frame/atlasCols);vUv=vec2((col+uv.x)/atlasCols,(row+1.0-uv.y)/atlasRows);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`precision mediump float;uniform sampler2D atlas;varying vec2 vUv;void main(){vec4 texel=texture2D(atlas,vUv);if(texel.a<0.16)discard;gl_FragColor=vec4(texel.rgb,1.0);}`,side:THREE.DoubleSide,transparent:false,depthTest:true,depthWrite:true,toneMapped:false});}

const scratchWorld=new THREE.Vector3(),scratchCamera=new THREE.Vector3();
export function createNpcCutout({faction='civilian',ordinal=0,camera=null,mobile=false}={}){
  const atlas=getNpcCutoutAtlas({mobile}),profile=npcCutoutProfileIndex(faction,ordinal),material=interactiveMaterial(atlas,profile*NPC_CUTOUT_ANGLES);
  const group=new THREE.Group();group.name=`${faction} NPC cardboard cutout`;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.18,2.72),material);plane.position.y=1.36;plane.frustumCulled=false;group.add(plane);
  let facingYaw=0;
  function updateCutout(nextFacing=facingYaw,cameraPosition=null){
    facingYaw=Number.isFinite(nextFacing)?nextFacing:facingYaw;group.getWorldPosition(scratchWorld);
    if(cameraPosition?.isVector3)scratchCamera.copy(cameraPosition);else if(camera?.getWorldPosition)camera.getWorldPosition(scratchCamera);else scratchCamera.set(scratchWorld.x,scratchWorld.y,scratchWorld.z+10);
    const viewYaw=Math.atan2(scratchCamera.x-scratchWorld.x,scratchCamera.z-scratchWorld.z),direction=quantizeNpcCutoutDirection(viewYaw-facingYaw);
    material.uniforms.frame.value=profile*NPC_CUTOUT_ANGLES+direction;plane.rotation.y=viewYaw;group.userData.cutoutDirection=direction;
  }
  const character={setPose(index=0,gait=0,speed=0,now=0){plane.position.y=1.36+(speed>0?Math.sin(gait)*.018:0);plane.rotation.z=THREE.MathUtils.lerp(plane.rotation.z,(speed>3?Math.sin(gait)*.012:0),.3);group.userData.lastPose=index;group.userData.lastSpeed=speed;group.userData.lastUpdated=now;}};
  group.userData.character=character;group.userData.updateCutout=updateCutout;group.userData.profileIndex=profile;group.userData.dispose=()=>{plane.geometry.dispose();material.dispose();};updateCutout(0);
  return group;
}

export function createInstancedCutoutMaterial(atlas){return new THREE.RawShaderMaterial({uniforms:{atlas:{value:atlas.texture},atlasCols:{value:atlas.cols},atlasRows:{value:atlas.rows}},vertexShader:`precision highp float;attribute vec3 position;attribute vec2 uv;attribute mat4 instanceMatrix;attribute float instanceFrame;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;uniform float atlasCols;uniform float atlasRows;varying vec2 vUv;void main(){float col=mod(instanceFrame,atlasCols);float row=floor(instanceFrame/atlasCols);vUv=vec2((col+uv.x)/atlasCols,(row+1.0-uv.y)/atlasRows);gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,fragmentShader:`precision mediump float;uniform sampler2D atlas;varying vec2 vUv;void main(){vec4 texel=texture2D(atlas,vUv);if(texel.a<0.16)discard;gl_FragColor=vec4(texel.rgb,1.0);}`,side:THREE.DoubleSide,transparent:false,depthTest:true,depthWrite:true,toneMapped:false});}

export function disposeNpcCutoutAtlases(){for(const atlas of atlasCache.values())atlas.texture.dispose();atlasCache.clear();}
