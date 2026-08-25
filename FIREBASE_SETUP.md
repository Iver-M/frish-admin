# Firebase setup

> **Emulator authority milestone:** contract `1.0.0` does not authorize a
> Firebase deployment. Consumer `/concernReports`, legacy Admin `/reports`, and
> promoted `/authorityCases` remain separate. The combined rules, custom-claim
> promotion backend, and Consumer Intake UI are implemented only in the shared
> local emulator suite documented in
> [`docs/planning/emulator-consumer-intake.md`](docs/planning/emulator-consumer-intake.md).
> Consumer `PRODUCTION_FIREBASE_APPROVED` remains `false`; do not deploy or
> access production data.

The portal stays usable with its sample data until Firebase is enabled. When it
is enabled, Firebase Authentication controls administrator sign-in and
Firestore is ready for the operational records described in the manuscript.

## 1. Create the Firebase project

1. In the [Firebase console](https://console.firebase.google.com/), create a FRISH project.
2. Add a **Web app** and copy its configuration values.
3. Under **Authentication**, enable **Email/Password** sign-in.
4. Create a **Cloud Firestore** database and a **Cloud Storage** bucket.

## 2. Configure the portal

Copy `.env.example` to a new `.env.local` file, enter the Firebase web-app
values, and set `VITE_USE_FIREBASE=true`. Do not commit `.env.local`.

## 3. Create admin user profiles

Create each admin in Firebase Authentication. In Firestore, create a matching
document in `users`, using the Authentication user's UID as the document ID.

BFAR profile:

```json
{
  "name": "BFAR-NCR Admin",
  "role": "bfar_admin",
  "status": "active",
  "marketId": null,
  "marketName": null
}
```

LGU profile:

```json
{
  "name": "Pasig Public Market Admin",
  "role": "market_admin",
  "status": "active",
  "marketId": "pasig",
  "marketName": "Pasig Public Market"
}
```

Only `bfar_admin` and `market_admin` are allowed in the portal. A user with
`status: "suspended"` is blocked after password verification.

## 4. Future security rules deployment (not authorized in this milestone)

Install the Firebase CLI, log in, initialize this folder with the Firebase
project, then run:

```powershell
firebase deploy --only firestore:rules,storage
```

The included rules scope LGU access to Pasig records and give BFAR system-wide
access. For production, use trusted Cloud Functions for automated inspection
ingestion, enforcement decisions, and immutable audit entries.

## 5. Firestore collections

- `users` — admin role, status, and market scope.
- `assessments` — freshness result, sensor readings, shelf life, evidence, and market ID.
- `reports` — existing Inspector submissions and BFAR/LGU workflow; not Consumer concerns.
- `authorityCases` — future trusted Consumer-derived cases; runtime disabled.
- `vendors`, `inspectors`, `feedback`, `notifications`, and `auditLogs` — supporting records.

Each market-scoped record should include `marketId: "pasig"`, since this build
is scoped to Pasig Public Market.
