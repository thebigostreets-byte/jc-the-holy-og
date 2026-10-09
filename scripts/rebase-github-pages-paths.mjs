import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'pages');
const textExtensions=new Set(['.html','.css','.js','.mjs','.json','.webmanifest','.svg']);
let changedFiles=0,changedRefs=0;
function visit(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()){visit(file);continue;}
    if(!textExtensions.has(path.extname(entry.name).toLowerCase()))continue;
    let text=readFileSync(file,'utf8');
    let count=0;
    text=text.replace(/([\x22\x27\x60])\/(?!\/|jc-the-holy-og\/)(?=[A-Za-z0-9_.-])/g,(_,quote)=>{count++;return quote+'/jc-the-holy-og/';});
    text=text.replace(/url\((\s*)\/(?!\/|jc-the-holy-og\/)(?=[A-Za-z0-9_.-])/gi,(_,space)=>{count++;return 'url('+space+'/jc-the-holy-og/';});
    if(count){writeFileSync(file,text);changedFiles++;changedRefs+=count;}
  }
}
visit(root);
const html=readFileSync(path.join(root,'game-full.html'),'utf8');
const loader=readFileSync(path.join(root,'device-loader.js'),'utf8');
if(!html.includes('href="/jc-the-holy-og/game-ui.css')||!loader.includes('"/jc-the-holy-og/boot-runtime.js"')){
  throw new Error('GitHub Pages path verification failed; required CSS or startup module still uses an origin-root URL.');
}
console.log(`Rebased ${changedRefs} origin-root references in ${changedFiles} deployable text files for /jc-the-holy-og/.`);
