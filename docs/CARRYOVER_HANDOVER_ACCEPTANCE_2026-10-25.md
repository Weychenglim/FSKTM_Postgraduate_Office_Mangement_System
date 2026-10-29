# Carryover and semester handover acceptance — 25 October 2026

This is scoped A04/E13 evidence for existing workflows. It does not certify every five-module compound clause, faculty template/policy decision, full application shell or production deployment.

## Boundary

The opt-in `appointments.carryover_browser_journey` LiveServerTestCase refuses fixture setup outside a runner-created `test_` database. Each reassessment journey provisions an independently isolated pending primary Supervisor, supporting Supervisor or Panel request in a Closed semester, a current Active semester with Published capacity, original-semester unavailability and submitted Marks. The separate handover fixture has an expired outgoing Active semester, a ready Draft target, one submitted primary evaluation (85), one Panel draft (70), a live Panel appointment and an active completion window.

Production CapacityReassessments and SemesterActivationSection components and real services run against ephemeral Django HTTP with real JWT authentication. Academic responses are not mocked. Test tokens remain in memory, the runner asserts actual 1440/390px iframe widths, and browser artifacts are cleaned up from verified temporary paths. No development clock, credentials, academic records, runtime source, schema or dependencies were changed. Fixtures establish their semester dates relative to Malaysia's current date; no production clock is patched.

## Reassessment evidence

Each of the three request kinds passes **30 browser/API assertions at each viewport** (180 total):

- Student and Lecturer reads are forbidden; an unrelated Coordinator sees no records. The programme Coordinator reads original/current policy without Office mutation controls and cannot authorize through the API.
- Original Closed-semester unavailability blocks final approval before authorization. Current Published capacity remains visibly distinct. Whitespace reasons disable confirmation; a direct blank-reason request fails without adding history.
- Office grants through the real dialog without approving the appointment or changing its stage. Replacing a grant retains the original event; reasoned revocation retains all history and restores original-semester capacity enforcement.
- A new grant after revocation retains the revoked attempt. A separate real HTTP replacement commits while another dialog remains open. The stale dialog blocks replay and requires explicit latest-record review; recovery creates no duplicate event.
- Grants/replacements/revocation do not increase workload or reservations. Existing Coordinator final approval succeeds against authorized current policy and consumes authority once. The original request semester remains Closed and unchanged.
- Existing replay contracts are asserted individually: primary approval returns its saved result, supporting approval returns 409, and Panel approval returns 400. All retain exactly one consumption event and appointment; the tests do not change these API contracts.
- Coordinator dossiers continue to hide Marks, Students cannot inspect internal authorization history, consumed history becomes read-only and records the Published plan actually checked. Capacity cards omit private availability reasons. The mounted history fits each exact viewport.

After each browser exits, Django asserts the exact event sequence `GRANTED, REPLACED, REVOKED, GRANTED, REPLACED, CONSUMED`. The first five actors are Office and the final actor is the actual programme Coordinator. Consumption records the current target semester/Published plan, and the expected appointment exists Active. The pending request becomes Approved while retaining its original semester.

## Semester handover evidence

Each viewport passes **17 browser/API assertions** (34 total):

- Activation readiness is Office-only. The production readiness section names the outgoing semester. A real preview reconciles one submitted result, one draft, one unfinished evaluation and one active completion window.
- Direct activation without review, with a forged token or without unfinished-work acknowledgement fails. The production activation dialog requires a nonblank reason and its acknowledgement checkbox before enabling confirmation.
- The open activation review fits the exact viewport. Confirmation activates the target and closes the source atomically. The current-semester endpoint resolves the target, and the old Published Marks period becomes Closed.
- An active unfinished completion window blocks archival of the source semester. The assigned Panel member can still edit the historical draft through that retained window. Coordinator reports continue to hide Marks.

Django verifies exactly one HANDOVER_CLOSE and one ACTIVATE semester audit with the Office actor and recorded reason, plus one SEMESTER_CLOSE Marks-period audit. Existing primary/Panel appointments and recommendations remain unchanged.

Across all eight journeys, exact row snapshots preserve the original approved application, Mark entries/scores, evaluation tasks, task lifecycle/handover audits, completion windows and window audits. The handover retains both submitted and draft values; no tasks or windows are recreated. The primary replacement's intended appointment/profile handoff is separate from these retained historical records.

## Verification

The combined gate passed **63 tests in 76.819 seconds**:

| Suite | Tests | Evidence type |
| --- | ---: | --- |
| Capacity reassessment | 16 | 14 API/integration cases plus two real PostgreSQL revocation/semester-closure races |
| Reassessment migration | 1 | Additive schema with preserved appointment/Marks/completion history |
| Activation readiness | 7 | Date/capacity/current-semester gates, changed readiness and access boundaries |
| Closure preview | 13 | Snapshot/acknowledgement, changed task/window identity, handover and archive protection |
| Completion windows | 14 | Eligibility, expiry, submitted snapshots, history, pause/replacement and rollback |
| Capacity/handover locking | 4 | PostgreSQL generation/backup versus replacement races, including legacy-lock sensitivity controls |
| Opt-in browser journeys | 8 | Three request kinds plus semester activation at 1440/390px; 214 assertions plus persisted checks |

Direct review tightened the activation layout check to run while its review dialog is open. The final two activation journeys then passed in **7.253 seconds**, retaining 17 assertions per viewport. TypeScript, production build, Django system check, migration drift, runner syntax and scoped whitespace checks pass. The existing ExcelJS bundle-size advisory remains. No production defect was demonstrated.

Early failures were test setup/contract assumptions: a missing required Panel appointment Supervisor link, a readiness mount selector expecting a section where the component uses a card, and incorrect duplicate-approval response expectations. These were corrected using model/component/API source. An early parallel failure also hit Django's missing traceback-pickling support; the final combined gate ran serially without adding dependencies. All failed-run test databases/clones were removed; the successful runners destroyed their databases. The current A04 prefix was checked for leftovers.

Independent review remained unavailable after the earlier reviewer's account usage-limit failure. Direct scoped review completed; no independent approval is claimed. This work remains local and separate from the earlier release committed by the other active chat.

Build the frontend first with `npm run build`, then run from the repository root:

```powershell
./.venv/Scripts/python.exe backend/manage.py test appointments.test_capacity_reassessment appointments.test_capacity_reassessment_migration academics.test_activation_readiness academics.test_closure_preview marks.test_completion_windows marks.test_capacity_handover_locking appointments.carryover_browser_journey --noinput
```

This session used runner-only database name `test_carryover_acceptance_20261025_final` and fast hashing in the disposable process; final review used its own `_review` database. Concurrent runs need distinct test names. No settings or `.env` file was edited. Normal backend discovery does not launch these opt-in Chrome/Edge tests.

## Remaining acceptance

Changed active targets, capacity becoming full, changed eligibility, archived-source denial, acting-Coordinator scope, migration and races have fresh automated backend evidence; they are not additional browser journeys. Complete combinations with research transfers, delegation changes, participant terminal transitions, other historical views, report/export/dossier reconciliation and outage rollback remain A05/A06 work. Full application-shell/login and native file-saving/date-control behavior retain their own boundaries. Compound/external checklist rows remain pending; the historical 48 Passed / 358 Awaiting acceptance count is unchanged.

Next slice: A05 Dashboard/Timeline/report/export/dossier/reconciliation combinations.
