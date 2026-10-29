import React, { useEffect, useRef } from 'react';

export default function Dialog({ labelledBy, onClose, className = '', children }) {
  const ref = useRef(null);
  const returnFocus = useRef(null);

  useEffect(() => {
    const node = ref.current;
    returnFocus.current = document.activeElement;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    node.showModal();
    const focusTarget = node.querySelector('[data-autofocus]');
    if (focusTarget) focusTarget.focus();

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      const target = returnFocus.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus();
      } else {
        const main = document.getElementById('main');
        if (main) main.focus();
      }
    };
  }, []);

  return (
    <dialog ref={ref} className={`dialog ${className}`} aria-labelledby={labelledBy} onClose={onClose}>
      <div className="dialog-panel">{children}</div>
    </dialog>
  );
}
