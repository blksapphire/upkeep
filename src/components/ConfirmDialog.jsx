import React from 'react';
import Dialog from './Dialog.jsx';

export default function ConfirmDialog({ title, body, confirmLabel, tone = 'danger', onConfirm, onClose }) {
  return (
    <Dialog labelledBy="confirm-title" onClose={onClose} className="dialog-small">
      <h2 id="confirm-title">{title}</h2>
      <div className="dialog-body">{body}</div>
      <div className="dialog-actions">
        <button type="button" className="button-ghost" onClick={onClose} data-autofocus>
          Cancel
        </button>
        <button type="button" className={`button-${tone}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
