# Admin Note: Shared Consumer–Authority Report Contract

Contract version: `1.0.0`

Authority case schema: `1.0` implemented in the emulator-only workflow

Canonical Consumer repository: `towwfiee/FRISH`

Canonical repository path: `docs/planning/shared-consumer-authority-report-contract-v1.0.0.md`

Canonical privacy policy: `docs/planning/report-privacy-location-evidence-policy-v1.0.0.md` in the Consumer repository, policy version `1.0.0`

Status: documented, fixture-verified, and emulator-enabled; production runtime disabled

## Confirmed Admin assumptions

The current Admin portal listens to and mutates `/reports`. Those are existing
Inspector/BFAR/LGU workflow records with legacy status spellings and fields
such as `createdBy`, `sourceType`, assignment, assessment, and market data.
They are not Consumer concerns.

Consumer writes immutable `/concernReports/{reportId}` schema `1.0` as an
anonymous owner. Those documents contain PII (`reporterName` and
`reporterEmail`), have only `prototype_saved`, use
`firebase_emulator_only`, and keep `resultSummary: null`. Admin must not listen
to, list, read, normalize, update, delete, or display them as submitted cases.

The emulator authority workflow uses a separate
`/authorityCases/{caseId}` schema `1.0`. Only the trusted, idempotent, audited
Functions emulator promotion may validate an immutable
concern and create a case initially set to `submitted`. No client-side
promotion or direct Consumer creation is allowed.

## Compatibility matrix

| Concern | Consumer `concernReports` | Current Admin `reports` | Future `authorityCases` |
| --- | --- | --- | --- |
| Owner | anonymous Consumer | Inspector/BFAR/LGU workflow | authority workflow |
| Mutability | immutable | mutable under current rules | controlled transitions only |
| Status | `prototype_saved` | legacy live values such as `submitted`, `assigned`, `in progress`, `forwarded-lgu`, `resolved` | `submitted`, `assigned`, `in_progress`, `forwarded_lgu`, `resolved`, `closed_no_violation` |
| Analysis trust | always null | legacy assessment shape | null unless approved backend record |
| Reporter contact | direct PII, owner-only | legacy reporter shapes | opaque `reporterRef`; protected contact proposal |
| Runtime | emulator-only | existing optional Firebase listener | disabled |

The current `/reports` collection cannot be renamed or silently converted.
Migration requires an inventory of Inspector document variants, a versioned
adapter/backfill plan, combined rules and emulator coverage, rollout/rollback,
and coordinated Inspector/Admin release. Existing behavior stays in place
until that plan is separately approved.

## Trust, privacy, and security

The temporary Consumer model output is not official or authority-actionable.
`analysisSummary` remains null for `unavailable` and
`experimental_unapproved`; only an approved backend record with complete
model/dataset provenance and trusted timestamp may populate it.

Privacy policy `1.0.0` establishes the emulator baseline: BFAR may read the
protected reporter-contact compartment only for legitimate follow-up; general
views do not load it. LGU and Inspectors receive no reporter identity, email,
Consumer UID, or contact documents. The UID remains backend-only. BFAR and
assigned-Inspector evidence require a future short-lived, case-authorized,
audited callable; LGU evidence remains disabled. Production retention,
withdrawal, deletion, legal hold, backup, and evidence procedures still await
formal BFAR/LGU/project-owner approval.

There is one deployed Firestore ruleset per Firebase project. A future merged
ruleset must preserve Consumer owner behavior and current Inspector/Admin
behavior while adding strict authority case, evidence, reporter contact, audit,
and default-deny rules. Current role checks use mutable `/users` profiles;
backend-issued Firebase Auth custom claims are recommended as the future
authority source. They are not implemented.

## Milestone guardrails

- `AUTHORITY_CASES_RUNTIME_ENABLED` is true only under the explicit Vite development emulator flag; production builds have no authority listener.
- Consumer `prototype_saved` is never mapped to `submitted`.
- Admin never mutates `concernReports`.
- Existing Inspector `/reports` behavior remains pending a migration plan.
- Consumer `PRODUCTION_FIREBASE_APPROVED` remains `false`.
- No Firebase rules deployment or production Firebase access occurred.

The identical contract fixtures and validator live in
`contracts/shared-report-contract/`. Run `npm run test:contract` and
`npm run contract:peer:verify` with the sibling Consumer checkout to verify
schema behavior and cross-repository drift.
