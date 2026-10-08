# Advanced Marks acceptance — 7 October 2026

This slice verifies programme/role targeting and backup assignment, Lecturer historical-semester filters, and task completion-window grant/renewal/revocation/expiry within the five owned modules. The maintained root requirements/design/status remain the source of truth. This is scoped acceptance, not whole-system or production acceptance.

## Isolation and actors

All mutations use synthetic database `fsktm_marks_20261007_6cf435`, Django 8012 and Vite 3012, with mock/demo login disabled. Existing development data and earlier acceptance databases are preserved. The ignored fixture generator creates the prerequisite semesters, appointments, rubric and historical submissions; these seeded prerequisites are not browser workflow evidence.

Actors are Office Staff/Admin, Supervisor, Panel, Backup Lecturer, unassigned Lecturer, AI Coordinator and five synthetic Students. Existing test credentials are retained only in ignored runtime material. The fixture has current Semester I 2026/2027 and closed historical Semester II 2025/2026; four active Supervisor and four active Panel appointments; a 40/60 rubric; historical submitted Supervisor/Panel totals 85/80; and two Draft periods. AI1 retains a historical research-profile semester. AI2 has authoritative AI Student programme but a stale Data Science research-profile programme. Another linked Student has a blank programme; an AI Student lacks official appointments.

## Browser scenarios and persisted results

| Scenario | Result and evidence boundary |
| --- | --- |
| Invalid programme/role selection | Empty roles and empty selected programmes show validation responses. No targeting/configuration audit or tasks are persisted. |
| AI Supervisor-only preview | Two AI Students, two Supervisor tasks, no Panel tasks; one missing Supervisor reported. Stale profile programme, blank linked programme and other-programme Student do not alter the authoritative cohort. Preview is read-only. |
| Publication/generation | Reviewed AI publication followed by generation creates exactly two Supervisor tasks. Repeat generation reports zero new tasks. Published identity and targeting inputs are disabled; crafted targeting PATCH rejects 409 with no audit. |
| Backup exception | Mandatory reason is enforced. Reasoned, confirmed AI1 Backup assignment references current-period Supervisor task #3; task #5 and exactly one override audit are created. Official appointments remain unchanged. |
| Drawer cohort change | The historical-profile AI1 appears for the current AI period. Changing the drawer to Data Science clears the selected AI Student/original task and offers only DS1, even while the main selected period is AI. |
| Data Science both-role preview | One authoritative Data Science Student, one Supervisor and one Panel task. AI2's stale Data Science profile does not enter this cohort. Reviewed publication/generation creates exactly the pair. |
| Lecturer semesters | Supervisor sees four tasks: one historical submitted task and three current official tasks. Historical filter shows only the submitted historical AI1 task; current filter includes the same AI1's current task. Panel sees historical AI1 plus current DS1; AI Supervisor-only period creates no Panel task. |
| Open-period extension | Office grants an October 20 window, renews it to October 21 and revokes it with a reason. History retains SUPERSEDED and REVOKED entries. Empty revocation reason disables confirmation. Revocation preserves ordinary open-period access, independently asserted. |
| Closure review | AI preview reports two not-started plus one Draft, three unfinished; confirmation requires acknowledgement. Both periods close through reviewed server preview tokens and mandatory reasons. Draft 90 survives closure; ordinary write rejects 409 before recovery. |
| Closed-period recovery | Batch grant creates independent windows for current AI1 Supervisor and existing Backup without reopening the period. Supervisor submits preserved 35+55=90; immutable submission records window #3 and its exact deadline. Submitted task cannot receive another grant. |
| Backup revocation | Backup saves 12+34=46 while its recovery is active. Office revokes only that window. Browser shows CLOSED, REVOKED, disabled inputs and retained score/comments; direct draft/submit both reject 409 without mutation. |
| Actual Panel expiry | Office grants DS1 Panel a deadline of 7 October 22:07 Malaysia. Panel saves 20+30=50 before that real clock time. After expiry, browser shows EXPIRED/Overdue and read-only score/comments. Direct draft/submit reject 409 with exact persisted values/timestamps retained. No clock mocking or ledger edits were used. |
| Office monitoring scope | Multiple current/historical semesters were combined under a misleading single active-semester label. Corrected display describes active tasks across periods and shows `Semester scope: Multiple semesters (2)`, using the same operational collection as its totals. |

Native datetime `.fill()` did not persist the controlled value in this browser. Documented native accessibility `setValue` succeeded; the DOM value and enabled grant button were checked before submission. This establishes date entry for these completion controls, not the earlier Office availability control or stalled Supervisor native alert. Those E6 limitations remain separate.

## Independent API and state assertions

Crafted duplicate backup rejects 409; out-of-programme backup rejects 400; published targeting change rejects 409. Task/configuration/override counts remain unchanged. Four non-Office actors cannot grant windows or read Office history (403); the unassigned Lecturer has no tasks and cannot write another evaluator's task (404). Archival with unfinished active recovery rejects 409 with no configuration audit. Duplicate submission rejects 409.

Final independent assertions pass: seven tasks, four unchanged active Supervisor appointments, four unchanged active Panel appointments, one Backup override audit, six configuration audits (two UPDATE, two PUBLISH, two CLOSE), five windows and eight window audit events. Windows ordered by ID are SUPERSEDED, REVOKED, COMPLETED, REVOKED, EXPIRED. All window events retain Office actor/reason. Historical totals remain 85/80, recovered submitted total is 90, revoked Backup Draft is 46 and expired Panel Draft is 50. All three periods remain CLOSED. Research-profile historical semester/stale programme are preserved. No appointment handover or task lifecycle audit was created by Marks operations. Failed writes preserve scores, comments and updated timestamps.

## Demonstrated fixes

1. Backup dropdown wrongly filtered by research-profile semester, hiding AI1 despite its current-period task. It now uses the selected period's normalized programme scope; the drawer uses its own period and clears stale selections on change.
2. Assignment-options programme projection used stale profile data. It now reuses `profile_programme`, including authoritative blank linked programmes and legacy fallback, with eager relation loading. Recipient preview/generation were already correct.
3. Office monitoring mislabelled multiple-period/semester totals as one active semester. Display scope now matches the operational collection without changing counts or history access.

API projection and frontend cohort/scope regressions were run failing before implementation, then passing. No schema, dependency or official appointment change was required.

## Verification

From `backend`:

```powershell
../.venv/Scripts/python.exe manage.py test marks --parallel 2 --noinput
../.venv/Scripts/python.exe manage.py check
../.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
```

All **126 Marks backend tests pass in 152.338 seconds**. This includes targeting, completion windows, closure, atomicity and admin boundaries; it is not a fresh all-backend test claim. All **70 frontend test scripts**, TypeScript and the production build (4.05 seconds) pass in the final run. Django checks, migration-drift and whitespace checks pass. Scoped independent review found no critical or important issues. Documentation verification passes for 398 unique source clauses and exact wording/line mappings.

Ignored reproducibility material includes `.env.marks-acceptance-{fixture,context,server,probes}.py`, `.env.marks-final-assertions.py`, backend final logs/results and frontend final logs. The secret runtime manifest is never committed. Screenshots 01–13 are retained under `frontend/acceptance-evidence/advanced-marks-2026-10-07/`: invalid targeting, AI/DS previews, original/fixed backup dropdown, created exception, historical filter, superseded/revoked history, active Panel recovery, completed/revoked closed recovery, read-only revoked/expired drafts and corrected Office monitoring.

## Remaining acceptance

Semester closure/handover survival, participant ineligibility/pause/retirement, appointment replacement invalidation, scheduled/unopened/archived variants and cross-screen reports/export/dossier/reconciliation coverage remain distinct compound branches. Automated regressions cover many of these; this slice does not certify their browser combinations. The [five-module checklist](FIVE_MODULE_ACCEPTANCE_CHECKLIST.md) preserves that distinction.

Next development acceptance covers participant lifecycle, co-supervision, research amendments/programme transfers, acting-delegation revocation and carryover reassessment. Earlier native-alert/file-saving/availability-date limitations and production shared-cache/HTTPS/SMTP/backup checks remain open; faculty rules/coordinator identity policy remain deferred. Changes are uncommitted/unpushed. Cleanup confirms no listener on 8012/3012; the database/evidence are retained. Normal direct/proxied health endpoints on 8000/3001 both return 200.
