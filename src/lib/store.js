import { dayOfMonth, isDateTime, isValidIsoDate } from './dates.js';
import { CATEGORY_IDS } from './templates.js';

export const STORAGE_KEY = 'upkeep.data';
export const RECOVERY_KEY = 'upkeep.data.recovery';
export const SCHEMA_VERSION = 1;

export const LIMITS = {
  items: 1000,
  bytes: 2 * 1024 * 1024,
  title: 80,
  notes: 500,
  link: 300,
  leadDays: 730,
  intervalMonths: 120,
  history: 50
};

const ID = /^[A-Za-z0-9_-]{6,64}$/;
const HTTP_LINK = /^https?:\/\/[^\s]+$/i;

const encoder = new TextEncoder();

export function byteLength(text) {
  return encoder.encode(text).length;
}

export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function text(value) {
  return typeof value === 'string' ? value : '';
}

/** Validate and clean one item. Returns { item } or { error } with a stable code. */
export function normalizeItem(raw, now = new Date()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'invalid-item' };

  const id = text(raw.id).trim();
  if (!ID.test(id)) return { error: 'invalid-id' };

  const title = text(raw.title).trim();
  if (!title) return { error: 'missing-title' };
  if (title.length > LIMITS.title) return { error: 'title-too-long' };

  const category = text(raw.category);
  if (!CATEGORY_IDS.includes(category)) return { error: 'invalid-category' };

  const expiryDate = text(raw.expiryDate);
  if (!isValidIsoDate(expiryDate)) return { error: 'invalid-date' };

  const leadDays = raw.leadDays === undefined || raw.leadDays === null ? 30 : raw.leadDays;
  if (!Number.isInteger(leadDays) || leadDays < 0 || leadDays > LIMITS.leadDays) return { error: 'invalid-lead' };

  const intervalMonths = raw.intervalMonths === undefined ? null : raw.intervalMonths;
  if (
    intervalMonths !== null &&
    (!Number.isInteger(intervalMonths) || intervalMonths < 1 || intervalMonths > LIMITS.intervalMonths)
  ) {
    return { error: 'invalid-interval' };
  }

  const link = text(raw.link).trim();
  if (link.length > LIMITS.link) return { error: 'link-too-long' };
  if (link && !HTTP_LINK.test(link)) return { error: 'invalid-link' };

  const notes = text(raw.notes);
  if (notes.length > LIMITS.notes) return { error: 'notes-too-long' };

  const archivedAt = raw.archivedAt == null ? null : text(raw.archivedAt);
  if (archivedAt !== null && !isDateTime(archivedAt)) return { error: 'invalid-archived-at' };

  const anchorDay = raw.anchorDay === undefined || raw.anchorDay === null ? dayOfMonth(expiryDate) : raw.anchorDay;
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) return { error: 'invalid-anchor' };

  const createdAt = isDateTime(text(raw.createdAt)) ? raw.createdAt : now.toISOString();
  const updatedAt = isDateTime(text(raw.updatedAt)) ? raw.updatedAt : createdAt;

  const history = [];
  if (Array.isArray(raw.history)) {
    for (const entry of raw.history) {
      if (!entry || typeof entry !== 'object') continue;
      if (!isDateTime(text(entry.at)) || !isValidIsoDate(text(entry.from)) || !isValidIsoDate(text(entry.to))) continue;
      history.push({ at: entry.at, from: entry.from, to: entry.to });
    }
  }

  return {
    item: {
      id,
      title,
      category,
      expiryDate,
      leadDays,
      intervalMonths,
      anchorDay,
      link,
      notes,
      archivedAt,
      createdAt,
      updatedAt,
      history: history.slice(-LIMITS.history)
    }
  };
}

export function createItem(fields, now = new Date()) {
  const stamp = now.toISOString();
  const raw = { history: [], archivedAt: null, createdAt: stamp, updatedAt: stamp, ...fields };
  raw.id = raw.id || newId();
  raw.anchorDay = raw.anchorDay || (isValidIsoDate(raw.expiryDate) ? dayOfMonth(raw.expiryDate) : 1);
  return normalizeItem(raw, now);
}

export function createDoc(items = [], now = new Date()) {
  const stamp = now.toISOString();
  return { app: 'upkeep', version: SCHEMA_VERSION, items, meta: { createdAt: stamp, updatedAt: stamp } };
}

export function serializeDoc(doc) {
  return JSON.stringify(doc);
}

export function docBytes(doc) {
  return byteLength(serializeDoc(doc));
}

export function migrate(raw, now = new Date()) {
  if (typeof raw !== 'string' || !raw.trim()) return { status: 'corrupt' };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.app !== 'upkeep') {
    return { status: 'corrupt' };
  }
  const version = parsed.version === undefined ? SCHEMA_VERSION : parsed.version;
  if (!Number.isInteger(version) || version < 1) return { status: 'corrupt' };
  if (version > SCHEMA_VERSION) return { status: 'newer', version };
  if (!Array.isArray(parsed.items) || parsed.items.length > LIMITS.items) return { status: 'corrupt' };

  const items = [];
  const seen = new Set();
  let skipped = 0;
  for (const candidate of parsed.items) {
    const result = normalizeItem(candidate, now);
    if (result.error || seen.has(result.item.id)) {
      skipped += 1;
      continue;
    }
    seen.add(result.item.id);
    items.push(result.item);
  }

  const meta = parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {};
  return {
    status: 'ok',
    skipped,
    doc: {
      app: 'upkeep',
      version: SCHEMA_VERSION,
      items,
      meta: {
        createdAt: isDateTime(text(meta.createdAt)) ? meta.createdAt : now.toISOString(),
        updatedAt: isDateTime(text(meta.updatedAt)) ? meta.updatedAt : now.toISOString()
      }
    }
  };
}

export function loadDocument(storage, now = new Date()) {
  if (!storage) return { status: 'unavailable' };
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null || raw === undefined || raw === '') return { status: 'empty' };
  const result = migrate(raw, now);
  if (result.status === 'corrupt' || result.status === 'newer') return { ...result, raw };
  return result;
}

export function saveDocument(storage, doc) {
  if (!storage) return { ok: false, error: 'unavailable' };
  const payload = serializeDoc(doc);
  if (byteLength(payload) > LIMITS.bytes) return { ok: false, error: 'too-large' };
  try {
    storage.setItem(STORAGE_KEY, payload);
    return { ok: true, bytes: byteLength(payload) };
  } catch (error) {
    const quota =
      error &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22);
    return { ok: false, error: quota ? 'quota' : 'unavailable' };
  }
}

export function stashRecovery(storage, raw) {
  if (!storage) return false;
  try {
    storage.setItem(RECOVERY_KEY, raw);
    return true;
  } catch {
    return false;
  }
}
