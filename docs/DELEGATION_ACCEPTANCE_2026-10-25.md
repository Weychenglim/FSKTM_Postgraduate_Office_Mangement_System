# Acting Coordinator delegation acceptance — 25 October 2026

This records scoped A03/E12 evidence. It does not certify every five-module compound requirement, faculty policy, technical-admin separation or cross-account identity policy.

## Boundary

The opt-in `accounts.delegation_browser_journey` LiveServerTestCase refuses fixture setup outside a runner-created `test_` database. Fictional fixtures include pending primary requests in regular, delegated and unrelated programmes, a pending supporting nomination, Panel work and submitted Marks. Production CoordinatorDelegations, CoordinatorRequestsBrowse and SupervisoryTeamManagement components/services use real JWT-authenticated HTTP against an ephemeral Django server. Academic responses are not mocked; test tokens stay in memory.

The runner asserts actual 1440/390px iframe widths and removes its bundles/browser profiles from verified temporary paths. Scheduled, inclusive-end-date and expired phases patch only `accounts.delegations.today` in the isolated Django test process. They demonstrate deterministic Malaysia calendar-date boundaries, not a wait for real midnight. No development clock, account, academic record, runtime source, schema, dependency or credential was changed.

## Browser/API evidence

Each viewport completes 101 assertions: 56 for grant/revocation, 15 Scheduled, 14 Active on the inclusive end date, and 16 Expired on the following date. Across both viewports this is **202 assertions**.

- Office form whitespace validation retains entered dates and creates no grant. A valid grant adds only the specified programme; overlapping grants conflict. Students cannot read staff history, and Coordinators cannot grant their own access.
- Effective identity scope, primary request queues, Panel workspace scope, reports and dossier access follow delegation state while retaining regular programme access. Unrelated-programme requests remain excluded. Coordinator reports/dossiers hide Marks; delegation never permits Office reconciliation access.
- An acting Coordinator approves supporting work with their own recorded identity. After a separate Office request revokes the grant, an already-open second approval is denied. Explicit latest-record review removes approval controls without creating another decision.
- A mounted production primary-request queue reloads on focus after external revocation: delegated rows disappear while regular-programme work remains. Queue and delegation-history layouts fit each exact viewport.
- Office revocation requires a reason. Three separate grants remain visible as revoked history; replay cannot overwrite the reason. The acting Coordinator sees their own history without management controls; another Coordinator cannot read it. The permanent programme Coordinator retains their own authority.
- A scheduled grant conveys no current authority. Its inclusive end date conveys authority; the next date removes queues, decisions and dossier access. Expired grants cannot be rewritten as revocations. Date-derived state does not mutate stored grant history.

## Persisted records and exports

Exact before/after snapshots remain equal for original Supervisor applications, primary appointments, Panel recommendations, research profiles, evaluation tasks, submitted Mark entries/scores, and task lifecycle/handover audits. The intended first supporting approval remains Active after revocation, with the actual acting Coordinator recorded in its workflow event and appointment. The second nomination stays Pending Coordinator with only its nomination/acceptance events. Each of three grants retains the Office grant/revocation actor and the original revocation reason.

After every browser phase Django fetches and parses a real authenticated XLSX response with openpyxl. The Supervisor sheet always includes the regular-programme request, includes the delegated request only during Active authority, and never includes the unrelated-programme request. Sheet names are exactly Summary, Research Amendments, Supervisor and Panel; no Marks sheet is exposed. Browser checks separately verify real spreadsheet bytes. Native browser file saving is outside this evidence.

## Verification

The final combined run passed **46 tests in 219.809 seconds**:

| Suite | Tests | Evidence |
| --- | ---: | --- |
| Delegation API, retirement and concurrency | 9 | Validation, scope/audits, future/expired retirement eligibility and real PostgreSQL overlapping-grant/revocation locking |
| Appointment delegation integration | 7 | Primary, supporting and Panel decisions, actual actors, history, revocation and expiry |
| Delegation migration | 1 | Existing permanent Coordinator preservation without invented grants |
| Reports | 12 | Role/programme boundaries, delegated exports/dossiers, capacity and date filters |
| Progress dossiers | 13 | Participant scope, private-field redaction and historical/current projections |
| Opt-in browser journeys | 4 | Eight browser phases at exact 1440/390px, 202 assertions plus persisted-record and parsed-XLSX assertions |

Django destroyed the test databases and worker clones. TypeScript, production build, Django system check, migration drift, Node runner syntax and scoped whitespace checks pass. The existing ExcelJS bundle-size advisory remains. Independent scoped review was attempted but the reviewer could not run because of an account usage limit. Direct review of the three new test files found no actionable issue; independent review remains unavailable. No production defect was demonstrated.

Build the frontend with `npm run build`, then run explicitly from the repository root:

```powershell
./.venv/Scripts/python.exe backend/manage.py test accounts.test_delegations appointments.test_coordinator_delegation accounts.test_delegation_migration dashboard.test_reports dashboard.test_progress_dossier accounts.delegation_browser_journey --noinput --parallel=2
```

This session supplied runner-only test database name `test_delegation_acceptance_20261025_final` and fast password hashing in that disposable process. Concurrent runs need distinct test names. No settings or `.env` file was edited; ordinary backend discovery does not launch these opt-in Chrome/Edge journeys.

## Remaining acceptance

The retirement/concurrency/migration scenarios above are backend evidence, not additional browser journeys. Full application-shell/login refresh, research-transfer/delegation combinations, carryover/semester transitions, complete retirement/responsibility combinations, audit-outage rollback and every historical report/export/dossier/reconciliation combination remain scoped work. Technical-admin separation and faculty template/identity decisions remain separate. The historical checklist count remains 48 Passed / 358 Awaiting acceptance because compound rows are not promoted by this slice alone.

Next slice: A04 carryover capacity reassessment and semester handover.
