import { LIMITS, SCHEMA_VERSION, byteLength, normalizeItem } from './store.js';

export const SKIP_REASONS = {
  'invalid-item': 'not an item record',
  'invalid-id': 'missing or malformed id',
  'missing-title': 'no title',
  'title-too-long': 'title too long',
  'invalid-category': 'unknown category',
  'invalid-date': 'invalid date',
  'invalid-lead': 'invalid alert window',
  'invalid-interval': 'invalid renewal interval',
  'invalid-link': 'link must start with http:// or https://',
  'link-too-long': 'link too long',
  'notes-too-long': 'notes too long',
  'invalid-archived-at': 'invalid archive timestamp',
  'invalid-anchor': 'invalid anchor day',
  'duplicate-id': 'duplicate id'
};

export const IMPORT_ERRORS = {
  empty: 'That file is empty.',
  'invalid-json': 'That file is not valid JSON.',
  'not-upkeep': 'That does not look like an Upkeep backup.',
  'invalid-version': 'That backup has an unrecognised version.',
  'newer-version': 'That backup was made by a newer version of Upkeep.',
  'invalid-items': 'That backup has no readable item list.',
  'too-many-items': 'That backup has more than 1,000 items.',
  'too-large': 'That backup is larger than 2 MB.',
  'no-valid-items': 'No usable items were found in that file.'
};

export function exportDocument(doc, now = new Date()) {
  return JSON.stringify(
    {
      app: 'upkeep',
      version: SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      items: doc.items
    },
    null,
    2
  );
}

export function parseImport(source, now = new Date()) {
  if (typeof source !== 'string' || !source.trim()) return { ok: false, error: 'empty' };
  if (byteLength(source) > LIMITS.bytes) return { ok: false, error: 'too-large' };

  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { ok: false, error: 'invalid-json' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.app !== 'upkeep') {
    return { ok: false, error: 'not-upkeep' };
  }

  const version = parsed.version === undefined ? SCHEMA_VERSION : parsed.version;
  if (!Number.isInteger(version) || version < 1) return { ok: false, error: 'invalid-version' };
  if (version > SCHEMA_VERSION) return { ok: false, error: 'newer-version' };
  if (!Array.isArray(parsed.items)) return { ok: false, error: 'invalid-items' };
  if (parsed.items.length > LIMITS.items) return { ok: false, error: 'too-many-items' };

  const items = [];
  const seen = new Set();
  const skipped = [];
  parsed.items.forEach((candidate, index) => {
    const result = normalizeItem(candidate, now);
    if (result.error) {
      skipped.push({ index, reason: result.error });
      return;
    }
    if (seen.has(result.item.id)) {
      skipped.push({ index, reason: 'duplicate-id' });
      return;
    }
    seen.add(result.item.id);
    items.push(result.item);
  });

  if (!items.length) return { ok: false, error: 'no-valid-items', skipped };
  return { ok: true, items, skipped };
}

export function skipSummary(skipped) {
  const totals = new Map();
  for (const entry of skipped) totals.set(entry.reason, (totals.get(entry.reason) || 0) + 1);
  return [...totals.entries()]
    .map(([reason, count]) => `${count} × ${SKIP_REASONS[reason] || reason}`)
    .join(', ');
}
