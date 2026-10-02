const STORAGE_KEY='jc-npc-contacts-v1';
const MAX_CONTACTS=64;

export function npcContactId(npc) {
  if(typeof npc==='string')return npc;
  if(!npc)return '';
  return String(npc.id||[npc.faction||'civilian',npc.avatar||npc.file||'npc',npc.name||'Unknown'].join(':'));
}

function cleanContact(value) {
  if(!value||typeof value!=='object')return null;
  const id=String(value.id||'').slice(0,180),name=String(value.name||'').slice(0,80);
  const faction=String(value.faction||'civilian').slice(0,24),avatar=String(value.avatar||value.file||faction+'-01').slice(0,80);
  if(!id||!name)return null;
  const p=value.position||value.lastPosition;
  const position=p&&[p.x,p.y,p.z].every(Number.isFinite)?{x:p.x,y:p.y,z:p.z}:null;
  return {id,name,faction,avatar,addedAt:Number(value.addedAt)||Date.now(),lastSeenAt:Number(value.lastSeenAt)||Date.now(),position};
}

export function createNpcContactStore(storage=globalThis.localStorage) {
  let contacts=[],trackedId=null;
  try {
    const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');
    if(saved&&saved.version===1){
      contacts=(Array.isArray(saved.contacts)?saved.contacts:[]).map(cleanContact).filter(Boolean).slice(0,MAX_CONTACTS);
      trackedId=typeof saved.trackedId==='string'?saved.trackedId:null;
      if(trackedId&&!contacts.some(contact=>contact.id===trackedId))trackedId=null;
    }
  } catch {}
  function persist() {
    try {storage?.setItem(STORAGE_KEY,JSON.stringify({version:1,contacts,trackedId}));} catch {}
  }
  function getAll() {
    return contacts.map(contact=>({...contact})).sort((a,b)=>b.lastSeenAt-a.lastSeenAt||a.name.localeCompare(b.name));
  }
  function has(value) {const id=npcContactId(value);return !!id&&contacts.some(contact=>contact.id===id);}
  function add(npc) {
    const id=npcContactId(npc);
    if(!id)return null;
    const now=Date.now(),existing=contacts.find(contact=>contact.id===id);
    if(existing){
      existing.name=String(npc.name||existing.name).slice(0,80);
      existing.faction=String(npc.faction||existing.faction).slice(0,24);
      existing.avatar=String(npc.avatar||npc.file||existing.avatar).slice(0,80);
      existing.lastSeenAt=now;
      if(npc.position&&[npc.position.x,npc.position.y,npc.position.z].every(Number.isFinite))existing.position={x:npc.position.x,y:npc.position.y,z:npc.position.z};
      persist();
      return {...existing};
    }
    const contact=cleanContact({id,name:npc.name,faction:npc.faction,avatar:npc.avatar||npc.file,position:npc.position,addedAt:now,lastSeenAt:now});
    if(!contact)return null;
    contacts.push(contact);
    contacts.sort((a,b)=>b.lastSeenAt-a.lastSeenAt);
    contacts=contacts.slice(0,MAX_CONTACTS);
    persist();
    return {...contact};
  }
  function remove(value) {
    const id=npcContactId(value),before=contacts.length;
    contacts=contacts.filter(contact=>contact.id!==id);
    if(trackedId===id)trackedId=null;
    if(contacts.length!==before)persist();
    return contacts.length!==before;
  }
  function toggle(npc) {
    const id=npcContactId(npc);
    if(has(id)){remove(id);return {saved:false,contact:null};}
    return {saved:true,contact:add(npc)};
  }
  function setTracked(value) {
    const id=value==null?'':npcContactId(value);
    if(id&&!contacts.some(contact=>contact.id===id))return false;
    trackedId=id||null;persist();return true;
  }
  function getTrackedId(){return trackedId;}
  function touch(npc) {
    const id=npcContactId(npc),contact=contacts.find(item=>item.id===id);
    if(!contact)return false;
    const now=Date.now();
    if(now-contact.lastSeenAt<15000)return true;
    contact.lastSeenAt=now;
    if(npc.position&&[npc.position.x,npc.position.y,npc.position.z].every(Number.isFinite))contact.position={x:npc.position.x,y:npc.position.y,z:npc.position.z};
    persist();return true;
  }
  return {getAll,has,add,remove,toggle,setTracked,getTrackedId,touch,clearTracked(){return setTracked(null);},get size(){return contacts.length;}};
}

export {STORAGE_KEY as NPC_CONTACT_STORAGE_KEY};
