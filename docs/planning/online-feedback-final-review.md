# Online Consumer Feedback inbox final review

Date: 2026-09-11 (Asia/Manila)

The existing User Feedback route is connected to the controlled
`listConsumerFeedback` callable. It requires a current active BFAR token with
`feedbackOnlineTest=consumer-feedback-v1`, sends only a bounded page-size
request, validates the exact schema 1.1 safe projection, and provides loading,
empty, success, failure, Refresh, and Retry states. It performs no direct
Consumer Feedback Firestore or Storage read.

The navigation correction preserves the original role-appropriate Dashboard,
Freshness Assessments, Reports, Inspectors, Audit Trail, Manage Admins, Profile,
Notifications, and other existing routes. User Feedback appears once. Consumer
Intake and Authority Cases remain disabled online, and Storage is not
initialized in online-test mode.

## Verification and deployment record

Browser acceptance confirmed the full Admin navigation, one safe feedback card
before and after refresh, the empty inbox after exact cleanup, no duplicate tab,
no white screen, and no console errors. The companion Android acceptance
recorded counts `0 -> 1 -> 0`, exact schema 1.1, no forbidden fields, and no
unrelated or Storage write.

The final branch security review found no reportable issue across Auth and role
boundaries, profile-role trust, callable-only access, listing bounds, response
validation, identifier leakage, stale-session handling, route preservation,
Storage isolation, Hosting scope, and production gating.

Retained resources and rollback identifiers:

- Hosting site/version: `frish` / `8f7fcff188441eb0`
- Immediate rollback: `4c4b4736b7a1d9c1`
- Pre-feedback rollback: `16b23254b72305f2`
- Sole active Function: `listConsumerFeedback`
- Firestore Ruleset: `4df777d0-3c46-4fc6-9476-c8ec81ded4ab`
- Normalized Rules SHA-256:
  `d110ed211cf3ae609f0bcf67434841f7e8446a93eebb27dd1e3d06aea916fd5c`
- Consumer feedback index: READY
- Storage deny-all Ruleset: `d7ec114b-73de-4208-9766-270e61c80084`
- `PRODUCTION_FIREBASE_APPROVED=false`

## Limitations and handoff

App Check awaits real-token validation and staged enforcement. One anonymous
acceptance-test Auth account remains because its identifier was deliberately not
retained. Function container-artifact cleanup is not configured. The official
dataset/model is not approved. Reports, scans, images, location, authority
workflows, and evidence remain emulator/local-only. This remains controlled test
use and is not final public production activation.

Merge the FRISH Consumer PR first and this Admin PR second. The separate map
branch remains untouched; after both merges, resume `feature/scan-address-map`.
