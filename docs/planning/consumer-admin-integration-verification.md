# Consumer reports in Admin Report Management

Verification date: 2026-10-15 (Asia/Manila).

Admin starting revision: `d906d35`, remote `admin-portal-progress`.
The existing branch was explicitly requested, so it was continued rather than
recreated from main. Its original Inspector/UI changes remain in scope for review.
The separate `feature/cloud-authority-integration` checkout and its unfinished
tracked/untracked work were preserved in place. No Consumer or Inspector source
was edited. Admin PR #9 remains closed.

References: [Admin issue #8](https://github.com/Iver-M/frish-admin/issues/8) and
[Consumer PR #46](https://github.com/towwfiee/FRISH/pull/46), inspected at
`b57a6e562d10eaf04961d5a37fd66ce8716e5f51`. Relevant Consumer implementations:
`functions/src/index.js`, `authorityPromotion.js`, `authorityCaseCallable.js`,
`authorityCaseTransitions.js`, `cloudTestRuntime.js`, `cloudIntakeTransport.js`,
`cloudAuthoritySetup.js`, identity adapters, shared contracts and authority rules.

## Confirmed causes and request path

These are source-level findings, not an audit of deployed Firebase resources or
the project owner's current staff account.

1. `.env.example` defaults Consumer integration to disabled. Previously this hid
   Consumer tabs and silently selected Inspector reports, including for a direct
   Consumer link. Consumer tabs now remain discoverable inside Report Management
   and explain disabled, incomplete, wrong-project and conflicting configuration.
   The default stays disabled. No existing private `.env.local` was copied into
   the task checkout or changed.
2. Cloud portal login checks `users/{uid}` for portal role and account status.
   Consumer intake separately verifies signed, current active BFAR claims. A
   successful dashboard login does not establish Consumer permission. The UI now
   explains that distinction and carries an advisory claim summary. It neither
   provisions nor grants access, and the backend remains authoritative.
3. Pending/saved records are loaded only through `listPendingConsumerConcerns`
   and `getPendingConsumerConcern`; acceptance/rejection use the existing
   protected callables. Accepted records are subscribed from `authorityCases`.
   LGU queries retain their Pasig/forwarded-or-resolved scope. Inspector report
   collections, writes and workflow are unchanged.
4. `transitionAuthorityCase` is `onRequest`, implementing a strict `{data: command}`
   protocol and returning `{result}` or `{error}`. It requires both a Firebase ID
   token and verified App Check. The earlier Admin had no transition controls or
   App Check setup. The new HTTP client uses the exact endpoint, credentials,
   schema, expected version, UUID v4 and `reasonCode: workflow`; it validates the
   confirmed result. A real web reCAPTCHA v3 App Check site key is an explicit
   optional configuration. No debug token or synthetic attestation is built into
   the portal.
5. A failed intake/subscription used to render its error alongside an empty list
   or missing detail. Failure now excludes successful data/empty rendering.
   Errors distinguish disabled integration, authentication, denied permission,
   endpoint absence, a missing Firestore index, invalid/precondition/conflict,
   missing App Check and transport failure. A generic 401/403/CORS failure cannot
   prove which deployed credential/origin/account component is wrong; messages
   identify the owner checks without claiming certainty.
6. Second Space acceptance reports in PR #46 were local emulator records. They
   are not shared cloud-test reports. Both displays now identify their configured
   environment; configuration alone is not described as successful connectivity.

## Behavior and scope decisions

- Consumer Intake and Consumer Cases are source-specific views of existing Report
  Management. Consumer records are not copied into Inspector `reports`.
- BFAR can assign an active inspector from the existing staff directory, start an
  investigation, forward to LGU or close without a violation when the record's
  status/version and signed role permit it. Only signed `lgu` can resolve a
  forwarded Pasig Consumer case. Portal `market_admin` is not silently translated
  to backend `lgu`. Every request is still subject to server account/policy/scope
  and assignment checks.
- Confirmed success comes only from the exact server result; subscription data
  supplies recorded status and timestamps. No optimistic status/feed writes,
  invented conclusions, historical timeline dates or push-delivery claims.
- An unconfirmed transition is retained in session storage per runtime, staff UID
  and case. Retry sends the identical command/version/UUID after a page reload or
  recorded-case refresh. It stores no tokens, Consumer contacts, findings or
  evidence. Retention is per browser tab/session; closing the session can remove
  it. Explicit abandonment is available after reviewing recorded progress.
- A lost response after assignment is handled even if the Firestore subscription
  already shows the new version: no next action is offered until confirmation or
  explicit abandonment. The shared dialog must receive `false` on completion so
  its automatic close does not discard this command.
- Acceptance retries use the backend's deterministic `case_{reportId}_v1` and open
  that linked case. Rejection validates the recorded result. Pagination uses the
  backend cursor; refresh/polling retains the selected page.
- Only vendor/stall, market, reason, findings, assigned inspector, current status,
  version and recorded dates are shown. The current intake contract provides no
  authorized species or analysis. Promotion records null analysis with trust
  `unavailable`; show **Uncertain estimate**. Future authorized estimates must use
  **Fresh / Moderately Fresh / Not Fresh**, described as photo estimates.
- Existing separately gated temporary emulator evidence viewing is preserved.
  No new cloud evidence enablement, private source joins, reporter contacts,
  sensor values, Inspector assessment decisions, shelf-life/storage estimates,
  precise GPS or enforcement fields are introduced.

## Verification

- Admin `npm test`: 63 tests passed, including existing Inspector compatibility,
  workflow, rules alignment and contract tests. New cases cover environment
  diagnostics, portal-only claims, denied/allowed roles, exact HTTP payload,
  invalid/mismatched results, missing credentials, stale versions, retained
  idempotency after a lost response/reload, recorded dates and failure rendering.
- `node scripts/verifyConsumerAuthorityPeer.mjs <Consumer-PR-46-checkout>` passed
  against the revision above. It runs actual Consumer intake/HTTP/identity/
  authorization/transition handlers against an in-memory synthetic store:
  private-field exclusion, claim denial, one linked case after repeated
  acceptance, rejection/retry/conflict, assignment, lost response followed by one
  transition receipt, stale-version rejection, investigation, forwarding, BFAR
  resolution denial and authorized LGU resolution. It initializes no Firebase
  app and makes no network calls.
- Shared fixture/validator drift verification against that Consumer checkout
  passed. The frozen contract files were not edited.
- Consumer's existing `npm run firebase:report-status:e2e` passed locally with
  Auth/Firestore/Functions emulators at 9099/8080/5001: baseline callable, private
  synthetic registration/disable, automatic promotion/subsequent status
  projection, owner query, foreign/staff denial and zero emulator push receipts.
  The script uses a backend synthetic subsequent change; it does not establish
  that the Admin browser's HTTP transition endpoint works in that emulator setup.
  Emulators were shut down by the existing runner. No real device/token was
  registered, no real push sent and no shared cloud write performed.
- Browser review uses `node scripts/previewConsumerReports.mjs` at loopback 5176.
  Its fixture replaces Firebase boundaries and disables env-file loading only in
  that review server. The production app has no fixture import. Acceptance,
  assignment, lost-response retry, explicit disabled/error/denied/empty states
  and signed-LGU resolution were reviewed with synthetic content. Layout checks
  at 375×812 and 812×375 found no horizontal overflow. Keyboard/screen-reader,
  large text, dark mode and real device acceptance were not completed; no live
  Firebase browser login was performed.
- Admin `npm run build` passed; Vite reports a >500 kB bundle warning. The initial
  sandbox blocked Vite `realpath`; the unchanged build command passed with host
  permissions. Node 24 was used locally; Consumer Functions declares Node 22 and
  its emulator printed that existing host-engine mismatch warning.
- `git diff --check` passed. Admin has no lint or dedicated typecheck script.

Not verified: deployed staff claims/current accounts, enabled operation policies,
App Check registration/allowed app IDs, CORS origins, live function availability,
live Firestore indexes/rules or genuinely empty cloud queues. No current Android
Admin-to-phone acceptance, FCM delivery, notification taps, iOS, native accessibility
or production enablement is claimed. The earlier PR #46 deployment audit is
revision-bound evidence, not a fresh deployment inspection in this task.

## Consumer/backend dependencies for its owner

1. **Intake decision filtering:** `listPending` filters private source
   `prototype_saved`/delivery mode/test run, but does not exclude
   `authorityIntakeDecisions`; `getPending` also omits that decision. Promotion
   and rejection leave the source report unchanged. Decided concerns therefore
   return again after reload. Fix this in the protected backend with correct
   pagination, or return a privacy-safe recorded intake decision. Admin labels
   these as saved concerns rather than claiming every returned row is pending;
   acceptance remains idempotent and rejection cannot replace a promotion.
2. **One approved local setup:** the ordinary PR #46 Functions entry point uses
   `createCloudAuthorityHandler`, which explicitly rejects emulator mode. Its
   separate synthetic callable entry point uses Auth/Firestore/Functions at
   9198/8180/5002 and fixed guarded attestation, while mobile status acceptance
   uses 9099/8080/5001. The portal does not manufacture the synthetic App Check
   credential or change those guards. A Consumer-owned reviewed adapter/setup is
   needed for a real Admin-browser-to-Android workflow in one existing approved
   local suite. The in-memory handler and independent delivery-emulator passes
   are complementary; they are not that end-to-end result.
3. **Staff role/policy setup:** cloud login can use a `market_admin` portal profile
   with separately authorized signed `lgu` claims. The endpoint permits only
   `lgu` to resolve, even though rules can read some other LGU-role aliases.
   Coordinate the intended account mapping and policies with the owner. Existing
   emulator login uses token role for portal access and does not accept `lgu`;
   that local mapping remains an owner dependency. Inspector app controls are
   outside this Admin change.
4. **Assignee validation:** the existing transition service checks the acting
   staff identity, policy and resource; assignment validates inspector ID/name
   shape but does not load/revalidate the target inspector account's active
   status/market inside the transaction. The UI lists active profiles but this
   is not a backend guarantee. The owner should add trusted target validation.
5. **Status delivery and evidence:** deploy/verify PR #46 status projection
   triggers, owner-only rules/indexes and approved environment configuration only
   after separate authorization. No Admin browser writes to status/audit/private
   collections. General intake/promoted data currently withholds species and
   analysis; adding those or cloud photo access needs a reviewed privacy-safe
   backend contract, not browser reads of private Consumer scans.

## Project-owner setup steps (separate authorization required)

1. Select the approved local or shared cloud-test environment. Keep defaults off
   until approved. For authorized cloud-test use, fill the Web App configuration,
   select `VITE_USE_FIREBASE=true`, `VITE_CONSUMER_AUTHORITY_MODE=cloud_test`,
   project `frish-app2026`; keep `VITE_AUTHORITY_CASES_EMULATOR=false`. Restart or
   rebuild the portal. This is configuration, not proof of service access.
2. Verify the existing portal profile and separately authorized signed staff
   claims/current Firebase Auth account. Cloud intake expects active
   `bfar_admin`, environment `staging`, `cloudTestApproved=true`, both versions
   `frish-cloud-test-v1` and `marketIds` containing `pasig`. Do not provision or
   elevate accounts without the owner's explicit authorization. Sign in again
   after an authorized change and refresh permissions/records.
3. For case actions, configure the registered web reCAPTCHA v3 site key as
   `VITE_AUTHORITY_APP_CHECK_SITE_KEY`; verify web App ID in backend
   `FRISH_AUTHORITY_APP_IDS`, exact portal origin in
   `FRISH_AUTHORITY_ALLOWED_ORIGINS`, current operation policy/version and case
   resource binding. A refreshed ID token does not refresh sign-in age; sign in
   again if the server's authentication-age policy requires it. Leave
   `VITE_AUTHORITY_TRANSITION_ENDPOINT` blank for the fixed cloud endpoint.
4. Verify approved deployment, region `asia-southeast1`, rules and indexes and
   Consumer-owned status projection services. Deployment, shared fixtures,
   provisioning and production enablement remain separately gated. Check the
   backend dependencies above before claiming a pending queue or complete LGU
   workflow. Real notifications require separate FCM registration/send approval.
5. Complete authorized synthetic acceptance: save concern, see it in Report
   Management, accept twice to one case, assign, investigate, forward and use an
   authorized LGU account to resolve; observe that Consumer's own History updates
   status/date/unread automatically on the same environment. Test denied accounts,
   stale versions and reconnect/retry. Record exact builds/revisions/results.

Deferred: dependencies above; deployed cross-app/phone acceptance and real pushes;
Consumer improvements #7/#8 and the standalone offline demo. No deployment,
production approval, merge, source-branch cleanup or reopening Admin PR #9.
