(() => {
  const canvas=document.getElementById("world"),gl=canvas.getContext("webgl",{alpha:false,antialias:true,powerPreference:"high-performance"})||canvas.getContext("experimental-webgl");
  if(!gl){document.getElementById("status").textContent="WEBGL1 IS DISABLED IN THIS BROWSER";return}
  const vs=`attribute vec3 p;attribute vec2 u;uniform mat4 m;varying vec2 v;void main(){v=u;gl_Position=m*vec4(p,1.0);}`;
  const fs=`precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec4 c;uniform float textured;void main(){vec4 q=mix(c,texture2D(t,v),textured);if(q.a<.03)discard;gl_FragColor=q;}`;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);gl.useProgram(program);
  const P=gl.getAttribLocation(program,"p"),U=gl.getAttribLocation(program,"u"),M=gl.getUniformLocation(program,"m"),T=gl.getUniformLocation(program,"textured"),C=gl.getUniformLocation(program,"c");
  const vb=gl.createBuffer(),ub=gl.createBuffer();gl.enableVertexAttribArray(P);gl.enableVertexAttribArray(U);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(.025,.018,.025,1);
  const mul=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[r+4]*b[c*4+1]+a[r+8]*b[c*4+2]+a[r+12]*b[c*4+3];return o};
  const perspective=(f,a,n,z)=>{const q=1/Math.tan(f/2),d=1/(n-z);return new Float32Array([q/a,0,0,0,0,q,0,0,0,0,(z+n)*d,-1,0,0,2*z*n*d,0])};
  const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const look=(eye,target)=>{const z=norm([eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]]),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])};
  const texture=(src)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([15,15,18,255]));const i=new Image();i.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,i);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)};i.src=src;return t};
  const landmarks={paris:{name:"PARIS LAS VEGAS",x:0,z:-180,w:180,h:120,tex:texture("/jc-the-holy-og-assets/landmarks/paris-las-vegas.png?v=39")},luxor:{name:"LUXOR",x:-250,z:-560,w:190,h:127,tex:texture("/jc-the-holy-og-assets/landmarks/luxor-las-vegas.png?v=39")},stadium:{name:"ALLEGIANT STADIUM",x:330,z:-980,w:260,h:130,tex:texture("/jc-the-holy-og-assets/landmarks/allegiant-stadium.png?v=39")}};
  // Parking is its own ground layer. The landmark textures remain vertical cutouts;
  // vehicles can now drive onto and stop on these lots instead of colliding with a
  // building-shaped billboard footprint.
  const parkingLots=[
    {name:"Paris guest parking",x:0,z:-55,w:260,d:150},
    {name:"Luxor guest parking",x:-250,z:-395,w:280,d:170},
    {name:"Stadium event parking",x:330,z:-805,w:360,d:220},
  ];
  const casinoAccess=[
    {name:"Paris casino frontage",x:0,z:-120,w:240,d:34},
    {name:"Luxor casino frontage",x:-250,z:-475,w:270,d:34},
    {name:"Stadium casino frontage",x:330,z:-895,w:340,d:34},
  ];
  const casinoForecourts=[
    {name:"Paris casino forecourt",x:0,z:-165,w:250,d:70},
    {name:"Luxor casino forecourt",x:-250,z:-510,w:280,d:70},
    {name:"Stadium casino forecourt",x:330,z:-930,w:350,d:70},
  ];
  const lasVegasBoulevard={name:"LAS VEGAS BLVD",x:150,z:-500,w:34,start:-1300,end:260};
  const draw=(verts,uvs,m,color,textured,tex)=>{gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);gl.vertexAttribPointer(P,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,ub);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uvs),gl.DYNAMIC_DRAW);gl.vertexAttribPointer(U,2,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(M,false,m);gl.uniform4fv(C,color);gl.uniform1f(T,textured);if(tex)gl.bindTexture(gl.TEXTURE_2D,tex);gl.drawArrays(gl.TRIANGLES,0,verts.length/3)};
  let px=0,pz=45,yaw=0,last=0,paused=false;const keys={};
  const stops={paris:[0,15,0],luxor:[-250,-300,0],stadium:[330,-690,0]};
  function go(id){[px,pz,yaw]=stops[id];document.getElementById("status").textContent=landmarks[id].name}
  addEventListener("keydown",e=>{if(e.code==="Escape"){pause(!paused);return}if(paused)return;if(["KeyW","KeyA","KeyS","KeyD"].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==="Digit1")go("stadium");if(e.code==="Digit2")go("paris");if(e.code==="Digit3")go("luxor")});addEventListener("keyup",e=>keys[e.code]=false);document.querySelectorAll("[data-stop]").forEach(b=>b.onclick=()=>go(b.dataset.stop));
  function pause(value){paused=value;Object.keys(keys).forEach(k=>keys[k]=false);document.getElementById("tourPaused").style.display=value?"grid":"none";if(value)document.getElementById("tourResume").focus()}
  document.getElementById("tourPause").onclick=()=>pause(true);document.getElementById("tourResume").onclick=()=>pause(false);
  addEventListener("blur",()=>pause(true));document.addEventListener("visibilitychange",()=>{if(document.hidden)pause(true)});
  document.querySelectorAll("[data-hold]").forEach(button=>{button.addEventListener("pointerdown",e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(!paused)keys[button.dataset.hold]=true});for(const name of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(name,()=>{keys[button.dataset.hold]=false})});
  function frame(now){const dt=paused?0:Math.min(.1,(now-last)/1000||0);last=now;const move=((keys.KeyW?1:0)-(keys.KeyS?1:0))*(keys.ShiftLeft?95:48)*dt;yaw+=((keys.KeyA?1:0)-(keys.KeyD?1:0))*1.7*dt;px+=Math.sin(yaw)*move;pz-=Math.cos(yaw)*move;
    const ratio=Math.min(devicePixelRatio||1,1.5),w=innerWidth,h=innerHeight;if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);gl.viewport(0,0,canvas.width,canvas.height)}gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const eye=[px,10,pz],target=[px+Math.sin(yaw)*20,7,pz-Math.cos(yaw)*20],m=mul(perspective(Math.PI/3,w/h,.5,4000),look(eye,target));
    for(let z=-1200;z<200;z+=80){draw([-900,0,z,900,0,z,900,0,z-4,-900,0,z,900,0,z-4,-900,0,z-4],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.12,.14,.17,1],0)}
    for(let x=-800;x<900;x+=120){draw([x-2,0,180,x+2,0,180,x+2,0,-1250,x-2,0,180,x+2,0,-1250,x-2,0,-1250],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.11,.13,.16,1],0)}
    {
      const r=lasVegasBoulevard;
      draw([r.x-r.w/2,.018,r.start,r.x+r.w/2,.018,r.start,r.x+r.w/2,.018,r.end,r.x-r.w/2,.018,r.start,r.x+r.w/2,.018,r.end,r.x-r.w/2,.018,r.end],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.09,.095,.105,1],0);
      draw([r.x-.9,.03,r.start,r.x+.9,.03,r.start,r.x+.9,.03,r.end,r.x-.9,.03,r.start,r.x+.9,.03,r.end,r.x-.9,.03,r.end],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.84,.75,.34,1],0);
      for(let z=r.start+18;z<r.end-8;z+=42){
        draw([r.x-r.w*.25,.03,z,r.x-r.w*.25+1.1,.03,z,r.x-r.w*.25+1.1,.03,z+18,r.x-r.w*.25,.03,z,r.x-r.w*.25+1.1,.03,z+18,r.x-r.w*.25,.03,z+18],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.78,.78,.72,1],0);
        draw([r.x+r.w*.25-1.1,.03,z,r.x+r.w*.25,.03,z,r.x+r.w*.25,.03,z+18,r.x+r.w*.25-1.1,.03,z,r.x+r.w*.25,.03,z+18,r.x+r.w*.25-1.1,.03,z+18],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.78,.78,.72,1],0);
      }
    }
    for(const lot of parkingLots){
      const x=lot.x,z=lot.z,w=lot.w,d=lot.d;
      draw([x-w/2,.012,z-d/2,x+w/2,.012,z-d/2,x+w/2,.012,z+d/2,x-w/2,.012,z-d/2,x+w/2,.012,z+d/2,x-w/2,.012,z+d/2],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.075,.082,.09,1],0);
      for(let mark=-w/2+24;mark<w/2-8;mark+=30){
        draw([x+mark,.025,z-d/2+12,x+mark+2,.025,z-d/2+12,x+mark+2,.025,z+d/2-12,x+mark,.025,z-d/2+12,x+mark+2,.025,z+d/2-12,x+mark,.025,z+d/2-12],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.72,.67,.42,1],0);
      }
    }
    for(const lane of casinoAccess){
      const x=lane.x,z=lane.z,w=lane.w,d=lane.d;
      draw([x-w/2,.02,z-d/2,x+w/2,.02,z-d/2,x+w/2,.02,z+d/2,x-w/2,.02,z-d/2,x+w/2,.02,z+d/2,x-w/2,.02,z+d/2],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.12,.125,.14,1],0);
      draw([x-w/2+.8,.035,z,x+w/2-.8,.035,z,x+w/2-.8,.035,z+1.2,x-w/2+.8,.035,z,x+w/2-.8,.035,z+1.2,x-w/2+.8,.035,z+1.2],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.84,.75,.34,1],0);
    }
    for(const apron of casinoForecourts){
      const x=apron.x,z=apron.z,w=apron.w,d=apron.d;
      draw([x-w/2,.025,z-d/2,x+w/2,.025,z-d/2,x+w/2,.025,z+d/2,x-w/2,.025,z-d/2,x+w/2,.025,z+d/2,x-w/2,.025,z+d/2],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.17,.16,.15,1],0);
      draw([x-w/2,.04,z+d/2-2,x+w/2,.04,z+d/2-2,x+w/2,.04,z+d/2,x-w/2,.04,z+d/2-2,x+w/2,.04,z+d/2,x-w/2,.04,z+d/2],[0,0,1,0,1,1,0,0,1,1,0,1],m,[.84,.75,.34,1],0);
    }
    const boulevardDistance=Math.abs(px-lasVegasBoulevard.x);
    if(boulevardDistance<lasVegasBoulevard.w*.7 && pz<=lasVegasBoulevard.end && pz>=lasVegasBoulevard.start) document.getElementById("status").textContent=lasVegasBoulevard.name;
    const list=Object.values(landmarks).sort((a,b)=>Math.hypot(b.x-px,b.z-pz)-Math.hypot(a.x-px,a.z-pz));for(const l of list){const dx=px-l.x,dz=pz-l.z,len=Math.hypot(dx,dz)||1,rx=dz/len,rz=-dx/len,hw=l.w/2;draw([l.x-rx*hw,0,l.z-rz*hw,l.x+rx*hw,0,l.z+rz*hw,l.x+rx*hw,l.h,l.z+rz*hw,l.x-rx*hw,0,l.z-rz*hw,l.x+rx*hw,l.h,l.z+rz*hw,l.x-rx*hw,l.h,l.z-rz*hw],[0,0,1,0,1,1,0,0,1,1,0,1],m,[1,1,1,1],1,l.tex)}requestAnimationFrame(frame)}requestAnimationFrame(frame);window.JC_WEBGL1={active:true,renderer:gl.getParameter(gl.VERSION),landmarks:Object.keys(landmarks),parkingLots:parkingLots.map(({name,x,z,w,d})=>({name,x,z,w,d})),streets:[{name:lasVegasBoulevard.name,x:lasVegasBoulevard.x,start:lasVegasBoulevard.start,end:lasVegasBoulevard.end,width:lasVegasBoulevard.w}]};
})();
