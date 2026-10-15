# Online feedback Admin navigation correction

## Scope

Checkpoint 3C remains paused. This correction restores the original Admin application while keeping the existing User Feedback route connected to the controlled online-test callable.

## Cause and correction

The first online-test build applied feedback restrictions to the whole application in three places: the sidebar reduced navigation to `/feedback`, the shared layout redirected every route to `/feedback`, and Firebase initialization disabled Firestore outside emulator mode. The correction removes the global sidebar and layout restrictions, restores Firestore for the existing Admin modules, and retains Storage initialization only for emulator mode.

The `/feedback` route remains restricted to active `bfar_admin` accounts carrying `feedbackOnlineTest=consumer-feedback-v1`. It reads through `listConsumerFeedback`, validates the returned projection, exposes loading, empty, error, and retry states, and shows the online-test/read-only disclosure. It does not query Consumer feedback through Firestore or initialize Storage.

Consumer Intake and Authority Cases remain behind their existing disabled runtime boundary. Production remains disabled.

## Verification

- Complete Admin test suite: 42 passed.
- Online-test production build: passed, 141 modules transformed.
- Navigation regression coverage confirms original role-based sidebar entries and routes, exactly one User Feedback entry, feedback-specific authorization, callable-only feedback reads, no feedback Storage initialization, sign-out behavior, and disabled production/authority modules.
- Credential scan: only the expected public Firebase web API key was found; no private key, service account, OAuth secret, production approval, or account identifier was present.
- Dependency audit: completed without fixes; 4 existing advisories reported (3 moderate, 1 high), with the available remediation requiring forced breaking upgrades.
- Browser acceptance at `https://frish.web.app`: Dashboard and original routes load; the original BFAR navigation is present; User Feedback appears once and shows the online-test empty state; no white screen or console errors; Consumer Intake and Authority Cases are absent.

## Hosting record

- Site: `frish`
- Corrected version: `8f7fcff188441eb0`
- Immediate rollback version: `4c4b4736b7a1d9c1`
- Pre-feedback rollback version retained: `16b23254b72305f2`

The deployment targeted Hosting only. Firestore rules and indexes, Functions, Storage rules, Auth users, and Custom Claims were not changed. Post-deploy metadata confirmed the previously deployed rulesets, indexes, Storage ruleset, and sole `listConsumerFeedback` Function remained unchanged.
