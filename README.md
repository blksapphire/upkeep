# Upkeep

**Nothing expires unnoticed.** A private, local-first tracker for passports, visas, licences, insurance, warranties, boiler services, vehicle inspections, domains and memberships.

Record a date once; Upkeep shows what needs attention, keeps a renewal history, and exports calendar reminders with the alert already set. There is no account, no server and no sync — every date stays in this browser.

## What it does

- **Lead-time warnings.** Each item has its own warning window (0–730 days). A passport can start warning six months out; a domain thirty days out.
- **Status at a glance.** Overdue, urgent (inside 14 days or the warning window), due (inside the warning window), later. The overview surfaces the soonest active deadline.
- **Renewal loop.** “Mark renewed” advances the date by the item's interval, preserving month-end anchors (31 Jan → 28 Feb → 31 Mar), or accepts a manual date. Renewals are recorded in a short history.
- **Year ahead.** A rolling twelve-month grid places every active item in exactly one month, with a tail for anything further out.
- **Calendar export.** An `.ics` file with all-day events, a display alarm at each item's lead time, and stable UIDs so re-imports update events instead of duplicating them.
- **Backups.** A JSON export/import round-trip, with item-by-item validation and a report of anything skipped.

## Privacy

Upkeep makes no network requests. The promise is enforced, not just stated:

- No `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon` or remote dynamic imports anywhere in `src` — a test scans every source file for them.
- `vercel.json` sends a strict Content-Security-Policy with `connect-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'none'` and `frame-ancestors 'none'`, plus `nosniff`, `no-referrer` and a restrictive Permissions-Policy.
- `index.html` loads no external scripts, styles or fonts. Fraunces and DM Sans are bundled from `@fontsource`.
- No analytics, no accounts, no cookies, no third-party assets.

Clearing this site's data in the browser deletes Upkeep. A downloaded JSON backup is the only copy — download one regularly.

## Getting started

Requires Node 20 or newer.

```sh
npm ci
npm run dev      # local dev server
npm test         # node --test, colocated in src/lib
npm run build    # production build in dist/
npm run preview  # serve the build locally
```

Built with React 18 and Vite 5. There is no router, state library or date library: views are tabs, state lives in one hook, and all date math is plain ISO helpers.

## Data model

Stored in `localStorage` under `upkeep.data`:

```json
{
  "app": "upkeep",
  "version": 1,
  "items": [
    {
      "id": "…",
      "title": "Passport",
      "category": "documents",
      "expiryDate": "2027-04-10",
      "leadDays": 180,
      "intervalMonths": 120,
      "anchorDay": 10,
      "link": "",
      "notes": "",
      "archivedAt": null,
      "createdAt": "…",
      "updatedAt": "…",
      "history": [{ "at": "…", "from": "2017-04-10", "to": "2027-04-10" }]
    }
  ],
  "meta": { "createdAt": "…", "updatedAt": "…" }
}
```

- Categories: `documents`, `money`, `home`, `vehicle`, `other`.
- Dates are ISO `YYYY-MM-DD`; arithmetic is UTC date-only, so time zones cannot shift a deadline.
- Limits: 1,000 items, 2 MB serialized, title 80 characters, notes 500, history 50 records, lead 0–730 days, interval 1–120 months.
- Corrupt saved data is never overwritten silently: the raw text is stashed under `upkeep.data.recovery` and a banner explains the recovery path.
- Data saved by a newer schema version is left untouched in read-only mode.
- Changes made in another tab are adopted through the `storage` event.

## Calendar export

Every active item becomes one all-day event:

- `UID:upkeep-{id}@upkeep.local` — stable across edits and renewals.
- `DTSTART;VALUE=DATE` with no `DTEND`; `TRANSP:TRANSPARENT`.
- `VALARM` with `TRIGGER:-P{leadDays}D` (omitted when the lead is zero).
- Notes, category, renewal interval and an optional renewal link are included in the description.

Some calendars — Google Calendar in particular — ignore alerts more than about four weeks in the future. Upkeep remains the source of truth for long lead times; the form says so when a lead exceeds 28 days. A static `.ics` file cannot update itself, so re-export after changes or renewals.

## Deployment

The app is a static Vite build and deploys as-is to Vercel (framework preset **Vite**, build `npm run build`, output `dist`). `vercel.json` supplies the security headers.

The Open Graph image URL in `index.html` must be absolute once the deployment domain is known; replace `/og-upkeep.jpg` with the full URL after the first deploy.

CI (`.github/workflows/validate.yml`) runs `npm ci`, `npm test` and `npm run build` on Node 22 for every push.

## Structure

```
src/
  lib/          dates, status, templates, store, transfer, ics (pure, tested)
  useTracker.js load, mutations, cross-tab adoption, save state
  components/   dialog, item form, list, status pill, empty state
  pages/        overview, items, year ahead, data
  styles.css    tokens and layout (single dark theme)
public/         favicon and Open Graph banner
```

## Out of scope

No document vault, accounts, sync, email or push reminders, price tracking, OCR, or self-updating calendar feeds. Those would require a server; Upkeep is deliberately the opposite.
