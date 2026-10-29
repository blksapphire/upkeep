import React from 'react';
import Icon from '../Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { statusFor, yearView } from '../lib/status.js';
import { dayOfMonth } from '../lib/dates.js';
import { formatMonth } from '../lib/format.js';

function YearItem({ item, today, onEdit }) {
  return (
    <li>
      <button type="button" className="year-item" onClick={() => onEdit(item)}>
        <span className={`dot dot-${statusFor(item, today)}`} aria-hidden="true" />
        <span className="year-title">{item.title}</span>
        <span className="year-day tabular">{dayOfMonth(item.expiryDate)}</span>
      </button>
    </li>
  );
}

export default function YearAhead({ items, today, onAdd, onEdit, onGoItems }) {
  const view = yearView(items, today);
  const totalActive =
    view.overdue.length +
    view.beyond.length +
    view.months.reduce((sum, month) => sum + month.items.length, 0);

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Rolling twelve months</p>
          <h1>Year ahead</h1>
          <p className="page-sub">From {formatMonth(view.startKey)}. Archived items are hidden.</p>
        </div>
        <button type="button" className="button-secondary" onClick={() => onAdd()}>
          <Icon name="plus" /> Add item
        </button>
      </header>

      {totalActive === 0 ? (
        <EmptyState
          title="The year is clear"
          body="Add a date and it will appear in the month it falls due."
        >
          <button type="button" className="button-primary" onClick={() => onAdd()}>
            <Icon name="plus" /> Add a date
          </button>
        </EmptyState>
      ) : (
        <>
          {view.overdue.length ? (
            <section className="panel year-overdue">
              <header className="panel-head">
                <h2>Past due</h2>
                <span className="count-pill">{view.overdue.length}</span>
              </header>
              <ul className="year-list">
                {view.overdue.map((item) => (
                  <YearItem key={item.id} item={item} today={today} onEdit={onEdit} />
                ))}
              </ul>
            </section>
          ) : null}

          <div className="year-grid">
            {view.months.map((month) => (
              <section className="month-card" key={month.key}>
                <header className="month-head">
                  <h2>{formatMonth(month.key)}</h2>
                  <span className="month-count tabular">{month.items.length || '—'}</span>
                </header>
                {month.items.length ? (
                  <ul className="year-list">
                    {month.items.map((item) => (
                      <YearItem key={item.id} item={item} today={today} onEdit={onEdit} />
                    ))}
                  </ul>
                ) : (
                  <p className="month-empty">Nothing due</p>
                )}
              </section>
            ))}
          </div>

          {view.beyond.length ? (
            <p className="beyond-note">
              {view.beyond.length} {view.beyond.length === 1 ? 'item is' : 'items are'} further out.{' '}
              <button type="button" className="link-button" onClick={onGoItems}>
                See them in Items
              </button>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
