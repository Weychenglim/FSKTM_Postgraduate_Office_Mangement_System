# Supporting supervision acceptance — 25 October 2026

This report records pending-register A01's supporting-supervision component/HTTP journey. It is scoped evidence, not a certificate for every five-module requirement or faculty policy.

## Test boundary

- `appointments.supporting_browser_journey` is an explicit opt-in Django `LiveServerTestCase`. Normal backend discovery does not require a browser.
- Each journey creates fictional users and academic records in a runner-created PostgreSQL database whose name must start with `test_`. The database is destroyed afterwards.
- The production `SupervisoryTeamManagement` component and production API services run against the ephemeral real Django server. JWT authentication is real; tokens are minted only for test users, passed through stdin and held in memory. There are no mocked academic responses.
- The browser uses an exact-width same-origin iframe. The runner checks `window.innerWidth` against 1440 or 390 pixels; Chrome's native window-size flag alone does not establish those widths.
- The login screen and full application shell are outside this component-level journey. This pass does not exercise the technical-admin permission separation or activate faculty policies.
- Browser bundles and profiles use guarded temporary-directory cleanup. No development users, credentials, appointments, Marks or schema are changed.

## Observed journey

Both viewports run the same 63 browser/API assertions:

1. A Student cannot nominate. The primary Supervisor's form requires both a selectable candidate and justification.
2. The primary submits a nomination. Student response payloads and screens omit unconfirmed candidate identity, staff nomination workflow, private justification, reasons and audit history.
3. The candidate rejects with a reason. The primary can submit a new attempt and cancel it with a reason. The Coordinator can reject a separately accepted attempt without creating an appointment.
4. Candidate acceptance forwards a new attempt to Coordinator review. An out-of-programme Coordinator and the primary nominator cannot perform final approval. The scoped Coordinator approves through the production decision dialog.
5. The active supporting Supervisor can read current research, but cannot access the private primary application or write the primary Supervisor's Marks. The team response contains no submitted Marks.
6. An active Panel member cannot be nominated for conflicting supporting duties.
7. A supporting replacement retains the incumbent before candidate acceptance and before final approval. Approval ends the outgoing membership and records replacement lineage.
8. The former supporting Supervisor loses current student-detail access while retaining their own ended-appointment history, rendered without decision controls.
9. Office closure requires a reason in both the UI and backend. The completed outcome and private reason persist. The closed member loses current-team access and retains their own outcome/history.
10. The Student sees no current supporting member after closure, may inspect confirmed historical members, and receives no staff reasons/audits. The closure dialog and Student result fit the tested viewport.
11. Office can still read the unchanged submitted total/comments. The approved replacement request remains approved after its appointment ends.

## Persisted assertions

After each browser exits, Django verifies:

- Five distinct nominations: candidate-rejected, primary-cancelled, Coordinator-rejected, approved and approved replacement.
- Exact workflow event counts of 2, 2, 3, 3 and 3. Both final approvals retain the correct scoped Coordinator actor.
- Two ended supporting appointments, exact replacement predecessor, completed outcome, private closure reason and two lifecycle events per appointment.
- Exact before/after equality for primary appointments, Panel appointments, research profiles, evaluation tasks, mark entries, component scores, task lifecycle audits and handover audits.
- Neither incoming supporting lecturer receives an evaluation task.

## Verification

The combined supporting regression run passed **27 tests in 73.583 seconds**: 16 API/workflow tests, 7 lifecycle/migration tests, 2 real PostgreSQL concurrency tests and 2 browser journeys. That run's browser journeys each passed 57 assertions. Test databases and worker clones were destroyed. The exact-width rerun passed both journeys in 27.289 seconds. Independent review identified a missing isolated justification assertion; the final journey additionally selects a valid candidate, verifies that whitespace justification keeps Submit disabled, and rejects a direct blank-justification API request. Final verification of these 63 assertions per viewport is recorded below and in root status.

Final reviewed verification passed both exact-width journeys in **28.099 seconds**, with **63 assertions at each width (126 total)** and all persisted assertions. The test database was destroyed. Independent review confirmed its justification finding resolved and reported no further findings. TypeScript, production build, Django system checks and migration-drift checks pass. The existing ExcelJS bundle-size advisory remains. No runtime source, dependency or schema change was needed.

The initial harness selected the oldest nomination despite the API's newest-first ordering. Correcting the harness to use the newly submitted record resolved its cancellation assertion. A later strict viewport check reproduced Chrome's native-window sizing mismatch; exact iframe dimensions replace that assumption. Neither was a production workflow defect.

## Run again

Build the frontend with `npm run build`, then run from the repository root:

```powershell
./.venv/Scripts/python.exe backend/manage.py test appointments.test_co_supervision appointments.test_co_supervision_lifecycle appointments.test_co_supervision_concurrency appointments.supporting_browser_journey --noinput --parallel=2
```

For concurrent acceptance work, configure a unique runner-only `DATABASES['default']['TEST']['NAME']` and keep fast password hashing limited to the test process. This session used `test_supporting_acceptance_20261025_final` and a separate database for exact-viewport reruns. No settings or `.env` file was edited.

## Remaining acceptance

- E10 establishes the core A01 journey, not every role/action/lifecycle combination. Office cancellation, Coordinator closure, scheduled/archived combinations, lifecycle audit-outage rollback, all role conflicts and all cross-screen histories must retain their own evidence boundaries.
- Existing API/lifecycle tests separately cover two-position/duplicate conflicts, final eligibility/capacity checks, graduation/withdrawal, lecturer retirement, primary handover and preservation, plus simultaneous last-position/last-capacity races. These are automated results, not additional browser journeys.
- Compound checklist rows U002–U004 and L013–L014 remain awaiting acceptance where their complete combinations, dependent reports/exports/dossiers/reconciliation or faculty-policy/template conditions are not yet established.
- Next slice: A02 research amendments/programme transfers, followed by A03 delegation, A04 carryover/handover and A05/A06 cross-module checks. Production-host acceptance remains separate.
