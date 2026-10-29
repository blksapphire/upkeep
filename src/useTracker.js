import { useCallback, useEffect, useRef, useState } from 'react';
import { dayOfMonth } from './lib/dates.js';
import { formatDate } from './lib/format.js';
import {
  LIMITS,
  STORAGE_KEY,
  createDoc,
  createItem,
  loadDocument,
  migrate,
  normalizeItem,
  saveDocument,
  stashRecovery
} from './lib/store.js';

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function boot(now) {
  let storage = getStorage();
  const loaded = loadDocument(storage, now);
  if (loaded.status === 'unavailable') storage = null;
  const doc = loaded.status === 'ok' ? loaded.doc : createDoc([], now);
  return {
    storage,
    doc,
    readOnly: loaded.status === 'newer',
    loadIssue:
      loaded.status === 'corrupt'
        ? { kind: 'corrupt' }
        : loaded.status === 'newer'
          ? { kind: 'newer', version: loaded.version }
          : null,
    recoveryRaw: loaded.status === 'corrupt' ? loaded.raw : null,
    savedAt: loaded.status === 'ok' ? new Date(loaded.doc.meta.updatedAt) : null,
    saveError: storage ? null : 'unavailable',
    loadSkipped: loaded.status === 'ok' ? loaded.skipped : 0
  };
}

export function useTracker() {
  const [start] = useState(() => boot(new Date()));
  const storageRef = useRef(start.storage);
  const [doc, setDoc] = useState(start.doc);
  const [savedAt, setSavedAt] = useState(start.savedAt);
  const [saveError, setSaveError] = useState(start.saveError);
  const [loadIssue, setLoadIssue] = useState(start.loadIssue);
  const [loadSkipped] = useState(start.loadSkipped);
  const [notice, setNotice] = useState(null);
  const recoveryRaw = useRef(start.recoveryRaw);
  const readOnly = start.readOnly;
  const skipPersist = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (readOnly) return;
    const storage = storageRef.current;
    if (!storage) return;
    if (recoveryRaw.current) {
      if (!stashRecovery(storage, recoveryRaw.current)) {
        setSaveError('recovery');
        return;
      }
      recoveryRaw.current = null;
    }
    const result = saveDocument(storage, doc);
    if (result.ok) {
      setSavedAt(new Date());
      setSaveError(null);
    } else {
      setSaveError(result.error);
    }
  }, [doc, readOnly]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY || typeof event.newValue !== 'string') return;
      const result = migrate(event.newValue);
      if (result.status !== 'ok') return;
      skipPersist.current = true;
      setDoc(result.doc);
      setSavedAt(new Date());
      setNotice({ tone: 'ok', message: 'Updated from another tab.' });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback((updater) => {
    setDoc((prev) => {
      const next = updater(prev);
      if (!next) return prev;
      return { ...next, meta: { ...next.meta, updatedAt: new Date().toISOString() } };
    });
  }, []);

  const announce = useCallback((next) => setNotice(next), []);

  const addItem = useCallback(
    (fields) => {
      const result = createItem(fields);
      if (result.error) return result;
      commit((prev) => ({ ...prev, items: [...prev.items, result.item] }));
      setNotice({ tone: 'ok', message: `${result.item.title} added.` });
      return result;
    },
    [commit]
  );

  const updateItem = useCallback(
    (id, fields) => {
      const existing = doc.items.find((item) => item.id === id);
      if (!existing) return { error: 'invalid-item' };
      const merged = { ...existing, ...fields, id, updatedAt: new Date().toISOString() };
      if (fields.expiryDate && fields.expiryDate !== existing.expiryDate && fields.anchorDay === undefined) {
        merged.anchorDay = dayOfMonth(fields.expiryDate);
      }
      const result = normalizeItem(merged);
      if (result.error) return result;
      commit((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? result.item : item))
      }));
      return result;
    },
    [doc, commit]
  );

  const renewItem = useCallback(
    (id, nextDate) => {
      const existing = doc.items.find((item) => item.id === id);
      if (!existing) return { error: 'invalid-item' };
      const stamp = new Date().toISOString();
      const merged = {
        ...existing,
        expiryDate: nextDate,
        anchorDay: dayOfMonth(nextDate),
        updatedAt: stamp,
        history: [...existing.history, { at: stamp, from: existing.expiryDate, to: nextDate }].slice(-LIMITS.history)
      };
      const result = normalizeItem(merged);
      if (result.error) return result;
      commit((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? result.item : item))
      }));
      setNotice({ tone: 'ok', message: `${result.item.title} renewed to ${formatDate(nextDate)}.` });
      return result;
    },
    [doc, commit]
  );

  const archiveItem = useCallback(
    (id) => {
      const stamp = new Date().toISOString();
      commit((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? { ...item, archivedAt: stamp, updatedAt: stamp } : item))
      }));
    },
    [commit]
  );

  const restoreItem = useCallback(
    (id) => {
      const stamp = new Date().toISOString();
      commit((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? { ...item, archivedAt: null, updatedAt: stamp } : item))
      }));
    },
    [commit]
  );

  const deleteItem = useCallback(
    (id) => {
      commit((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
      setNotice({ tone: 'ok', message: 'Item deleted.' });
    },
    [commit]
  );

  const replaceAll = useCallback(
    (items) => {
      commit((prev) => ({ ...prev, items }));
      setNotice({ tone: 'ok', message: `${items.length} ${items.length === 1 ? 'item' : 'items'} imported.` });
    },
    [commit]
  );

  const clearAll = useCallback(() => {
    commit((prev) => ({ ...prev, items: [] }));
    setNotice({ tone: 'ok', message: 'All items removed from this device.' });
  }, [commit]);

  return {
    items: doc.items,
    doc,
    savedAt,
    saveError,
    loadIssue,
    loadSkipped,
    readOnly,
    storageAvailable: Boolean(storageRef.current),
    notice,
    announce,
    dismissNotice: () => setNotice(null),
    dismissLoadIssue: () => setLoadIssue(null),
    addItem,
    updateItem,
    renewItem,
    archiveItem,
    restoreItem,
    deleteItem,
    replaceAll,
    clearAll
  };
}
