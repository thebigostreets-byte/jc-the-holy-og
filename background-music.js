const TRACKS=[['Holy Drive-By','holy-drive-by.mp3'],['JC recording 01','jc-recording-01.m4a'],['JC recording 02','jc-recording-02.m4a'],['JC recording 03','jc-recording-03.m4a'],['JC mixdown 01','jc-mixdown-01.m4a'],['JC mixdown 02','jc-mixdown-02.m4a']];
export function addBackgroundMusic(parent){
 const box=document.createElement('details');box.style.cssText='position:fixed;right:12px;top:145px;z-index:45;background:#101728dd;color:white;padding:8px;border-radius:9px;font:12px system-ui;max-width:230px';
 const summary=document.createElement('summary');summary.textContent='JC MUSIC';const input=document.createElement('input');input.type='file';input.accept='audio/*,video/*';input.multiple=true;input.title='Choose JC music or lyric video files';input.style.width='210px';
 const media=document.createElement('audio');media.controls=true;media.preload='none';media.volume=.35;media.style.width='210px';
 const select=document.createElement('select');select.title='Choose a song';select.style.cssText='width:210px;margin:6px 0;padding:6px';
 const title=document.createElement('div');let urls=TRACKS.map(t=>'./api/music/'+t[1]),names=TRACKS.map(t=>t[0]),index=0,localUrls=[];
 function choices(){select.replaceChildren(...names.map((name,i)=>new Option(name,String(i))));select.value=String(index);}
 function play(){media.src=urls[index];title.textContent=names[index];select.value=String(index);media.play().catch(()=>{title.textContent='Press Play to start music';});}
 media.src=urls[0];title.textContent=names[0];choices();
 document.addEventListener('pointerdown',()=>{media.play().catch(()=>{});},{once:true});select.onchange=()=>{index=Number(select.value);play();};
 input.onchange=()=>{media.pause();localUrls.forEach(URL.revokeObjectURL);const files=[...input.files];if(!files.length)return;localUrls=files.map(f=>URL.createObjectURL(f));urls=localUrls;names=files.map(f=>f.name);index=0;choices();play();};
 media.onended=()=>{if(urls.length){index=(index+1)%urls.length;play();}};box.append(summary,title,select,media,input);parent.append(box);return box;
}
