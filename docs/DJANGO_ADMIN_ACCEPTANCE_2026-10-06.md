# Owned-workflow Django admin acceptance

Started 6 October 2026; finalized 7 October 2026 (Malaysia). This acceptance covers the five owned modules' Django admin boundaries and shared semester/capacity configuration. It does not certify every advanced portal workflow or production deployment.

## Required boundary

Normal appointments, configuration, evaluator assignment, semester/capacity/availability and draft entry changes use their existing portal workflow services. Governed records remain inspectable in Django admin according to existing model view permissions. Submitted Marks correction/reopening is the explicit exception: authorized Office Staff/Admin with staff status and model change permission may use the reasoned, audited services. Reopening requires a period still accepting submissions; an audited correction may occur after closure. No new website, top-level module or approval stage was added.

## Original failures and fixes

| Probe | Before | After |
| --- | --- | --- |
| Invalid negative, excessive or unknown-component correction | Unhandled service validation → HTTP 500 | Bound form validation, no entry/score/audit changes |
| Non-finite correction (`NaN`, `Infinity`) | `NaN` also escaped the first error-handling fix | Explicit finite/nonnegative correction-input validation |
| Reopen after period closure | HTTP 500 | Form error; submitted entry preserved |
| Staff Lecturer with Marks permissions attempts correction | HTTP 500 from service authorization | HTTP 403 before mutation; view has no correction controls |
| Admin changes evaluator or period's academic semester | HTTP 302; unaudited reassignment succeeded | HTTP 403; task/period unchanged |
| Admin edits a draft comment | HTTP 302; unaudited edit succeeded | HTTP 403; draft remains in assigned Lecturer workflow |
| Mark Entry/correction audit deletion, including bulk action | Individual deletion could succeed | Delete permission denied; bulk delete action unavailable |
| Admin creates tasks/entries outside workflow | Add form remained available | Add route denied |
| Shared semester direct closure | HTTP 302 without closure side effects/audit | HTTP 403; existing semester unchanged |
| Draft capacity plan/entry and availability writes | Accepted outside audited configuration services | Add/change/delete/bulk actions denied; records inspectable |

The initial Marks HTTP run executed 13 tests and reported 15 failing assertions/subcases against the old implementation. The shared Academic probe executed five tests with eight failing assertions/subcases. These were reproduction runs, not acceptance passes. Existing capacity-admin tests that expected direct Draft mutation were revised to assert denial; underlying model persistence/concurrency tests remain intact.

The implementation keeps the existing transactional Marks services. Service validation exits Django's admin transaction, rolling back partial writes, before the same POST is rebound with a form error. The rebound form cannot save. Score inlines cannot add/change/delete. No-op admin saves leave Marks unchanged. Governed Academic/Marks configuration and audit permissions prevent crafted POSTs as well as visible controls; no permission was added to a real development account.

## Controlled browser cases

A new synthetic PostgreSQL database, `fsktm_admin_20261006_1213c8`, provided an active semester, rubric (40/60), open period and assigned Lecturer task. Test credentials were generated into ignored local files. The Office fixture is staff with Marks permissions and is not a superuser. Submitted marks were prepared through the real Lecturer draft/submit API, initially 30 + 50 = 80. The browser used loopback Django on port 8010; mocks were not involved. All writes/assertions were guarded to this database, not `fsktm_pg_office`.

| Browser case | Persisted result/evidence |
| --- | --- |
| Correction without a reason | Visible form error; no correction |
| Correction with `1=35,2=-1` | Clear finite/nonnegative validation; original 30/50 and total 80 preserved |
| Reasoned score/comment correction | Submitted and locked; 35/50, total 85, corrected comment; one `CORRECT` audit with Office actor, reason and exact before/after |
| Correction-audit inspection | Both score sets, comments, status, totals, reason and actor visible; no edit/delete controls |
| Open-period reopening | Draft, submission timestamp cleared, total 85 retained; exactly one additional `REOPEN` audit |
| Reopened draft inspection | Read-only admin detail; no correction or ordinary draft-edit controls |
| Closed-period reopening | Visible form error; Submitted 85 and audit count two preserved |
| Post-closure correction | Submitted and locked; 36/50, total 86; exactly one additional reasoned `CORRECT` audit |
| Ordinary Lecturer admin login | Staff-login rejection; no admin workspace access |

Lecturer resubmission and Office period closure were real API preconditions for the closed-period admin cases. They are not claims of a new portal-browser walkthrough. Independent read-only ORM assertions verified each checkpoint's scores, status, actor/reason, before/after totals and exact correction-audit count. New final HTTP checks additionally verify an Office actor without model permission and a stale correction POST after reopening cannot change the draft.

Ignored screenshots: `frontend/acceptance-evidence/admin-2026-10-06/01-negative-score-rejected.png` through `07-lecturer-admin-login-denied.png`; `03-immutable-correction-audit.png` shows the audit details. `08-local-main-admin-20261007.png` records the existing development Office account's restricted admin on the restarted normal local backend. Fixture/server/verification helpers, credentials and test logs remain ignored. Synthetic fixture databases/evidence are retained for inspection; temporary acceptance services are stopped after verification.

## Verification

Commands below ran from `backend/` using the repository `.venv` and real PostgreSQL with normal password hashers.

| Check | Result |
| --- | --- |
| Initial affected Marks/workflow/admin run | 50 tests passed in 99.532 s |
| Expanded Marks admin run | 16 tests passed in 46.866 s |
| Integrated `academics.test_admin_boundaries academics.test_capacity marks.test_admin_acceptance marks.tests appointments.test_admin_boundaries dashboard.test_admin_boundaries --parallel 2` | 186 tests passed in 178.565 s |
| Two final permission/stale-form checks | 2 tests passed in 5.619 s; 188 distinct affected tests across integrated run and follow-ups |
| Fresh 7 October `marks.test_admin_acceptance academics.test_admin_boundaries appointments.test_admin_boundaries dashboard.test_admin_boundaries --parallel 2` | 29 tests passed in 63.403 s |
| Django system check and migration drift | Pass; no migration changes |
| Independent read-only review | No critical or important findings; suggested permission/stale-form coverage added and passed |

No frontend source changed, no dependency/schema change was needed, and no fresh full backend/66-script frontend run is claimed. Earlier full-suite/frontend evidence remains dated in the prior acceptance reports. The 7 October recheck is restricted to the affected admin boundaries.

The normal loopback services were restarted from the uncommitted current working tree on 7 October: Django `127.0.0.1:8000`, Vite `127.0.0.1:3001`, development database `fsktm_pg_office`. Direct and proxied health checks and existing Office admin sign-in passed. Credentials, permissions and academic records were unchanged; ordinary login/session metadata may update. The synthetic port 8010 service is stopped. This is local testing, not public deployment.

## Checklist and remaining work

[The five-module checklist](FIVE_MODULE_ACCEPTANCE_CHECKLIST.md) preserves individual in-scope requirement clauses and connects them to existing screen/API and regression references. Passed rows cite an acceptance slice; unexercised compound/advanced branches remain Awaiting acceptance rather than being inferred from a broad suite pass.

Continue with isolated Supervisor/Panel rejection, cancellation and replacement; Marks targeting/backup/completion-window branches; participant/supporting-supervision/research-transfer/delegation/carryover scenarios; then scoped Dashboard reports/dossiers/reconciliation evidence. Faculty rules and coordinator identity policy remain deferred. Shared production-cache provisioning, HTTPS/proxy, SMTP and backup/restore/rollback on the actual host remain deployment checks. Changes in this slice are uncommitted and have not been pushed or publicly deployed.
