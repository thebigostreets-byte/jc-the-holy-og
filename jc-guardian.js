// Dependency-free runtime defense layer. Integration is opt-in: no gameplay behavior changes until wired.
export function createJCGuardian({
  clock=()=>Date.now(), report=()=>{}, frameBudgetMs=50, maxConsecutiveSlowFrames=15,
  maxRecentFailures=5, failureWindowMs=30000, cooldownMs=60000
}={}){
  const circuits=new Map(), incidents=[], metrics={frames:0,slowFrames:0,invalidPositions:0,recoveries:0};
  let slowStreak=0;
  const record=(type,details={})=>{
    const event={type,at:clock(),...details};
    incidents.push(event); if(incidents.length>200)incidents.shift();
    try{report(event)}catch{} // diagnostic reporting cannot bring down the game
    return event;
  };
  function frame(ms){
    if(!Number.isFinite(ms)||ms<0){record('invalid-frame',{ms});return {ok:false};}
    metrics.frames++;
    if(ms>frameBudgetMs){metrics.slowFrames++;slowStreak++;}
    else slowStreak=0;
    if(slowStreak===maxConsecutiveSlowFrames)record('sustained-slow-frames',{streak:slowStreak,ms});
    return {ok:slowStreak<maxConsecutiveSlowFrames,slowStreak};
  }
  function position(p,bounds){
    if(!p||!['x','y','z'].every(k=>Number.isFinite(p[k]))){
      metrics.invalidPositions++;record('invalid-position');return false;
    }
    if(bounds&&['x','y','z'].some(k=>bounds[k]&&
      (p[k]<bounds[k][0]||p[k]>bounds[k][1]))){
      metrics.invalidPositions++;record('out-of-bounds-position');return false;
    }
    return true;
  }
  function execute(name,action,fallback=()=>undefined){
    const now=clock(), state=circuits.get(name)||{failures:[],openUntil:0};
    if(now<state.openUntil){record('circuit-open',{name});return fallback();}
    // Only sync work is wrapped here; async API requests should use a separate timeout controller.
    try {const result=action();state.failures=[];circuits.set(name,state);return result;}
    catch(error){
      state.failures=state.failures.filter(t=>now-t<=failureWindowMs);
      state.failures.push(now);
      if(state.failures.length>=maxRecentFailures)state.openUntil=now+cooldownMs;
      circuits.set(name,state);
      record('subsystem-failure',{name,message:String(error?.message||error)});
      try{metrics.recoveries++;return fallback(error)}catch(e){
        record('fallback-failure',{name,message:String(e?.message||e)});return undefined;
      }
    }
  }
  function reset(name){circuits.delete(name);record('circuit-reset',{name});}
  function snapshot(){return {metrics:{...metrics},slowStreak,incidents:[...incidents],circuits:[...circuits].map(([name,s])=>({name,openUntil:s.openUntil,failures:s.failures.length}))};}
  return {frame,position,execute,reset,record,snapshot};
}
