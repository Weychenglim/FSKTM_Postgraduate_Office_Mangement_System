# Research amendment and programme transfer acceptance — 25 October 2026

This is scoped pending-register A02 evidence. It does not certify all five-module requirements, every lifecycle/report/export combination, faculty policy or production deployment.

## Boundary

The opt-in `appointments.research_browser_journey` LiveServerTestCase refuses fixture setup outside a runner-created `test_` database. Each journey provisions fictional participants, active primary/supporting/Panel membership, one submitted Supervisor evaluation (85), one Panel draft (70), and an approved completion window. The production `ResearchAmendments` component and real API services run against the ephemeral Django HTTP server with real JWT authentication. Tokens are passed through stdin and held in memory; academic responses are not mocked.

The Node runner asserts exact iframe viewport widths of 1440 and 390 pixels and cleans up bundles/browser profiles under verified temporary paths. Django destroys its test databases and worker clones. No development records, credentials, schema, dependencies or runtime workflow source were changed. Login and the complete application shell are outside this component-level journey.

## Browser/API evidence

Each viewport passes the same **74 assertions**:

- Research changes require a reason in both the UI and API. Students cannot initiate Office programme transfers, and a second pending proposal conflicts.
- Student cancellation and primary-Supervisor rejection preserve the saved research profile. A separate research proposal is approved successfully through the primary Supervisor's production dialog.
- The programme Coordinator cannot decide research-only changes. Supporting and unrelated lecturers cannot read the primary's private decision record; an unrelated lecturer's collection is empty.
- A separate proposal is reviewed in two tabs: one real API decision commits while the mounted dialog remains stale. The stale dialog rejects another decision, exposes explicit latest-record review and reloads the saved outcome. It adds no second decision event or research revision.
- Office creates transfers through the production form with a destination and required reason. The preview retains the primary/supporting/Panel membership and one unfinished task.
- Office can cancel; the source Coordinator can reject; the destination Coordinator can reject after source endorsement. Cancelled/rejected attempts remain distinct history.
- Destination approval cannot bypass source review. Each Coordinator's dialog requires explicit team acknowledgement, and each backend stage independently rejects its omission.
- Source approval forwards the request without changing the current programme. Replaying that old stage returns a conflict instead of advancing the destination stage.
- Final destination approval records both acknowledgements, updates programme/revision consistently and retains approved research wording.
- The former source Coordinator can read their exact decision history but cannot open the current research profile or see decision controls on the approved historical request.
- Student history retains all eight attempts and three baseline/applied revisions without private submitted/draft evaluation comments. The final Student profile renders the destination programme and accepted research title; profile and decision-dialog layouts fit the actual viewport.

## Persisted assertions

After each browser exits, Django checks eight request outcomes in order: research Cancelled, Rejected, Approved, stale-tab Rejected; transfer Cancelled, source Rejected, destination Rejected, Approved. Their exact event counts are `2, 2, 2, 2, 2, 2, 3, 3`.

The research approval actor is the primary Supervisor. The final transfer endorsement/final approval actors are respectively the source and destination Coordinators, both with retained-team acknowledgement. The Student and research-profile programme match the destination; the profile has the accepted title/abstract and revision 2, with exactly three baseline/applied revision rows. The transfer snapshot retains one primary, one supporting Supervisor and one Panel member.

Exact before/after row snapshots remain equal for original Supervisor applications, primary appointments, Panel appointments, supporting nominations/appointments, evaluation tasks, submitted/draft mark entries, component scores, completion windows and their audits, and Marks task lifecycle/handover audits. Thus the research/transfer journeys do not rewrite the original application, change team membership or lose/recreate dependent Marks/window data.

## Verification

The final combined run passed **32 tests in 53.315 seconds**:

| Suite | Tests | Evidence type |
| --- | ---: | --- |
| Research amendment API/workflows | 16 | Automated HTTP/API and persisted assertions |
| Amendment/lifecycle integration | 10 | Automated integration and preserved-record assertions |
| Amendment concurrency | 3 | Real PostgreSQL competing-request/final-approval/withdrawal races |
| Amendment migration | 1 | Additive migration and baseline/history preservation |
| Research/transfer browser journeys | 2 | Production React/real HTTP at exact 1440/390px; 148 browser/API assertions total |

All runner databases and clones were destroyed. TypeScript, production build, Django checks, migration drift, runner syntax and scoped whitespace checks pass. The existing ExcelJS bundle-size advisory remains. Independent scoped review found no actionable issues. No production defect was found in this slice.

Build the frontend first with `npm run build`, then run explicitly from the repository root:

```powershell
./.venv/Scripts/python.exe backend/manage.py test appointments.test_research_amendments appointments.test_amendment_lifecycle appointments.test_amendment_concurrency appointments.test_amendment_migration appointments.research_browser_journey --noinput --parallel=2
```

Concurrent acceptance runs should use distinct runner-only `DATABASES['default']['TEST']['NAME']` values. This session used `test_research_acceptance_20261025_final`; fast password hashing was limited to that disposable process and the test class. No settings or `.env` file was edited. The new journey is opt-in; normal backend discovery does not require Chrome/Edge.

## Remaining boundaries

The 16 API/workflow tests additionally cover the same Coordinator explicitly serving both transfer stages, changed research/team baselines, unresolved nomination blockers, missing/ineligible destination Coordinator, Office correction attestation, immutable records and deferred/cancel behavior. Lifecycle tests cover primary closure, withdrawal/graduation, transfer nomination blocking and recorded research/Marks/window preservation. These are automated evidence, not additional browser journeys.

Complete combinations involving coordinator delegation expiry/revocation, semester/carryover, audit-outage rollback, every historical screen/report/export/dossier and reconciliation remain A03–A06 acceptance work. Transfer initiation relocation to Registry remains a separate ownership/navigation proposal. Faculty rules and template decisions remain external. Checklist compound rows T001–T006 are not promoted merely because this scoped suite passes; older research-only Coordinator-approval wording is superseded by the current primary-Supervisor final-decision requirement.

Next slice: A03 acting delegation grant/expiry/revocation, programme scope, queue refresh and dependent privacy.
