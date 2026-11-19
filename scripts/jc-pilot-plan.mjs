// JC Phase 2: deterministic selection from the original 50,000-slot registry.
// Preview/final jobs stay BLOCKED: there is no automatic image generation here.
import {pathToFileURL} from 'node:url';
const ids=[
  ...Array.from({length:12},(_,i)=>1+i),
  ...Array.from({length:4},(_,i)=>30001+i),
  47001,47002,45001,48501
];
const family=n=>n<=30000?'facade':n<=37500?'collider':n<=42500?'npc_visual':n<=45000?'npc_behavior':n<=47000?'vehicle':n<=48500?'tile':n<=49500?'vfx':'tuning';
const fmt=n=>String(n).padStart(6,'0');
export function makeJcPilotPlan(){
  return {
    version:1,
    project:'JC vs. Satan: Sin City',
    source:'JC Pipeline Master 50,000-parameter plan',
    pilot_area:'Strip startup tile C15_R14; source placement pending verification',
    tile_id:'C15_R14',
    real_world_geometry_verified:false,
    game_engine:'preserve existing 3D geometry, flight, collision, NPCs and controls',
    existing_cutout_fixtures:['cutout_blood_bay_v1','cutout_obsidian_pyramid_v1'],
    promotion_requirements:[
      'source rights and provenance verified',
      'coordinates and geometry aligned to authoritative tile data',
      'sky/road/valet/sidewalk/parking removed from vertical wall images',
      'alpha edges and neighboring-building occlusion manually reviewed',
      'colliders stay active at every visual LOD',
      'day/night and camera-angle consistency checked',
      'desktop and mobile flight benchmarks measured'
    ],
    slots:ids.map(n=>({
      parameter_id:'P'+fmt(n),family:family(n),planned_tile_id:'C15_R14',
      real_building_id:null,verified_coordinate_epsg32611:null,
      source_ref:null,state:'unassigned'
    })),
    jobs:ids.flatMap(n=>[0,1].map(stage=>({
      job_id:'J'+fmt(2*n-1+stage),parameter_id:'P'+fmt(n),
      family:family(n),stage:stage===0?'preview':'final',
      depends_on:stage===0?[]:['J'+fmt(2*n-1)],
      status:'blocked',output_path:null,qa_passed:false,
      blocker:'requires verified source geometry, placement, visual reference and rights review'
    })))
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  process.stdout.write(JSON.stringify(makeJcPilotPlan(),null,2)+'\n');
}
