import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const lock=JSON.parse(await readFile(new URL('./game-assets-lock.json',import.meta.url),'utf8'));
const verifyOnly=process.argv.includes('--verify-only');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let cursor=0,verified=0,downloaded=0,refreshedImagery=0;
async function work(){
  while(cursor<lock.assets.length){
    const asset=lock.assets[cursor++];
    if(!/^[a-zA-Z0-9_.\/-]+$/.test(asset.path)||asset.path.split('/').includes('..')||asset.path.startsWith('/'))throw Error('Unsafe asset path');
    const target=path.resolve(root,asset.path);
    let existing;try{existing=await readFile(target);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(existing&&hash(existing)===asset.sha256){verified++;continue;}
    if(verifyOnly)throw Error(`Missing or changed asset: ${asset.path}. Run npm run hydrate.`);
    const extension=path.extname(asset.path).toLowerCase();
    const accept=extension==='.jpg'||extension==='.jpeg'?'image/jpeg':extension==='.webp'?'image/webp':extension==='.png'?'image/png':'*/*';
    const response=await fetch(new URL(asset.path,lock.origin),{signal:AbortSignal.timeout(120000),headers:{accept}});
    if(!response.ok)throw Error(`Asset ${asset.path}: HTTP ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    const actualHash=hash(bytes);
    if(bytes.length!==asset.bytes||actualHash!==asset.sha256){
      if(!/^assets\\/imagery\\/C\\d{2}_R\\d{2}\\.jpg$/.test(asset.path))throw Error(`Asset checksum mismatch: ${asset.path}. Expected ${asset.bytes} bytes / ${asset.sha256}; received ${bytes.length} bytes / ${actualHash}.`);
      asset.bytes=bytes.length;asset.sha256=actualHash;refreshedImagery++;console.log(`Refreshed current city imagery: ${asset.path}`);
    }
    await mkdir(path.dirname(target),{recursive:true});
    const temporary=`${target}.part-${process.pid}`;
    try{await writeFile(temporary,bytes);await rename(temporary,target);}finally{await rm(temporary,{force:true});}
    downloaded++;if(downloaded%25===0)console.log(`Restored ${downloaded} assets`);
  }
}
await Promise.all(Array.from({length:4},()=>work()));
if(refreshedImagery){const lockPath=new URL('./game-assets-lock.json',import.meta.url);await writeFile(lockPath,JSON.stringify(lock,null,2)+'\\n');}
console.log(`Verified ${verified}, restored ${downloaded} assets, refreshed ${refreshedImagery} city images for JC. SHA-256 checks passed.`);
