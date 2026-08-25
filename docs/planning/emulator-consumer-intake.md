# Emulator-only Consumer Intake

The portal exposes Consumer Intake and Consumer Authority Cases only in Vite
development mode when `VITE_USE_FIREBASE=true`,
`VITE_AUTHORITY_CASES_EMULATOR=true`, and the Firebase project is
`frish-app2026`. Production builds fail this gate even if the flag is supplied.

Use the Auth, Firestore, Storage, Functions, and UI emulators configured in the
sibling `FRISH` repository. Copy `.env.example` to `.env.local`, populate only
the public emulator web-app configuration, and set:

```text
VITE_USE_FIREBASE=true
VITE_AUTHORITY_CASES_EMULATOR=true
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

Consumer notification and secure evidence delivery are deferred. Do not deploy
this portal or Firebase resources from this milestone. Retention, withdrawal,
deletion, legal-hold, evidence, contact-sharing, and audit policies still need
project-owner approval.
