// Shared micro-surface maps add subtle material response without per-building textures.
let cached;
export function createPhotorealDetailMaps(THREE){
  if(cached)return cached;
  const size=128, pixels=new Uint8Array(size*size*4), roughness=new Uint8Array(size*size*4);
  // Deterministic, tileable low-amplitude grain; keep it subtle so it never reads as dirt.
  const hash=(x,y)=>{let n=(x*374761393+y*668265263)|0;n=(n^(n>>>13))*1274126177;return (n^(n>>>16))>>>0;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const n=hash(x,y),grain=((n&255)-127)*.11;
    const broad=(Math.sin(x*.19+Math.sin(y*.07))*Math.cos(y*.17))*5;
    const height=Math.max(0,Math.min(255,128+grain+broad));
    pixels[i]=pixels[i+1]=pixels[i+2]=height;pixels[i+3]=255;
    const r=Math.max(0,Math.min(255,207+((n>>>8)&31)-15+ broad*.45));
    roughness[i]=roughness[i+1]=roughness[i+2]=r;roughness[i+3]=255;
  }
  const make=data=>{
    const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
    t.generateMipmaps=true;t.colorSpace=THREE.NoColorSpace;t.needsUpdate=true;return t;
  };
  cached={bump:make(pixels),roughness:make(roughness)};
  return cached;
}

export function applyPhotorealMaterial(THREE,material,detailMaps,{casino=false,buildingHeight=12}={}){
  if(!material||!detailMaps)return material;
  material.bumpMap ||= detailMaps.bump;
  material.bumpScale=casino?.018:buildingHeight<12?.035:.024;
  material.roughnessMap ||= detailMaps.roughness;
  // Preserve authored roughness but avoid polished plastic on ordinary walls.
  if(!casino)material.roughness=Math.max(.78,material.roughness??.85);
  material.metalness=casino?Math.min(.16,material.metalness??.08):0;
  material.needsUpdate=true;
  return material;
}
