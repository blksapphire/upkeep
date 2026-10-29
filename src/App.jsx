import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import ItemDialog from './components/ItemDialog.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import Overview from './pages/Overview.jsx';
import ItemsPage from './pages/Items.jsx';
import YearAhead from './pages/YearAhead.jsx';
import DataPage from './pages/DataPage.jsx';
import { useTracker } from './useTracker.js';
import { counts } from './lib/status.js';
import { todayIso } from './lib/dates.js';
import { buildIcs, filenameItem } from './lib/ics.js';
import { downloadText } from './lib/download.js';
import { relativeSaved } from './lib/format.js';

const VIEWS = [
  { id: 'overview', label: 'Overview', short: 'Home', icon: 'home' },
  { id: 'items', label: 'Items', short: 'Items', icon: 'list' },
  { id: 'year', label: 'Year ahead', short: 'Year', icon: 'calendar' },
  { id: 'data', label: 'Data', short: 'Data', icon: 'shield' }
];

const SAVE_ERRORS = {
  unavailable: "This browser isn't letting Upkeep save. Changes will be lost when you close the tab.",
  quota: 'Local storage is full. Changes are held in memory only — download a backup now.',
  'too-large': 'Your data is larger than the 2 MB limit, so changes are not being saved.',
  recovery: "Upkeep couldn't set aside the unreadable saved data, so it is not overwriting it."
};

export default function App() {
  const tracker = useTracker();
  const { items } = tracker;
  const [view, setView] = useState('overview');
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const today = todayIso();
  const attention = counts(items, today).attention;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const findItem = (id) => items.find((item) => item.id === id) || null;
  const dialogItem = dialog && dialog.itemId ? findItem(dialog.itemId) : null;

  const openAdd = (templateId) => setDialog({ mode: 'add', templateId });
  const openEdit = (item) => setDialog({ mode: 'edit', itemId: item.id });
  const openRenew = (item) => setDialog({ mode: 'renew', itemId: item.id });
  const closeDialog = () => setDialog(null);

  const downloadItemIcs = (item) => {
    downloadText(filenameItem(item), buildIcs([item]), 'text/calendar');
    tracker.announce({ tone: 'ok', message: `Calendar file for ${item.title} downloaded.` });
  };

  const saveLabel = !tracker.storageAvailable
    ? 'Not saving'
    : tracker.readOnly
      ? 'Read-only'
      : tracker.saveError
        ? 'Not saved'
        : relativeSaved(tracker.savedAt);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topbar">
        <div className="topbar-inner">
          <a
            className="brand"
            href="#overview"
            aria-label="Upkeep overview"
            onClick={(event) => {
              event.preventDefault();
              setView('overview');
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              U
            </span>
            <span className="brand-name">Upkeep</span>
          </a>

          <nav className="desktop-nav" aria-label="Main navigation">
            {VIEWS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={view === entry.id ? 'nav-item active' : 'nav-item'}
                aria-current={view === entry.id ? 'page' : undefined}
                onClick={() => setView(entry.id)}
              >
                {entry.label}
                {entry.id === 'overview' && attention > 0 ? <span className="nav-badge">{attention}</span> : null}
              </button>
            ))}
          </nav>

          <div className="topbar-tools">
            <span className={`save-chip${tracker.saveError || tracker.readOnly ? ' warn' : ''}`}>
              <span className="live-dot" aria-hidden="true" />
              <span className="save-text">{saveLabel}</span>
            </span>
            <button type="button" className="button-primary add-button" onClick={() => openAdd()}>
              <Icon name="plus" />
              <span className="add-label">Add item</span>
            </button>
          </div>
        </div>
      </header>

      <div className="banners">
        {tracker.loadIssue ? (
          <div className="banner banner-brass" role="alert">
            <div className="banner-text">
              <strong>
                {tracker.loadIssue.kind === 'corrupt'
                  ? "We couldn't read the saved Upkeep data."
                  : 'Saved data is from a newer version of Upkeep.'}
              </strong>
              <span>
                {tracker.loadIssue.kind === 'corrupt'
                  ? 'The original copy is kept on this device. Start fresh, or import a backup from Data.'
                  : "This version won't overwrite it. Open the newer app, or export from there before continuing."}
              </span>
            </div>
            <button type="button" className="icon-button" aria-label="Dismiss" onClick={tracker.dismissLoadIssue}>
              <Icon name="close" />
            </button>
          </div>
        ) : null}

        {tracker.saveError ? (
          <div className="banner banner-rose" role="alert">
            <div className="banner-text">
              <strong>Changes aren't being saved.</strong>
              <span>{SAVE_ERRORS[tracker.saveError] || 'Something is blocking local storage.'}</span>
            </div>
            <button type="button" className="button-quiet" onClick={() => setView('data')}>
              Open Data
            </button>
          </div>
        ) : null}

        {tracker.loadSkipped > 0 ? (
          <div className="banner banner-neutral" role="status">
            <div className="banner-text">
              <span>
                {tracker.loadSkipped} saved {tracker.loadSkipped === 1 ? 'item' : 'items'} couldn't be read and were
                skipped.
              </span>
            </div>
          </div>
        ) : null}

        {tracker.notice ? (
          <div
            className={`banner ${tracker.notice.tone === 'warn' ? 'banner-brass' : 'banner-mint'}`}
            role="status"
          >
            <div className="banner-text">
              <span>{tracker.notice.message}</span>
            </div>
            <button type="button" className="icon-button" aria-label="Dismiss message" onClick={tracker.dismissNotice}>
              <Icon name="close" />
            </button>
          </div>
        ) : null}
      </div>

      <main id="main" className="page-content" tabIndex={-1}>
        {view === 'overview' ? (
          <Overview
            items={items}
            today={today}
            onAdd={openAdd}
            onEdit={openEdit}
            onRenew={openRenew}
            onDownloadIcs={downloadItemIcs}
            onGoItems={() => setView('items')}
          />
        ) : null}

        {view === 'items' ? (
          <ItemsPage
            items={items}
            today={today}
            onAdd={openAdd}
            onEdit={openEdit}
            onRenew={openRenew}
            onDownloadIcs={downloadItemIcs}
            onArchive={(item) => tracker.archiveItem(item.id)}
            onRestore={(item) => tracker.restoreItem(item.id)}
            onDelete={setDeleteTarget}
          />
        ) : null}

        {view === 'year' ? (
          <YearAhead
            items={items}
            today={today}
            onAdd={openAdd}
            onEdit={openEdit}
            onGoItems={() => setView('items')}
          />
        ) : null}

        {view === 'data' ? (
          <DataPage
            items={items}
            doc={tracker.doc}
            today={today}
            savedAt={tracker.savedAt}
            saveError={tracker.saveError}
            storageAvailable={tracker.storageAvailable}
            readOnly={tracker.readOnly}
            onReplaceAll={tracker.replaceAll}
            onClearAll={tracker.clearAll}
            announce={tracker.announce}
          />
        ) : null}
      </main>

      <footer className="site-footer">
        <p>
          <Icon name="lock" size={14} /> Local-first by design — no account, no sync, no tracking.
        </p>
        <div className="footer-actions">
          <button type="button" className="link-button" onClick={() => setView('data')}>
            Backups & exports
          </button>
          <span aria-hidden="true">·</span>
          <span>Upkeep</span>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Main navigation">
        {VIEWS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={view === entry.id ? 'bottom-tab active' : 'bottom-tab'}
            aria-label={entry.label}
            aria-current={view === entry.id ? 'page' : undefined}
            onClick={() => setView(entry.id)}
          >
            <span className="bottom-icon">
              <Icon name={entry.icon} size={20} />
              {entry.id === 'overview' && attention > 0 ? <span className="nav-badge">{attention}</span> : null}
            </span>
            <span>{entry.short}</span>
          </button>
        ))}
      </nav>

      {dialog && (dialog.mode === 'add' || dialogItem) ? (
        <ItemDialog
          mode={dialog.mode}
          item={dialogItem}
          templateId={dialog.templateId}
          today={today}
          onClose={closeDialog}
          onAdd={tracker.addItem}
          onEdit={tracker.updateItem}
          onRenew={tracker.renewItem}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={`Delete “${deleteTarget.title}”?`}
          body={<p>This removes it from this device for good. Archive it instead if it might come back.</p>}
          confirmLabel="Delete item"
          onConfirm={() => {
            tracker.deleteItem(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </>
  );
}
