# Consumer feedback inbox — Phase 6, Checkpoint 3

The existing `/feedback` page can read Consumer feedback only from the local
Firebase emulator suite. The capability defaults to disabled with
`VITE_CONSUMER_FEEDBACK_EMULATOR=false`. Enabling it also requires Vite
development mode, configured Auth/Firestore/Functions emulators, project
`frish-app2026`, and freshly refreshed Firebase claims for an active BFAR Admin.

The browser calls `listConsumerFeedback`; it does not query Firestore directly.
The Function uses the Admin SDK after checking the emulator and custom claims.
Market Admin, LGU, Inspector, inactive, arbitrary and unauthenticated callers are
denied. The response is newest-first, capped at 50, and contains exactly schema
version, an anonymous `FB-*` reference, rating, feedback text, app/platform
versions and a canonical submission time.

Malformed stored records are omitted. The projection excludes the stored ID,
Guest UID, submission UUID, identity, status, delivery metadata, location,
scan/report/case data, evidence, Storage, device identifiers, analysis, staff and
audit data. The page validates the projection again before rendering it.

The inbox supports loading, success, empty, safe failure, Refresh and Retry.
Active requests are deduplicated, while generation guards reject stale results
after retry, account changes, sign-out or unmount. With the flag off, existing
placeholder cards are clearly labeled as sample data. The page is read-only.

Replies, status, moderation, assignment, deletion, sentiment, history,
notifications and production access remain deferred. No Rules or Storage
permissions were expanded, and no production deployment is approved.

## Verification — 2026-09-07

Checkpoint 3 passed 56 Functions tests, 35 Admin tests, 399 Consumer tests, 79
Firestore Rules cases and 7 Storage Rules cases. The combined emulator E2E used
the actual Consumer service to submit, retry idempotently and submit a second
record; repeated Admin reads returned two safe records newest-first, denied all
six unauthorized caller classes, omitted a malformed record and left Firestore
and Storage hashes unchanged. Authority/status/evidence regressions, both contract
drift checks, the default-off production build, lint and diff checks passed.

The dependency review found existing transitive advisories and made no forced or
unrelated upgrades. Production Firebase was not accessed or deployed.
