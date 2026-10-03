export const ABILITIES_PER_WHEEL_PAGE = 8;

export function abilityWheelPage(abilities, group, page = 0, pageSize = ABILITIES_PER_WHEEL_PAGE) {
  const items = abilities.filter(ability => ability.group === group);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = ((Math.trunc(page) % pageCount) + pageCount) % pageCount;
  return { items: items.slice(safePage * pageSize, (safePage + 1) * pageSize), page: safePage, pageCount };
}

export function minimapPoint(position, center, halfRange, size) {
  const scale = size / (2 * halfRange);
  return { x: size / 2 + (position.x - center.x) * scale, y: size / 2 + (position.z - center.z) * scale };
}

export function compassHeading(yaw) {
  return ((Math.round(yaw * 180 / Math.PI) % 360) + 360) % 360;
}
