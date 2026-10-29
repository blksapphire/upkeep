import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addMonths,
  addMonthsToKey,
  dayOfMonth,
  daysUntil,
  isValidIsoDate,
  monthKey,
  todayIso
} from './dates.js';

test('todayIso follows the local calendar date, not UTC', () => {
  assert.equal(todayIso(new Date(2026, 9, 29, 23, 30)), '2026-10-29');
  assert.equal(todayIso(new Date(2026, 0, 1, 0, 1)), '2026-01-01');
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('addDays is calendar arithmetic across leap days', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
});

test('addMonths clamps the 31st to the end of shorter months', () => {
  assert.equal(addMonths('2026-01-31', 1, 31), '2026-02-28');
  assert.equal(addMonths('2026-03-31', 1, 31), '2026-04-30');
  assert.equal(addMonths('2026-03-31', 1), '2026-04-30');
});

test('addMonths keeps leap days where the calendar allows', () => {
  assert.equal(addMonths('2024-02-29', 12, 29), '2025-02-28');
  assert.equal(addMonths('2024-02-29', 48, 29), '2028-02-29');
});

test('addMonths restores the anchor day after a short month', () => {
  assert.equal(addMonths('2026-04-30', 1, 31), '2026-05-31');
  assert.equal(addMonths('2026-05-31', 2, 31), '2026-07-31');
});

test('addMonthsToKey rolls across years in both directions', () => {
  assert.equal(addMonthsToKey('2026-11', 2), '2027-01');
  assert.equal(addMonthsToKey('2026-01', -1), '2025-12');
  assert.equal(addMonthsToKey('2026-10', 12), '2027-10');
});

test('isValidIsoDate rejects impossible and malformed dates', () => {
  assert.ok(isValidIsoDate('2024-02-29'));
  assert.ok(!isValidIsoDate('2026-02-29'));
  assert.ok(!isValidIsoDate('2026-13-01'));
  assert.ok(!isValidIsoDate('2026-2-3'));
  assert.ok(!isValidIsoDate('1899-12-31'));
  assert.ok(!isValidIsoDate('2101-01-01'));
  assert.ok(!isValidIsoDate(null));
});

test('daysUntil is signed and unaffected by daylight saving', () => {
  assert.equal(daysUntil('2026-03-30', '2026-03-28'), 2);
  assert.equal(daysUntil('2026-03-28', '2026-03-30'), -2);
  assert.equal(daysUntil('2026-10-29', '2026-10-29'), 0);
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
});

test('monthKey and dayOfMonth read ISO parts without a Date object', () => {
  assert.equal(monthKey('2026-10-29'), '2026-10');
  assert.equal(dayOfMonth('2026-10-29'), 29);
  assert.equal(dayOfMonth('2026-10-01'), 1);
});
