# FRISH Admin Portal

FRISH is a role-based administration portal for monitoring fish freshness assessments, report workflows, and market enforcement activity at **Pasig Public Market**.

> The Consumer team-test build and this portal share the `frish-app2026` Firebase project. Consumer `/concernReports`
> remain immutable and separate from Inspector `/reports`; BFAR must explicitly accept a concern through the trusted
> callable before an `/authorityCases` record exists. This is a controlled `cloud_test` integration, not a production
> authorization. The Consumer repository intentionally keeps `PRODUCTION_FIREBASE_APPROVED=false`.

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
- Live Inspector feedback management and privacy-safe Consumer feedback inbox
- Report location-integrity review for Pasig Public Market
- Administrator profile management

With Firebase enabled, these operational modules use live Firestore data. Vendor Records is assembled from submitted `reports` and merged with managed `vendors` documents, while Profile Management reads and updates the signed-in administrator's `users/{UID}` profile. Demonstration records are used only when `VITE_USE_FIREBASE=false`.

## Technology

- React 18
- Vite 5
- React Router 6
- React Icons
- Firebase Authentication with Email/Password and Google administrator login
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
VITE_CONSUMER_AUTHORITY_MODE=cloud_test
VITE_CONSUMER_FEEDBACK_MODE=disabled
VITE_AUTHORITY_CASES_EMULATOR=false
VITE_AUTHORITY_EVIDENCE_EMULATOR=false
VITE_AUTHORITY_EVIDENCE_ENDPOINT=http://127.0.0.1:5001/frish-app2026/asia-southeast1/getAuthorityCaseEvidence
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_web_app_id
VITE_GOOGLE_MAPS_WEB_API_KEY=your_web_restricted_maps_embed_key
```

The values are available in Firebase Console under:

```text
Project settings > General > Your apps > Web app > SDK setup and configuration
```

Do not commit `.env.local`, passwords, service-account files, or private keys.

`VITE_CONSUMER_AUTHORITY_MODE=cloud_test` enables the Consumer Intake and Consumer Cases tabs inside Report Management
against the shared team-test callable Functions and Firestore contract. Authorized BFAR users also need the Consumer cloud-test custom
claims; a Firestore `users/{UID}` profile by itself is not sufficient for the protected callable.

Set `VITE_CONSUMER_FEEDBACK_MODE=online_test` only when the controlled Consumer feedback Function environment is enabled
and the BFAR account has `feedbackOnlineTest: "consumer-feedback-v1"`. The Consumer inbox is intentionally read-only and
excludes the raw feedback document ID, Consumer UID, and contact details.

The mobile app uses the Google Maps SDK for Android. The portal uses the matching Google Maps Platform provider through
the Maps Embed API. Create a separate website-restricted key for `localhost` and `https://frish.web.app`; do not reuse
the Android-restricted mobile key. If the web key is absent, the portal keeps a safe external Google Maps link but does
not render the embedded preview.

Enable the **Google** and **Email/Password** providers under **Firebase Authentication > Sign-in method**. Both methods require an authorized BFAR or LGU Firestore profile. Keep Email/Password enabled if it is also required by the Inspector mobile application.

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
access remains disabled; rejected and unpromoted concerns are also denied by
the backend. No Download, Save, Print, or Share action is provided. Production
builds fail the development gate even if a local flag is accidentally supplied.

Final emulator/browser verification confirmed authenticated eyes/skin and gills
display, temporary Blob replacement and revocation, deterministic backend-only
audit, immutable source evidence, safe restricted-role failures, and recovery
after emulator restart. Production Firebase was neither accessed nor deployed.

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

## Google administrator login and Firestore profiles

Firebase Authentication accounts require matching Firestore profiles. On the first Google sign-in attempt, Firebase creates the Authentication identity and the portal rejects it because no FRISH profile exists yet. Copy the new UID from Firebase Authentication, create the matching profile inside `users`, and sign in again.

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

The Inspector Management and Manage Admins pages create and update Firestore profiles. They do not create Google accounts or Firebase Authentication identities. For administrators, complete one Google sign-in attempt first, then register the resulting UID through Manage Admins or Firebase Console.

## Firestore collections

| Collection | Purpose |
| --- | --- |
| `users` | Inspector, BFAR, and LGU profiles and access status |
| `scans` | Freshness assessments submitted by the Inspector app |
| `reports` | Existing Inspector reports and BFAR/LGU workflow; not Consumer concerns |
| `vendors` | LGU-managed operating status merged with vendor activity derived from reports |
| `feedback` | Inspector mobile-app ratings and comments reviewed and managed by BFAR |
| `consumerFeedback` | Consumer ratings exposed to BFAR only through a sanitized, read-only callable inbox |
| `authorityCases` | Trusted promoted Consumer authority workflow in emulator or controlled cloud test |
| `auditLogs` | Administrative actions and workflow history |
| `reporterNotifications` | Private conclusions sent to original reporters |

## Report workflow

Report Management is the single visible reporting module in both administrator sidebars. Its tabs compose two separate
and intentionally different data workflows: Inspector Reports use `/reports`, while Consumer Intake calls the trusted
backend and never reads protected concern documents directly. After BFAR accepts a concern, the Consumer Cases tab
subscribes to the resulting `/authorityCases` record in real time. Forwarded Consumer authority cases are visible to
the Pasig LGU through a market-scoped query. The portal never merges these collections or maps `prototype_saved` to
`submitted` on the client. Legacy `/consumer-intake` and `/authority-cases` URLs remain available only so existing
bookmarks and notification links from older builds do not break.

The manuscript/module comparison and the remaining controlled-test gates are recorded in
[`docs/planning/documentation-module-alignment.md`](docs/planning/documentation-module-alignment.md).

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

The portal accepts the current Inspector app's nested report payload without requiring a manual migration:

```text
assessment: { fishType, freshness, confidence, sensor, location, detectedParts, ... }
vendor: { vendorName, stallNumber, contactNumber }
inspector: { findings, actionTaken }
```

BFAR resolves `createdBy.uid` against `users/{UID}` so the report list and detail page show the inspector's managed profile name. When BFAR forwards a case, the portal adds the canonical Pasig market fields, the forwarding actor, workflow timestamp, and audit entry. The LGU decision follows the same audited pattern.

If the mobile app submits usable coordinates, the report detail page shows a decision-support radius check for Pasig Public Market. The current 300-meter radius is provisional; replace it with the approved operational boundary before using the result for enforcement. A `0, 0` location is treated as not captured.

## Mobile feedback workflow

The BFAR User Feedback page listens to the Inspector app's `feedback` collection in real time. It also loads the
Consumer app's sanitized feedback projection through the trusted `listConsumerFeedback` callable when the controlled
online-test flag and claim are enabled. It supports the current Inspector mobile fields:

```text
userId, userEmail, userName, role, rating, message,
createdAt, status, platform, appVersion
```

BFAR can record a response and resolve an Inspector feedback item. These actions also create audit entries. Consumer
feedback remains read-only because its callable response intentionally provides no writable document identifier or
Consumer identity. The current Inspector app does not yet listen for feedback replies, so saved Inspector responses
remain administrative records until that mobile screen is implemented.

## Assessment records

The Assessment page reads live records from the Firestore `scans` collection. Display codes use the following format:

```text
DLGBKD - 000
GG - 000
```

These are presentation identifiers. The original Firestore document ID remains the database key.

Images stored as mobile `file://` paths are available only on the inspector's device. To display an image in the web portal, upload it to Firebase Storage and save its downloadable URL in Firestore.

## Firestore rules

This repository's `firestore.rules` mirrors the Consumer repository's generated controlled cloud-test ruleset and
preserves the existing Inspector/mobile and Admin Portal collections. `firestore.indexes.json` is the union of the
Consumer intake indexes and the existing Admin/Inspector indexes. Treat the Consumer repository's rule fragments as
the source of truth and regenerate there before copying a future revision here.

Coordinate rule changes with the Inspector mobile team before deployment. Deploy the rules with:

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project frish-app2026
```

Only one Firestore ruleset can be active in a Firebase project. Do not deploy separate mobile and web rule files without merging their permissions first.

The current combined rules are for the controlled team-test environment. Consumer
`PRODUCTION_FIREBASE_APPROVED` remains `false`; do not reinterpret the cloud-test flags as production approval.

## Firebase Hosting

The project is configured to deploy the Vite `dist` folder to the Firebase Hosting target `frish` (`https://frish.web.app`). After changing the portal, publish the latest build with:

```powershell
npm run build
firebase deploy --only hosting
```

Hosting deployment does not publish Firestore rules. When the operational rules changed and the mobile team has confirmed the merge, deploy them separately with `firebase deploy --only firestore:rules`.

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
