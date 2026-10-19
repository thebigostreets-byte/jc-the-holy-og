import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),assetFile=new URL('../scripts/public-assets.json',import.meta.url);
const assets=new Set(JSON.parse(await readFile(assetFile,'utf8')));
const dataRoot=new URL('../data/',import.meta.url);
async function tiles(kind){
 try{return (await readdir(new URL(kind+'/',dataRoot))).filter(x=>/^C\d{2}_R\d{2}\.json\.gz$/.test(x)).map(x=>x.slice(0,7)).sort();}
 catch{return [];}
}
const roads=await tiles('roads'),parking=await tiles('parking');
if(roads.length<100)throw Error('Refusing to register incomplete city road dataset: '+roads.length+' tiles');
const index={source:'OpenStreetMap ODbL © OpenStreetMap contributors; offline Geofabrik Nevada',
 boundsEPSG32611:[648949.782,3983561.814,683949.782,4018561.814],
 generatedAt:new Date().toISOString(),roads,parking};
await mkdir(dataRoot,{recursive:true});
await writeFile(new URL('paving-index.json',dataRoot),JSON.stringify(index));
for(const id of roads)assets.add('data/roads/'+id+'.json.gz');
for(const id of parking)assets.add('data/parking/'+id+'.json.gz');
assets.add('data/paving-index.json');
await writeFile(assetFile,JSON.stringify([...assets].sort(),null,2)+'\n');
console.log('Registered '+roads.length+' city road tiles and '+parking.length+' OSM surface-parking tiles.');
