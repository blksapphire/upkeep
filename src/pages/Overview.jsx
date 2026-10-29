import React from 'react';
import Icon from '../Icon.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { counts, groupItems, nextItem, statusFor } from '../lib/status.js';
import { daysUntil } from '../lib/dates.js';
import { countdownLabel, dateParts, formatDate, formatWeekday } from '../lib/format.js';
import { categoryLabel, TEMPLATES } from '../lib/templates.js';

function DeadlineRow({ item, today, onEdit, onRenew }) {
  const days = daysUntil(item.expiryDate, today);
  return (
    <li className="deadline-row">
      <button type="button" className="deadline-main" onClick={() => onEdit(item)}>
        <span className="deadline-title">{item.title}</span>
        <span className="deadline-meta">
          {categoryLabel(item.category)} · {formatDate(item.expiryDate)}
        </span>
      </button>
      <span className="deadline-count tabular">{countdownLabel(days)}</span>
      <StatusPill status={statusFor(item, today)} />
      <button
        type="button"
        className="icon-button"
        aria-label={`Renew ${item.title}`}
        title="Renew"
        onClick={() => onRenew(item)}
      >
        <Icon name="refresh" />
      </button>
    </li>
  );
}

function Group({ title, items, total, today, emptyText, onEdit, onRenew, onGoItems }) {
  return (
    <section className="panel group-panel">
      <header className="panel-head">
        <h2>{title}</h2>
        <span className="count-pill">{total}</span>
        <button type="button" className="link-button" onClick={onGoItems}>
          View all <Icon name="arrow-right" size={14} />
        </button>
      </header>
      {items.length ? (
        <ul className="deadline-list">
          {items.map((item) => (
            <DeadlineRow key={item.id} item={item} today={today} onEdit={onEdit} onRenew={onRenew} />
          ))}
        </ul>
      ) : (
        <p className="quiet">{emptyText}</p>
      )}
      {total > items.length ? (
        <button type="button" className="group-more" onClick={onGoItems}>
          {total - items.length} more in Items
        </button>
      ) : null}
    </section>
  );
}

export default function Overview({ items, today, onAdd, onEdit, onRenew, onDownloadIcs, onGoItems }) {
  const totals = counts(items, today);
  const groups = groupItems(items, today);
  const next = nextItem(items, today);

  if (!totals.active) {
    return (
      <div className="page-stack">
        <section className="hero hero-empty">
          <div className="hero-top">
            <p className="eyebrow">{formatWeekday(today)} · your quiet deadline tracker</p>
            <span className="local-chip">
              <Icon name="lock" size={13} /> Local-only
            </span>
          </div>
          <h1>Nothing expires unnoticed.</h1>
          <p className="hero-lede">
            Passports, policies, warranties, boiler services, vehicle dates and renewals — in one calm place, with a
            reminder you actually control.
          </p>
          <div className="hero-actions">
            <button type="button" className="button-primary" onClick={() => onAdd()}>
              <Icon name="plus" /> Add your first date
            </button>
          </div>
          <div className="template-row">
            <span className="template-hint">Start with</span>
            {TEMPLATES.slice(0, 5).map((template) => (
              <button key={template.id} type="button" className="chip" onClick={() => onAdd(template.id)}>
                {template.title}
              </button>
            ))}
          </div>
        </section>

        <section className="how-grid">
          <article className="how-card">
            <span className="how-index">01</span>
            <h2>Add it once</h2>
            <p>Name the thing, set its date, and choose how early you want the warning. Templates cover the usual suspects.</p>
          </article>
          <article className="how-card">
            <span className="how-index">02</span>
            <h2>See what matters</h2>
            <p>Dates sort themselves into needs attention, next 90 days and later. No spreadsheet to keep tidy.</p>
          </article>
          <article className="how-card">
            <span className="how-index">03</span>
            <h2>Remind yourself</h2>
            <p>Export a calendar event with the alert built in, then mark the item renewed once it's done.</p>
          </article>
        </section>
      </div>
    );
  }

  const days = daysUntil(next.expiryDate, today);
  const parts = dateParts(next.expiryDate);
  const status = statusFor(next, today);
  const noAttention = totals.attention === 0;

  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero-top">
          <p className="eyebrow">
            {formatWeekday(today)} · {totals.active} tracked
          </p>
          <span className="local-chip">
            <Icon name="lock" size={13} /> Local-only
          </span>
        </div>
        <div className="hero-body">
          <div className="hero-copy">
            <p className="hero-kicker">
              {status === 'overdue' ? 'Past due' : noAttention ? 'Next up — all clear for now' : 'Next deadline'}
            </p>
            <h1>{next.title}</h1>
            <div className="hero-when">
              <span className={`hero-day${status === 'overdue' ? ' is-overdue' : ''}`}>{parts.day}</span>
              <span className="hero-month">
                {parts.month}
                <br />
                {parts.year}
              </span>
            </div>
            <div className="hero-status">
              <StatusPill status={status} />
              <span className="hero-count">{countdownLabel(days)}</span>
              <span className="hero-cat">{categoryLabel(next.category)}</span>
            </div>
          </div>
          <div className="hero-actions">
            <button type="button" className="button-primary" onClick={() => onRenew(next)}>
              <Icon name="refresh" /> Mark renewed
            </button>
            <button type="button" className="button-secondary" onClick={() => onDownloadIcs(next)}>
              <Icon name="calendar-plus" /> Add to calendar
            </button>
            <button type="button" className="button-quiet" onClick={() => onEdit(next)}>
              Edit details
            </button>
          </div>
        </div>
      </section>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">Overdue</span>
          <strong className={`stat-value${totals.overdue ? ' tone-rose' : ''}`}>{totals.overdue}</strong>
          <span className="stat-hint">{totals.overdue ? 'Past their date' : 'Nothing past due'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Needs attention</span>
          <strong className={`stat-value${totals.attention ? ' tone-brass' : ''}`}>{totals.attention}</strong>
          <span className="stat-hint">Inside their alert window</span>
        </div>
        <div className="stat">
          <span className="stat-label">Tracked</span>
          <strong className="stat-value">{totals.active}</strong>
          <span className="stat-hint">Active dates on this device</span>
        </div>
      </div>

      <div className="groups">
        <Group
          title="Needs attention"
          items={groups.attention.slice(0, 5)}
          total={groups.attention.length}
          today={today}
          emptyText={noAttention ? 'Nothing needs attention right now. Enjoy the quiet.' : 'Nothing needs attention.'}
          onEdit={onEdit}
          onRenew={onRenew}
          onGoItems={onGoItems}
        />
        <Group
          title="Next 90 days"
          items={groups.next90.slice(0, 5)}
          total={groups.next90.length}
          today={today}
          emptyText="No other dates in the next three months."
          onEdit={onEdit}
          onRenew={onRenew}
          onGoItems={onGoItems}
        />
        <Group
          title="Later"
          items={groups.later.slice(0, 5)}
          total={groups.later.length}
          today={today}
          emptyText="Nothing further out yet."
          onEdit={onEdit}
          onRenew={onRenew}
          onGoItems={onGoItems}
        />
      </div>
    </div>
  );
}
