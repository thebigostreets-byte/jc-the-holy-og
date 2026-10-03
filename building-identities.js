let pending;
export function loadBuildingIdentities(){
 return pending ||= fetch('./data/building-identities.json',{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error('Building identities unavailable');return r.json();}).then(data=>{const arena=data.buildings?.['NGA14-538100'];if(arena)arena.name='Dee Mobile Center';return data.buildings;}).catch(error=>{console.warn(error.message);return {};});
}
// Color directions are game art choices inspired by the named properties.
// Only the name/address relationship is sourced from the county footprint match.
export function identityPalette(name=''){
 if(/Luxor/i.test(name))return {photo:0,color:'#525d66',roughness:.34};
 if(/MGM Grand/i.test(name))return {photo:0,color:'#93b5a2',roughness:.38};
 if(/Wynn|Encore|Trump|Mandalay/i.test(name))return {photo:0,color:'#c8aa77',roughness:.36};
 if(/Bellagio|Caesars|Venetian|Palazzo|Paris/i.test(name))return {photo:1,color:'#e9d8b9',roughness:.77};
 if(/Cosmopolitan|Aria|Vdara|Waldorf/i.test(name))return {photo:0,color:'#aebfc9',roughness:.32};
 if(/Flamingo/i.test(name))return {photo:3,color:'#eed2ce',roughness:.8};
 return null;
}
