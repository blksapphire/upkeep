import React from 'react';
import Icon from '../Icon.jsx';
import StatusPill from './StatusPill.jsx';
import { statusFor } from '../lib/status.js';
import { daysUntil } from '../lib/dates.js';
import { countdownLabel, formatDate } from '../lib/format.js';
import { categoryLabel } from '../lib/templates.js';

const COLUMNS = ['Item', 'Category', 'Expires', 'Status', 'Alert', 'Actions'];
const COLSPAN = COLUMNS.length;

function alertText(item) {
  return item.leadDays ? `${item.leadDays} days before` : 'On the day';
}

export default function ItemList({ items, today, onEdit, onRenew, onDownloadIcs, onArchive, onRestore, onDelete }) {
  return (
    <>
      <div className="table-wrap panel">
        <table className="data-table">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={COLSPAN} className="table-empty">
                  Nothing to show.
                </td>
              </tr>
            ) : null}
            {items.map((item) => {
              const status = statusFor(item, today);
              const days = daysUntil(item.expiryDate, today);
              return (
                <tr key={item.id}>
                  <td>
                    <button type="button" className="row-title" onClick={() => onEdit(item)}>
                      {item.title}
                    </button>
                    {item.notes ? <span className="row-sub">{item.notes}</span> : null}
                  </td>
                  <td className="muted">{categoryLabel(item.category)}</td>
                  <td>
                    <span className="tabular">{formatDate(item.expiryDate)}</span>
                    <span className="row-sub">{countdownLabel(days)}</span>
                  </td>
                  <td>
                    <StatusPill status={status} />
                  </td>
                  <td className="muted tabular">{alertText(item)}</td>
                  <td>
                    <div className="row-actions">
                      {item.archivedAt ? (
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Restore ${item.title}`}
                          title="Restore"
                          onClick={() => onRestore(item)}
                        >
                          <Icon name="restore" />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Renew ${item.title}`}
                            title="Renew"
                            onClick={() => onRenew(item)}
                          >
                            <Icon name="refresh" />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Add ${item.title} to calendar`}
                            title="Add to calendar"
                            onClick={() => onDownloadIcs(item)}
                          >
                            <Icon name="calendar-plus" />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Archive ${item.title}`}
                            title="Archive"
                            onClick={() => onArchive(item)}
                          >
                            <Icon name="archive" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="icon-button icon-danger"
                        aria-label={`Delete ${item.title}`}
                        title="Delete"
                        onClick={() => onDelete(item)}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="item-cards">
        {items.map((item) => {
          const status = statusFor(item, today);
          const days = daysUntil(item.expiryDate, today);
          return (
            <li className="item-card" key={item.id}>
              <div className="item-card-head">
                <button type="button" className="item-card-title" onClick={() => onEdit(item)}>
                  {item.title}
                </button>
                <StatusPill status={status} />
              </div>
              <p className="item-card-meta">
                {categoryLabel(item.category)} · {formatDate(item.expiryDate)} · {countdownLabel(days)}
              </p>
              <p className="item-card-meta">Alert {alertText(item).toLowerCase()}</p>
              <div className="item-card-actions">
                {item.archivedAt ? (
                  <button type="button" className="text-button" onClick={() => onRestore(item)}>
                    Restore
                  </button>
                ) : (
                  <>
                    <button type="button" className="text-button" onClick={() => onRenew(item)}>
                      Renew
                    </button>
                    <button type="button" className="text-button" onClick={() => onEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="text-button" onClick={() => onDownloadIcs(item)}>
                      Calendar
                    </button>
                    <button type="button" className="text-button" onClick={() => onArchive(item)}>
                      Archive
                    </button>
                  </>
                )}
                <button type="button" className="text-button danger" onClick={() => onDelete(item)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
