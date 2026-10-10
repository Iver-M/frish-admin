# Consumer form and shared Admin Reports view

## Agreed presentation

Consumer uses the Inspector form's assessment-summary / details structure, with Consumer-appropriate fields. Vendor Name and Stall Number are separate inputs; Findings is the observation description. Reporter name/email and reason remain Consumer fields. Warnings, suspensions, administrative penalties, sensor readings and Inspector Pass/Conditional/Fail assessments are not Consumer inputs.

Consumer concerns and Inspector submissions appear under Admin **Reports**, using the existing report cards, summary, vendor facts, detail cards and side panel. Source labels and a source filter distinguish them. The old Consumer Intake / Authority Cases links redirect to Reports; they are not extra sidebar destinations.

This shares presentation, not database writes. Consumer records remain in their protected concern / authority-case workflow. No Consumer report is inserted into legacy `reports`, and no Admin client writes `consumerReportStatuses` directly.

## Latest main audit (2026-10-11)

- Inspector: `gerilouise/FRISH-INSPECTOR`, current main `aa15db29ef6eaa86393229f56fe86337059520f6`; primary checkout fast-forwarded cleanly.
- Admin: `Iver-M/frish-admin`, current origin/main `4b4938bea822929109b0e4a1251f49b63542e18c`. Work is isolated on `fix/consumer-bfar-intake` from that commit. The primary `feature/cloud-authority-integration` checkout contains unfinished cloud configuration/auth changes; these were neither copied nor overwritten.
- Consumer continuation: PR #46, `fix/clarify-concern-report-status`, starting at `6d92298c2527df7928a6970335dba61c97b01f8a`.

Inspector's actual `saveReport` in `src/services/reportService.ts` writes nested assessment/vendor/inspector data to `reports` with workflow status `submitted`. Admin subscribes to those reports, reviews them, and can forward Inspector submissions to LGU. LGU resolution returns to BFAR; an explicit BFAR conclusion creates a `reporterNotifications` record. Inspector listens to that in-app collection.

There are limits in the existing Inspector return path: Reports/Detail display assessment Pass/Conditional/Fail rather than workflow progress, fetching is on focus/mount with a manual refresh, and the notification detail's View Report handler only logs. Inspector's Contact Number input is required but is not persisted by the actual save payload. These were audited, not copied into Consumer behavior or changed in this task. Inspector has no FCM delivery implementation in this path.

## Consumer workflow and field mapping

| BFAR action / state | Consumer status |
| --- | --- |
| Saved concern, awaiting BFAR acceptance | Saved — awaiting authority intake |
| Accept report | Submitted to authority |
| Assign an active inspector | Under review |
| Start investigation | Investigating |
| Forward to LGU | Forwarded to LGU |
| Authorized LGU resolution | Resolved |
| BFAR closes investigation with no violation | Closed — no violation |

The Consumer inputs map to the existing contract: name/email retain their private fields; Vendor Name (maximum 100 characters) and Stall Number (maximum 40) combine as `Vendor · Stall 18` in the existing bounded `vendorOrStall` field (maximum composed length 149, within its 160-character contract); Findings maps to `description`; reason is unchanged. Either vendor or stall is required. This preserves existing receipts, immutable concerns, rules and shared contract fixtures without adding personal phone data or changing old reports. Admin displays the stored combined vendor/stall value rather than guessing how to split older records.

Pending concerns are paginated through the existing BFAR callable, checked automatically every 30 seconds while visible and immediately on returning to the foreground. Authority status uses a live Firestore subscription. Promoted concerns retain their original saved document; the merged queue suppresses their pending counterpart using `sourceConcernReportId`. Pending cards are withheld until the case subscription is ready, so a failed case listener cannot incorrectly present promoted concerns as unaccepted. Source-specific URLs and view keys prevent overlap with Inspector IDs. Account changes invalidate subscriptions and pending responses.

Allowed BFAR actions use the existing `transitionAuthorityCase` v1 command: exact fields, current version, UUID, active inspector selection and fixed workflow reason. The backend controls authorization, policy, App Check, audit and legal transitions. BFAR cannot resolve an LGU-only state. Unconfirmed mutations retain the exact request for idempotent retry; stale versions require reviewing the latest state. Acceptance uses the backend's existing deterministic promotion rather than a new case write.

## Verification

- Admin `npm test`: **57 passed** (42 baseline plus 9 workflow and 6 shared-view tests).
- Admin `npm run build`: passed; existing >500 kB chunk warning remains. Vite needed execution outside the filesystem sandbox because sandboxed realpath returned EPERM.
- Consumer active tests, explicitly selected from tracked `__tests__`: **948 passed, 54 suites**. Archived tests were excluded.
- Consumer lint: **0 errors, 11 pre-existing warnings**.
- Consumer Android JavaScript bundle passed. Metro recovered from an unreadable existing cache by doing a full crawl; no manual cache deletion was needed.
- All four BFAR commands passed the actual Consumer backend command validator; pinned shared fixture/validator hashes matched the Consumer PR worktree.
- Local synthetic browser checks: mixed-source queue, Consumer filter, existing detail-card layout, acceptance confirmation, assignment, unknown-result retry, automatic external update, stale-version conflict, LGU forwarding/read-only state, return to a queue with one promoted Consumer row, and 375×812 / 812×375 overflow checks passed. A banner overflow found on the narrow view was fixed; final document width equals viewport width.
- Screenshots show synthetic local data and mock services, not cloud acceptance: [queue](consumer-reports-local-preview.jpg), [detail](consumer-report-detail-local-preview.jpg). No Firebase request was made by that fixture.
- No new dependency was added. Functions/rules are unchanged; their full suites and emulator checks were not repeated for these presentation changes.

## Still deferred before live use

1. Admin main deliberately has `isAuthorityEmulatorEnabled = false`, so the Consumer boundary remains off. This task preserves that gate; the app clearly states Consumer reports are not connected. Complete/review the separately unfinished Admin cloud configuration/auth integration, then reconcile it with this presentation branch. Do not simply flip a boolean or expose protected collections.
2. Authorize and run scoped cloud acceptance using the existing Consumer PR #46 plan, approved BFAR operator and clean Second Space profile. No cloud deployment, synthetic cloud write, role/claim change, FCM registration, real push or production enablement was performed here.
3. Inspector and LGU clients do not yet receive/act on Consumer authority-case assignments through the new collection. BFAR's controls match the trusted state machine, but this task does not claim a complete live Inspector/LGU return loop for Consumer cases. Do not mark a forwarded case resolved from BFAR to bypass that gap.
4. Recheck the revised Consumer layout on Android/iOS; the previous native acceptance predates these form changes. Actual FCM delivery/taps remain unverified. The Android JS bundle check is recorded in the Consumer continuation document; native/all-ABI builds were not repeated.

Issue: https://github.com/Iver-M/frish-admin/issues/8. Consumer PR: https://github.com/towwfiee/FRISH/pull/46. Both the interface PR and Consumer PR remain draft pending integration/acceptance; issue #8 remains open.
