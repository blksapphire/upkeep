import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITS,
  RECOVERY_KEY,
  STORAGE_KEY,
  createDoc,
  createItem,
  docBytes,
  loadDocument,
  migrate,
  newId,
  normalizeItem,
  saveDocument,
  serializeDoc,
  stashRecovery
} from './store.js';

const NOW = new Date('2026-10-29T12:00:00Z');

function raw(overrides = {}) {
  return { id: 'item-0001', title: 'Passport', category: 'documents', expiryDate: '2027-03-14', ...overrides };
}

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value)
  };
}

test('normalizeItem fills optional fields and keeps the anchor day', () => {
  const { item } = normalizeItem(raw(), NOW);
  assert.equal(item.leadDays, 30);
  assert.equal(item.intervalMonths, null);
  assert.equal(item.anchorDay, 14);
  assert.deepEqual(item.history, []);
  assert.equal(item.archivedAt, null);
  assert.equal(item.link, '');
  assert.equal(item.notes, '');
  assert.equal(item.createdAt, NOW.toISOString());
});

test('normalizeItem rejects malformed records with stable codes', () => {
  assert.equal(normalizeItem(null).error, 'invalid-item');
  assert.equal(normalizeItem(raw({ id: 'x' })).error, 'invalid-id');
  assert.equal(normalizeItem(raw({ title: '   ' })).error, 'missing-title');
  assert.equal(normalizeItem(raw({ title: 'x'.repeat(LIMITS.title + 1) })).error, 'title-too-long');
  assert.equal(normalizeItem(raw({ category: 'travel' })).error, 'invalid-category');
  assert.equal(normalizeItem(raw({ expiryDate: '2026-02-30' })).error, 'invalid-date');
  assert.equal(normalizeItem(raw({ leadDays: LIMITS.leadDays + 1 })).error, 'invalid-lead');
  assert.equal(normalizeItem(raw({ intervalMonths: 0 })).error, 'invalid-interval');
  assert.equal(normalizeItem(raw({ link: 'ftp://example.test' })).error, 'invalid-link');
  assert.equal(normalizeItem(raw({ notes: 'x'.repeat(LIMITS.notes + 1) })).error, 'notes-too-long');
  assert.equal(normalizeItem(raw({ archivedAt: 'yesterday' })).error, 'invalid-archived-at');
  assert.equal(normalizeItem(raw({ anchorDay: 32 })).error, 'invalid-anchor');
});

test('history keeps the last 50 valid renewals and drops malformed entries', () => {
  const history = [];
  for (let index = 0; index < 60; index += 1) {
    history.push({
      at: `2026-01-01T00:00:${String(index).padStart(2, '0')}.000Z`,
      from: '2026-01-01',
      to: '2027-01-01'
    });
  }
  history.push({ at: 'nope', from: '2026-01-01', to: '2027-01-01' });
  history.push({ at: '2026-01-01T00:00:00.000Z', from: '2026-02-30', to: '2027-01-01' });

  const { item } = normalizeItem(raw({ history }), NOW);
  assert.equal(item.history.length, LIMITS.history);
  assert.equal(item.history[0].at, '2026-01-01T00:00:10.000Z');
  assert.equal(item.history[49].at, '2026-01-01T00:00:59.000Z');
});

test('createItem generates an id and normalizes form fields', () => {
  const { item } = createItem(
    { title: 'Boiler service', category: 'home', expiryDate: '2027-01-05', leadDays: 60, intervalMonths: 12 },
    NOW
  );
  assert.match(item.id, /^[A-Za-z0-9_-]{6,64}$/);
  assert.equal(item.anchorDay, 5);
  assert.deepEqual(item.history, []);
  assert.equal(item.createdAt, NOW.toISOString());
  assert.equal(createItem({ title: '', category: 'home', expiryDate: '2027-01-05' }, NOW).error, 'missing-title');
  assert.match(newId(), /^[A-Za-z0-9_-]{6,64}$/);
});

test('migrate accepts documents from this version and refuses foreign ones', () => {
  const doc = createDoc([normalizeItem(raw(), NOW).item], NOW);
  const legacy = { ...doc };
  delete legacy.version;
  assert.equal(migrate(JSON.stringify(legacy), NOW).status, 'ok');
  assert.equal(migrate('{not json', NOW).status, 'corrupt');
  assert.equal(migrate(JSON.stringify({ app: 'other', version: 1, items: [] }), NOW).status, 'corrupt');
  assert.equal(migrate(JSON.stringify({ app: 'upkeep', version: 1, items: {} }), NOW).status, 'corrupt');

  const newer = migrate(JSON.stringify({ app: 'upkeep', version: 2, items: [] }), NOW);
  assert.equal(newer.status, 'newer');
  assert.equal(newer.version, 2);
});

test('migrate skips invalid and duplicate items and reports the count', () => {
  const doc = {
    app: 'upkeep',
    version: 1,
    items: [
      raw(),
      raw({ title: 'Copy of passport' }),
      raw({ id: 'item-0002', expiryDate: '2026-13-01' }),
      raw({ id: 'item-0003', category: 'space' })
    ]
  };
  const result = migrate(JSON.stringify(doc), NOW);
  assert.equal(result.status, 'ok');
  assert.equal(result.doc.items.length, 1);
  assert.equal(result.skipped, 3);
});

test('documents round-trip through storage, with explicit empty and unavailable states', () => {
  const storage = memoryStorage();
  assert.equal(loadDocument(storage, NOW).status, 'empty');
  assert.equal(loadDocument(null, NOW).status, 'unavailable');

  const doc = createDoc([normalizeItem(raw(), NOW).item], NOW);
  assert.equal(saveDocument(storage, doc).ok, true);
  const loaded = loadDocument(storage, NOW);
  assert.equal(loaded.status, 'ok');
  assert.equal(loaded.doc.items[0].id, 'item-0001');
  assert.equal(storage.map.get(STORAGE_KEY), serializeDoc(doc));
});

test('saveDocument surfaces quota, unavailable and oversize failures', () => {
  const quota = {
    getItem: () => null,
    setItem: () => {
      const error = new Error('full');
      error.name = 'QuotaExceededError';
      throw error;
    }
  };
  const broken = {
    getItem: () => null,
    setItem: () => {
      throw new Error('nope');
    }
  };
  assert.equal(saveDocument(quota, createDoc([], NOW)).error, 'quota');
  assert.equal(saveDocument(broken, createDoc([], NOW)).error, 'unavailable');
  const huge = { app: 'upkeep', version: 1, items: [{ notes: 'x'.repeat(LIMITS.bytes + 1) }] };
  assert.equal(saveDocument(memoryStorage(), huge).error, 'too-large');
});

test('stashRecovery keeps an unreadable copy and tolerates failure', () => {
  const storage = memoryStorage();
  assert.equal(stashRecovery(storage, '{broken'), true);
  assert.equal(storage.map.get(RECOVERY_KEY), '{broken');
  assert.equal(stashRecovery(null, '{broken'), false);
});

test('docBytes matches the serialized UTF-8 size', () => {
  const doc = createDoc([], NOW);
  assert.equal(docBytes(doc), new TextEncoder().encode(serializeDoc(doc)).length);
});
