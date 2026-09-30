import * as THREE from './three.module.js';
import {cloneBuildingMaterial} from './map-materials.js';

const waitForStudio = () => new Promise(resolve => {
  const timer = setInterval(() => {if (window.studio) {clearInterval(timer);resolve(window.studio);}},100);
});
const studio = await waitForStudio();
const panel = document.createElement('div');
panel.innerHTML = `<label for="buildingTexture">Upload wall texture</label><input id="buildingTexture" type="file" accept="image/png,image/jpeg,image/webp" disabled style="width:100%;font-size:14px"><p class="hint">Select a building, then choose a JPG, PNG or WebP (up to 12 MB). Saved on this browser/device. Images are resized for smoother play.</p><button id="removeBuildingTexture" type="button" disabled>Remove uploaded texture</button><p id="textureMessage" role="status" aria-live="polite" class="hint">Select a building to upload its texture.</p>`;
document.getElementById('editControls').prepend(panel);
const input = panel.querySelector('input');
const remove = panel.querySelector('button');
const message = panel.querySelector('#textureMessage');
let busy = false, sequence = 0;
const saved = new Set(), pending = new WeakSet();
const database = new Promise((resolve,reject) => {
  const req = indexedDB.open('jc-building-textures',1);
  req.onupgradeneeded = () => req.result.createObjectStore('textures');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
async function storage(mode, operation) {
  const db = await database;
  return new Promise((resolve,reject) => {
    const tx = db.transaction('textures',mode);
    const request = operation(tx.objectStore('textures'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(tx.error || Error('Texture storage unavailable'));
  });
}
const selected = () => studio.buildings.get(document.getElementById('buildingList').value);
const walls = ob => ob.children.filter(mesh => mesh.isMesh && mesh.material?.name?.endsWith('_walls'));
function sync() {
  const ob = selected();
  input.disabled = busy || !ob;
  remove.disabled = busy || !ob || !saved.has(ob.userData.buildingId);
  if (!busy) message.textContent = !ob ? 'Select a building to upload its texture.' : saved.has(ob.userData.buildingId) ? 'Your wall texture is saved on this device.' : 'Ready for a texture on '+ob.userData.buildingId+'.';
}
function disposeCustom(ob) {
  const old = new Set(walls(ob).map(m=>m.material.userData.customTexture).filter(Boolean));
  for(const t of old) {
    t.dispose();
    const textures = ob.parent?.userData.textures;
    if(textures) {const index=textures.indexOf(t);if(index>=0)textures.splice(index,1);}
  }
}
async function textureFromBlob(blob) {
  const url=URL.createObjectURL(blob);
  try {
    const texture=await new THREE.TextureLoader().loadAsync(url);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.anisotropy=Math.min(2,studio.renderer.capabilities.getMaxAnisotropy());
    return texture;
  } finally {URL.revokeObjectURL(url);}
}
function apply(ob,texture) {
  if(studio.buildings.get(ob.userData.buildingId)!==ob){texture.dispose();return;}
  disposeCustom(ob);
  for(const mesh of walls(ob)) {
    if(!mesh.userData.jcMaterialClone){mesh.material=cloneBuildingMaterial(mesh.material);mesh.userData.jcMaterialClone=true;}
    mesh.material.userData.customTexture=texture;
    mesh.material.map=texture;
    mesh.material.color.set(0xffffff);
    mesh.material.needsUpdate=true;
  }
  (ob.parent.userData.textures ||= []).push(texture);
}
async function hydrate() {
  for(const [id,ob] of studio.buildings) {
    if(!saved.has(id)||pending.has(ob)||walls(ob).some(m=>m.material.userData.customTexture))continue;
    pending.add(ob);
    try {const blob=await storage('readonly',s=>s.get(id));if(blob&&saved.has(id)&&!walls(ob).some(m=>m.material.userData.customTexture)){const texture=await textureFromBlob(blob);if(saved.has(id)&&!walls(ob).some(m=>m.material.userData.customTexture))apply(ob,texture);else texture.dispose();}}
    catch {message.textContent='A saved texture could not load. You can upload it again.';}
    finally {pending.delete(ob);}
  }
}
async function optimize(file) {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP image.');
  if(file.size>12*1024*1024)throw Error('Choose an image smaller than 12 MB.');
  const url=URL.createObjectURL(file),image=new Image();
  try {
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('This image could not be opened.'));image.src=url;});
    if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>64000000)throw Error('Choose an image under 64 megapixels.');
    const scale=Math.min(1,1024/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not prepare this image.')),'image/webp',.88));
  } finally {URL.revokeObjectURL(url);}
}
input.onchange=async()=>{
  const ob=selected(),file=input.files[0];if(!ob||!file||busy)return;
  const id=ob.userData.buildingId,attempt=++sequence;busy=true;sync();message.textContent='Preparing texture for '+id+'…';
  let texture;
  try {
    if(!walls(ob).length)throw Error('This building has no editable wall surfaces.');
    const blob=await optimize(file);texture=await textureFromBlob(blob);
    await storage('readwrite',s=>s.put(blob,id));saved.add(id);
    if(attempt===sequence){apply(ob,texture);texture=null;const edit=studio.edits.get(id)||{};edit.surface='textured';edit.wallColor='#ffffff';studio.edits.set(id,edit);if(selected()===ob){document.getElementById('materialMode').value='textured';document.getElementById('wallColor').value='#ffffff';studio.updateEdit();}}
    message.textContent='Texture applied to '+id+' and saved on this device.';
  } catch(error) {message.textContent=error.message||'The texture could not be saved. Try a smaller image.';}
  finally {texture?.dispose();busy=false;input.value='';input.disabled=!selected();remove.disabled=!selected()||!saved.has(selected().userData.buildingId);}
};
remove.onclick=async()=>{
  const ob=selected();if(!ob||busy)return;const id=ob.userData.buildingId;busy=true;sync();
  try {
    await storage('readwrite',s=>s.delete(id));saved.delete(id);disposeCustom(ob);
    for(const mesh of walls(ob)){delete mesh.material.userData.customTexture;mesh.material.map=mesh.material.userData.original.map;mesh.material.needsUpdate=true;}
    message.textContent='Uploaded texture removed from '+id+'.';
  }catch {message.textContent='Could not remove the saved texture. Please try again.';}
  finally {busy=false;input.disabled=!selected();remove.disabled=!selected()||!saved.has(selected().userData.buildingId);}
};
window.addEventListener('jc-building-selected',sync);
window.addEventListener('jc-tiles-loaded',hydrate);
try {for(const id of await storage('readonly',s=>s.getAllKeys()))saved.add(id);sync();await hydrate();}
catch {input.disabled=true;message.textContent='Texture saving is unavailable in this browser. Enable site storage and reload.';}
