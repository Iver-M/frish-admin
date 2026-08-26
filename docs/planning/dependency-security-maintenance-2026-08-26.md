# Dependency security maintenance — 2026-08-26

Issue: https://github.com/towwfiee/FRISH/issues/13

## Scope and decision

The Admin dependency scope was audited on 2026-08-26. Vite was raised only to
the first release that resolves the validated development-server advisory set,
and React Router DOM was raised within major version 6. No
`npm audit fix --force`, override, lockfile deletion, unrelated modernization,
Firebase deployment, or production Firebase access was used.

Registry-backed `npm audit --json` results on 2026-08-26: before, 6 package
findings (3 high, 3 moderate); after, 2 moderate findings.

| Package | Before | After | Parent / use | Decision |
| --- | --- | --- | --- | --- |
| Vite | `5.4.21` | `6.4.3` | direct development/build tool | Resolved. Vite 6.4.3 is the minimum line fixing the Windows `server.fs.deny` bypass; plugin-react 4.7.0 supports Vite 6. |
| esbuild | `0.21.5` | `0.25.12` | Vite development server | Resolved through Vite. The original localhost CORS behavior was reachable from a malicious webpage while development was running. |
| PostCSS | `8.5.16` | `8.5.26` | Vite CSS build pipeline | Resolved with a compatible patch. Repository-controlled CSS/source maps are the normal input boundary. |
| Nano ID | `3.3.15` | `3.3.18` | PostCSS internal IDs | Resolved with a compatible patch. |
| React Router DOM | `6.30.4` | `6.30.6` | direct Admin runtime navigation | Direct DOM advisory resolved within major version 6. |
| React Router | `6.30.4` | `6.30.6` | React Router DOM | Two moderate package findings remain because upstream only marks Router 7.18.0 patched. FRISH uses declarative `BrowserRouter`, not Data/Framework mode SSR or manual hydration. Navigation destinations are fixed internal paths or internally interpolated document IDs; no attacker-controlled absolute redirect destination was found. |

The remaining Router entries are not reachable under the current architecture.
Moving to Router 7 solely to clear audit metadata would be a breaking migration
without a demonstrated security benefit here. Preserve declarative routing and
internal destination construction, track Router 6 upstream, and review again by
2026-09-30 or before adding SSR, Data/Framework mode, or external redirect
destinations.

## Compatibility and verification

- Direct changes: `vite` security floor `^5.4.0` → `^6.4.3` and
  `react-router-dom` security floor `^6.26.0` → `^6.30.6`.
- React 18.3.1, Firebase Web SDK 12.17.0, emulator flags, project values, and
  application source are unchanged.
- All configured tests: 11 passed.
- Focused Consumer Intake / Authority Cases tests: 5 passed.
- Contract tests: 6 passed; shared-contract peer drift passed in both
  directions.
- Vite production build: passed with the existing large-chunk warning.
- No lint script exists, so no new lint command was invented.
- Emulator callable E2E in the sibling repository passed, including
  idempotent promotion and LGU privacy-rule coverage.
- Browser smoke on Vite 6.4.3 passed with seeded emulator accounts. BFAR opened
  Consumer Intake, promoted a `prototype_saved` concern, and saw one submitted
  authority case. A second promotion returned that existing case and the list
  remained at one document. The seeded LGU account had no Consumer Intake or
  Authority Cases navigation and a direct submitted-case URL redirected to its
  dashboard. Firestore Rules tests separately denied LGU reads of submitted
  cases and reporter contacts.
- Functions recovery passed: with the local Functions process stopped, Admin
  showed the emulator-unavailable message and a Retry action. After Functions
  restarted, promotion returned the existing case without duplication.

Authority features remain gated by development mode,
`VITE_AUTHORITY_CASES_EMULATOR=true`, and project `frish-app2026`. Production
authority delivery remains disabled. No Firebase deploy command was run, no
production environment value changed, and no production data was read or
written.
