// Three serializes userData during clone(). Keep live Texture references out of
// that JSON path; each building still owns its color and editable material.
export function cloneBuildingMaterial(source) {
  const metadata=source.userData;
  source.userData={};
  let clone;
  try {clone=source.clone();}finally{source.userData=metadata;}
  clone.userData={...metadata};
  if(metadata.original) clone.userData.original={...metadata.original,color:metadata.original.color?.clone?.()||metadata.original.color};
  return clone;
}
