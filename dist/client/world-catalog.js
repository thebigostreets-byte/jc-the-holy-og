export const ITEM_TYPES=[
 {id:'battery',name:'Storm Cell',art:'./miracles/lightning.webp',color:0x89d8ff},
 {id:'medkit',name:'First Aid Kit',art:'./miracles/heal.webp',color:0x92ffbd},
 {id:'relic',name:'Miracle Relic',art:'./miracles/bless.webp',color:0xffd675},
 {id:'flare',name:'Signal Flare',art:'./miracles/reveal.webp',color:0xff664d},
 {id:'sidearm',name:'Sidearm',art:null,color:0xffbd72}
];
export const WORLD_SAVE_KEY='jc-world-catalog-v1';
export function hashId(value){let n=2166136261;for(const c of String(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
export function buildingVenue(identity={}){
 const name=identity.name||'',category=identity.category||'';
 if(/church|chapel|cathedral|sanctuary/i.test(name+' '+category))return 'church';
 if(/casino|gambling/i.test(category+' '+name)||/Bellagio|Caesars|Paris Las Vegas|Flamingo|Harrahs|Wynn|Encore|Cosmopolitan|Cromwell|Linq|Resorts World|Sahara|Park MGM|Fontainebleau/i.test(name))return 'casino';
 return null;
}
export function createWorldCatalog(storage=globalThis.localStorage){
 const places=new Map(),items=new Map(),inventory=new Map();let objective=null;
 try{const saved=JSON.parse(storage?.getItem(WORLD_SAVE_KEY)||'null');if(saved?.version===1){
  for(const row of (saved.items||[]).slice(-128))if(row&&ITEM_TYPES.some(k=>k.id===row.type)&&typeof row.id==='string'&&typeof row.placeId==='string')items.set(row.id,{...row,collected:!!row.collected});
  for(const [kind,n] of Object.entries(saved.inventory||{}))if(ITEM_TYPES.some(k=>k.id===kind))inventory.set(kind,Math.max(0,Math.min(99,Number(n)||0)));
  if(typeof saved.objective==='string')objective=saved.objective;
 }}catch{}
 function save(){try{storage?.setItem(WORLD_SAVE_KEY,JSON.stringify({version:1,items:[...items.values()].slice(-128),inventory:Object.fromEntries(inventory),objective}));}catch{}}
 function registerPlace(row){
  if(!row?.id||!row.name||!row.entry||!row.spawn||![row.entry.x,row.entry.y,row.entry.z,row.spawn.x,row.spawn.y,row.spawn.z].every(Number.isFinite))return null;
  const existing=places.get(row.id);places.set(row.id,{...existing,...row});return places.get(row.id);
 }
 function ensureItem(type,placeId,{id,source='world',name}={}){
  if(!ITEM_TYPES.some(k=>k.id===type)||!places.has(placeId))return null;
  const key=id||'item:'+placeId+':'+type;
  if(items.has(key))return items.get(key);
  if(items.size>=128){const oldest=[...items.values()].find(r=>r.collected&&r.id!==objective);if(!oldest)return null;items.delete(oldest.id);}
  const row={id:key,type,placeId,name:ITEM_TYPES.find(k=>k.id===type).name,source:String(source).slice(0,80),collected:false};
  items.set(key,row);save();return row;
 }
 function promiseItem(action,npc){
  if(!action||!ITEM_TYPES.some(k=>k.id===action.itemType)||!places.has(action.placeId))return null;
  const place=places.get(action.placeId);
  const owner=String(npc?.id??npc?.name??'npc');
  const prior=[...items.values()].find(r=>r.source==='npc:'+owner&&r.type===action.itemType);
  if(prior){if(prior.collected)return null;objective=prior.id;save();return {item:prior,place:places.get(prior.placeId),direction:prior.name+' is waiting at '+places.get(prior.placeId).name+'. Follow the gold item marker and use the marked entrance.'};}
  const existing=[...items.values()].find(r=>r.type===action.itemType&&r.placeId===place.id&&!r.collected);
  const row=existing||ensureItem(action.itemType,place.id,{id:'promise:'+owner+':'+place.id+':'+action.itemType,source:'npc:'+owner});
  if(!row||row.collected)return null;
  objective=row.id;save();return {item:row,place,direction:row.name+' is waiting at '+place.name+'. Follow the gold item marker and use the marked entrance.'};
 }
 function collect(id){const row=items.get(id);if(!row||row.collected)return null;row.collected=true;inventory.set(row.type,Math.min(99,(inventory.get(row.type)||0)+1));if(objective===id)objective=null;save();return row;}
 function use(type){const n=inventory.get(type)||0;if(!n)return false;inventory.set(type,n-1);save();return true;}
 function available(placeId){return [...items.values()].filter(r=>!r.collected&&places.has(r.placeId)&&(!placeId||r.placeId===placeId));}
 function knowledge(position,activePlaceId){
  const nearest=[...places.values()].sort((a,b)=>{
   const dist=p=>Math.hypot(p.entry.x-position.x,p.entry.z-position.z);return dist(a)-dist(b);
  }).slice(0,8);
  const active=places.get(activePlaceId);if(active&&!nearest.some(p=>p.id===active.id))nearest.unshift(active);
  return {player:{x:Number(position.x)||0,z:Number(position.z)||0},places:nearest.slice(0,8).map(p=>({id:p.id,name:p.name,kind:p.kind,entry:p.entry,items:available(p.id).map(r=>({id:r.id,type:r.type,name:r.name})),canSupply:ITEM_TYPES.map(k=>k.id)})),itemTypes:ITEM_TYPES.map(k=>({id:k.id,name:k.name}))};
 }
 return {places,items,inventory,registerPlace,ensureItem,promiseItem,collect,use,available,knowledge,get objective(){return items.get(objective)||null;}};
}
