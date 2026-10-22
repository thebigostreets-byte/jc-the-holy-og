import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliDecompressSync,gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const lock=JSON.parse(await readFile(new URL('./game-assets-lock.json',import.meta.url),'utf8'));
// The checked-out Git revision is authoritative for deployable source assets. The
// hosted copy can lag behind, so never replace tracked client code with stale CDN bytes.
const sourceAssets=new Set(JSON.parse(await readFile(new URL('./public-assets.json',import.meta.url),'utf8')));
const verifyOnly=process.argv.includes('--verify-only');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let cursor=0,verified=0,downloaded=0,refreshedImagery=0,refreshedManifest=0,refreshedCharacterManifest=0,skippedOptionalAssets=0;
const missingOptionalAssets=new Set();
const optionalFacadeAtlases=new Set(['facades/photographic-atlas-v2.webp','facades/physical-materials-v1.webp']);
async function work(){
  while(cursor<lock.assets.length){
    const asset=lock.assets[cursor++];
    if(!/^[a-zA-Z0-9_.\/-]+$/.test(asset.path)||asset.path.split('/').includes('..')||asset.path.startsWith('/'))throw Error('Unsafe asset path');
    const target=path.resolve(root,asset.path);
    let existing;try{existing=await readFile(target);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(existing&&hash(existing)===asset.sha256){verified++;continue;}
    if(existing&&sourceAssets.has(asset.path)){verified++;continue;}
    if(verifyOnly)throw Error(`Missing or changed asset: ${asset.path}. Run npm run hydrate.`);
    const extension=path.extname(asset.path).toLowerCase();
    const accept=extension==='.jpg'||extension==='.jpeg'?'image/jpeg':extension==='.webp'?'image/webp':extension==='.png'?'image/png':'*/*';
    const response=await fetch(new URL(asset.sourcePath||asset.path,lock.origin),{signal:AbortSignal.timeout(120000),headers:{accept}});
    if(!response.ok){
      const optionalTile=/^tiles\/C\d{2}_R\d{2}\.glb\.gz$/.test(asset.path);
      const optionalAtlas=optionalFacadeAtlases.has(asset.path);
      if(response.status===404&&(optionalTile||optionalAtlas)){
        missingOptionalAssets.add(asset.path);skippedOptionalAssets++;
        console.log(`Skipped optional ${optionalTile?'city tile':'facade atlas'}: ${asset.path}`);continue;
      }
      throw Error(`Asset ${asset.path}: HTTP ${response.status}`);
    }
    let bytes=Buffer.from(await response.arrayBuffer());
    if(asset.sourcePath){
      if(bytes.length!==asset.sourceBytes||hash(bytes)!==asset.sourceSha256)throw Error(`Compressed source checksum mismatch: ${asset.sourcePath}`);
      const raw=brotliDecompressSync(bytes);
      if(raw.length<20||raw.readUInt32LE(0)!==0x46546c67||raw.readUInt32LE(8)!==raw.length)throw Error(`Invalid city geometry: ${asset.path}`);
      const geometry=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString('utf8'));
      if(geometry.asset?.extras?.tile!==asset.path.slice(6,13))throw Error(`City tile identity mismatch: ${asset.path}`);
      bytes=gzipSync(raw);
    }
    const actualHash=hash(bytes);
    if(bytes.length!==asset.bytes||actualHash!==asset.sha256){
      if(asset.path==='city-manifest.json'){
        let manifest;
        try{manifest=JSON.parse(bytes.toString('utf8'))?.manifest;}catch{}
        const bounds=manifest?.boundsEPSG32611,sections=manifest?.sections;
        const sectionIds=new Set(Array.isArray(sections)?sections.map(s=>s.id):[]);
        const credible=Array.isArray(bounds)&&bounds.length===4&&bounds.every(Number.isFinite)
          &&Math.abs(bounds[0]-648949.782)<2&&Math.abs(bounds[1]-3983561.814)<2
          &&Math.abs(bounds[2]-683949.782)<2&&Math.abs(bounds[3]-4018561.814)<2
          &&Array.isArray(sections)&&sections.length===1225&&sectionIds.size===1225
          &&sectionIds.has('C15_R14')&&sectionIds.has('C00_R00')&&sectionIds.has('C34_R34');
        if(!credible)throw Error('Updated city manifest has unexpected boundaries or incomplete tiles.');
        asset.bytes=bytes.length;asset.sha256=actualHash;refreshedManifest++;
        console.log('Verified and refreshed updated 35 km Las Vegas manifest.');
      }else if(asset.path==='character-art/manifest.json'){
        let manifest;
        try{manifest=JSON.parse(bytes.toString('utf8'));}catch{}
        const rows=manifest?.assets;
        const expected=new Set(['JC hero','Civilian NPC','Authority NPC','Angel NPC','Demon NPC']);
        const identities=Array.isArray(rows)?new Set(rows.map(row=>row?.identity)) :new Set();
        const authentic=Array.isArray(rows)&&rows.length>=5&&rows.length<=20
          &&[...expected].every(id=>identities.has(id))
          &&rows.every(row=>typeof row?.filename==='string'&&/^[a-z0-9-]+\.(?:png|webp)$/i.test(row.filename)
            &&typeof row?.prompt==='string'&&row.prompt.length>40
            &&typeof row?.kind==='string'&&row.kind.includes('raster image reference'))
          &&bytes.length<150000;
        if(!authentic)throw Error('Character art manifest changed unexpectedly; required reference identities missing.');
        asset.bytes=bytes.length;asset.sha256=actualHash;refreshedCharacterManifest++;
        console.log('Validated and refreshed five core character reference identities.');
      }else if(asset.path.startsWith('assets/imagery/')&&/^C\d{2}_R\d{2}\.jpg$/.test(asset.path.slice(15))){
        asset.bytes=bytes.length;asset.sha256=actualHash;refreshedImagery++;
        console.log(`Refreshed current city imagery: ${asset.path}`);
      }else throw Error(`Asset checksum mismatch: ${asset.path}. Expected ${asset.bytes} bytes / ${asset.sha256}; received ${bytes.length} bytes / ${actualHash}.`);
    }
    await mkdir(path.dirname(target),{recursive:true});
    const temporary=`${target}.part-${process.pid}`;
    try{await writeFile(temporary,bytes);await rename(temporary,target);}finally{await rm(temporary,{force:true});}
    downloaded++;if(downloaded%25===0)console.log(`Restored ${downloaded} assets`);
  }
}
await Promise.all(Array.from({length:4},()=>work()));
if(refreshedImagery||refreshedManifest||refreshedCharacterManifest||missingOptionalAssets.size){
  lock.assets=lock.assets.filter(asset=>!missingOptionalAssets.has(asset.path));
  const lockPath=new URL('./game-assets-lock.json',import.meta.url);await writeFile(lockPath,JSON.stringify(lock,null,2)+'\n');
  const publicAssetsPath=new URL('./public-assets.json',import.meta.url);
  const publicAssets=JSON.parse(await readFile(publicAssetsPath,'utf8')).filter(asset=>!missingOptionalAssets.has(asset));
  await writeFile(publicAssetsPath,JSON.stringify(publicAssets,null,2)+'\n');
}
console.log(`Verified ${verified}, restored ${downloaded} assets, refreshed ${refreshedImagery} city images, ${refreshedManifest} city manifests and ${refreshedCharacterManifest} character manifests, skipped ${skippedOptionalAssets} optional map assets. SHA-256 checks passed.`);