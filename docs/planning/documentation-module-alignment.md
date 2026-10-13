# Documentation-to-system module alignment

Reviewed against the FRISH final manuscript and the team report-process draft on 2026-10-13.
This note records the implemented test-stage behavior and prevents the Consumer authority workflow from being mixed into the legacy Inspector report schema.

## End-to-end report flow

1. A Consumer submits an immutable `concernReports` record from an explicitly submitted scan.
2. BFAR reads only the sanitized Consumer Intake callable response. The portal never lists protected Consumer source documents directly.
3. BFAR either records a private rejection decision or explicitly promotes the concern into a separate `authorityCases` record.
4. A promoted case follows `submitted -> assigned -> in_progress -> forwarded_lgu -> resolved`, or `in_progress -> closed_no_violation`.
5. The Consumer reads only a privacy-safe status projection. Reporter identity, contact, precise GPS, Storage paths, and temporary model output do not enter the general authority case.
6. Inspector-created inspection reports remain in `reports` and retain their existing BFAR/LGU workflow. They are not converted into Consumer authority cases.

The Admin client currently implements intake list/detail, accept/reject, live authority-case views, BFAR dashboard/notification/audit visibility, and Pasig LGU scoped read visibility. Authority-case assignment and status transitions must use the trusted `transitionAuthorityCase` backend; direct client Firestore writes remain denied. The Admin UI does not expose those transition buttons until the real web App Check and backend policy/resource registrations are approved.

## Module matrix

| Documented module | Current integration |
| --- | --- |
| BFAR authentication | Firebase Auth plus active BFAR profile for legacy modules; server-issued BFAR custom claims for protected Consumer authority Functions/rules. |
| BFAR dashboard | Live Inspector, scan, and legacy report summaries plus Consumer intake and authority-case workload. |
| Assessment records | Inspector assessments only, matching the manuscript. Consumer scan history remains private unless the Consumer submits a concern and evidence is accessed through the audited backend. |
| Report management | One visible module with Inspector Reports, Consumer Intake, and Consumer Cases tabs. Inspector records stay in `reports`; Consumer submissions remain in their protected intake and `authorityCases` workflows. |
| Inspector management | Live `users` profiles with role/status/market management. Authority-case assignment will use the trusted transition endpoint, not a direct case update. |
| Vendor management | Kept on the Pasig LGU surface by the current product decision. This deliberately differs from the manuscript's proposed BFAR vendor view. |
| Audit trail | Legacy Admin/Inspector activity plus backend-created Consumer authority transition events. |
| User feedback | Inspector feedback supports Admin response/resolution. Consumer feedback is a privacy-safe, read-only callable inbox when the controlled feedback mode and claim are enabled. |
| Profile management | Existing authenticated BFAR/LGU profile view and allowed non-security edits. |
| LGU dashboard | Existing Inspector-report escalation summary. Forwarded Consumer authority cases also appear through the scoped Authority Cases module. |
| LGU escalated reports | One visible module with Inspector Escalations and Consumer Cases tabs. Existing `reports` workflow remains fully actionable. Consumer cases are visible only after `forwarded_lgu`; trusted LGU resolution wiring remains a release gate. |
| LGU vendor management | Existing Pasig Public Market vendor compliance and enforcement history. |
| Notifications | Real-time Inspector reports/scans/feedback plus live Consumer authority-case notifications. Read state remains per administrator. |
| GIS/location integrity | Inspector report coordinates can be reviewed in Google Maps. Consumer precise location is intentionally not copied into the general case; secure evidence/location access needs an approved audited backend policy. |

## Configuration boundaries

- `VITE_CONSUMER_AUTHORITY_MODE=cloud_test` enables the controlled Consumer intake/case integration.
- `VITE_CONSUMER_FEEDBACK_MODE=online_test` enables the sanitized Consumer feedback inbox only when the deployed Function environment and BFAR claim are also approved.
- BFAR/LGU authority custom claims are required because trusted Functions and Consumer authority rules must not authorize from client-editable profile fields.
- A website-restricted Google Maps key is required only for an embedded Admin map. The Android-restricted mobile key must not be reused. Without a web key, the portal keeps a Google Maps link.

## Remaining controlled-test gates

- Provision and verify staff custom claims; force a fresh ID token after changes.
- Configure web App Check and approved callable policy/resource documents before exposing authority-case transition controls.
- Add the Inspector mobile assigned-authority-case client before claiming Consumer-to-Inspector validation is complete.
- Exercise the complete Consumer -> BFAR -> Inspector -> BFAR -> Pasig LGU -> Consumer status path on staging with synthetic data.
- Keep production approval disabled until privacy, retention, account lifecycle, App Check, and deployment ownership are approved.
