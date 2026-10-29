import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from './dates.js';
import { counts, groupItems, nextItem, renewalDate, sortItems, statusFor, yearView } from './status.js';

const TODAY = '2026-10-29';

function item(overrides = {}) {
  return {
    id: 'item-0001',
    title: 'Passport',
    category: 'documents',
    expiryDate: '2027-03-14',
    leadDays: 30,
    intervalMonths: 12,
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

test('status bands follow the lead window with a 14-day urgency cap', () => {
  assert.equal(statusFor(item({ expiryDate: '2026-10-28' }), TODAY), 'overdue');
  assert.equal(statusFor(item({ expiryDate: '2026-10-29' }), TODAY), 'urgent');
  assert.equal(statusFor(item({ expiryDate: '2026-11-11' }), TODAY), 'urgent');
  assert.equal(statusFor(item({ expiryDate: '2026-11-12' }), TODAY), 'urgent');
  assert.equal(statusFor(item({ expiryDate: '2026-11-13' }), TODAY), 'due');
});

test('the lead boundary itself is inclusive', () => {
  assert.equal(statusFor(item({ expiryDate: '2026-11-28', leadDays: 30 }), TODAY), 'due');
  assert.equal(statusFor(item({ expiryDate: '2026-11-29', leadDays: 30 }), TODAY), 'later');
});

test('a zero-day lead only fires on the day', () => {
  assert.equal(statusFor(item({ expiryDate: TODAY, leadDays: 0 }), TODAY), 'urgent');
  assert.equal(statusFor(item({ expiryDate: addDays(TODAY, 1), leadDays: 0 }), TODAY), 'later');
});

test('a short lead caps urgency', () => {
  assert.equal(statusFor(item({ expiryDate: addDays(TODAY, 5), leadDays: 3 }), TODAY), 'later');
  assert.equal(statusFor(item({ expiryDate: addDays(TODAY, 3), leadDays: 3 }), TODAY), 'urgent');
});

test('archived items are archived regardless of their date', () => {
  assert.equal(statusFor(item({ expiryDate: '2020-01-01', archivedAt: '2026-05-01T10:00:00.000Z' }), TODAY), 'archived');
});

test('sorting is by date, then title, then id', () => {
  const rows = sortItems([
    item({ id: 'item-0003', title: 'Zeta', expiryDate: '2027-01-01' }),
    item({ id: 'item-0001', title: 'Beta', expiryDate: '2026-12-01' }),
    item({ id: 'item-0002', title: 'Alpha', expiryDate: '2026-12-01' }),
    item({ id: 'item-0000', title: 'Alpha', expiryDate: '2026-12-01' })
  ]);
  assert.deepEqual(rows.map((row) => row.id), ['item-0000', 'item-0002', 'item-0001', 'item-0003']);
});

test('groups partition every active item exactly once', () => {
  const rows = [
    item({ id: 'item-0001', expiryDate: '2026-10-01' }),
    item({ id: 'item-0002', expiryDate: '2026-10-29' }),
    item({ id: 'item-0003', expiryDate: '2026-11-20', leadDays: 30 }),
    item({ id: 'item-0004', expiryDate: '2026-12-15', leadDays: 10 }),
    item({ id: 'item-0005', expiryDate: '2027-03-01', leadDays: 10 }),
    item({ id: 'item-0006', expiryDate: '2026-10-01', archivedAt: '2026-01-01T00:00:00.000Z' })
  ];
  const groups = groupItems(rows, TODAY);
  assert.deepEqual(groups.attention.map((row) => row.id), ['item-0001', 'item-0002', 'item-0003']);
  assert.deepEqual(groups.next90.map((row) => row.id), ['item-0004']);
  assert.deepEqual(groups.later.map((row) => row.id), ['item-0005']);
});

test('the 90-day horizon includes exactly day 90', () => {
  const within = groupItems([item({ expiryDate: addDays(TODAY, 90), leadDays: 10 })], TODAY);
  const beyond = groupItems([item({ expiryDate: addDays(TODAY, 91), leadDays: 10 })], TODAY);
  assert.equal(within.next90.length, 1);
  assert.equal(beyond.later.length, 1);
});

test('counts exclude archived items and total the attention band', () => {
  const rows = [
    item({ id: 'item-0001', expiryDate: '2026-10-01' }),
    item({ id: 'item-0002', expiryDate: '2026-10-29' }),
    item({ id: 'item-0003', expiryDate: '2026-11-20', leadDays: 30 }),
    item({ id: 'item-0004', expiryDate: '2026-12-15', leadDays: 10 }),
    item({ id: 'item-0005', expiryDate: '2027-03-01', leadDays: 10 }),
    item({ id: 'item-0006', expiryDate: '2026-01-01', archivedAt: '2026-01-01T00:00:00.000Z' })
  ];
  assert.deepEqual(counts(rows, TODAY), {
    active: 5,
    overdue: 1,
    urgent: 1,
    due: 1,
    later: 2,
    attention: 3
  });
});

test('nextItem is the earliest active deadline and ignores archived items', () => {
  assert.equal(nextItem([], TODAY), null);
  assert.equal(
    nextItem(
      [
        item({ id: 'item-0002', expiryDate: '2026-01-01', archivedAt: '2026-01-01T00:00:00.000Z' }),
        item({ id: 'item-0001', expiryDate: '2027-01-10' })
      ],
      TODAY
    ).id,
    'item-0001'
  );
});

test('renewalDate advances by the interval and keeps the anchor day', () => {
  assert.equal(renewalDate(item({ expiryDate: '2026-01-31', intervalMonths: 12, anchorDay: 31 })), '2027-01-31');
  assert.equal(renewalDate(item({ expiryDate: '2026-05-31', intervalMonths: 1, anchorDay: 31 })), '2026-06-30');
  assert.equal(renewalDate(item({ intervalMonths: null })), null);
});

test('yearView puts every active item in exactly one bucket', () => {
  const rows = [
    item({ id: 'item-0001', expiryDate: '2026-09-15' }),
    item({ id: 'item-0002', expiryDate: '2026-10-31' }),
    item({ id: 'item-0003', expiryDate: '2026-11-05' }),
    item({ id: 'item-0004', expiryDate: '2027-03-01' }),
    item({ id: 'item-0005', expiryDate: '2027-09-30' }),
    item({ id: 'item-0006', expiryDate: '2027-10-01' }),
    item({ id: 'item-0007', expiryDate: '2026-10-01', archivedAt: '2026-01-01T00:00:00.000Z' })
  ];
  const view = yearView(rows, TODAY);
  assert.equal(view.startKey, '2026-10');
  assert.deepEqual(view.overdue.map((row) => row.id), ['item-0001']);
  assert.equal(view.months.length, 12);
  const byMonth = Object.fromEntries(view.months.map((month) => [month.key, month.items.map((row) => row.id)]));
  assert.deepEqual(byMonth['2026-10'], ['item-0002']);
  assert.deepEqual(byMonth['2026-11'], ['item-0003']);
  assert.deepEqual(byMonth['2027-03'], ['item-0004']);
  assert.deepEqual(byMonth['2027-09'], ['item-0005']);
  assert.deepEqual(view.beyond.map((row) => row.id), ['item-0006']);

  const seen = [
    ...view.overdue.map((row) => row.id),
    ...view.months.flatMap((month) => month.items.map((row) => row.id)),
    ...view.beyond.map((row) => row.id)
  ];
  assert.deepEqual(seen.sort(), ['item-0001', 'item-0002', 'item-0003', 'item-0004', 'item-0005', 'item-0006']);
});
