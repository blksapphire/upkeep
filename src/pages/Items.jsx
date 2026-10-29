import React, { useState } from 'react';
import Icon from '../Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ItemList from '../components/ItemList.jsx';
import { isActive, sortItems } from '../lib/status.js';
import { CATEGORIES, categoryLabel } from '../lib/templates.js';

export default function ItemsPage({
  items,
  today,
  onAdd,
  onEdit,
  onRenew,
  onDownloadIcs,
  onArchive,
  onRestore,
  onDelete
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const needle = query.trim().toLowerCase();
  const matches = (item) => {
    const inText =
      !needle ||
      item.title.toLowerCase().includes(needle) ||
      item.notes.toLowerCase().includes(needle) ||
      categoryLabel(item.category).toLowerCase().includes(needle);
    return inText && (category === 'all' || item.category === category);
  };

  const active = items.filter(isActive);
  const archived = items.filter((item) => !isActive(item));
  const visible = sortItems(active.filter(matches));
  const visibleArchived = sortItems(archived.filter(matches));

  const listProps = {
    today,
    onEdit,
    onRenew,
    onDownloadIcs,
    onArchive,
    onRestore,
    onDelete
  };

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Everything you're watching</p>
          <h1>Items</h1>
          <p className="page-sub">Dates, warning windows and renewal history — all on this device.</p>
        </div>
        <button type="button" className="button-primary" onClick={() => onAdd()}>
          <Icon name="plus" /> Add item
        </button>
      </header>

      {active.length ? (
        <div className="toolbar panel">
          <div className="search-box">
            <Icon name="search" size={16} />
            <input
              type="search"
              value={query}
              aria-label="Search items"
              placeholder="Search items and notes"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button type="button" className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}>
                <Icon name="close" size={15} />
              </button>
            ) : null}
          </div>
          <div className="chip-row" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={category === 'all' ? 'chip active' : 'chip'}
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              All
            </button>
            {CATEGORIES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={category === entry.id ? 'chip active' : 'chip'}
                aria-pressed={category === entry.id}
                onClick={() => setCategory(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!active.length ? (
        <EmptyState
          title="No dates yet"
          body="Add the first thing you don't want to miss — a passport, a policy, a service, a renewal."
        >
          <button type="button" className="button-primary" onClick={() => onAdd()}>
            <Icon name="plus" /> Add your first date
          </button>
        </EmptyState>
      ) : visible.length ? (
        <ItemList items={visible} {...listProps} />
      ) : (
        <EmptyState title="Nothing matches" body="Try a different search or category.">
          <button
            type="button"
            className="button-ghost"
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
          >
            Clear filters
          </button>
        </EmptyState>
      )}

      {archived.length ? (
        <section className="archived-block">
          <button
            type="button"
            className="archived-toggle"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((value) => !value)}
          >
            <Icon name="archive" size={16} />
            Archived ({archived.length})
            <Icon name="chevron" size={16} className={showArchived ? 'chevron open' : 'chevron'} />
          </button>
          {showArchived ? (
            visibleArchived.length ? (
              <ItemList items={visibleArchived} {...listProps} />
            ) : (
              <p className="quiet">No archived items match your search.</p>
            )
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
