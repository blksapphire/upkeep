import { parseIso } from './dates.js';

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const LONG_FORMAT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function localDate(iso) {
  const { y, m, d } = parseIso(iso);
  return new Date(y, m - 1, d);
}

export function formatDate(iso) {
  return DATE_FORMAT.format(localDate(iso));
}

export function formatLongDate(iso) {
  return LONG_FORMAT.format(localDate(iso));
}

export function formatWeekday(iso) {
  return WEEKDAY_FORMAT.format(localDate(iso));
}

export function formatMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return MONTH_FORMAT.format(new Date(y, m - 1, 1));
}

export function dateParts(iso) {
  const { y, m, d } = parseIso(iso);
  return {
    day: String(d),
    month: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(y, m - 1, d)),
    year: String(y)
  };
}

export function countdownLabel(days) {
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  if (days === -1) return 'overdue by 1 day';
  if (days < 0) return `overdue by ${Math.abs(days)} days`;
  return `in ${days} days`;
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function clockTime(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function relativeSaved(date) {
  return date ? `Saved locally · ${clockTime(date)}` : 'Saved locally';
}
