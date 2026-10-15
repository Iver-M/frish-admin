# Checkpoint 1 verification

All verification below uses local files, mocks, local Firebase emulators or build tooling. No cloud application data was read or written. No deployment, Auth user/claim creation, cleanup run against cloud, or PR creation occurred.

| Verification | Result |
| --- | --- |
| Complete Consumer Jest | 402 passed, 33 suites |
| Functions tests | 59 passed |
| Admin tests | 37 passed |
| Existing Firestore Rules | 90 passed |
| Online feedback combined Rules | 95 passed |
| Existing Storage Rules | 7 passed |
| Online anonymous Storage denial | 12 passed |
| Consumer feedback emulator E2E | 13 checks passed |
| Combined Consumer-to-Admin emulator E2E | passed: actual submit, immutable retry, separate submission, repeated refresh, safe/newest-first projection, six denial classes, zero Admin-read Firestore/Storage mutations |
| Android debug/emulator build | passed; generated emulator / online approval false / production false |
| Android online-test release build | passed; generated online_test / feedback-team-v1 / approval true / production false |
| Admin production-disabled build | passed |
| Admin online-test build | passed |
| Shared contract peer drift | passed for fixtures and validator |
| ESLint | zero errors; 11 existing warnings in untouched BottomTabNavigator and LearnScreen |
| Dependency audits | zero vulnerabilities in Consumer, Functions and Admin; no force fixes |

Totals: 498 unit/service tests, 204 Rules checks, 13 Consumer E2E checks and the combined feedback-to-Admin scenario. All four requested build configurations passed. Admin has no configured ESLint script.

Both native build configurations retain production approval false. Online release assembly uses existing debug signing solely for configuration verification. No app was installed or launched against cloud services. App Check enforcement stays false; real token validation remains a later checkpoint action.

Credential-pattern scans found no matches in repository source or either retained Admin build (14 files). The online-test release APK scan covered 1,308 entries with no matches. The debug APK scan covered 1,302 entries with no matches. These are bounded credential-pattern scans, not a guarantee against every possible secret format.

Debug APK SHA-256: E59814A79F75B2E19FA12717913BEE6CCDE88D45373F40288C75131389677101.

Online-test APK SHA-256: A2FD50969CB85233821A5F4258BFB5C73F1AA7C3A541910FF36D6BA61D6CA642.

Local diagnostic logs are ignored in FRISH under checkpoint1-*.log, outside artifacts/. The release APK is android/app/build/outputs/apk/release/app-release.apk; the debug APK is android/app/build/outputs/apk/debug/app-debug.apk. Admin verification builds are under dist/production-disabled and dist/online-test.

FRISH starts at fetched origin/main d69f8a6; Admin starts at fetched origin/main 58735ec. Both use feature/online-feedback-connection. The map branch and remote-tracking ref remain 4d83aa0e96003f557673bb057ef7fea977717ccd. No cancelled online-demo commits were reused. artifacts/ contains the same 30 untracked files, with latest modification on 2026-09-08, before this task.

See [the deployment and security contract](online-feedback-checkpoint-1.md) for exact schema, configuration gates, future deployment inventory, BFAR claims, manual actions and dry-run-first cleanup. The Admin repository contains no Hosting target declaration, so the existing deployed site's destination must be confirmed before any later deployment. Emulator Firestore and Storage Rules are unchanged; deployment-only Rules add feedback and exclude anonymous users from legacy grants.

Final git diff whitespace checks passed in both repositories. Commit IDs and synchronized pushed refs are supplied in the delivery response.
