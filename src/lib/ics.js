import { sortItems } from './status.js';
import { categoryLabel } from './templates.js';

function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// RFC 5545: lines are folded at 75 octets; continuation lines start with a space.
function fold(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts = [];
  let current = '';
  let size = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
      limit = 74; // the leading space counts as one octet
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function icsStamp(now) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(
    now.getUTCHours()
  )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

export function slugify(value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'item';
}

function uidFor(item) {
  return `upkeep-${String(item.id).replace(/[^A-Za-z0-9-]/g, '')}@upkeep.local`;
}

function descriptionFor(item) {
  const parts = [
    `Category: ${categoryLabel(item.category)}`,
    item.leadDays ? `Alert: ${item.leadDays} days before` : 'Alert: on the day'
  ];
  if (item.intervalMonths) parts.push(`Renews every ${item.intervalMonths} months`);
  if (item.notes) parts.push(item.notes);
  if (item.link) parts.push(item.link);
  return parts.join('\n');
}

/**
 * One all-day event per active item. Stable UIDs mean a re-import updates the
 * existing calendar entries instead of duplicating them.
 */
export function buildIcs(items, { now = new Date(), calendarName = 'Upkeep deadlines' } = {}) {
  const active = sortItems(items.filter((item) => !item.archivedAt));
  const stamp = icsStamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Upkeep//Expiry tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`
  ];

  for (const item of active) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uidFor(item)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${item.expiryDate.replace(/-/g, '')}`,
      `SUMMARY:${escapeText(`${item.title} expires`)}`,
      `DESCRIPTION:${escapeText(descriptionFor(item))}`
    );
    if (item.link) lines.push(`URL:${item.link}`);
    lines.push('TRANSP:TRANSPARENT');
    if (item.leadDays > 0) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(`${item.title}: ${item.leadDays}-day alert`)}`,
        `TRIGGER:-P${item.leadDays}D`,
        'END:VALARM'
      );
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function filenameAll(fromIso) {
  return `upkeep-deadlines-${fromIso}.ics`;
}

export function filenameItem(item) {
  return `upkeep-${slugify(item.title)}-${item.expiryDate}.ics`;
}
