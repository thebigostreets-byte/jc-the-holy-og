#!/usr/bin/env python3
"""Cooperative scoped read/write asset agent interface for JC."""
import argparse,hashlib,json,os,time
from pathlib import Path
SCOPES={"coordinator":["tasks/","reports/"],"geometry":["assets/geometry/"],"vehicles":["assets/vehicles/"],"characters":["assets/characters/"],"buildings":["assets/buildings/"],"textures":["assets/materials/"],"reflections":["runtime/reflections/"],"animation":["assets/animations/"],"performance":["runtime/performance/"],"qa":["reports/"]}
def operate(root,agent,action,path,content=None):
    if agent not in SCOPES: raise ValueError("Unknown agent")
    root=Path(root).resolve(); dest=(root/path).resolve()
    if dest==root or not dest.is_relative_to(root) or any(x.startswith(".") for x in Path(path).parts):raise ValueError("Invalid path")
    if action=="write" and not any(path.startswith(prefix) for prefix in SCOPES[agent]):raise PermissionError("Write scope denied")
    if action=="read":return dest.read_text(encoding="utf-8")
    if action!="write":raise ValueError("Invalid action")
    dest.parent.mkdir(parents=True,exist_ok=True)
    tmp=dest.with_name(dest.name+".tmp-"+str(os.getpid()));tmp.write_text(content,encoding="utf-8");os.replace(tmp,dest)
    audit=root/"reports/audit.jsonl";audit.parent.mkdir(parents=True,exist_ok=True)
    with audit.open("a") as f:f.write(json.dumps({"time":time.time(),"agent":agent,"path":path,"sha256":hashlib.sha256(content.encode()).hexdigest()})+"\n")
    return str(dest)
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("action",choices=["read","write"]);p.add_argument("--root",required=True);p.add_argument("--agent",required=True,choices=SCOPES);p.add_argument("--path",required=True);p.add_argument("--text")
    a=p.parse_args();print(operate(a.root,a.agent,a.action,a.path,a.text))
