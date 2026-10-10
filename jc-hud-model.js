export const ABILITIES_PER_WHEEL_PAGE = 8;

export function abilityWheelPage(abilities, group, page = 0, pageSize = ABILITIES_PER_WHEEL_PAGE) {
  const safeSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(64, Math.trunc(pageSize)) : ABILITIES_PER_WHEEL_PAGE;
  const items = (Array.isArray(abilities) ? abilities : []).filter(ability => ability && ability.group === group);
  const pageCount = Math.max(1, Math.ceil(items.length / safeSize));
  const index = Number.isFinite(page) ? Math.trunc(page) : 0;
  const safePage = ((index % pageCount) + pageCount) % pageCount;
  return { items: items.slice(safePage * safeSize, (safePage + 1) * safeSize), page: safePage, pageCount };
}

export function minimapPoint(position, center, halfRange, size) {
  const invalid = { x: -1e6, y: -1e6 };
  if (![position?.x, position?.z, center?.x, center?.z, halfRange, size].every(Number.isFinite) || halfRange <= 0 || size <= 0) return invalid;
  const scale = size / (2 * halfRange);
  const x = size / 2 + (position.x - center.x) * scale;
  const y = size / 2 + (position.z - center.z) * scale;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : invalid;
}

export function compassHeading(yaw) {
  if (!Number.isFinite(yaw)) return 0;
  return ((Math.round(yaw * 180 / Math.PI) % 360) + 360) % 360;
}
