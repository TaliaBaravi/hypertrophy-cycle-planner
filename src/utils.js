export function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatPriority(priority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function roundToIncrement(value, increment = 2.5) {
  return Math.round(value / increment) * increment;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function groupBy(items, keySelector) {
  return items.reduce((map, item) => {
    const key = keySelector(item);
    const current = map.get(key) || [];
    current.push(item);
    map.set(key, current);
    return map;
  }, new Map());
}
