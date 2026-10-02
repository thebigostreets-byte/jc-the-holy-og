const STORAGE_KEY='jc-audio-settings-v1';
const DEFAULTS={master:.72,music:.14,effects:.78,muted:false};
const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,Number(value)||0));

const PATTERNS={
  ui:[[660,.055,'sine',.055,0,0]],
  collect:[[523,.10,'sine',.12,0,0],[659,.11,'sine',.11,0,.075],[784,.18,'sine',.12,0,.15]],
  prayer:[[392,.16,'sine',.10,0,0],[494,.18,'sine',.10,0,.12],[587,.28,'sine',.11,0,.25]],
  cast:[[330,.07,'triangle',.08,0,0],[660,.13,'sine',.075,0,.045]],
  restore:[[392,.10,'sine',.09,0,0],[523,.12,'sine',.10,0,.08],[659,.19,'sine',.11,0,.16]],
  flight:[[196,.09,'triangle',.075,0,0],[293.66,.11,'triangle',.07,0,.07],[440,.16,'sine',.075,0,.14]],
  boost:[[220,.07,'sawtooth',.06,440,0],[440,.08,'triangle',.065,880,.05],[880,.15,'sine',.075,1320,.10]],
  dash:[[260,.07,'triangle',.075,520,0],[520,.13,'sine',.075,780,.05]],
  dive:[[260,.10,'sawtooth',.065,120,0],[120,.22,'triangle',.10,48,.08]],
  impact:[[100,.17,'sawtooth',.12,48,0],[75,.24,'triangle',.09,35,.04]],
  destroy:[[180,.16,'sawtooth',.10,60,0],[65,.27,'triangle',.12,35,.08]],
  enter:[[330,.08,'sine',.06,0,0],[247,.12,'sine',.055,0,.07]],
  exit:[[247,.08,'sine',.055,0,0],[392,.14,'sine',.07,0,.07]],
  teleport:[[440,.07,'sine',.07,880,0],[880,.16,'triangle',.08,440,.06]],
  pulse:[[220,.07,'triangle',.07,440,0],[440,.14,'sine',.075,880,.05]]
};

export function createJcAudio(){
  let settings={...DEFAULTS};
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(saved&&typeof saved==='object'){
      for(const key of ['master','music','effects'])if(Number.isFinite(Number(saved[key])))settings[key]=clamp(saved[key]);
      if(typeof saved.muted==='boolean')settings.muted=saved.muted;
    }
  }catch{}

  let context=null,masterGain=null,musicGain=null,effectsGain=null,ambientStarted=false;
  function setParam(param,value){
    if(!param)return;
    if(context&&typeof param.setTargetAtTime==='function')param.setTargetAtTime(value,context.currentTime,.025);
    else param.value=value;
  }
  function startAmbient(){
    if(!context||ambientStarted||settings.music<=0)return;
    ambientStarted=true;
    [110,164.81,220,329.63].forEach((frequency,index)=>{
      const oscillator=context.createOscillator(),voice=context.createGain();
      oscillator.type=index===3?'sine':'triangle';
      oscillator.frequency.value=frequency;
      voice.gain.value=[.06,.035,.025,.012][index];
      oscillator.connect(voice);voice.connect(musicGain);oscillator.start();
    });
  }
  function apply(){
    if(!context)return;
    setParam(masterGain.gain,settings.muted?0:settings.master);
    setParam(musicGain.gain,settings.music);
    setParam(effectsGain.gain,settings.effects);
    if(settings.music>0)startAmbient();
  }
  function start(){
    if(!context){
      const AudioCtor=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtor)return false;
      try{
        context=new AudioCtor();
        masterGain=context.createGain();musicGain=context.createGain();effectsGain=context.createGain();
        musicGain.connect(masterGain);effectsGain.connect(masterGain);masterGain.connect(context.destination);
        apply();
      }catch(error){console.warn('JC audio unavailable',error);context=null;return false;}
    }
    if(context.state==='suspended')Promise.resolve(context.resume()).catch(()=>{});
    return true;
  }
  function persist(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{}
  }
  function set(key,value){
    if(key==='muted')settings.muted=!!value;
    else if(['master','music','effects'].includes(key))settings[key]=clamp(value);
    else return getSettings();
    persist();apply();return getSettings();
  }
  function getSettings(){return {...settings};}
  function play(name='cast'){
    const pattern=PATTERNS[name]||PATTERNS.cast;
    if(!start()||settings.muted||settings.effects<=0)return false;
    for(const [frequency,duration,waveform,level,endFrequency=0,delay=0] of pattern){
      const oscillator=context.createOscillator(),voice=context.createGain();
      const at=context.currentTime+delay,peak=Math.max(.0001,level);
      oscillator.type=waveform;oscillator.frequency.setValueAtTime(frequency,at);
      if(endFrequency>0)oscillator.frequency.exponentialRampToValueAtTime(endFrequency,at+duration);
      voice.gain.setValueAtTime(.0001,at);
      voice.gain.exponentialRampToValueAtTime(peak,at+.015);
      voice.gain.exponentialRampToValueAtTime(.0001,at+duration);
      oscillator.connect(voice);voice.connect(effectsGain);
      oscillator.start(at);oscillator.stop(at+duration+.025);
      oscillator.addEventListener?.('ended',()=>{oscillator.disconnect();voice.disconnect();},{once:true});
    }
    return true;
  }

  const activate=()=>start();
  if(typeof window!=='undefined'){
    window.addEventListener('pointerdown',activate,{capture:true,passive:true});
    window.addEventListener('keydown',activate,{capture:true});
  }
  return {start,play,set,getSettings};
}
