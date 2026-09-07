# Consumer feedback inbox — Phase 6 final verification

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

## Final verification — 2026-09-08

Checkpoint 3 passed 56 Functions tests, 35 Admin tests, 399 Consumer tests, 79
Firestore Rules cases and 7 Storage Rules cases. The combined emulator E2E used
the actual Consumer service to submit, retry idempotently and submit a second
record; repeated Admin reads returned two safe records newest-first, denied all
six unauthorized caller classes, omitted a malformed record and left Firestore
and Storage hashes unchanged. Authority/status/evidence regressions, both contract
drift checks, the default-off production build, lint and diff checks passed.

The dependency review found existing transitive advisories and made no forced or
unrelated upgrades. Production Firebase was not accessed or deployed.

Local browser acceptance used Firebase Auth, Functions and Firestore emulators
with the real-feedback development flag. An active BFAR account saw two records
exactly once and newest first, including anonymous references, 5- and 3-star
labels, feedback text, app/Android versions and submission times. Refresh stayed
at two records. A Market Admin saw no User Feedback navigation item, and direct
navigation to `/feedback` returned to Dashboard. No write or private-field action
was present.

The browser run exposed a React Strict Mode remount defect that kept the first
request in the loading state. The request guard now explicitly reactivates on
mount, and regression coverage verifies the remount lifecycle. All 35 Admin tests
and the default-off production build pass after the fix. Loading, empty,
failure/Retry, duplicate request, stale-result and all denied-caller states remain
covered deterministically. The callable returns one newest-first page capped at
50; Phase 6 does not implement pagination controls.

The final Consumer/backend totals are 399 Consumer tests, 56 Functions tests, 79
Firestore Rules cases and 7 Storage Rules cases. All four emulator E2Es and both
shared-contract drift checks passed, including unchanged Firestore and Storage
hashes across Admin reads. No physical Android device was connected for the final
rerun, so Consumer UI lifecycle acceptance is recorded from deterministic tests
and the real persistence E2E. The audit reports 2 moderate React Router findings;
the offered remediation is a breaking major upgrade and was not force-applied.
Production Firebase remained untouched and `PRODUCTION_FIREBASE_APPROVED=false`.
