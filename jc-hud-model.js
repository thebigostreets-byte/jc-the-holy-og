export const ABILITIES_PER_WHEEL_PAGE = 8;

export function abilityWheelPage(abilities, group, page = 0, pageSize = ABILITIES_PER_WHEEL_PAGE) {
  const safeSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.trunc(pageSize) : ABILITIES_PER_WHEEL_PAGE;
  const items = (Array.isArray(abilities) ? abilities : []).filter(ability => ability?.group === group);
  const pageCount = Math.max(1, Math.ceil(items.length / safeSize));
  const requestedPage = Number.isFinite(page) ? Math.trunc(page) : 0;
  const safePage = ((requestedPage % pageCount) + pageCount) % pageCount;
  return { items: items.slice(safePage * safeSize, (safePage + 1) * safeSize), page: safePage, pageCount };
}

export function minimapPoint(position, center, halfRange, size) {
  const side = Number.isFinite(size) && size > 0 ? size : 0;
  const middle = side / 2;
  if (!Number.isFinite(halfRange) || halfRange <= 0 ||
      !position || !center ||
      ![position.x, position.z, center.x, center.z].every(Number.isFinite)) {
    return { x: middle, y: middle };
  }
  const scale = side / (2 * halfRange);
  const x = middle + (position.x - center.x) * scale;
  const y = middle + (position.z - center.z) * scale;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : { x: -21, y: -21 };
}

export function compassHeading(yaw) {
  if (!Number.isFinite(yaw)) return 0;
  const normalized = yaw % (Math.PI * 2);
  return ((Math.round(normalized * 180 / Math.PI) % 360) + 360) % 360;
}
