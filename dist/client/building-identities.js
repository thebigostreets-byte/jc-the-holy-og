let pending;
const FALLBACK_LANDMARKS=[
 {name:'Bellagio',type:'casino',longitude:-115.1767,latitude:36.1126,radius:210,address:'Las Vegas Strip'},
 {name:'Caesars Palace',type:'casino',longitude:-115.1745,latitude:36.1162,radius:230,address:'Las Vegas Strip'},
 {name:'Paris Las Vegas',type:'casino',longitude:-115.1707,latitude:36.1125,radius:180,address:'Las Vegas Strip'},
 {name:'MGM Grand',type:'casino',longitude:-115.1697,latitude:36.1025,radius:230,address:'Las Vegas Strip'},
 {name:'New York-New York',type:'casino',longitude:-115.1745,latitude:36.1022,radius:190,address:'Las Vegas Strip'},
 {name:'Excalibur',type:'casino',longitude:-115.1756,latitude:36.0987,radius:210,address:'Las Vegas Strip'},
 {name:'Luxor',type:'casino',longitude:-115.1761,latitude:36.0955,radius:220,address:'Las Vegas Strip'},
 {name:'Mandalay Bay',type:'casino',longitude:-115.1753,latitude:36.0919,radius:250,address:'Las Vegas Strip'},
 {name:'The Venetian',type:'casino',longitude:-115.1697,latitude:36.1212,radius:210,address:'Las Vegas Strip'},
 {name:'The Palazzo',type:'casino',longitude:-115.1686,latitude:36.1240,radius:190,address:'Las Vegas Strip'},
 {name:'Wynn Las Vegas',type:'casino',longitude:-115.1654,latitude:36.1263,radius:220,address:'Las Vegas Strip'},
 {name:'Encore',type:'casino',longitude:-115.1644,latitude:36.1291,radius:190,address:'Las Vegas Strip'},
 {name:'Flamingo Las Vegas',type:'casino',longitude:-115.1719,latitude:36.1161,radius:180,address:'Las Vegas Strip'},
 {name:'The Cosmopolitan',type:'casino',longitude:-115.1761,latitude:36.1097,radius:180,address:'Las Vegas Strip'},
 {name:'Aria Resort',type:'casino',longitude:-115.1761,latitude:36.1074,radius:210,address:'Las Vegas Strip'},
 {name:'Resorts World',type:'casino',longitude:-115.1677,latitude:36.1354,radius:250,address:'Las Vegas Strip'},
 {name:'Circus Circus',type:'casino',longitude:-115.1665,latitude:36.1379,radius:220,address:'Las Vegas Strip'},
 {name:'Treasure Island',type:'casino',longitude:-115.1728,latitude:36.1247,radius:190,address:'Las Vegas Strip'},
 {name:'The STRAT',type:'casino',longitude:-115.1554,latitude:36.1475,radius:190,address:'Las Vegas Boulevard'},
 {name:'Palms',type:'casino',longitude:-115.1982,latitude:36.1155,radius:230,address:'Flamingo Road'},
 {name:'Sphere',type:'landmark',longitude:-115.1602,latitude:36.1208,radius:160,address:'Sands Avenue'},
 {name:'Allegiant Stadium',type:'stadium',longitude:-115.183952,latitude:36.090794,radius:300,address:'Russell Road'},
 {name:'T-Mobile Arena',type:'arena',longitude:-115.1783,latitude:36.1029,radius:190,address:'Las Vegas Boulevard'}
];
function distanceMetres(lon,lat,target){const y=(lat-target.latitude)*111320,x=(lon-target.longitude)*111320*Math.cos(lat*Math.PI/180);return Math.hypot(x,y);}
export function resolveBuildingIdentity(id,extras={},identities={}){
 const direct=identities?.[id];if(direct)return direct;
 const lon=Number(extras.longitude),lat=Number(extras.latitude);if(!Number.isFinite(lon)||!Number.isFinite(lat))return null;
 let best=null,bestDistance=Infinity;
 for(const landmark of FALLBACK_LANDMARKS){const d=distanceMetres(lon,lat,landmark);if(d<=landmark.radius&&d<bestDistance){best=landmark;bestDistance=d;}}
 return best?{name:best.name,type:best.type,address:best.address,sourceUpdated:'built-in geographic landmark match'}:null;
}
export function loadBuildingIdentities(){
 return pending ||= fetch('./data/building-identities.json',{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error('Building identities unavailable');return r.json();}).then(data=>{const arena=data.buildings?.['NGA14-538100'];if(arena)arena.name='T-Mobile Arena';return data.buildings;}).catch(error=>{console.warn(error.message);return {};});
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
 if(/New York|Circus Circus/i.test(name))return {photo:3,color:'#b97870',roughness:.74};
 if(/Excalibur/i.test(name))return {photo:1,color:'#d8c5a4',roughness:.82};
 if(/Resorts World/i.test(name))return {photo:0,color:'#743b42',roughness:.42};
 if(/Treasure Island|STRAT/i.test(name))return {photo:0,color:'#9caab4',roughness:.38};
 if(/Palms/i.test(name))return {photo:2,color:'#a5b7c2',roughness:.4};
 if(/Sphere/i.test(name))return {photo:2,color:'#5f6570',roughness:.28};
 if(/Allegiant/i.test(name))return {photo:2,color:'#1b2026',roughness:.38};
 if(/T-Mobile/i.test(name))return {photo:2,color:'#9ba6b1',roughness:.4};
 return null;
}
