# Owned-module workflow browser acceptance

Browser walkthrough performed 2026-10-05; follow-up verification continued 2026-10-06 (Malaysia time).

## Scope and isolation

The user authorized the owned Student request → Supervisor review → Coordinator approval → Panel appointment → Marks submission → semester closure flow. Faculty rules, coordinator identity policy and teammate-owned modules remain outside this slice.

The walkthrough used a newly created PostgreSQL database, synthetic Student/Lecturer/Coordinator/Office accounts, a synthetic proposal PDF, loopback-only backend/frontend services, real API calls and disabled mock/demo login. Only accounts, an Active semester, capacity configuration, proposal requirement and a 40/60 rubric were seeded. Application, appointment, nomination, evaluation period, task and Marks records were created through the UI. Credentials, uploads, screenshots and read-only verification scripts remain ignored and outside Git.

## Completed workflow

| Browser transition | Persisted result |
| --- | --- |
| Student submits Supervisor request with proposal | `SUBMITTED_TO_SUPERVISOR`, one document, Student `SUBMIT` event; no appointment or research profile yet |
| Requested Supervisor accepts | `PENDING_COORDINATOR`, Supervisor `SUPERVISOR_ACCEPT` event; no premature appointment |
| Coordinator approves | `APPROVED`, one Active primary appointment, linked research profile and Coordinator approval event |
| Supervisor nominates a separate eligible Panel lecturer | `SUBMITTED_TO_PANEL`, Supervisor nomination event; no premature Panel appointment |
| Nominated lecturer accepts | `PENDING_COORDINATOR`, Panel acceptance event |
| Coordinator confirms Panel appointment | `APPROVED`, one distinct Active Panel appointment and approval event; Student sees both confirmed appointments |
| Office creates, previews and publishes evaluation period | One Student, one Supervisor, one Panel, exactly two generated tasks and no missing appointments; Malaysia opening/closing times round-trip correctly |
| Supervisor saves draft and submits 35/40 + 50/60 | Locked `SUBMITTED` entry with authoritative total 85/100 and two scores |
| Panel submits 30/40 + 50/60 | Locked `SUBMITTED` entry with authoritative total 80/100 and two scores |
| Office monitors and closes semester with reason | Monitoring 2/2 submitted, zero incomplete; closure preview zero unfinished; semester and its published period become `CLOSED` with audit events |
| Lecturer opens submitted Marks after closure | Persisted 35/40 and 50/60, total 85/100, read-only submitted detail; no save/submit controls |
| Office reconciliation scan | Zero issues, blocking findings, warnings or repairs |

Read-only ORM assertions ran after every transition and checked actors, linked Student/profile/semester, distinct evaluators, appointment counts, status, totals and closure audit. Closure preserved both submitted Marks and both active appointment records.

## Issues exposed and bounded corrections

1. A first Panel nomination sent `replacementReason: null`, rejected by the existing optional string field. The API service now omits the absent reason; genuine/blank replacement reasons still reach authoritative backend validation. The initial real-browser failure was followed by a successful nomination after the correction.
2. Successful primary approval removed the request from the queue but left appointment history and the separately loaded supervisory team stale. Decisions now reload queue/history; primary appointment changes also refresh the team. Request versions discard obsolete Coordinator reloads.
3. Successful semester closure left audit history empty until the semester was reopened. Audit loading now follows the selected semester, including lifecycle refreshes, with obsolete-response cleanup and independent loading/error/Retry states. A failed audit read cannot report a completed lifecycle write as failed.
4. The same UTC evening timestamp appeared as 04 October in some Supervisor/Panel views and 05 October in Malaysia-facing views. Backend appointment presentation and relevant frontend date views now consistently use Asia/Kuala_Lumpur; date-only values retain their calendar day. New regressions failed with the original date formatter/mapping and passed after correction.

## Follow-up verification

- A second isolated database seeded only the preconditions for UI regression checks (accounts, capacity configuration and a Supervisor-accepted request). Its first primary appointment was approved in the browser; without reload, the pending request disappeared, appointment history showed the Active appointment, and the team showed the primary supervisor and research profile.
- A controlled UTC evening submission in that fixture displayed **05 Oct 2026** in Supervisor request history, matching the Malaysia calendar date. The original completed workflow's Panel recommendation also displayed **05 Oct 2026** in its reviewed-request row and submitted/progress details after the backend formatter correction.
- After Office closed this second fixture's semester, ignored test-only middleware deliberately returned one HTTP 503 for audit history. The UI retained **Closed**, showed a read-specific audit-loading error, and Retry restored the Office `CLOSE` event and Malaysia timestamp without repeating closure. Read-only assertions confirmed exactly one closure audit and the preserved primary appointment. This fixture had no evaluation tasks; preservation of submitted Marks was checked in the complete workflow above.
- Independent read-only review identified an overlapping Coordinator reload race and misleading generic audit-read error. Both were corrected and re-reviewed; no remaining important findings were reported.
- Final complete-workflow assertions also verified the four exact rubric scores, all six appointment workflow events with their actors, and Office configuration events `CREATE`, `PUBLISH`, `SEMESTER_CLOSE`. Django system and migration-drift checks pass.
- All **66 frontend scripts**, TypeScript lint, production build and both production artifact guards pass. Appointment/Malaysia date checks additionally pass under **UTC**, **Asia/Kuala_Lumpur** and **America/New_York**.
- All **222 Appointments tests** pass in **1902.342 seconds**, using two PostgreSQL workers with the normal configured password hashers. This includes the two new backend display-date regressions. No additional full 623-test run is claimed.

## Evidence and limits

Local ignored evidence: `frontend/acceptance-evidence/e2e-2026-10-05/`, including request, review, confirmed appointments, published period, completed monitoring, closure preview, closed semester, reconciliation and locked Marks screenshots. `15-malaysia-request-date.png`, `16-coordinator-auto-refresh.png`, `17-closed-semester-audit-outage.png`, `18-semester-audit-recovered.png` and `19-malaysia-panel-date.png` record the follow-up checks. The initial primary approval and closed-semester screenshots also preserve the stale UI findings; they are reproduction evidence, not post-fix refresh proof.

This is local synthetic acceptance of the owned workflow. It does not claim public deployment, production multi-worker/proxy/SMTP readiness, faculty rule approval or successful human password-change acceptance. Earlier 623-test backend verification and the subsequent shared-cache/Timeline suite runs are documented in `PROJECT_STATUS.md`; the results above identify only the suites actually rerun for this slice.
