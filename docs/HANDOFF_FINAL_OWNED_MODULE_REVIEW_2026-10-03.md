# Final five-module review handoff — 2026-10-03

## Scope and repository state

Workspace: `C:\Users\User\Documents\FKSTM_Postgraduate_Management_System`.
Reviewed branch: `main`, commit `256ee60`. Prior completed features and Settings are committed and pushed. This review changes documentation only; none of the findings below has been fixed. Do not commit or push future implementation without the user's instruction.

The user owns only Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking. Read `PROJECT_REQUIREMENTS.md` (Product Scope and Five-Module Completion Requirements), `ARCHITECTURE_AND_CODING_DESIGN.md`, and newest `PROJECT_STATUS.md` sections first. Do not expand this task to teammate-owned Registry, Files, FAQ, Letters or Announcements. Shared auth/deployment configuration is relevant only as a dependency of the owned modules.

User request: perform a final configuration/bug review, explain development work still needed for production readiness, and hand findings to another session. This is a findings handoff, not authorization inferred for a new feature design.

## Confirmed findings, recommended fix order

### 1. P1: Supervisor replacement permits existing Panel member as primary

- `backend/appointments/serializers.py:958` (`SupervisorApplicationCreateSerializer`) checks supporting-role conflicts but not the candidate's active Panel membership or pending Panel nominations for this student.
- `backend/appointments/supervisor_handoff.py:121` (`approve_supervisor_application`) repeats the supporting-role check but has no corresponding Panel check. `appointment_lifecycle.activate_replacement` checks capacity but not this overlap.
- Reproduction used `AppointmentLifecycleTests`: assign `new_supervisor` the Panel role and create an approved active Panel appointment for the student; create a primary replacement application pointing to that lecturer and approve through `approve_supervisor_application`. Approval succeeds and both primary and Panel appointments remain active. Confirmed in isolated PostgreSQL test DB.
- Fix both submission and final activation under shared student/lecturer locking, including active/pending conflicts in both directions. Check existing Panel nomination/final-approval safeguards and candidate presentation. Preserve prior appointments/history on rejection. This is same-account role separation, independent of deferred cross-account coordinator identity.

### 2. P1: Normal Add Timeline Entry request is rejected

- `frontend/src/services/timelineApi.ts:92` sends selected `semesterId` in the POST JSON; the Office Timeline Management screen supplies it.
- `backend/dashboard/views.py:408` passes the complete request body to `TimelineEntryCreateSerializer`.
- `backend/dashboard/serializers.py:96` does not declare `semesterId`, and its unknown-field mixin rejects it.
- Reproduction: instantiate the serializer with otherwise valid P1/title/detail/action/date/role values plus `semesterId=1`. Validation returns false with `semesterId: This field is system-derived and cannot be provided.` This was executed without database writes.
- Fix the request contract while retaining authoritative semester resolution and Draft/Active restrictions. Add an actual API regression matching the frontend payload, not just a serializer test that omits the selected semester.

### 3. P1: Django admin can bypass appointment workflow/configuration services

- `backend/appointments/admin.py:55`, `:67`, `:111`, `:139` leave Panel recommendations/appointments and primary Supervisor applications/appointments editable through ordinary ModelAdmin saves.
- Runtime form inspection confirmed editable Supervisor application `status`, `proposed_supervisor`, `research_title`, and appointment `supervisor`/`status`. Those saves do not route through approval/closure/capacity/Marks handover services.
- `backend/appointments/admin.py:156` also allows document requirement label/required/active changes through default saves, bypassing `SupervisorDocumentRequirementAudit`. Only code is read-only. Model save protects code immutability, not audit creation.
- Consequence: an authorized admin can create inconsistent academic state or change configuration without required workflow audits. This is not an unauthenticated exploit; it is a supported administrative-write boundary problem.
- Make governed records read-only in Django admin or route explicit administrative actions through the same reasoned transactional services. Preserve initial profile provisioning and the intentionally supported audited Marks correction path. Add admin permission/form/POST regressions and assertions that histories and dependent Marks remain consistent. Actual admin POST bypass was not separately executed; form exposure and inherited save path were inspected directly.

### 4. P2: Negative new Marks score produces an unhandled database error

- `backend/marks/serializers.py:251` declares `marksAwarded` without a minimum. `MarkDraftSerializer.validate` checks only the upper bound.
- Its save method inserts via `MarkScore.objects.get_or_create(defaults=...)` before calling `full_clean`. A negative new score hits `marks_awarded__gte=0` at the database first. The draft view (`backend/marks/views.py:767`) catches domain conflicts but not this integrity failure.
- Reproduction used `MarkEntryWorkflowTests`: send a new component score `-1.00`; `is_valid()` returns true, then `save()` raises `IntegrityError`. Confirmed in isolated PostgreSQL test DB. The API would return 500; transactional rollback prevents partial draft persistence.
- Validate a nonnegative decimal before inserting. Test new and existing scores, draft and submission paths, 400 responses and unchanged data. Keep the database constraint.

### 5. P2: Lecturer Marks semester source and filter are incorrect

- `backend/marks/serializers.py:130` serializes `semester` from `profile.semester` instead of the evaluation period. A retained research profile can belong to an older semester than a new evaluation task.
- Isolated probe changed the fixture profile semester to `Old profile semester` while keeping the task's period semester unchanged; the serialized task returned the old profile semester.
- `frontend/src/components/LecturerMarksEntry.tsx:294` hardcodes `Sem 1 2025/2026` and `Sem 2 2024/2025`. Filtering at line 165 uses exact string equality. Current semesters cannot be selected; mismatched labels hide tasks.
- Derive task semester from the period and populate filter options from authoritative task/period data, preserving access to historical assignments. Test multiple semesters, profile handover, historical tasks and current filter selection.

## Production configuration work (separate from module defects)

- `backend/config/settings.py:184` hardcodes process-local cache and explicitly says multi-worker production must use a shared cache. There is no environment-selected shared-cache configuration. Before a multi-worker rollout, configure a shared supported backend and verify consistent authentication throttle counts; do not count this as a new academic module feature.
- The deployment runbook already records that a production WSGI runtime/service must be selected and pinned. SMTP, HTTPS/proxy trust, private-media storage, backup restore and real-host configuration still need deployment validation. No hosting exists yet. Do not install infrastructure or claim production deployment in this task.
- Faculty templates/final rules and coordinator cross-account identity policy remain explicitly deferred. Antivirus and post-submission document replacement are outside the agreed Supervisor-intake version. They are not newly discovered missing required features.

## Verification performed and limits

- Ran `python manage.py test accounts academics appointments dashboard marks --parallel 2 --noinput --verbosity 1`: **594 tests passed**. The log reports 35290.818 seconds, including a long session interruption; do not present that as a normal performance benchmark. Log: `backend/final-owned-review.log` (ignored).
- Three targeted observation probes passed by confirming the existing bad behavior: role overlap, negative new score IntegrityError, wrong task semester. Runtime: 13.530 seconds. Log: `backend/final-review-probes.log` (ignored). These are diagnostic probes, not regression tests asserting desired behavior.
- Probe script is outside Git at `%TEMP%\fsktm-final-review-probes.py`. It uses existing `AppointmentLifecycleTests` and `MarkEntryWorkflowTests` fixtures and Django `DiscoverRunner` with three explicit test labels; it does not modify the development database. Set `PYTHONPATH` to the backend directory to rerun. Replace observations with failing desired-behavior regressions during implementation.
- Timeline serializer and Django admin form probes were executed via `manage.py shell`, without writes.
- No new frontend full-suite run, dependency audit, production deployment or browser acceptance was performed in this review. Earlier recorded passes remain historical evidence only.
- Parallel review agents stopped at a usage limit before completing their broad reviews. The parent verified the findings above directly. This is a bounded review, not proof of absence of other bugs.
- Browser automation previously fails during initialization with `failed to write kernel assets: The system cannot find the path specified`; retry after reset also failed. Manual four-role acceptance remains necessary.

## Suggested next-session execution

1. Confirm clean base and preserve this documentation. Read relevant skills/instructions and the three source-of-truth docs.
2. Implement the five findings as focused fixes, starting with role integrity, Timeline contract and admin bypasses. Add regressions that first reproduce the incorrect behavior.
3. Serialize backend test processes; use at most two PostgreSQL test workers. Do not run separate agents' migration tests against the same test database concurrently.
4. Use root `.venv/Scripts/python.exe`. Supported local Node 22.22.0 is at `C:/Users/User/AppData/Local/npm-cache/_npx/6d82ddbdd7da268b/node_modules/node/bin/node.exe`; prepend that directory for npm commands. System Node was below the required floor.
5. Run affected suites, Django checks and migration drift, all frontend scripts, lint, build and production artifact guards. Update all three mandatory docs as appropriate with actual results. Review fixes before declaring completion; keep browser acceptance distinct.

No application code was changed by this review. Do not say the five modules are production-ready while these confirmed defects remain.
