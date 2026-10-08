# Submitted Marks portal acceptance — 7 October 2026

Submitted Marks correction/reopening now lives in the existing Office portal at Marks Entry → View Mark Records → record detail. Django admin is inspection-only for Mark Entries and scores, including for superusers. This is a bounded migration within Marks, not a new website or whole-system acceptance claim.

## Isolation and permissions

Browser mutations use fresh synthetic PostgreSQL database `fsktm_portal_marks_20261007_c3dfa7`, Django 8013 and Vite 3013 with mock/demo login disabled. Seeded prerequisites comprise two semesters, official distinct Supervisor/Panel appointments, a 40/60 rubric, open/closed periods, submitted totals 80/80 and an untouched Draft 46. Seeding is not browser workflow evidence. Synthetic credentials remain in ignored runtime files; normal development credentials/permissions/data are preserved.

Correction/reopening retains the former authorization: Office role, staff status and `marks.change_markentry`. Office inspection accounts can read history without receiving mutation controls. The backend checks permission independently of frontend capabilities.

## Browser results

| Scenario | Verified result |
| --- | --- |
| Required reason and score bounds | Empty reason disables review. Negative Problem Definition score displays a validation message before confirmation. |
| Cancellation | Review again followed by Cancel discards the form; opening it again shows original 30.00. No audit or mutation is persisted. |
| Audited correction | Office changes Problem Definition 30→35 and comments with a reason and confirmation. Detail refreshes to Submitted 85, preserves Lecturer feedback, and displays Office actor, reason, Malaysia time and named before/after values. |
| No change | A reason without a score/comment change is rejected before confirmation. No audit is created. |
| Stale form | Two tabs review total 85. One saves 36+50=86; the other's attempted 37+50=87 receives a conflict. Editing controls disappear, Reload latest record restores 86, and the stale reason never appears in audits. |
| Reasoned reopening | Office confirms a separate reopening with a reason. Entry becomes Draft 86 with scores/comments preserved, submission date cleared and a REOPEN audit. Office correction/reopening controls disappear on the refreshed Draft. |
| Lecturer review/resubmission | Assigned Panel Lecturer opens the preserved Draft, changes 36→38, saves and confirms submission. Task becomes Submitted 88. Original component feedback/comments survive and the new submission records the ordinary deadline snapshot. |
| Closed-period policy | Historical record shows correction but no reopening action. Confirmed correction changes 80→82 while preserving Submitted, comments and exact submission date. A separate crafted API reopening rejects 400 with unchanged entries/audit count. |
| Inspection-only Office | Account with view permissions but no change permission can inspect submitted 88 and all three current-record audit events, with no mutation controls. |
| Django admin | Office account with model change permission sees View mark entry, persisted total 88 and comments, with no save, correction or reopening controls. Automated tests also deny forged admin POSTs and superuser mutation. |

Independent persisted assertions confirm exactly four audits: CORRECT 80→85, CORRECT 85→86, REOPEN 86→86, and closed-record CORRECT 80→82. All have the correct Office actor and exact browser reasons. Invalid, cancelled, no-op and stale attempts produce no audit. The unrelated Draft remains 46. No completion window or official appointment change is required.

The existing correction audit snapshot contains status, total, comments and component scores; submission-date/deadline preservation is checked against persisted fields and API regressions rather than claimed as fields inside that snapshot.

## API, concurrency and regression evidence

New regression tests first failed for the missing portal endpoints/capabilities and writable Mark Entry admin. Portal cases cover score bounds/precision/nonfinite values, unknown/duplicate components, forged fields, comment-only correction, required reasons/versions, no-op rejection, stale/replayed versions, permission matrix, missing/unsubmitted records, audit-outage rollback, closed-period policy and Lecturer resubmission. PostgreSQL thread tests prove one success/one conflict for the same reviewed version and rejection of reopening when period closure locks first.

The implementation reuses existing transactional services. State versions bind entry identity, timestamp, status, submission date, scores, total and comments through a server HMAC. Services lock semester → period → task → entry consistently with closure/submission. No migrations or dependencies were added. The old admin form is removed; its acceptance tests now assert denial, with the operational validations exercised at the portal boundary.

Fresh verification:

```powershell
# From backend
../.venv/Scripts/python.exe manage.py test marks --parallel 2 --noinput
../.venv/Scripts/python.exe manage.py check
../.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
```

All **142 Marks backend tests passed in 96.988 seconds on 7 October**; the final **8 October rerun passes all 142 in 196.017 seconds**. All **73 frontend test scripts**, TypeScript and production build (4.75 seconds) passed on 7 October after the final frontend change. Django checks, migration-drift, whitespace and documentation checks pass. Scoped independent code review found no actionable correctness/security issue; conflicting current-spec admin wording was reconciled. These are not fresh all-backend or production-host results.

Browser screenshots are retained outside Git in `C:/Users/User/.codex/visualizations/2026/10/07/marks-portal/`. The acceptance database and ignored verification material are retained. Isolated 8013/3013 services are stopped after acceptance. On 8 October normal 8000/3001 services were restarted with the current working-tree code and both return HTTP 200; the existing development database and account authority are preserved. Changes remain uncommitted/unpushed.

## Remaining work

Continue the five-module checklist's participant lifecycle, supporting supervision, research amendment/transfer, acting-delegation and carryover branches, then Dashboard/Timeline/report/export/dossier/reconciliation combinations. Earlier browser file-saving/native-alert/availability-date limitations remain open. Production shared-cache/host acceptance, faculty rules and coordinator identity policy remain separate.
