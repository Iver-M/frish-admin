# FRISH Admin Portal (Frontend Prototype)

Fish Freshness Monitoring System — Web Administration Portal.

This is a **frontend-only prototype**. There is no backend, no authentication, and no database connection. All data is dummy JSON located in `src/data/`.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser. Logging in (any input, no validation) navigates straight to `/dashboard`.

## Structure

- `src/pages` — one folder per route/module (dashboard, assessment, reports, inspectors, vendors, audit, feedback, profile) plus the `Login` page
- `src/components` — shared, reusable UI building blocks (Sidebar, Topbar, StatCard, TableCard, StatusBadge, SearchBar, Pagination, Modal, ConfirmDialog, LoadingSkeleton)
- `src/layout` — `AdminLayout` composes Sidebar + Topbar + the active page via `<Outlet />`
- `src/data` — dummy JSON-like data modules, one per domain. Swap these for real API/Firestore calls later without touching the pages.
- `src/styles` — global tokens and base styles

## Connecting a real backend later

Each `src/data/*.js` file exports data plus a couple of trivial helper functions. To wire up a real backend:

1. Replace the exported arrays with `fetch`/Firestore calls (e.g. inside a `useEffect` + `useState`, or React Query).
2. Add an `AuthContext` and guard `AdminLayout` with it — the routing already isolates the login page from the admin shell, so this is a small, localized change.
3. Wire the `Assign`, `Resolve`, `Reply`, `Change Password`, etc. buttons to real mutations — they're already isolated as handlers at the page level.

No Tailwind is used; styling is plain CSS with CSS variables defined in `src/styles/theme.css`.
