# Online Consumer Feedback — Checkpoint 1

This checkpoint prepares code only. No Firebase, Functions, Rules, Hosting or application-data deployment is authorized here. Production remains hard-disabled: `PRODUCTION_FIREBASE_APPROVED=false`.

Only Consumer About feedback creation, owner single-document retry/get, and the active-BFAR read-only Admin `/feedback` inbox support online testing. All scans, Storage/images, concerns, authority promotion/cases, report status, evidence, contacts, audits, location/address persistence, Inspector and LGU integrations remain emulator-only. The online Consumer navigation mounts About only; other Consumer data services refuse release access. Online Admin navigation permits `/feedback` only and initializes neither Firestore nor Storage.

## Environment contract

Android debug defaults explicitly to emulator in native BuildConfig. Runtime configuration must have the correct project and compatible environment, approval and run settings; missing/unknown/contradictory settings block Firebase startup. Online testing is release-only and requires all three Gradle properties:

```powershell
.\gradlew.bat assembleRelease -PfeedbackEnvironment=online_test -PonlineTestApproved=true -PfeedbackTestRunId=feedback-team-v1
```

This is a local configuration-verification APK using the repository's existing debug signing configuration. It is not a production-signed release. Ordinary release and any production request remain blocked. Native project identity comes from the Google Services generated project resource, not user input.

Admin builds require existing public Firebase web configuration, `VITE_USE_FIREBASE=true`, and the exact project `frish-app2026`. Online build settings:

```dotenv
VITE_FEEDBACK_ENVIRONMENT=online_test
VITE_ONLINE_TEST_APPROVED=true
VITE_PRODUCTION_FIREBASE_APPROVED=false
VITE_AUTHORITY_CASES_EMULATOR=false
VITE_CONSUMER_FEEDBACK_EMULATOR=false
```

Emulator development uses `VITE_FEEDBACK_ENVIRONMENT=emulator`, online approval false, production approval false, and both existing emulator feature flags true. Missing environment configuration disables Firebase. The online banner identifies test data and says submission does not mean BFAR review or reply.

## Immutable document contract

Normal path: `/consumerFeedback/feedback_{anonymousUid}_{submissionUuidV4}`. Online schema `1.1` retains rating 1–5, trimmed nonempty feedback up to 2,000 characters, bounded app/platform versions, Android platform, `prototype_saved` status, immutable creation and equal server creation/submission timestamps. Delivery mode is `firebase_online_test`. Exactly three additional markers are mandatory:

| Field | Exact value |
| --- | --- |
| environment | online_test |
| dataVersion | consumer-feedback-test-v1 |
| testRunId | feedback-team-v1 |

The run ID is a bounded server-side allowlist, not a freely chosen client string. Changing it requires coordinated Rules, backend, client and cleanup review. Schema 1.0 and `firebase_emulator_only` remain unchanged for emulator records. Online Rules accept only schema 1.1; emulator Rules accept only the existing schema. A missing owner document may be read to implement create-if-absent; existing reads require the same owner and exact test markers. Listing, overwrite, update, delete, foreign and direct Admin feedback access are denied.

Exact keys reject name, email, phone, address/location, scan/report/case identifiers, images/Storage paths, device identifiers, analysis, tokens and credentials. The free-text form tells testers not to include personal information; semantic redaction of arbitrary prose is not guaranteed.

## Callable and authorization

`listConsumerFeedback` uses verified callable authentication and token claims, then rechecks the current Auth user in online mode (disabled/revoked/current claims). No `/users` profile is trusted for online feedback authorization. Required claims:

```json
{"role":"bfar_admin","accountStatus":"active","feedbackOnlineTest":"consumer-feedback-v1"}
```

Required backend environment: `GCLOUD_PROJECT=frish-app2026`, `FEEDBACK_ENVIRONMENT=online_test`, `FEEDBACK_ONLINE_TEST_APPROVED=true`, `PRODUCTION_FIREBASE_APPROVED=false`. Emulator-host variables must be absent. No environment fallback to production exists.

The query filters all three markers, orders submittedAt descending and limits to 50. Returned fields are exactly schemaVersion, feedbackReference (one-way safe reference), rating, feedbackText, appVersion, platform, platformVersion and submittedAt. No UID, stored document ID or submission UUID is returned. Listing does not mutate Firestore or Storage and logs no payloads. Region: asia-southeast1; maxInstances: 1; timeout: 15 seconds; memory: 256 MiB.

App Check enforcement remains false. The callable supports the standard Firebase callable App Check transport; before enabling enforcement in a later checkpoint, register Android and web providers, wire client token initialization, validate real tokens for both clients and confirm the callable receives valid App Check context. This checkpoint does not claim tokens have been validated or enforce App Check.

## Exact future deployment inventory

- FRISH `firebase.online-test.json`: combined `firestore.online-test.rules`, feedback composite index from `firestore.online-test.indexes.json`, and only `functions:listConsumerFeedback` from the Functions source. Never perform an unrestricted Functions deployment.
- Combined Rules preserve the checked-in Admin legacy users, assessments, scans, reports, reporterNotifications and auditLogs contracts for nonanonymous users, while excluding newly enabled anonymous feedback users from those legacy grants. They add only online feedback permissions; other Consumer and authority paths default-deny. The checked-in baseline is not a claim about currently deployed Rules: compare the live Rules manually in the next checkpoint before deployment.
- FRISH-ADMIN: the online-test static build for the existing deployed Admin site `frish` and `/feedback` route. Checkpoint 2B adds an explicit project alias and Hosting target. No new tab is required.
- Consumer: locally built online-test Android APK for controlled distribution only.
- Storage is excluded from the feedback deployment package. The live bucket keeps exact deny-all Ruleset `d7ec114b-73de-4208-9766-270e61c80084`; the existing emulator Storage Rules and regression suite remain unchanged.
- No Storage objects, other callable, Auth account, claims, or application documents belong to this checkpoint's deployment inventory.

## Manual actions for a separately authorized checkpoint

Verify the exact Firebase project and existing deployed Rules without overwriting separately approved Admin behavior. Verify billing/runtime readiness, the existing Admin deployment destination, and anonymous Auth provider configuration. Keep the live deny-all Storage Rules unchanged. Select an existing team BFAR test account and arrange the exact custom claims above through a trusted Admin SDK process; do not trust profile roles. Refresh its ID token. Configure the explicit function environment, deploy only the inventory above, and validate the index. Register App Check providers and validate tokens before proposing enforcement. None of these actions were performed in Checkpoint 1.

## Cleanup

`scripts/cleanupOnlineFeedback.cjs` requires the exact project/environment, explicit online-test approval, no emulator variables, production false and `--run=feedback-team-v1`. Dry run is the default. Output contains counts and hashed safe references only. `--confirm-delete` enables per-document transactional deletion after rechecking every marker. No collection deletion exists; unknown or unmarked documents never qualify. Do not execute the script online in this checkpoint.

## Preserved work

The map branch `feature/scan-address-map` remains paused at `4d83aa0e96003f557673bb057ef7fea977717ccd`. Both feedback branches start from fetched origin/main; no cancelled online-demo commits are reused. FRISH `artifacts/` remains untouched and untracked.
