import React, { useState } from 'react';
import Dialog from './Dialog.jsx';
import Icon from '../Icon.jsx';
import { CATEGORIES, TEMPLATES, templateById } from '../lib/templates.js';
import { isValidIsoDate } from '../lib/dates.js';
import { renewalDate } from '../lib/status.js';
import { formatDate } from '../lib/format.js';
import { SKIP_REASONS } from '../lib/transfer.js';

const FIELD_BY_CODE = {
  'missing-title': 'title',
  'title-too-long': 'title',
  'invalid-category': 'category',
  'invalid-date': 'expiryDate',
  'invalid-lead': 'leadDays',
  'invalid-interval': 'intervalMonths',
  'invalid-link': 'link',
  'link-too-long': 'link',
  'notes-too-long': 'notes'
};

const LEAD_CHOICES = [14, 30, 60, 90, 180];

const INTERVALS = [
  { value: '', label: 'No repeat' },
  { value: '6', label: 'Every 6 months' },
  { value: '12', label: 'Every 12 months' },
  { value: '24', label: 'Every 2 years' },
  { value: '60', label: 'Every 5 years' },
  { value: '120', label: 'Every 10 years' }
];

const LINK = /^https?:\/\/[^\s]+$/i;

export default function ItemDialog({ mode, item, templateId: initialTemplateId, today, onClose, onAdd, onEdit, onRenew }) {
  const template = mode === 'add' && initialTemplateId ? templateById(initialTemplateId) : null;
  const [templateId, setTemplateId] = useState(template ? template.id : null);
  const [title, setTitle] = useState(mode === 'add' ? (template ? template.title : '') : item.title);
  const [category, setCategory] = useState(mode === 'add' ? (template ? template.category : 'documents') : item.category);
  const [expiryDate, setExpiryDate] = useState(mode === 'add' ? '' : item.expiryDate);
  const [leadDays, setLeadDays] = useState(
    String(mode === 'add' ? (template ? template.leadDays : 30) : item.leadDays)
  );
  const [intervalMonths, setIntervalMonths] = useState(
    mode === 'add'
      ? template && template.intervalMonths != null
        ? String(template.intervalMonths)
        : ''
      : item.intervalMonths == null
        ? ''
        : String(item.intervalMonths)
  );
  const [link, setLink] = useState(mode === 'add' ? '' : item.link);
  const [notes, setNotes] = useState(mode === 'add' ? '' : item.notes);
  const [renewDate, setRenewDate] = useState(mode === 'renew' ? renewalDate(item) || item.expiryDate : '');
  const [errors, setErrors] = useState({});

  const heading = mode === 'renew' ? `Renew ${item.title}` : mode === 'edit' ? `Edit ${item.title}` : 'Add a deadline';
  const suggested = mode === 'renew' && item.intervalMonths ? renewalDate(item) : null;
  const leadNumber = Number(leadDays);

  function applyTemplate(next) {
    setTemplateId(next.id);
    setTitle(next.title);
    setCategory(next.category);
    setLeadDays(String(next.leadDays));
    setIntervalMonths(next.intervalMonths == null ? '' : String(next.intervalMonths));
    setErrors({});
  }

  function payload() {
    return {
      title: title.trim(),
      category,
      expiryDate,
      leadDays: leadNumber,
      intervalMonths: intervalMonths === '' ? null : Number(intervalMonths),
      link: link.trim(),
      notes
    };
  }

  function validate() {
    const next = {};
    if (!title.trim()) next.title = 'Give it a name, for example “Passport”.';
    if (!isValidIsoDate(expiryDate)) next.expiryDate = 'Choose the date it expires or renews.';
    if (String(leadDays).trim() === '' || !Number.isInteger(leadNumber) || leadNumber < 0 || leadNumber > 730) {
      next.leadDays = 'Use a whole number from 0 to 730 days.';
    }
    if (link.trim() && !LINK.test(link.trim())) next.link = 'Use a full address starting with https://';
    if (notes.length > 500) next.notes = 'Keep notes under 500 characters.';
    return next;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (mode === 'renew') {
      if (!isValidIsoDate(renewDate)) {
        setErrors({ renewDate: 'Choose a valid date.' });
        return;
      }
      const result = onRenew(item.id, renewDate);
      if (result && result.error) {
        setErrors({ renewDate: SKIP_REASONS[result.error] || 'That date could not be saved.' });
        return;
      }
      onClose();
      return;
    }

    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    const result = mode === 'add' ? onAdd(payload()) : onEdit(item.id, payload());
    if (result && result.error) {
      const field = FIELD_BY_CODE[result.error];
      setErrors({ [field || 'title']: SKIP_REASONS[result.error] || 'Please check this field.' });
      return;
    }
    onClose();
  }

  if (mode === 'renew') {
    return (
      <Dialog labelledBy="item-dialog-title" onClose={onClose}>
        <form className="item-form" onSubmit={handleSubmit} noValidate>
          <header className="dialog-head">
            <h2 id="item-dialog-title">{heading}</h2>
            <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
              <Icon name="close" />
            </button>
          </header>
          <p className="dialog-lede">
            Currently set to <strong>{formatDate(item.expiryDate)}</strong>. Marking it renewed moves the date forward
            and keeps a short history.
          </p>
          <div className="field">
            <label htmlFor="renew-date">New expiry or renewal date</label>
            <input
              id="renew-date"
              type="date"
              value={renewDate}
              data-autofocus
              aria-invalid={errors.renewDate ? 'true' : 'false'}
              aria-describedby={errors.renewDate ? 'renew-date-error' : undefined}
              onChange={(event) => {
                setRenewDate(event.target.value);
                setErrors({});
              }}
            />
            {errors.renewDate ? (
              <p className="field-error" id="renew-date-error">
                {errors.renewDate}
              </p>
            ) : null}
            {suggested && suggested !== renewDate ? (
              <p className="field-hint">
                Suggested: {formatDate(suggested)} ({item.intervalMonths} months on).{' '}
                <button type="button" className="link-button inline" onClick={() => setRenewDate(suggested)}>
                  Use it
                </button>
              </p>
            ) : null}
            {renewDate && renewDate < today ? (
              <p className="field-hint warn">That date is already in the past — the item will stay overdue.</p>
            ) : null}
            {item.history.length ? (
              <p className="field-hint">
                Last renewed{' '}
                {formatDate(item.history[item.history.length - 1].at.slice(0, 10))}.
              </p>
            ) : null}
          </div>
          <div className="dialog-actions">
            <button type="button" className="button-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-primary">
              Mark renewed
            </button>
          </div>
        </form>
      </Dialog>
    );
  }

  return (
    <Dialog labelledBy="item-dialog-title" onClose={onClose}>
      <form className="item-form" onSubmit={handleSubmit} noValidate>
        <header className="dialog-head">
          <h2 id="item-dialog-title">{heading}</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>

        {mode === 'add' ? (
          <div className="template-block">
            <span className="field-label">Start from a template</span>
            <div className="template-chips" role="group" aria-label="Templates">
              {TEMPLATES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={templateId === entry.id ? 'chip active' : 'chip'}
                  aria-pressed={templateId === entry.id}
                  onClick={() => applyTemplate(entry)}
                >
                  {entry.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="form-grid">
          <div className="field span-2">
            <label htmlFor="item-title">What is it?</label>
            <input
              id="item-title"
              value={title}
              data-autofocus
              maxLength={80}
              placeholder="Passport, home insurance, boiler service…"
              aria-invalid={errors.title ? 'true' : 'false'}
              aria-describedby={errors.title ? 'item-title-error' : undefined}
              onChange={(event) => {
                setTitle(event.target.value);
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
            />
            {errors.title ? (
              <p className="field-error" id="item-title-error">
                {errors.title}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="item-category">Category</label>
            <select id="item-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="item-date">Expires or renews on</label>
            <input
              id="item-date"
              type="date"
              value={expiryDate}
              aria-invalid={errors.expiryDate ? 'true' : 'false'}
              aria-describedby={errors.expiryDate ? 'item-date-error' : undefined}
              onChange={(event) => {
                setExpiryDate(event.target.value);
                setErrors((prev) => ({ ...prev, expiryDate: undefined }));
              }}
            />
            {errors.expiryDate ? (
              <p className="field-error" id="item-date-error">
                {errors.expiryDate}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="item-lead">Start warning me</label>
            <div className="lead-row">
              <input
                id="item-lead"
                type="number"
                min="0"
                max="730"
                inputMode="numeric"
                value={leadDays}
                aria-invalid={errors.leadDays ? 'true' : 'false'}
                aria-describedby={errors.leadDays ? 'item-lead-error' : undefined}
                onChange={(event) => {
                  setLeadDays(event.target.value);
                  setErrors((prev) => ({ ...prev, leadDays: undefined }));
                }}
              />
              <span className="input-suffix">days before</span>
            </div>
            {errors.leadDays ? (
              <p className="field-error" id="item-lead-error">
                {errors.leadDays}
              </p>
            ) : null}
            <div className="quick-row" role="group" aria-label="Common warning windows">
              {LEAD_CHOICES.map((days) => (
                <button
                  key={days}
                  type="button"
                  className={leadNumber === days ? 'chip chip-small active' : 'chip chip-small'}
                  aria-pressed={leadNumber === days}
                  onClick={() => setLeadDays(String(days))}
                >
                  {days}d
                </button>
              ))}
            </div>
            {leadNumber > 28 ? (
              <p className="field-hint">Some calendars ignore alerts more than four weeks ahead; Upkeep still shows it.</p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="item-interval">Renews every</label>
            <select
              id="item-interval"
              value={intervalMonths}
              onChange={(event) => setIntervalMonths(event.target.value)}
            >
              {INTERVALS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="item-link">Renewal page (optional)</label>
            <input
              id="item-link"
              type="url"
              value={link}
              maxLength={300}
              placeholder="https://"
              aria-invalid={errors.link ? 'true' : 'false'}
              aria-describedby={errors.link ? 'item-link-error' : undefined}
              onChange={(event) => {
                setLink(event.target.value);
                setErrors((prev) => ({ ...prev, link: undefined }));
              }}
            />
            {errors.link ? (
              <p className="field-error" id="item-link-error">
                {errors.link}
              </p>
            ) : null}
          </div>
        </div>

        <div className="field">
          <label htmlFor="item-notes">Notes (optional)</label>
          <textarea
            id="item-notes"
            rows={3}
            maxLength={500}
            value={notes}
            placeholder="Policy number, where the document lives, what to check…"
            aria-invalid={errors.notes ? 'true' : 'false'}
            aria-describedby={errors.notes ? 'item-notes-error' : undefined}
            onChange={(event) => {
              setNotes(event.target.value);
              setErrors((prev) => ({ ...prev, notes: undefined }));
            }}
          />
          <p className="field-hint counter">{notes.length}/500</p>
          {errors.notes ? (
            <p className="field-error" id="item-notes-error">
              {errors.notes}
            </p>
          ) : null}
        </div>

        <div className="dialog-actions">
          <span className="dialog-footnote">Saved only in this browser.</span>
          <button type="button" className="button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-primary">
            {mode === 'add' ? 'Add to Upkeep' : 'Save changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
