# FRISH Admin Portal

FRISH is a role-based administration portal for monitoring fish freshness assessments, report workflows, and market enforcement activity at **Pasig Public Market**.

> Consumer–authority integration is emulator-only and is not live in production. Shared contract `1.0.0` keeps
> immutable Consumer `/concernReports` separate from current Inspector
> `/reports` and explicitly promoted `/authorityCases`. A Consumer
> `prototype_saved` record is not submitted to BFAR. See
> [`docs/planning/emulator-consumer-intake.md`](docs/planning/emulator-consumer-intake.md).

The portal is part of the FRISH capstone system and connects to the same Firebase project as the FRISH Inspector mobile application. Inspector scans and submitted reports are synchronized with the administration portal through Cloud Firestore.

## Roles and workflows

### BFAR-NCR Admin

- Monitor live inspector activity and freshness assessments.
- Review submitted inspection reports and supporting evidence.
- Normalize older mobile report records when required.
- Forward validated reports to the Pasig LGU.
- Manage inspector and administrator Firestore profiles.
- Review notifications and audit activity.
- Send the reviewed LGU conclusion to the original reporter.

### LGU Market Admin

- View reports formally forwarded by BFAR-NCR.
- Review inspection details and available evidence.
- Record administrative or enforcement decisions.
- Return final case decisions to BFAR-NCR.
- Review Pasig Public Market vendor compliance records.

## Main modules

- Role-based BFAR and LGU dashboards
- Live freshness assessment records
- BFAR report review and LGU escalation workflow
- Inspector management
- Administrator management
- LGU vendor compliance history
- Dynamic notifications
- Audit trail
- User feedback
- Administrator profile management

## Technology

- React 18
- Vite 5
- React Router 6
- React Icons
- Firebase Authentication
- Cloud Firestore
- Firebase Storage integration

## Getting started

### Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/) 18 or newer
- npm, included with Node.js
- Git
- Access to the FRISH Firebase project

### 1. Clone the repository

Open a terminal in VS Code and run:

```powershell
git clone https://github.com/Iver-M/frish-admin.git
cd frish-admin
```

If the project was downloaded as a ZIP file, extract it and open the extracted folder in VS Code instead.

### 2. Install dependencies

```powershell
npm install
```

### 3. Configure Firebase

Copy the included environment template:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` and enter the Firebase Web App configuration:

```dotenv
VITE_USE_FIREBASE=true
VITE_AUTHORITY_CASES_EMULATOR=true
VITE_AUTHORITY_EVIDENCE_EMULATOR=false
VITE_AUTHORITY_EVIDENCE_ENDPOINT=http://127.0.0.1:5001/frish-app2026/asia-southeast1/getAuthorityCaseEvidence
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_web_app_id
```

The values are available in Firebase Console under:

```text
Project settings > General > Your apps > Web app > SDK setup and configuration
```

Do not commit `.env.local`, passwords, service-account files, or private keys.

### Secure authority evidence emulator

The promoted Consumer authority-case viewer is disabled by default. For an
approved local emulator session only, set
`VITE_AUTHORITY_EVIDENCE_EMULATOR=true` in the untracked `.env.local` file.
The viewer also requires Vite development mode, the existing authority emulator
flag, project `frish-app2026`, an approved `localhost:5173` or
`127.0.0.1:5173` page origin, and an active `bfar_admin` custom claim.

Evidence is fetched from the local Functions endpoint with a freshly refreshed
Firebase ID token. The browser receives JPEG/PNG bytes, creates one temporary
in-memory Blob URL for the open viewer, and revokes it on close, replacement,
case change, sign-out, cancellation, or unmount. It never reads Storage directly
or persists bytes, Base64, object URLs, evidence paths, or download tokens.
Access is audited by the trusted backend. Manual Retry starts a new intentional
audited request; no invisible retry is performed.

Only `submitted`, `assigned`, `in_progress`, and `forwarded_lgu` cases expose
the actions. LGU, Inspector, inactive, unauthenticated, resolved, and closed
access remains disabled. No Download or Save action is provided. Production
builds fail the development gate even if a local flag is accidentally supplied.

### 4. Run the development server

```powershell
npm run dev
```

Open the address displayed by Vite, normally:

```text
http://localhost:5173
```

### 5. Create a production build

```powershell
npm run build
```

Preview the generated build with:

```powershell
npm run preview
```

## Firebase user profiles

Firebase Authentication accounts require matching Firestore profiles. Create the profile inside the `users` collection and use the account's exact Firebase Authentication UID as the Firestore document ID.

Do not use an Auto-ID or email address as the document ID.

### Inspector profile

```text
users/{INSPECTOR_AUTH_UID}
  name: "Inspector Name"
  email: "inspector@example.com"
  role: "inspector"
  accountStatus: "active"
  marketId: "pasig"
  marketName: "Pasig Public Market"
```

### BFAR administrator profile

```text
users/{BFAR_AUTH_UID}
  name: "BFAR-NCR Admin"
  email: "admin@frish.gov.ph"
  role: "bfar_admin"
  accountStatus: "active"
```

### LGU administrator profile

```text
users/{LGU_AUTH_UID}
  name: "Pasig Market Admin"
  email: "lgupasig@frish.gov.ph"
  role: "market_admin"
  accountStatus: "active"
  marketId: "pasig"
  marketName: "Pasig Public Market"
```

The Inspector Management and Manage Admins pages create and update Firestore profiles. They do not create Firebase Authentication accounts or passwords. Create the Authentication account first, then register its UID through the appropriate management page.

## Firestore collections

| Collection | Purpose |
| --- | --- |
| `users` | Inspector, BFAR, and LGU profiles and access status |
| `scans` | Freshness assessments submitted by the Inspector app |
| `reports` | Existing Inspector reports and BFAR/LGU workflow; not Consumer concerns |
| `authorityCases` | Emulator-only promoted Consumer authority workflow |
| `auditLogs` | Administrative actions and workflow history |
| `reporterNotifications` | Private conclusions sent to original reporters |

## Report workflow

This workflow applies only to existing Inspector `/reports`. The portal does
not subscribe to `/concernReports` or `/authorityCases`, and it does not map
`prototype_saved` to `submitted`.

1. An inspector submits a report with the `submitted` status.
2. BFAR receives the report through a real-time Firestore listener.
3. BFAR reviews the report and forwards a valid case using `forwarded-lgu`.
4. The Pasig LGU receives the forwarded report automatically.
5. The LGU records a decision and changes the report to `resolved`.
6. BFAR reviews the decision and may send a conclusion to the original reporter.

Inspector-created reports must contain the fields required by the shared Firestore rules, including:

```text
status: "submitted"
sourceType: "inspector"
createdBy.uid: authenticated inspector UID
createdBy.role: "inspector"
```

## Assessment records

The Assessment page reads live records from the Firestore `scans` collection. Display codes use the following format:

```text
DLGBKD - 000
GG - 000
```

These are presentation identifiers. The original Firestore document ID remains the database key.

Images stored as mobile `file://` paths are available only on the inspector's device. To display an image in the web portal, upload it to Firebase Storage and save its downloadable URL in Firestore.

## Firestore rules

The canonical combined emulator rules are stored in the sibling Consumer/backend repository at `../FRISH/firestore.rules`. This repository's historical rules file remains a legacy Admin reference and must not be deployed for the authority milestone.

Coordinate rule changes with the Inspector mobile team before deployment. Deploy the rules with:

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project frish-app2026
```

Only one Firestore ruleset can be active in a Firebase project. Do not deploy separate mobile and web rule files without merging their permissions first.

For shared contract `1.0.0`, deployment remains prohibited. The combined rules
are emulator-tested only and have not been approved for production.
Consumer `PRODUCTION_FIREBASE_APPROVED` remains `false`; no production Firebase
data should be accessed for this milestone.

## Updating a local copy

Before starting new work, download the latest changes:

```powershell
git pull origin main
npm install
```

Run `npm install` again whenever `package.json` or `package-lock.json` changes.

To upload completed changes:

```powershell
git add .
git commit -m "Describe the completed changes"
git pull --rebase origin main
git push origin main
```

If Git reports a merge or rebase conflict, resolve the conflict before pushing. Firestore rule conflicts should be reviewed carefully so that mobile and admin permissions are both preserved.

## Project structure

```text
src/
  assets/             Images and visual assets
  components/         Reusable interface components
  context/            Authentication and role state
  data/               Demonstration data used when Firebase is disabled
  layout/             Shared admin layout and navigation
  pages/admin/        BFAR and LGU administration modules
  services/           Firebase, Authentication, and Firestore operations
  utils/              Record normalization, codes, and shared helpers
```

## Troubleshooting

### Firebase is not enabled

Confirm that `.env.local` exists and contains:

```text
VITE_USE_FIREBASE=true
```

Restart `npm run dev` after changing environment variables.

### Missing or insufficient permissions

- Confirm that the account has a matching `users/{UID}` document.
- Confirm that `role`, `accountStatus`, and `marketId` use the expected values.
- Confirm that the latest merged `firestore.rules` file has been deployed.
- Sign out and sign in again after changing a user profile.

### An Auth user does not appear in management pages

Authentication users are not automatically added to Firestore. Create a matching `users/{UID}` profile or register the UID through the relevant management page.

### Changes from another computer are missing

Run:

```powershell
git pull origin main
npm install
```

Then restart the development server.

## Notes

- The current implementation is scoped to Pasig Public Market.
- Firebase-enabled modules use real-time Firestore listeners.
- Demonstration records remain available when `VITE_USE_FIREBASE=false`.
- See [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md) for additional Firebase configuration guidance.
