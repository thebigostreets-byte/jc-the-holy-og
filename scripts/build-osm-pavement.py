#!/usr/bin/env python3
"""Offline 35x35km OpenStreetMap paving compiler for JC.
Source: Geofabrik Nevada PBF, ODbL © OpenStreetMap contributors.
Emits no network calls at runtime. Re-run during controlled deployments to update.
Dependencies: osmium, pyproj, shapely (installed in GitHub Actions).
"""
import argparse
import collections
import gzip
import json
import math
from pathlib import Path

X0,Y0=648949.782,3983561.814
GRID=35
SIZE=1000
HIGHWAYS={
 "motorway":"INTERSTATE","motorway_link":"RAMP","trunk":"FREEWAY","trunk_link":"RAMP",
 "primary":"MAJOR STREET","primary_link":"RAMP",
 "secondary":"MAJOR STREET","secondary_link":"RAMP",
 "tertiary":"COLLECTOR","tertiary_link":"RAMP",
 "residential":"LOCAL","living_street":"LOCAL","unclassified":"LOCAL",
 "service":"PRIVATE STREET","road":"LOCAL","track":"ALLEY"
}

def tiles(bounds):
 minx,miny,maxx,maxy=bounds
 a=max(0,int(math.floor((minx-X0)/SIZE)))
 b=min(GRID-1,int(math.floor((maxx-X0)/SIZE)))
 c=max(0,int(math.floor((miny-Y0)/SIZE)))
 d=min(GRID-1,int(math.floor((maxy-Y0)/SIZE)))
 if a>b or c>d:return
 for col in range(a,b+1):
  for row in range(c,d+1):
   yield col,row

def ident(col,row):return f"C{col:02d}_R{row:02d}"

def split_lines(shape):
 if shape.is_empty:return
 if shape.geom_type=="LineString":
  if len(shape.coords)>1 and shape.length>0.5:yield shape
 elif hasattr(shape,"geoms"):
  for sub in shape.geoms:yield from split_lines(sub)

def split_polygons(shape):
 if shape.is_empty:return
 if shape.geom_type=="Polygon":
  if shape.area>=120:yield shape
 elif hasattr(shape,"geoms"):
  for sub in shape.geoms:yield from split_polygons(sub)

def compile_pbf(path,out,limit=None):
 import osmium
 from shapely.geometry import LineString,Polygon,box
 from pyproj import Transformer
 project=Transformer.from_crs("EPSG:4326","EPSG:32611",always_xy=True)
 highway_tiles=collections.defaultdict(list)
 parking_tiles=collections.defaultdict(list)
 box_cache={}
 def bounds_box(i,j):
  key=(i,j)
  if key not in box_cache:
   x=X0+i*SIZE;y=Y0+j*SIZE
   box_cache[key]=box(x,y,x+SIZE,y+SIZE)
  return box_cache[key]

 class Handler(osmium.SimpleHandler):
  count=0;roads=0;lots=0
  def way(self,w):
   tags=w.tags
   highway=tags.get("highway")
   parking=(tags.get("amenity")=="parking" or tags.get("landuse")=="parking")
   if not (highway in HIGHWAYS or parking):return
   if tags.get("area")=="yes" and highway in HIGHWAYS:return
   if tags.get("tunnel") in ("yes","building_passage"):return
   try:
    nodes=[(n.lon,n.lat) for n in w.nodes if n.location.valid()]
   except (ValueError,RuntimeError):
    return
   if len(nodes)<2:return
   if abs(nodes[0][0]+115.2)>1 or abs(nodes[0][1]-36.1)>1:return
   projected=[project.transform(lon,lat) for lon,lat in nodes]
   minx=min(p[0] for p in projected);maxx=max(p[0] for p in projected)
   miny=min(p[1] for p in projected);maxy=max(p[1] for p in projected)
   if maxx<X0 or minx>X0+GRID*SIZE or maxy<Y0 or miny>Y0+GRID*SIZE:return
   if parking and len(projected)>=4 and nodes[0]==nodes[-1]:
    if tags.get("parking") in ("underground","multi-storey","rooftop") or tags.get("location")=="underground":return
    try:
     poly=Polygon(projected)
     if not poly.is_valid:poly=poly.buffer(0)
     for col,row in tiles(poly.bounds):
      for clipped in split_polygons(poly.intersection(bounds_box(col,row))):
       coords=[[round(x,2),round(y,2)] for x,y in list(clipped.exterior.coords)[:-1]]
       if len(coords)<3 or len(coords)>500:continue
       parking_tiles[ident(col,row)].append({"id":str(w.id),"points":coords,"name":str(tags.get("name") or "")[:80]})
       self.lots+=1
    except (ValueError,TypeError):pass
   if highway not in HIGHWAYS or (tags.get("access")=="no"):return
   try:
    line=LineString(projected)
    if line.length<2:return
    for col,row in tiles(line.bounds):
     for clipped in split_lines(line.intersection(bounds_box(col,row))):
      points=[[round(x,2),round(y,2)] for x,y in clipped.coords]
      if len(points)<2:continue
      highway_tiles[ident(col,row)].append({"name":str(tags.get("name") or "")[:90],
       "kind":HIGHWAYS[highway],"points":points})
      self.roads+=1
   except (ValueError,TypeError):pass
   self.count+=1

 handler=Handler()
 handler.apply_file(str(path),locations=True)
 out=Path(out)
 for sub in ("roads","parking"):
  (out/sub).mkdir(parents=True,exist_ok=True)
  for stale in (out/sub).glob("C??_R??.json.gz"):stale.unlink()
 def emit(kind,tileset):
  for ident_,rows in sorted(tileset.items()):
   if not rows:continue
   data=json.dumps(rows,separators=(",",":"),ensure_ascii=False).encode("utf-8")
   with gzip.open(out/kind/(ident_+".json.gz"),"wb",compresslevel=8) as stream:stream.write(data)
 emit("roads",highway_tiles)
 emit("parking",parking_tiles)
 report={"road_tiles":len(highway_tiles),"parking_tiles":len(parking_tiles),
  "roads":handler.roads,"surface_parking_polygons":handler.lots,
  "bounding_box_EPSG32611":[X0,Y0,X0+GRID*SIZE,Y0+GRID*SIZE],
  "source":"Geofabrik Nevada OpenStreetMap ODbL © OpenStreetMap contributors"}
 (out/"osm-paving-report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps(report,indent=2))
 if handler.roads<500 or len(highway_tiles)<100:
  raise RuntimeError("Insufficient OSM coverage; refusing to deploy incomplete pavement data.")

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--pbf",required=True)
 p.add_argument("--out",default="data")
 args=p.parse_args()
 compile_pbf(args.pbf,args.out)

if __name__=="__main__":main()
