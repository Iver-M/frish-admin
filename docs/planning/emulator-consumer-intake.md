# Emulator-only Consumer Intake

Canonical privacy baseline: sibling Consumer repository
`docs/planning/report-privacy-location-evidence-policy-v1.0.0.md`, policy
version `1.0.0`. This is an engineering baseline, not final legal approval.

The portal exposes Consumer Intake and Consumer Authority Cases only in Vite
development mode when `VITE_USE_FIREBASE=true`,
`VITE_AUTHORITY_CASES_EMULATOR=true`, and the Firebase project is
`frish-app2026`. Production builds fail this gate even if the flag is supplied.
Secure evidence additionally requires `VITE_AUTHORITY_EVIDENCE_EMULATOR=true`,
the documented local `getAuthorityCaseEvidence` endpoint, an approved Vite
origin, and active `bfar_admin` custom claims. Its safe default is false.

Use the Auth, Firestore, Storage, Functions, and UI emulators configured in the
sibling `FRISH` repository. Copy `.env.example` to `.env.local`, populate only
the public emulator web-app configuration, and set:

```text
VITE_USE_FIREBASE=true
VITE_AUTHORITY_CASES_EMULATOR=true
VITE_AUTHORITY_EVIDENCE_EMULATOR=true
VITE_AUTHORITY_EVIDENCE_ENDPOINT=http://127.0.0.1:5001/frish-app2026/asia-southeast1/getAuthorityCaseEvidence
VITE_FIREBASE_PROJECT_ID=frish-app2026
```

Run `npm run dev`, then sign in with the BFAR test account seeded by the sibling
repository. Auth claims—not form values or `/users` profile roles—authorize
callable intake operations. The profile is display metadata in this mode.

Consumer Intake lists and opens sanitized `prototype_saved` concerns through
Functions. It never queries or mutates `concernReports` in the browser.
Promotion requires confirmation, disables repeat actions while pending, and
navigates to the deterministic authority case. An ambiguous retry returns the
existing case. Authorization, validation, timeout, and emulator-unavailable
failures receive distinct messages.

Consumer Authority Cases reads the separate `authorityCases` collection under
claim-based rules. It remains visibly separate from legacy Inspector `/reports`,
which is unchanged. No production authority listener is enabled. General views
contain no reporter identity/email, Consumer UID, evidence path/URI/URL, or
experimental class/confidence. Protected contacts are not loaded.

General lists defensively allowlist authority-case fields. Reporter contacts
and source mappings are never loaded by these screens. A missing image means
evidence may be unavailable; it does not prove that no Consumer scan is linked.
For eligible `submitted`, `assigned`, `in_progress`, and `forwarded_lgu` cases,
an active BFAR administrator can intentionally open eyes/skin or gills through
the authenticated local endpoint. The UI sends only case ID, evidence type,
and a new UUID action ID. It never sends or renders a Storage path, owner/scan
ID, location, reporter contact, or backend linkage.

The response becomes one temporary in-memory Blob URL. Replacement, close,
case change, sign-out, cancellation, and unmount abort pending work and revoke
the URL. No bytes, Base64, URL, or evidence identifier enters browser storage,
route state, logs, analytics, or a download action. Backend no-store headers
and the viewer disclosure reinforce that evidence must not be copied or shared.
Every request is independently authorized and audited. Manual Retry creates a
new intentional request; failures retain no Blob. LGU, Inspector, inactive
BFAR, resolved, closed, malformed, and unauthenticated access remains denied.

Consumer notification is implemented separately, and the secure BFAR evidence
backend plus temporary viewer are emulator-only. Inspector/LGU evidence and
production evidence remain deferred. Do not deploy this portal or Firebase
resources from this milestone. Production retention,
withdrawal, deletion, legal-hold, backup, evidence-operation, and audit
decisions still require formal BFAR/LGU/project-owner approval.
