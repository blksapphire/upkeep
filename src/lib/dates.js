const DAY_MS = 86400000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function toIso(y, m, d) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function isValidIsoDate(iso) {
  if (typeof iso !== 'string' || !ISO_DATE.test(iso)) return false;
  const { y, m, d } = parseIso(iso);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function todayIso(now = new Date()) {
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(iso, days) {
  const { y, m, d } = parseIso(iso);
  const date = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return toIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Add whole months, keeping the anchor day where the month allows it (31st -> 28th/30th). */
export function addMonths(iso, months, anchorDay) {
  const { y, m, d } = parseIso(iso);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const day = Math.min(anchorDay || d, daysInMonth(year, month));
  return toIso(year, month, day);
}

export function utcMs(iso) {
  const { y, m, d } = parseIso(iso);
  return Date.UTC(y, m - 1, d);
}

export function daysUntil(iso, fromIso = todayIso()) {
  return Math.round((utcMs(iso) - utcMs(fromIso)) / DAY_MS);
}

export function dayOfMonth(iso) {
  return parseIso(iso).d;
}

export function monthKey(iso) {
  return iso.slice(0, 7);
}

export function addMonthsToKey(key, months) {
  const [y, m] = key.split('-').map(Number);
  const index = y * 12 + (m - 1) + months;
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function isDateTime(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
}
