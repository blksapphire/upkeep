import React, { useRef, useState } from 'react';
import Icon from '../Icon.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { buildIcs, filenameAll } from '../lib/ics.js';
import { downloadText } from '../lib/download.js';
import { IMPORT_ERRORS, exportDocument, parseImport, skipSummary } from '../lib/transfer.js';
import { docBytes } from '../lib/store.js';
import { plural } from '../lib/format.js';
import { isActive } from '../lib/status.js';

const SAVE_ERROR_TEXT = {
  unavailable: 'This browser is blocking local storage.',
  quota: 'Local storage is full.',
  'too-large': 'The data is larger than the 2 MB limit.',
  recovery: 'Unreadable saved data could not be set aside, so nothing is being overwritten.'
};

export default function DataPage({ items, doc, today, savedAt, saveError, storageAvailable, onReplaceAll, onClearAll, announce }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [importError, setImportError] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const active = items.filter(isActive);
  const sizeKb = (docBytes(doc) / 1024).toFixed(1);

  let statusText = 'No changes saved yet.';
  let statusTone = '';
  if (!storageAvailable) {
    statusText = 'Not saving — this browser blocks local storage.';
    statusTone = 'tone-rose';
  } else if (saveError) {
    statusText = SAVE_ERROR_TEXT[saveError] || 'Changes are not being saved.';
    statusTone = 'tone-rose';
  } else if (savedAt) {
    statusText = `Saved locally at ${new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(
      savedAt
    )}.`;
  }

  function exportBackup() {
    downloadText(`upkeep-backup-${today}.json`, exportDocument(doc), 'application/json');
    announce({ tone: 'ok', message: 'JSON backup downloaded.' });
  }

  function exportCalendar() {
    if (!active.length) {
      announce({ tone: 'warn', message: 'Add an item before exporting a calendar file.' });
      return;
    }
    downloadText(filenameAll(today), buildIcs(active), 'text/calendar');
    announce({ tone: 'ok', message: `Calendar file with ${plural(active.length, 'date')} downloaded.` });
  }

  async function handleFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    setImportError(null);
    setPreview(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setImportError('That file is larger than 2 MB.');
      return;
    }
    let source;
    try {
      source = await file.text();
    } catch {
      setImportError('That file could not be read.');
      return;
    }
    const result = parseImport(source);
    if (!result.ok) {
      setImportError(IMPORT_ERRORS[result.error] || 'That backup could not be read.');
      return;
    }
    setPreview({ ...result, fileName: file.name });
  }

  function replaceEverything() {
    if (!preview) return;
    onReplaceAll(preview.items);
    setPreview(null);
  }

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Your data</p>
          <h1>Backups & calendar</h1>
          <p className="page-sub">Everything lives in this browser. Export regularly; nothing is synced or uploaded.</p>
        </div>
      </header>

      <div className="data-grid">
        <section className="panel">
          <h2>Storage</h2>
          <dl className="facts">
            <div>
              <dt>Items</dt>
              <dd className="tabular">{items.length}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd className="tabular">{sizeKb} KB</dd>
            </div>
          </dl>
          <p className={`panel-note ${statusTone}`}>{statusText}</p>
          <p className="panel-note">
            Clearing this site's data in your browser deletes Upkeep. A downloaded JSON backup is the only copy.
          </p>
        </section>

        <section className="panel">
          <h2>Calendar reminders</h2>
          <p>Download an all-day event for each active date, with the alert set to that item's warning window.</p>
          <div className="button-row">
            <button type="button" className="button-primary" onClick={exportCalendar} disabled={!active.length}>
              <Icon name="calendar" /> Download .ics
            </button>
            <span className="panel-note inline">{plural(active.length, 'active date')}</span>
          </div>
          <ul className="notes-list">
            <li>Re-importing a newer file updates existing events instead of duplicating them.</li>
            <li>Google Calendar ignores alerts beyond about four weeks; Upkeep still flags those dates.</li>
            <li>Every item also has its own “Add to calendar” action.</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Backup</h2>
          <p>A JSON backup contains every item, note and renewal record. Keep it somewhere safe.</p>
          <div className="button-row">
            <button type="button" className="button-secondary" onClick={exportBackup}>
              <Icon name="download" /> Download backup
            </button>
            <button type="button" className="button-secondary" onClick={() => fileRef.current && fileRef.current.click()}>
              <Icon name="upload" /> Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              aria-label="Choose an Upkeep backup file"
              onChange={handleFile}
            />
          </div>
          {importError ? (
            <p className="field-error" role="alert">
              {importError}
            </p>
          ) : null}
          {preview ? (
            <div className="import-preview">
              <p>
                <strong>{plural(preview.items.length, 'item')}</strong> ready from {preview.fileName}.
              </p>
              {preview.skipped.length ? (
                <p className="field-hint">
                  Skipped {preview.skipped.length}: {skipSummary(preview.skipped)}.
                </p>
              ) : null}
              <p className="field-hint">
                Replacing deletes the {plural(items.length, 'item')} currently stored. Download a backup first.
              </p>
              <div className="button-row">
                <button type="button" className="button-danger" onClick={replaceEverything}>
                  Replace all my data
                </button>
                <button type="button" className="button-quiet" onClick={() => setPreview(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel">
          <h2>Privacy & limits</h2>
          <ul className="notes-list">
            <li>No account, no server, no analytics. A strict Content-Security-Policy blocks network requests.</li>
            <li>Dates, notes and renewal history stay in this browser's local storage.</li>
            <li>Backups and calendar files are generated on this device and saved directly.</li>
            <li>Up to 1,000 items and 2 MB of data — comfortably beyond a normal household.</li>
          </ul>
        </section>
      </div>

      <section className="panel danger-zone">
        <div>
          <h2>Remove everything</h2>
          <p>Deletes every item from this device. Download a backup first if you might want them back.</p>
        </div>
        <button
          type="button"
          className="button-danger"
          onClick={() => setConfirmClear(true)}
          disabled={!items.length}
        >
          <Icon name="trash" /> Delete all items
        </button>
      </section>

      {confirmClear ? (
        <ConfirmDialog
          title="Delete every item?"
          body={
            <p>
              This removes {plural(items.length, 'item')} and their renewal history from this device. Downloaded backups
              are not affected.
            </p>
          }
          confirmLabel="Delete everything"
          onConfirm={() => {
            onClearAll();
            setConfirmClear(false);
          }}
          onClose={() => setConfirmClear(false)}
        />
      ) : null}
    </div>
  );
}
