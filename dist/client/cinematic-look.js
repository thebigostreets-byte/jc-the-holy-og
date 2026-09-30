import * as THREE from './three.module.js';

// Bounded full-screen glow. Two small blur targets, no per-building lights.
export function createCinematicLook(game, mobile=false) {
  const {renderer,scene,camera}=game;
  const skyFallback=new THREE.Color(0x101a30);
  let sky=skyFallback,sunrise=false;
  scene.background=sky;scene.fog=new THREE.FogExp2(0x172238,.00032);
  scene.traverse(o=>{if(o.isHemisphereLight)o.intensity=.42;if(o.isDirectionalLight){o.color.set(0xa8bded);o.intensity=1.15;}});
  const rim=new THREE.DirectionalLight(0xffc685,1.65);rim.position.set(-900,300,-700);scene.add(rim);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  new THREE.TextureLoader().load('./assets/jc-storm-sky.webp',t=>{
    t.colorSpace=THREE.SRGBColorSpace;t.mapping=THREE.EquirectangularReflectionMapping;
    sky=t;scene.environment=t;scene.environmentIntensity=.35;if(!sunrise)scene.background=t;
  },undefined,()=>{});
  const rt=new THREE.WebGLRenderTarget(1,1,{type:renderer.extensions?.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false});
  const a=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false}),b=a.clone();
  const passScene=new THREE.Scene(),passCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const vertex='varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const blur=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{source:{value:null},stepUV:{value:new THREE.Vector2()},threshold:{value:0}},vertexShader:vertex,
    fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform vec2 stepUV;uniform float threshold;
    vec3 bright(vec2 uv){vec3 c=texture2D(source,uv).rgb;return c*smoothstep(threshold,threshold+.2,max(c.r,max(c.g,c.b)));}
    void main(){vec3 c=bright(vUv)*.227027;c+=(bright(vUv+stepUV*1.384615)+bright(vUv-stepUV*1.384615))*.316216;c+=(bright(vUv+stepUV*3.230769)+bright(vUv-stepUV*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`});
  const composite=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:true,
    uniforms:{base:{value:rt.texture},glow:{value:b.texture},strength:{value:mobile?.24:.34}},vertexShader:vertex,
    fragmentShader:`varying vec2 vUv;uniform sampler2D base,glow;uniform float strength;
    void main(){vec3 c=texture2D(base,vUv).rgb+texture2D(glow,vUv).rgb*strength;
    c=mix(c,c*vec3(.93,.98,1.06),.17);vec2 p=vUv-.5;c*=1.-.22*dot(p,p);
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),blur);passScene.add(quad);
  // Keep mobile play on one scene render; the desktop glow stack costs three
  // additional full-screen passes and competes with streamed city geometry.
  const size=new THREE.Vector2();let width=0,height=0,enabled=!mobile;
  function render(){
    if(!enabled){renderer.render(scene,camera);return;}
    renderer.getDrawingBufferSize(size);
    if(width!==size.x||height!==size.y){width=size.x;height=size.y;rt.setSize(width,height);a.setSize(Math.max(1,width>>2),Math.max(1,height>>2));b.setSize(a.width,a.height);}
    try{
      renderer.setRenderTarget(rt);renderer.render(scene,camera);
      quad.material=blur;blur.uniforms.source.value=rt.texture;blur.uniforms.threshold.value=.64;blur.uniforms.stepUV.value.set(1.4/a.width,0);
      renderer.setRenderTarget(a);renderer.render(passScene,passCamera);
      blur.uniforms.source.value=a.texture;blur.uniforms.threshold.value=0;blur.uniforms.stepUV.value.set(0,1.4/a.height);
      renderer.setRenderTarget(b);renderer.render(passScene,passCamera);
      quad.material=composite;renderer.setRenderTarget(null);renderer.render(passScene,passCamera);
    }catch(error){enabled=false;renderer.setRenderTarget(null);renderer.render(scene,camera);console.warn('Cinematic glow disabled; gameplay retained',error);}
  }
  // Reused geometry and finite pools keep flight/impact effects predictable on phones.
  const ringGeometry=new THREE.TorusGeometry(1,.025,4,56);
  const rings=Array.from({length:8},()=>{const mesh=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:0xffd486,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));mesh.visible=false;scene.add(mesh);return {mesh,life:0,max:1,impact:false};});
  const sparkCount=mobile?96:192,positions=new Float32Array(sparkCount*3),colors=new Float32Array(sparkCount*3);
  const sparks=Array.from({length:sparkCount},()=>({life:0,max:1,v:new THREE.Vector3()}));
  positions.fill(-100000);
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(positions,3));geom.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const sparkMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
    vertexShader:'attribute vec3 color;varying vec3 vColor;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(140./max(1.,-p.z),1.,7.);}',
    fragmentShader:'varying vec3 vColor;void main(){float a=1.-smoothstep(.12,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(vColor,a);}'});
  const points=new THREE.Points(geom,sparkMaterial);points.frustumCulled=false;scene.add(points);
  let ringCursor=0,sparkCursor=0,lastRing=0,now=0;
  const zAxis=new THREE.Vector3(0,0,1),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const flare=new THREE.PointLight(0xffc27d,0,100,2);scene.add(flare);let flareLife=0;
  function ring(position,normal,impact=false){const r=rings[ringCursor++%rings.length];r.mesh.position.copy(position);r.mesh.quaternion.setFromUnitVectors(zAxis,normal);r.life=r.max=impact?1.25:.65;r.impact=impact;r.mesh.visible=true;}
  function impact(position){
    ring(position,up,true);flare.position.copy(position).addScaledVector(up,5);flareLife=.35;
    for(let n=0;n<sparkCount;n++){const i=sparkCursor++%sparkCount,s=sparks[i];s.life=s.max=.5+Math.random()*1.2;s.v.set((Math.random()-.5)*36,Math.random()*24,(Math.random()-.5)*36);positions.set(position.toArray(),i*3);}
  }
  function update(dt,time,position,velocity,flying,boost,playing){
    now=time;points.visible=playing;flare.visible=playing;
    if(playing&&flying&&velocity.lengthSq()>9&&now-lastRing>(boost?95:220)){lastRing=now;direction.copy(velocity).normalize();ring(position.clone().addScaledVector(up,1.8),direction);}
    for(const r of rings){r.life=Math.max(0,r.life-dt);r.mesh.visible=playing&&r.life>0;if(!r.life)continue;const age=1-r.life/r.max;const scale=r.impact?2+age*32:1.5+age*(boost?5:3);r.mesh.scale.setScalar(scale);r.mesh.material.opacity=(1-age)*(r.impact?.85:.55);}
    for(let i=0;i<sparkCount;i++){const s=sparks[i];if(s.life<=0)continue;s.life-=dt;s.v.y-=12*dt;for(let j=0;j<3;j++)positions[i*3+j]+=s.v.getComponent(j)*dt;const fade=Math.max(0,s.life/s.max);colors.set([fade,fade*.57,fade*.15],i*3);if(!fade)positions[i*3+1]=-100000;}
    geom.attributes.position.needsUpdate=true;geom.attributes.color.needsUpdate=true;
    flareLife=Math.max(0,flareLife-dt);flare.intensity=flareLife*220;
  }
  function setSunrise(active){if(active===sunrise)return;sunrise=active;scene.background=active?new THREE.Color(0xf9dcbc):sky;rim.intensity=active?2.5:1.65;}
  return {render,update,impact,setSunrise,setGlow:on=>{enabled=!!on;}};
}
