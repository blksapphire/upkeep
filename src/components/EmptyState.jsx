import React from 'react';

export default function EmptyState({ title, body, children }) {
  return (
    <section className="empty-state panel">
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {children ? <div className="empty-actions">{children}</div> : null}
    </section>
  );
}
