import React from 'react';

const ICONS = {
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h4v-5h4v5h4V9.5" />
    </>
  ),
  list: (
    <>
      <path d="M8.5 6H21M8.5 12H21M8.5 18H21" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeWidth="2.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" />
      <path d="m9.2 12 2 2 3.6-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.5L20 8.5 15.5 4 4 15.5z" />
      <path d="M13.5 6 18 10.5" />
    </>
  ),
  archive: (
    <>
      <rect x="3.5" y="4" width="17" height="4.5" rx="1.5" />
      <path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5M10 12.5h4" />
    </>
  ),
  restore: (
    <>
      <path d="M4 4v6h6" />
      <path d="M4.6 10a8 8 0 1 1 2.2 8.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M10 3.5h4M6.5 7l.8 13h9.4l.8-13" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 4 21 20H3z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </>
  ),
  'calendar-plus': (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <path d="M16 13.5v4M14 15.5h4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 11 4.5 4.5L16.5 11" />
      <path d="M5 20h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20V9" />
      <path d="m7.5 13 4.5-4.5L16.5 13" />
      <path d="M5 4h14" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />
};

export default function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {ICONS[name] || null}
    </svg>
  );
}
