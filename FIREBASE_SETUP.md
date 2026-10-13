# Firebase setup

> **Controlled team-test boundary:** Consumer `/concernReports`, legacy Admin
> `/reports`, and promoted `/authorityCases` remain separate. Consumer Intake
> and general authority-case status can run against the approved `cloud_test`
> configuration. This is not production approval. Secure evidence remains
> emulator-gated, and Consumer `PRODUCTION_FIREBASE_APPROVED` remains `false`.

The FRISH Admin Portal and FRISH Inspector mobile application use the same Firebase project. BFAR-NCR and Pasig LGU administrators can sign in using an authorized email/password account or Google account. Inspector authentication remains controlled by the mobile application.

The existing Inspector `/reports` workflow continues to use the shared project.
The newer Consumer authority workflow additionally requires signed custom claims;
a Firestore profile alone is not sufficient for its protected Functions and rules.

## 1. Register the web application

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select the FRISH project.
3. Open **Project settings > General**.
4. Under **Your apps**, select or create the FRISH Web App.
5. Copy its Firebase configuration into `.env.local`.
6. Set `VITE_USE_FIREBASE=true`.

Do not commit `.env.local`, service-account JSON files, passwords, or private keys.

## 2. Enable Google Sign-In

1. Open **Authentication** in Firebase Console.
2. Select **Sign-in method**.
3. Open **Google**.
4. Enable the provider.
5. Select a project support email.
6. Save the provider configuration.

Under **Authentication > Settings > Authorized domains**, confirm that the following are present when applicable:

- `localhost` for local development
- The Firebase Hosting domain
- Any custom production domain used by the portal

Keep Email/Password enabled for existing administrator accounts and for the Inspector mobile application when required. Both administrator methods still require an active authorized `users/{UID}` profile.

## 3. Register the BFAR Google account

1. Run the portal with `npm run dev`.
2. Select **Continue with Google**.
3. Sign in using the new BFAR Google account.
4. The first attempt will show that the account has no FRISH profile. This is expected.
5. Open **Firebase Console > Authentication > Users**.
6. Find the Google account and copy its complete User UID.
7. Open **Firestore Database > Data > users**.
8. Create a document whose Document ID is the exact copied UID.

Add these fields:

```text
name: "BFAR-NCR Admin"
email: "the-bfar-google-email"
role: "bfar_admin"
accountStatus: "active"
marketId: null
marketName: null
```

Sign in again. The account should open the BFAR dashboard.

## 4. Register the LGU Google account

Repeat the first-login process with the new Pasig LGU Google account. Create its matching `users/{UID}` document with:

```text
name: "Pasig Market Admin"
email: "the-lgu-google-email"
role: "market_admin"
accountStatus: "active"
marketId: "pasig"
marketName: "Pasig Public Market"
```

Sign in again. The account should open the LGU dashboard and only receive the Pasig LGU interface.

## 5. Provision protected authority claims

Do not add these fields to Firestore and do not put Firebase Admin credentials in
the Vite application. Custom claims must be issued from a privileged environment
through the Firebase Admin SDK.

For a capstone team-test environment, the project owner can use Google Cloud Shell:

```bash
gcloud config set project frish-app2026
mkdir -p ~/frish-auth-claims && cd ~/frish-auth-claims
npm init -y
npm install firebase-admin
```

Create `set-claims.mjs` in the Cloud Shell editor:

```js
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const [uid, role] = process.argv.slice(2)
const allowedRoles = new Set(['bfar_admin', 'market_admin', 'inspector'])
if (!uid || !allowedRoles.has(role)) {
  throw new Error('Usage: node set-claims.mjs <AUTH_UID> <bfar_admin|market_admin|inspector>')
}

initializeApp({
  credential: applicationDefault(),
  projectId: 'frish-app2026',
})

const auth = getAuth()
const account = await auth.getUser(uid)
const claims = {
  ...(account.customClaims || {}),
  role,
  accountStatus: 'active',
  environment: 'staging',
  cloudTestApproved: true,
  claimVersion: 'frish-cloud-test-v1',
  policyVersion: 'frish-cloud-test-v1',
  marketIds: ['pasig'],
}

if (role === 'bfar_admin') {
  claims.feedbackOnlineTest = 'consumer-feedback-v1'
} else {
  delete claims.feedbackOnlineTest
}

await auth.setCustomUserClaims(uid, claims)
console.log(`Claims updated for ${uid} (${role}).`)
```

Run it with the exact UIDs copied from **Firebase Authentication > Users**:

```bash
node set-claims.mjs BFAR_AUTH_UID bfar_admin
node set-claims.mjs LGU_AUTH_UID market_admin
node set-claims.mjs INSPECTOR_AUTH_UID inspector
```

After changing claims, sign out and sign back in. The portal also force-refreshes
the ID token when it calls the protected Consumer services, but a new sign-in is
the clearest verification step.

Keep each Firestore `users/{UID}` profile consistent with the claim role and
status. During this team-test phase, deactivating an authority account requires
updating both the Firestore profile and its signed `accountStatus` claim.

## 6. Deploy the merged rules and indexes

The repository's `firestore.rules` preserves the Inspector team's report and scan
permissions while adding the controlled Consumer authority boundaries. Coordinate
with the Consumer and Inspector teams before publishing the one shared ruleset.

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project frish-app2026
```

Only one Firestore ruleset can be active for the project. Coordinate changes with the Inspector team before every rules deployment.

## 7. Test the access matrix

Verify all of the following before removing old administrator accounts:

1. An active BFAR Google profile opens the BFAR dashboard.
2. An active Pasig market-admin Google profile opens the LGU dashboard.
3. A Google account without a Firestore profile is rejected and signed out.
4. An Inspector profile is rejected by the admin portal.
5. A suspended administrator profile is rejected.
6. BFAR can read scans, review reports, manage profiles, and forward a report.
7. LGU can receive the forwarded report and submit a decision.
8. The Inspector mobile application can still sign in and submit its supported records.
9. A pending Inspector feedback document appears in BFAR User Feedback and Notifications.
10. Opening a notification reduces the unread count for that administrator and browser.

## 8. Existing Email/Password administrators

The web portal supports existing Email/Password administrator accounts alongside Google Sign-In. These accounts must have matching active BFAR or Pasig LGU profiles in `users/{UID}`.

Obsolete administrator Authentication entries and old Firestore profiles can be disabled or removed carefully after replacement accounts are tested. Do not remove Inspector accounts.

## Firestore collections

- `users` — account roles, status, and market assignment
- `assessments` — legacy freshness assessments and supporting evidence
- `scans` — freshness records submitted by the Inspector app
- `reports` — report review and BFAR/LGU escalation workflow
- `feedback` — Inspector mobile ratings/comments and BFAR review state
- `authorityCases` — emulator-only trusted Consumer-derived cases; evidence is fetched through the local backend and not directly from Storage
- `vendors` — LGU-managed operating status merged with report-derived vendor activity
- `auditLogs` — administrator actions and workflow history
- `reporterNotifications` — private BFAR conclusions for report originators

The Profile page reads the signed-in account from `users/{UID}`. Administrators may update only their own name, display name, phone, and department there. Role, account status, market assignment, and sign-in email remain controlled by administrator management and Firebase Authentication.

## Inspector app compatibility

The Admin Portal reads the Inspector app's current nested `reports` payload (`assessment`, `vendor`, `inspector`, `createdBy`) and its current `scans` and `feedback` documents. No duplicate admin database is required; both applications must point to the same Firebase project.

For Inspector submissions, keep these rule-critical values unchanged:

```text
reports.status: "submitted"
reports.sourceType: "inspector"
reports.createdBy.uid: current Firebase Authentication UID
reports.createdBy.role: "inspector"

feedback.userId: current Firebase Authentication UID
feedback.role: "inspector"
feedback.status: "pending"
```

After updating `firestore.rules`, publish the single merged ruleset before testing live feedback or BFAR/LGU report actions. A local code change does not modify the active Firebase rules automatically.

## 9. Build and update Firebase Hosting

The checked-in Hosting target publishes the Vite `dist` directory to `https://frish.web.app`:

```powershell
npm run build
firebase deploy --only hosting
```

Run both commands after every portal release. The first command creates the current production files; the second replaces the hosted version. Firestore data is not erased by a Hosting deployment.
