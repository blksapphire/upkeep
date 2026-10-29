import test from 'node:test';
import assert from 'node:assert/strict';
import { exportDocument, parseImport, skipSummary } from './transfer.js';
import { LIMITS, createDoc, normalizeItem } from './store.js';

const NOW = new Date('2026-10-29T12:00:00Z');

function raw(overrides = {}) {
  return { id: 'item-0001', title: 'Passport', category: 'documents', expiryDate: '2027-03-14', ...overrides };
}

function docWith(rows) {
  return createDoc(rows.map((row) => normalizeItem(row, NOW).item), NOW);
}

test('exports wrap items with the app id, version and timestamp', () => {
  const text = exportDocument(docWith([raw()]), NOW);
  const parsed = JSON.parse(text);
  assert.equal(parsed.app, 'upkeep');
  assert.equal(parsed.version, 1);
  assert.equal(parsed.exportedAt, NOW.toISOString());
  assert.equal(parsed.items.length, 1);
});

test('a fresh export imports cleanly', () => {
  const text = exportDocument(docWith([raw(), raw({ id: 'item-0002', title: 'Insurance' })]), NOW);
  const result = parseImport(text, NOW);
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.skipped, []);
});

test('files that are not Upkeep backups are refused', () => {
  assert.equal(parseImport('', NOW).error, 'empty');
  assert.equal(parseImport('{', NOW).error, 'invalid-json');
  assert.equal(parseImport('{}', NOW).error, 'not-upkeep');
  assert.equal(parseImport(JSON.stringify({ app: 'upkeep', version: 2, items: [] }), NOW).error, 'newer-version');
  assert.equal(parseImport(JSON.stringify({ app: 'upkeep', version: 1 }), NOW).error, 'invalid-items');
});

test('invalid items are skipped and counted by reason', () => {
  const result = parseImport(
    JSON.stringify({
      app: 'upkeep',
      version: 1,
      items: [
        raw({ id: 'item-0001' }),
        raw({ id: 'item-0002', title: '  ' }),
        raw({ id: 'item-0003', expiryDate: '2026-02-30' }),
        raw({ id: 'item-0004', link: 'ftp://example.test' })
      ]
    }),
    NOW
  );
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 1);
  assert.deepEqual(
    result.skipped.map((entry) => entry.reason),
    ['missing-title', 'invalid-date', 'invalid-link']
  );
  assert.match(skipSummary(result.skipped), /1 × no title/);
  assert.match(skipSummary(result.skipped), /1 × invalid date/);
});

test('duplicate ids are skipped after the first occurrence', () => {
  const result = parseImport(
    JSON.stringify({ app: 'upkeep', version: 1, items: [raw(), raw({ title: 'Second' })] }),
    NOW
  );
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.skipped.map((entry) => entry.reason), ['duplicate-id']);
});

test('a backup with no usable items fails without wiping anything', () => {
  const result = parseImport(
    JSON.stringify({ app: 'upkeep', version: 1, items: [raw({ expiryDate: 'nope' })] }),
    NOW
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, 'no-valid-items');
  assert.equal(result.skipped.length, 1);
});

test('backups above the item limit are refused before validation', () => {
  const items = Array.from({ length: LIMITS.items + 1 }, () => raw());
  assert.equal(parseImport(JSON.stringify({ app: 'upkeep', version: 1, items }), NOW).error, 'too-many-items');
});

test('oversized files are refused by byte length', () => {
  assert.equal(parseImport('x'.repeat(LIMITS.bytes + 1), NOW).error, 'too-large');
});

test('per-field limit violations carry specific reasons', () => {
  const result = parseImport(
    JSON.stringify({
      app: 'upkeep',
      version: 1,
      items: [
        raw({ id: 'item-0001', title: 'x'.repeat(LIMITS.title + 1) }),
        raw({ id: 'item-0002', notes: 'x'.repeat(LIMITS.notes + 1) }),
        raw({ id: 'item-0003', leadDays: LIMITS.leadDays + 1 }),
        raw({ id: 'item-0004', intervalMonths: LIMITS.intervalMonths + 1 })
      ]
    }),
    NOW
  );
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.skipped.map((entry) => entry.reason),
    ['title-too-long', 'notes-too-long', 'invalid-lead', 'invalid-interval']
  );
});

test('imported items are normalized and unknown fields are dropped', () => {
  const result = parseImport(
    JSON.stringify({ app: 'upkeep', version: 1, items: [raw({ unexpected: 'value' })] }),
    NOW
  );
  assert.equal(result.ok, true);
  assert.equal(result.items[0].unexpected, undefined);
  assert.equal(result.items[0].leadDays, 30);
  assert.equal(result.items[0].anchorDay, 14);
});
