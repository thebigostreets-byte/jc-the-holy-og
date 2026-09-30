import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const files=JSON.parse(await readFile(new URL('scripts/public-assets.json',root),'utf8'));
const assets=[];
for(const path of files){const bytes=await readFile(new URL(path,root));assets.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(new URL('scripts/game-assets-lock.json',root),JSON.stringify({version:1,origin:'https://jc-the-holy-og.ill5299.chatgpt.site/',assets},null,2)+'\n');
console.log(`Locked ${assets.length} public game assets.`);
