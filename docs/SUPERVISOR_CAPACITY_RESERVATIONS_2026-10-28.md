# Supervisor capacity reservations: implementation and verification

Latest follow-up review and corrected evidence: [28 October review](SUPERVISOR_CAPACITY_REVIEW_2026-10-28.md). That report supersedes older totals below and records two corrected UI issues plus the remaining whole-frontend failures.

Completed 28 October 2026. The approved design follows the capacity discussion recovered from “Improve Office Dashboard UI” on 23 October, and the user's instruction to critique the behaviour/UI and proceed.

## Delivered behaviour

With four active supervisees and a limit of five, the Lecturer sees an amber **1 place remaining** indicator and separate active, reserved and available counts. Accepting a primary request reserves the last place while awaiting Coordinator approval; the confirmation identifies the actual Student, explains the reservation and states what will happen to other pending requests. A second acceptance cannot reserve the same place, including simultaneous PostgreSQL requests.

Coordinator approval converts the accepted request's own reservation to active workload without double counting. Rejection or cancellation releases it. Final primary/supporting approval, including governed reconciliation activation, automatically closes unaccepted primary requests only when their own effective published policy is full with confirmed active workload. Accepted requests and requests with a higher applicable limit, archived semester, stale reassessment or missing policy remain unchanged. Pending replacement closure preserves the incumbent appointment.

Automatic outcomes use **Capacity full**, a reason/time, immutable **SYSTEM_CLOSE_CAPACITY** audit and deduplicated in-app notifications. They do not fabricate a personal rejection. Student cancellation remains available where previously permitted, and eligible Students can use the existing application route after closure. Supporting Supervisor nominations retain their prior acceptance semantics: acceptance forwards the nomination; capacity is checked at final approval. They do not acquire the primary-request reservation promise.

All shared Supervisor workload consumers respect primary reservations: capacity publication minimums, candidate eligibility, Office concerns, workload/export/dossier projections and reconciliation. Active students remain distinct from occupied places. Semester gaps retain global counts without inventing a configured policy or available places. No dependency or authorization expansion.

## Verification evidence

| Check | Evidence |
|---|---|
| Dedicated backend regressions | 18 passed in an independent primary-agent run, using a disposable PostgreSQL database which was destroyed afterward. Includes a real two-thread acceptance race. |
| Backend workflow integration | 135 passed, including the 18 dedicated regressions, primary/supporting workflows, concurrency, reassessment, Office concerns and reconciliation. |
| Backend capacity/history integration | 213 passed, including publication/query bounds, capacity workspace, Office workspace, history/export, cancellation visibility, Office replacements and archive guards. These overlap the other gates and are not an additive count. |
| Final focused frontend checks | 18 passed: the 13 reservation component checks plus request-layout and Lecturer request grouping regressions. |
| Final mounted browser checks | 26 passed: 13 scenarios at each exact 1440px and 390px width, with real components/production CSS and isolated HTTP responses. Covers last-place warning, fetched confirmation identity, supporting acceptance wording, Accept-only disabling, Reject/cancel operation, restriction/missing-policy wording, closure/history/recovery, keyboard focus and overflow. |
| Adjacent mounted UI checks | Shared request details, workload details and workload summaries passed; their affected suites were run by the UI implementer. |
| Whole frontend gate | 362/363 passed in the settled broad run. The sole failure is the existing `PanelSpecializedTools.test.tsx:31` assertion that rendered Panel details contain an exact legacy typography class string. That test, Panel workload details, shared workload layout and typography constants match HEAD; the failure was reproduced separately. The test was not weakened or changed. The subsequent small supporting-dialog correction was checked with the final focused and mounted gates above. |
| TypeScript/production build | Final TypeScript passed; final production build passed in 18.48 seconds after the supporting-confirmation correction. Existing ExcelJS bundle-size advisory remains. |
| Django/migrations | `manage.py check` found no issues; `makemigrations --check --dry-run` detected no changes. Migration `appointments/0019_supervisor_capacity_full.py` was applied locally after verifying it was the only planned migration and its SQL was a no-op. `showmigrations` confirms it applied. |

Tests were added and observed failing before the corresponding changes. Independent review found and rechecked two corrected P2 issues: zero reservations during semester gaps, and missing policy being misrepresented as a competing reservation. A further narrow independent re-review was unavailable because of the account usage limit; the primary agent directly reviewed the final identity/supporting-message changes and ran their regressions. No remaining material issue was found in the scoped direct review.

## Visual evidence

Follow-up warning refinement: the last-place confirmation now uses an amber callout, warning icon and concise text instead of the original long paragraph. Its visual/word-budget assertion failed against the previous version and passed after the change, with all 26 mounted scenarios and 17 focused checks passing. The example consistently represents two total pending requests and one other request, including singular wording. Final TypeScript and production build passed (17.28 seconds); no backend change. Already-full submissions are blocked; this presentation change does not create a submit-then-close workflow.

- [Short warning, phone](../output/supervisor-capacity-reservations-20261028/capacity-reservations-warning-short-390.png)
- [Short warning, desktop](../output/supervisor-capacity-reservations-20261028/capacity-reservations-warning-short-1440.png)

Desktop and phone synthetic fixtures were visually inspected. The preview preserves the existing portal typography and controls; external web fonts are removed in the isolated harness, so system fallback fonts may differ from the running portal. The screenshots are UI fixtures, not live academic records.

- [Last-place confirmation, phone](../output/supervisor-capacity-reservations-20261028/capacity-reservations-last-place-390.png)
- [Lecturer capacity summary, desktop](../output/supervisor-capacity-reservations-20261028/capacity-reservations-load-1440.png)
- [Automatic closure and Student recovery, phone](../output/supervisor-capacity-reservations-20261028/capacity-reservations-student-closed-390.png)

## Integration limits

No academic records, environment files or credentials were changed. No commit, push or deployment was performed. The local development database's migration history now records 0019; its generated SQL does not alter tables or academic data. Other environments should apply 0019 through their normal deployment process. Existing accepted requests begin counting as reservations immediately under the new resolver; no data migration silently closes them. Backend API/database checks and mounted UI checks were separate; this report does not claim a live full-portal mutation journey or a completely green whole-project suite.
