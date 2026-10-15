# Panel authoritative programme guard report — 2026-10-14

## Scope and implementation

Task 1 changed only:
- `backend/appointments/panel_access.py`
- `backend/appointments/views.py` (focused additions preserving pre-existing dirty changes)
- `backend/appointments/appointment_lifecycle.py` (controller explicitly extended ownership to close the related Panel-end bypass)
- `backend/appointments/test_panel_programme_guard.py` (11 new targeted tests)
- this report

The effective Panel Coordinator scope requires a linked authoritative `Student` record and normalized agreement between its programme and the research profile. Shared SQL scope and object authorization enforce that boundary for the Coordinator decision queue, recommendation detail links/team `canView`, and approve/reject. Workflow mutations recheck after Student/request locks, lock and reread the profile, and retain official active delegation checks. A changed Student link requires fresh review. Workspace records retain unlinked legacy monitoring by profile programme, but those rows never enter the decision queue or grant exact Coordinator decision access.

Panel appointment closure uses the same predicate, including a locked check. Primary Supervisor closure remains unchanged. Office and existing assigned lecturer recommendation audit access remain; Office legacy closure remains supported. Carryover projections already use the authoritative Student and are audit-only for Coordinators, so no unrelated projection changes were needed.

## Regression evidence

Before implementation, the new recommendation regression suite had four expected assertion failures: both unauthorized approve and reject returned 200, mismatch queue/access was exposed, and unlinked legacy records entered the decision queue. Valid regular/delegated decisions and assigned/Office audit checks passed. A test-fixture cleanup issue was corrected before recording this red run.

Before extending the lifecycle guard, new Panel-end tests exposed two additional expected failures: mismatched and unlinked Coordinator closures returned 200. The shared guard corrected both.

The final new tests cover both decisions and no workflow/appointment side effects, foreign and mismatched scope, exact links and team capability, unlinked monitoring, missing authoritative Student rows, whitespace/case normalization, post-precheck programme changes, current and delegated authority, Panel closure, and Office/assigned audit preservation.

## Verification

- Original scoped Panel/delegation/workspace/privacy run: 85 tests passed, 0 failures (161.548 seconds; normal fixture hashing).
- Intermediate targeted guard/delegation run: 17 tests passed, 0 failures.
- Expanded suite before final missing-Student lifecycle regression: 99 tests passed, 0 failures.
- Final expanded suite: 100 tests passed, 0 failures (12.564 seconds). System checks passed; test database destroyed successfully.

Expanded labels: `appointments.tests`, `appointments.test_coordinator_delegation`, `appointments.test_supervision_panel_detail`, `appointments.test_student_team_panel_privacy`, `appointments.test_coordinator_workspace`, `appointments.test_panel_programme_guard`, `appointments.test_appointment_lifecycle`.

Commands ran from backend via `../.venv/Scripts/python.exe`. Expanded runs apply a process-local MD5 test password hasher to reduce fixture setup time; production settings/files were not changed. Tests used Django's isolated test database. No live academic decisions, commit, push, reset, cleanup, frontend changes, or root documentation edits were performed.

## Limits / integration

Deterministic tests change programme data between precheck and workflow locks; they do not simulate simultaneous PostgreSQL connections. Existing delegation/revocation behavior is covered by the delegated suite. The controller owns updates to the three mandatory root project documents and the user-facing frontend confirmation integration.
