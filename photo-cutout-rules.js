const CUTOUTS = Object.freeze({
  'blood-bay': './assets/building-cutouts/blood-bay-v1.webp',
  'obsidian-pyramid': './assets/building-cutouts/obsidian-pyramid-v1.webp'
});
const VIEW_ANGLE = Math.PI / 4;
const VIEW_TOLERANCE = Math.PI / 5;

export function photoCutoutAsset(identityOrName = '') {
  const name = (typeof identityOrName === 'string' ? identityOrName : identityOrName?.name || '').trim().toLowerCase();
  if (name === 'blood bay' || name === 'mandalay bay') return CUTOUTS['blood-bay'];
  if (name === 'obsidian pyramid' || name === 'luxor') return CUTOUTS['obsidian-pyramid'];
  return null;
}

export function isPhotoCutoutView(dx, dz, distance, height, sector = VIEW_ANGLE) {
  if (![dx, dz, distance, height].every(Number.isFinite) || distance < Math.max(420, height * 6)) return false;
  const angle = Math.atan2(dx, dz);
  const delta = Math.atan2(Math.sin(angle - sector), Math.cos(angle - sector));
  return Math.abs(delta) <= VIEW_TOLERANCE;
}
