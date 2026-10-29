import { addMonths, addMonthsToKey, dayOfMonth, daysUntil, monthKey } from './dates.js';

export const URGENT_DAYS = 14;
export const HORIZON_DAYS = 90;
export const YEAR_MONTHS = 12;

export const STATUS_LABELS = {
  overdue: 'Overdue',
  urgent: 'Due soon',
  due: 'Due',
  later: 'Later',
  archived: 'Archived'
};

export function isActive(item) {
  return !item.archivedAt;
}

export function statusFor(item, today) {
  if (item.archivedAt) return 'archived';
  const days = daysUntil(item.expiryDate, today);
  if (days < 0) return 'overdue';
  if (days <= Math.min(item.leadDays, URGENT_DAYS)) return 'urgent';
  if (days <= item.leadDays) return 'due';
  return 'later';
}

export function sortItems(items) {
  return [...items].sort(
    (a, b) =>
      a.expiryDate.localeCompare(b.expiryDate) ||
      a.title.localeCompare(b.title) ||
      a.id.localeCompare(b.id)
  );
}

export function groupItems(items, today) {
  const groups = { attention: [], next90: [], later: [] };
  for (const item of sortItems(items)) {
    if (!isActive(item)) continue;
    const status = statusFor(item, today);
    if (status !== 'later') groups.attention.push(item);
    else if (daysUntil(item.expiryDate, today) <= HORIZON_DAYS) groups.next90.push(item);
    else groups.later.push(item);
  }
  return groups;
}

export function counts(items, today) {
  const totals = { active: 0, overdue: 0, urgent: 0, due: 0, later: 0, attention: 0 };
  for (const item of items) {
    if (!isActive(item)) continue;
    totals.active += 1;
    const status = statusFor(item, today);
    totals[status] += 1;
    if (status !== 'later') totals.attention += 1;
  }
  return totals;
}

export function nextItem(items, today) {
  return sortItems(items.filter(isActive))[0] || null;
}

export function renewalDate(item) {
  if (!item.intervalMonths) return null;
  return addMonths(item.expiryDate, item.intervalMonths, item.anchorDay || dayOfMonth(item.expiryDate));
}

/**
 * Split active items into past-due, the next twelve calendar months and everything beyond.
 * Every active item lands in exactly one bucket.
 */
export function yearView(items, today) {
  const startKey = monthKey(today);
  const endKey = addMonthsToKey(startKey, YEAR_MONTHS);
  const months = [];
  for (let index = 0; index < YEAR_MONTHS; index += 1) {
    months.push({ key: addMonthsToKey(startKey, index), items: [] });
  }
  const byKey = new Map(months.map((month) => [month.key, month]));
  const overdue = [];
  const beyond = [];
  for (const item of sortItems(items)) {
    if (!isActive(item)) continue;
    if (daysUntil(item.expiryDate, today) < 0) {
      overdue.push(item);
      continue;
    }
    const bucket = byKey.get(monthKey(item.expiryDate));
    if (bucket) bucket.items.push(item);
    else beyond.push(item);
  }
  return { startKey, endKey, overdue, months, beyond };
}
