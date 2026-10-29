import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, filenameAll, filenameItem, slugify } from './ics.js';

const NOW = new Date('2026-10-16T10:00:00Z');

function item(overrides = {}) {
  return {
    id: 'item-0001',
    title: 'Passport',
    category: 'documents',
    expiryDate: '2027-03-14',
    leadDays: 180,
    intervalMonths: 120,
    anchorDay: 14,
    link: '',
    notes: '',
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    history: [],
    ...overrides
  };
}

const byteSize = (line) => new TextEncoder().encode(line).length;

test('calendar output is CRLF-delimited with no blank lines', () => {
  const ics = buildIcs([item()], { now: NOW });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!ics.includes('\r\n\r\n'));
  assert.ok(ics.includes('PRODID:-//Upkeep//Expiry tracker//EN'));
  assert.ok(ics.includes('VERSION:2.0'));
});

test('summary text escapes commas, semicolons and backslashes', () => {
  const ics = buildIcs([item({ title: 'Big, Fancy; Co \\ Ltd' })], { now: NOW });
  assert.ok(ics.includes('SUMMARY:Big\\, Fancy\\; Co \\\\ Ltd expires'));
});

test('notes keep line breaks as escaped text', () => {
  const ics = buildIcs([item({ notes: 'first line\nsecond line' })], { now: NOW });
  assert.ok(ics.includes('first line\\nsecond line'));
});

test('long lines fold to 75 octets, including multi-byte characters', () => {
  const ics = buildIcs([item({ title: `${'A'.repeat(60)}—é`, notes: 'B'.repeat(200) })], { now: NOW });
  const lines = ics.split('\r\n');
  for (const line of lines) assert.ok(byteSize(line) <= 75, `line over 75 octets: ${line}`);
  assert.ok(lines.some((line) => line.startsWith(' ')), 'at least one continuation line');
});

test('all-day start and UTC stamp are well formed, with no DTEND', () => {
  const ics = buildIcs([item()], { now: NOW });
  assert.ok(ics.includes('DTSTAMP:20261016T100000Z'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20270314'));
  assert.ok(!ics.includes('DTEND'));
});

test('the lead time becomes a day-offset alarm', () => {
  const ics = buildIcs([item({ leadDays: 180 })], { now: NOW });
  assert.ok(ics.includes('BEGIN:VALARM'));
  assert.ok(ics.includes('TRIGGER:-P180D'));
  assert.ok(ics.includes('ACTION:DISPLAY'));
  assert.equal(ics.match(/BEGIN:VALARM/g).length, 1);
});

test('a zero-day lead omits the alarm', () => {
  const ics = buildIcs([item({ leadDays: 0 })], { now: NOW });
  assert.ok(!ics.includes('BEGIN:VALARM'));
});

test('the UID is stable when the date changes', () => {
  const before = buildIcs([item({ expiryDate: '2027-03-14' })], { now: NOW });
  const after = buildIcs([item({ expiryDate: '2028-01-05' })], { now: NOW });
  const uid = 'UID:upkeep-item-0001@upkeep.local';
  assert.ok(before.includes(uid));
  assert.ok(after.includes(uid));
  assert.equal(after.match(/^UID:/gm).length, 1);
});

test('archived items are left out of the export', () => {
  const ics = buildIcs(
    [item(), item({ id: 'item-0002', title: 'Old warranty', archivedAt: '2026-01-01T00:00:00.000Z' })],
    { now: NOW }
  );
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 1);
  assert.ok(!ics.includes('Old warranty'));
});

test('output is deterministic and sorted by date', () => {
  const a = item({ id: 'item-0001', title: 'A', expiryDate: '2027-01-01' });
  const b = item({ id: 'item-0002', title: 'B', expiryDate: '2026-11-01' });
  const first = buildIcs([a, b], { now: NOW });
  assert.equal(first, buildIcs([a, b], { now: NOW }));
  assert.ok(first.indexOf('DTSTART;VALUE=DATE:20261101') < first.indexOf('DTSTART;VALUE=DATE:20270101'));
});

test('the description carries category, alert window, interval, notes and link', () => {
  const ics = buildIcs([item({ notes: 'Renew online', link: 'https://example.test/renew' })], { now: NOW });
  const content = ics.replace(/\r\n /g, '');
  assert.ok(content.includes('Category: Documents'));
  assert.ok(content.includes('Alert: 180 days before'));
  assert.ok(content.includes('Renews every 120 months'));
  assert.ok(content.includes('Renew online'));
  assert.ok(content.includes('URL:https://example.test/renew'));
});

test('filenames are predictable and slugs are safe', () => {
  assert.equal(filenameAll('2026-10-29'), 'upkeep-deadlines-2026-10-29.ics');
  assert.equal(slugify('My Passport!'), 'my-passport');
  assert.equal(slugify('!!!'), 'item');
  assert.equal(filenameItem(item({ title: 'My Passport' })), 'upkeep-my-passport-2027-03-14.ics');
});
