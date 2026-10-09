const CUTOUTS = Object.freeze({
  'blood-bay': Object.freeze({
    day: './assets/building-cutouts/blood-bay-v1.webp',
    night: './assets/building-cutouts/blood-bay-v1.webp'
  }),
  'obsidian-pyramid': Object.freeze({
    day: './assets/building-cutouts/obsidian-pyramid-v1.webp',
    night: './assets/building-cutouts/obsidian-pyramid-night-v1.webp'
  })
});
const VIEW_ANGLE = Math.PI / 4;
const VIEW_TOLERANCE = Math.PI / 5;

export function photoCutoutAsset(identityOrName = '', night = false) {
  const name = (typeof identityOrName === 'string' ? identityOrName : identityOrName?.name || '').trim().toLowerCase();
  const asset = name === 'blood bay' || name === 'mandalay bay' ? CUTOUTS['blood-bay']
    : name === 'obsidian pyramid' || name === 'luxor' ? CUTOUTS['obsidian-pyramid']
    : null;
  return asset?.[night ? 'night' : 'day'] || null;
}

export function isPhotoCutoutView(dx, dz, distance, height, sector = VIEW_ANGLE) {
  if (![dx, dz, distance, height].every(Number.isFinite) || distance < Math.max(420, height * 6)) return false;
  const angle = Math.atan2(dx, dz);
  const delta = Math.atan2(Math.sin(angle - sector), Math.cos(angle - sector));
  return Math.abs(delta) <= VIEW_TOLERANCE;
}

// Prefer assets whose baked view matches the camera, then the closest landmark.
export function rankPhotoCutoutTargets(candidates = []) {
  return [...candidates].sort((a, b) => Number(!!b.inView) - Number(!!a.inView) || a.distance - b.distance);
}
