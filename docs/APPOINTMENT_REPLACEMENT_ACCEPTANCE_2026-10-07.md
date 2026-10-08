# Supervisor and Panel cancellation/replacement acceptance

Completed 7 October 2026 within the five owned modules. This report establishes the specific cancellation/replacement and display-recovery scenarios below, not complete system acceptance. The maintained root requirements/design/status take precedence over older handoffs.

## Environment and prerequisites

- A new isolated PostgreSQL database, `fsktm_replace_20261007_d50444`, used loopback Django 8011 and Vite 3011 with mock/demo login disabled. The normal development database and its academic records were not used for these mutations.
- Synthetic actors: Lifecycle Student; Dr Incumbent Supervisor; Dr Incoming Supervisor; Dr Incumbent Panel; Dr Incoming Panel; AI Programme Coordinator; Office Administrator; and another programme's Coordinator. Passwords/runtime launchers/logs are ignored `.env.*` files and are not included in this report.
- Fixture provisioning established one research profile, approved incumbent appointments, capacity/availability, a current academic semester, two published open evaluation periods and a 40/60 rubric. Baseline submitted entries were 85 and 80; baseline drafts were 46 and 39. These prerequisites were seeded, not created through the browser in this slice.
- Student replacement submissions each uploaded a fresh synthetic PDF through the multipart form. Read-only assertions verified the private document checksum; broader unauthorized-download/file-validation cases remain to be exercised.

## Browser transitions and persisted evidence

| Scenario | Browser result | Independent persisted result |
| --- | --- | --- |
| Student replacement cancellation | Empty reason rejected; reasoned confirmation succeeded; cancelled request remained in Student history; resubmission was possible | Application 2 `CANCELLED_BY_STUDENT`, exact reason, Student actor, `SUBMIT` and `STUDENT_CANCEL` events; incumbent retained |
| Supervisor Panel replacement cancellation | Missing replacement reason disabled submission; empty cancellation reason rejected; reasoned cancellation succeeded; candidate history retained the cancelled attempt | Recommendation 2 `CANCELLED_BY_SUPERVISOR`, exact reason, incumbent Supervisor actor, two workflow events |
| Replacement review before final approval | Incoming Supervisor accepted application 3; Coordinator then had the final decision | Both incumbents remained active, four baseline Marks tasks/entries remained unchanged, no lifecycle/handover events yet |
| Final Supervisor replacement | Coordinator approved; history showed old appointment replaced and incoming Supervisor active | Appointment 2 supersedes 1; same profile now points to incoming Supervisor; research title/area/abstract/semester unchanged; Panel appointment 1 remained active |
| Pending Panel nomination during Supervisor handover | Incumbent Supervisor history showed its pending recommendation automatically cancelled with a system reason/audit | Recommendation 3 has `SYSTEM_CANCEL_SUPERVISOR_REPLACED`, Coordinator actor and immutable reason; it left the selected Panel's active queue |
| Final Panel replacement | Incoming Supervisor submitted recommendation 4; incoming Panel accepted; Coordinator confirmed; Student saw only the confirmed current Panel identity | Panel appointment 2 supersedes 1, uses incoming Supervisor, and is active; predecessor ended as replaced |
| Outgoing evaluator history | Old Supervisor and Panel had no active draft queue and retained locked submitted history at 85 and 80; outgoing Panel assignment showed Ended | All original submitted scores/comments/timestamps/totals unchanged; submitted tasks remain historical assignments |
| Draft handover and clean tasks | Office detail displayed retired drafts with rubric values, reason, actor and handover JSON; incoming evaluators each saw two Not Started tasks | Immutable snapshots 46 (12+34) and 39 (14+25); exactly two handover/task-lifecycle audits; four successor tasks contain no Mark Entries |
| Office cancellation history/workload | Two distinct cancelled recommendations plus old Ended and current Approved appointments; no pending recommendation; old Panel workload 0/5, incoming Panel 1/5 | Final appointment/recommendation/task audit assertions passed |

The final state retains exactly one research profile, eight EvaluationTasks, four original MarkEntries, four appointment lifecycle events and twelve workflow events. Replacement approval creates a clean task for each unfinished period; the existing Marks list reconciliation subsequently creates each incoming evaluator's other eligible period task. Neither operation copies the old scores to new entries or rewrites the submitted history.

One browser-control timeout occurred after final Panel confirmation. The successful backend response and persisted approval were inspected before resuming in a fresh tab; the approval was not submitted again.

## Demonstrated defects and fixes

1. **Student Dashboard:** after replacement, cards still displayed the static `Dr. Siti Noor` example and a pending Panel. A failing regression reproduced the invented status/name. `StudentAppointmentStatusCards` now reads existing persisted APIs, prioritizes the active incumbent over pending requests, and uses the public Panel readiness/privacy boundary. Rendering tests cover empty/ended/legacy/cancelled records, both pending stages, confirmed identity, private pending identity, loading and errors. Browser rechecks showed Dr Incoming Supervisor and Dr Incoming Panel. Stopping only the isolated API reproduced retryable errors with no appointment cards; restoring it and clicking appointment Retry showed loading then both real cards without reload. Both API reads returned HTTP 200.
2. **Panel history:** recommendation attempts 2 and 3 matched the same student/candidate/displayed day/Cancelled status, causing the Lecturer list to collapse one attempt. Red regression evidence reproduced the old display-field key. Identity-based merging now retains both persisted attempts while deduplicating copies of one ID. Browser reload showed all three incumbent Supervisor records, including both cancellations. Office and selected Panel histories also retained the attempts.
3. **Office Marks monitoring:** retired baseline drafts inflated monitoring to 2/8 submitted, six incomplete and two drafts. A failing totals regression reproduced the inflation. The shared operational selector now excludes paused/retired rows consistently from monitoring totals, follow-ups, previews and activity, while authorized history retains them. Browser recheck showed 2/6 submitted, four Not Started, zero active drafts, and both retired details/snapshots still accessible. This fixes lifecycle exclusion; broader period aggregation/report/export acceptance remains separate.

Independent read-only review found no critical or important issues in the three fixes. The review's request for mounted asynchronous Dashboard recovery evidence was satisfied by the isolated outage/Retry scenario.

## Verification

From `backend`:

```powershell
..\.venv\Scripts\python.exe manage.py test appointments.test_appointment_lifecycle appointments.test_supervisor_workflow appointments.tests --parallel 2 --noinput
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

The affected backend suite passed **77 tests in 163.028 seconds**, exit 0. Django reported no system issues and no migration changes. Stage-specific read-only fixture assertions passed before final approval, after Supervisor handover and after both handovers; final assertions additionally require eight tasks and four unchanged original entries. No fresh full 623-test backend run is claimed.

From `frontend`, the available Node 22 runtime ran every `rg --files src -g '*.test.ts' -g '*.test.tsx'` result through `node --import tsx`, then `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/vite/bin/vite.js build`. **68 scripts passed, zero failed**; TypeScript and build exited 0. The lifecycle selector's final explicit-ACTIVE test passed. Each demonstrated defect had failing evidence before its fix and a passing focused recheck. `git diff --check` passed after documentation updates. No new dependency or schema change was made.

## Evidence and remaining acceptance

Ignored screenshots are retained under `frontend/acceptance-evidence/replacement-2026-10-07/`: 01–08 cancellation/approval/clean tasks; 09 corrected Student Dashboard; 10–11 system cancellation and distinct attempts; 12–14 outgoing submissions/incoming clean tasks; 15 corrected monitoring; 16–17 retired audit details; 18 Office Panel history; 19 outage; 20 appointment Retry recovery. Credentials are stored separately from screenshots.

The [five-module checklist](FIVE_MODULE_ACCEPTANCE_CHECKLIST.md) records this as E5 and keeps compound requirements awaiting acceptance where this slice did not exercise every branch. Next: rejection, capacity/availability and private-file failure branches; then programme/role/backup targeting, historical-semester filtering, completion windows and advanced lifecycle/report/export privacy scenarios. Scheduled-period handover and report/export exclusion are not newly browser-accepted by these open-period checks. Faculty rules and coordinator identity policy remain deferred; actual-host shared-cache/HTTPS/SMTP/backup/rollback checks remain separate.

Isolated acceptance services are stopped after final checks; the synthetic database, private fixtures and evidence remain available. Normal loopback Django/Vite 8000/3001 continue serving the current working tree. All changes from this and the prior admin slice remain uncommitted/unpushed.
