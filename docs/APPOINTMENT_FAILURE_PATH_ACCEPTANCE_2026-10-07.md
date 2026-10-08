# Appointment rejection, capacity and private-file acceptance

Date: 7 October 2026. Scope: the negative Supervisor/Panel branches and their shared capacity, document and audit boundaries within the five owned modules. The earlier [positive cancellation/replacement report](APPOINTMENT_REPLACEMENT_ACCEPTANCE_2026-10-07.md) remains separate. This report does not certify the entire system.

## Isolation and preconditions

The fresh synthetic database is `fsktm_failure_20261007_e35654`. Django/Vite acceptance services use loopback ports 8011/3011 with real APIs and mock/demo modes disabled. The existing development database, normal 8000/3001 services and prior acceptance databases are preserved. Passwords, launchers, logs and private-media fixtures remain ignored.

Seeded prerequisites are one Active semester (Semester I 2026/2027), one research profile, an incumbent Supervisor and Panel, a complete Published capacity plan v1, and two Published open evaluation periods. The four baseline entries are submitted totals 85/80 and drafts 46/39, with original scores/comments retained. Synthetic actors cover the owning/unrelated Students, incumbent/incoming Supervisor and Panel, scoped/unrelated Coordinator, Office and a zero-capacity candidate.

Applications/recommendations 1 are seeded incumbent history. Browser actions create rejected attempts 2/3. Accepted pending attempts 4 are created through the actual Student/Supervisor/Panel APIs for the late-policy browser checks; they are not counted as browser-created submissions.

## Browser scenarios

| Scenario | Observed result | Persisted evidence |
| --- | --- | --- |
| Student replacement without required proposal | Required Research Proposal validation | No new application, document or workflow event |
| Unsupported extension or over-10-MB proposal | Client validation displays the file error | No writes |
| Text renamed to PDF | Backend `400`, visible invalid PDF structure error | No writes |
| Full Supervisor candidate, zero limit | Candidate remains visible and disabled | Published capacity v1 authoritative |
| Valid replacement then requested Supervisor rejection | Request leaves lecturer queue; Student history returns it; incumbent remains active | Application 2 `REJECTED_BY_SUPERVISOR`; exact reason and two events |
| Student fresh resubmission; Supervisor accepts; Coordinator rejects | Empty Coordinator reason is rejected in-app; reasoned rejection leaves no final queue item | Application 3 `REJECTED_BY_COORDINATOR`; three events; fresh document retained |
| Full Panel candidate, zero limit | Nomination dropdown disables the full candidate | No nomination for that candidate |
| Selected Panel rejects replacement | Mandatory reason; rejection removes pending reservation and review queue item | Recommendation 2 `REJECTED_BY_PANEL`; two events; incumbent active |
| Supervisor resubmits; selected Panel accepts; Coordinator rejects | Empty reason leaves pending state unchanged; reasoned rejection retained in history | Recommendation 3 `REJECTED_BY_COORDINATOR`; three events |
| Office rejection details | Both rejected attempts retain candidate identity, correct rejection stage, reason and available timestamps | Read-only detail and audit counts 2/3 |
| Office clones v1, edits incoming Supervisor limit to zero and publishes v2 | Reason/confirmation required; v2 Published, v1 Superseded, incoming Supervisor Full | Clone, entry update, supersession/publication audits |
| Final Supervisor approval after reduction | `409`: no available capacity; pending request and incumbent retained | Application 4 remains `PENDING_COORDINATOR` with two events |
| Final Panel approval after effective unavailability | `409`: unavailable through 2026-10-20; persisted review remains visible | Recommendation 4 remains `PENDING_COORDINATOR` with two events |
| Office Panel workload snapshot | Original AVAILABLE/FULL LOAD display reproduced; corrected snapshot shows TEMPORARILY UNAVAILABLE/public date and INELIGIBLE | Rendered regression red/green; live browser recheck |

Reasons are synthetic test text. Stored rejection reasons exactly match the relevant actor's input. Rejected requests retain their immutable documents/history; later attempts are distinct records.

The Office date inputs retained their initial September value when filled by the browser tool. Native arrow keys demonstrably change the date, but reliable complete date entry was not achieved during this slice. The mistakenly created 7 September window was cancelled with a fixture-correction reason through the authorized Office API; a new 7–20 October window was created through that API. Office browser re-entry confirms the cancelled history, effective window and immutable audits. This establishes the late-availability approval guard, not complete browser date-entry acceptance.

## Private-file HTTP and privacy checks

Live authenticated requests target the retained rejected application 2/document 1 download endpoint.

| Actor group | Result |
| --- | --- |
| Owning Student, requested Supervisor, scoped Coordinator, Office | `200`; exact original 614 PDF bytes; attachment and nosniff headers |
| Unrelated Student, incumbent Supervisor, incumbent Panel, incoming Panel, unrelated Coordinator, full candidate | `404`; no PDF bytes |
| All ten authenticated actors requesting unknown file ID | `404` |
| Anonymous access | `401` |

The script respects actual login throttling and Retry-After; no cache clearing or throttle weakening was used. Tokens remain in memory and are omitted from evidence output.

Independent authenticated public reads confirm that the unavailable incoming Panel is excluded from new nomination candidates, the Student sees only the confirmed incumbent Panel, and Student/lecturer/coordinator projections exclude the internal Office availability reason. Approval conflicts disclose only the public date/capacity message.

## Demonstrated correction

`PanelAppointmentManagement.tsx` previously rendered the legacy occupancy `availability` field in its snapshot, even when `capacityState` declared temporary unavailability or ineligibility. The row now uses shared capacity labels and appropriate colours, exposes the public end date only for temporary unavailability, and retains legacy fallback when metadata is absent. Seat counts and clamped utilization are preserved. No backend behavior, API, schema or dependency changes were needed.

`PanelWorkloadSnapshotRow.test.tsx` renders the actual row component. Before the behavior fix it produced green AVAILABLE instead of TEMPORARILY UNAVAILABLE; after correction it verifies unavailable/end-date display, full, over-capacity, unconfigured, ineligible, authoritative available and legacy fallback states. Browser recheck matches the expected persisted policy.

## Final independent invariants

The final assertion script passes: one unchanged research profile; one active incumbent Supervisor and Panel; four original active tasks/entries with unchanged scores/comments/status/totals; four applications and four recommendations including seeded history; three valid private PDFs with exact size/checksum/bytes; fourteen workflow events. Failed final approvals add no workflow decision event or appointment and no appointment lifecycle, task lifecycle or Marks handover audit.

Capacity audits total fourteen: one plan creation, one copy, six entry updates, two publications, one supersession, two availability creations and one fixture cancellation. The effective window remains 7–20 October. Only the new pending Panel attempt retains one reserved seat; rejected attempts release theirs.

## Verification and evidence

From `backend`, with the repository virtual environment:

```powershell
../.venv/Scripts/python.exe manage.py test appointments.test_supervisor_workflow appointments.tests appointments.test_supervisor_documents appointments.test_appointment_lifecycle --parallel 2 --noinput
```

Result: **91 tests passed in 478.759 seconds**, PostgreSQL two-worker run. Covers stage/ownership/reasons, capacity/availability, private-document validation/access and atomic lifecycle preservation. The historical full-backend suite is not rerun by this command.

Fresh final checks pass:

- All **69 frontend test scripts**, including the rendered snapshot regression and both production artifact guards, run with the existing Node 22.22.0/tsx runtime.
- `tsc --noEmit` passes; `vite build` passes in 42.19 seconds.
- Django `check`, `makemigrations --check --dry-run` and `git diff --check` pass.
- Independent read-only scoped review reports no critical or important findings and independently reruns the new rendered regression successfully.
- Independent fixture assertions and public privacy reads pass. The regenerated checklist contains 396 unique source clauses, with this evidence recorded as E6.

The retained ignored logs are `backend/.env.failure-regressions.log`, `backend/.env.failure-private-access-results.json`, `backend/.env.failure-final-results.json` and `frontend/.env.failure-{frontend-tests,tsc,build}.log`. The isolated servers are stopped after verification; the synthetic database/evidence are retained and the normal loopback 8000/3001 services remain available.

Screenshots are retained outside Git under `frontend/acceptance-evidence/failure-paths-2026-10-07/`: 01/02 upload errors, 03/04 Supervisor rejection/Student history, 05 Coordinator Supervisor rejection, 06 full Panel disabled, 07 selected Panel rejection, 08 empty Coordinator rejection reason, 09 rejected Panel history, 10 audited effective policy, 11/12 final-approval conflicts, 13 retained incumbent, 14/16 Office rejection details, 15 corrected authoritative workload snapshot and 17 final viewport proof.

Final cleanup confirms no listener on 8011/3011. The normal Django/Vite services were restarted as hidden background processes after their previous sessions ended; direct/proxied `/api/health/` on 8000/3001 both return `200`. This serves the current working tree with the preserved development database; these new changes have not been pushed to main.

## Explicit remaining acceptance

The browser download control reached a successful backend download response, but its saved-file event could not be captured. Browser file saving remains awaiting acceptance; the passing exact-byte/security HTTP matrix is distinct evidence. Empty Supervisor rejection uses a native alert; two tool-controlled tabs stalled, so the backend reason regression passes while reliable browser alert dismissal remains unconfirmed. Native Office date entry also remains a separate browser check as described above.

This slice does not exercise every role/semester/lifecycle/report/export combination, scheduled-period replacement, programme/role Marks targeting and backups, completion-window grant/revoke/expiry, transfers, co-supervision or acting-delegation branches. The [five-module checklist](FIVE_MODULE_ACCEPTANCE_CHECKLIST.md) retains compound requirements awaiting acceptance. Production-host/HTTPS/SMTP/backup checks and faculty/coordinator-identity policy remain separate. Changes are uncommitted/unpushed.
