// JC photo-cutout pilot registry. Cutouts are distant visuals, not collision data.
// Existing assets are preserved; pending QA is not a certification of foreground masks.
export const PILOT_CUTOUTS = Object.freeze([
  Object.freeze({
    id:'cutout_blood_bay_v1',
    names:Object.freeze(['blood bay','mandalay bay']),
    day:'./assets/building-cutouts/blood-bay-v1.webp',
    night:'./assets/building-cutouts/blood-bay-v1.webp',
    source:'existing-user-provided-original-art',
    alphaVerified:true,
    foregroundReview:'pending',
    webglReview:'pending'
  }),
  Object.freeze({
    id:'cutout_obsidian_pyramid_v1',
    names:Object.freeze(['obsidian pyramid','luxor']),
    day:'./assets/building-cutouts/obsidian-pyramid-v1.webp',
    night:'./assets/building-cutouts/obsidian-pyramid-night-v1.webp',
    source:'existing-user-provided-original-art',
    alphaVerified:true,
    foregroundReview:'pending',
    webglReview:'pending'
  })
]);
export function pilotCutoutRecord(identityOrName=''){
  const name=(typeof identityOrName==='string'?identityOrName:identityOrName?.name||'').trim().toLowerCase();
  return PILOT_CUTOUTS.find(record=>record.names.includes(name))||null;
}
export function pilotCutoutAsset(identityOrName='',night=false){
  const record=pilotCutoutRecord(identityOrName);
  return record?record[night?'night':'day']:null;
}
// New images must complete all gates before release.
export function canPromoteNewCutout(record){
  return !!record&&record.alphaVerified===true&&record.foregroundReview==='passed'
    &&record.webglReview==='passed'&&record.rightsReview==='passed'
    &&record.placementReview==='passed';
}
