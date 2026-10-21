# Connected operational periods implementation plan

> Execute in this session using the executing-plans/subagent-driven-development workflow. Do not commit, push or use a browser. Preserve all existing uncommitted work on codex/portal-consistency-and-toast.

**Goal:** Office manages operational deadlines and extensions from Timeline Management; Supervisor and Panel intake respects configured periods; Marks retains authoritative periods/completion windows; calendar imports preview safely and reminders follow effective deadlines.

**Spec:** docs/SEMESTER_PERIODS_IMPROVEMENT_PROPOSAL_2026-10-16.md, approved by the user's instruction to implement, with the subsequent single Timeline Management entry-point clarification.

## Constraints and rulings

- Work in the existing feature checkout because it contains the prior authorised shared UI changes; a new checkout would omit these dependencies. No destructive Git operations or new commits.
- No new dependencies. Use Django/DRF, existing signing, transaction and notification utilities; existing React primitives and services.
- No authoritative student P1/P2 attribute exists. Calendar levels remain descriptive; operational scope uses semester/activity/student programme. Do not infer P1/P2 eligibility from titles or course-code strings.
- Marks period/task records, permissions, effective task deadlines, submitted scores and lifecycle history remain authoritative. Date changes use existing Marks services and task windows.
- Newly added appointment enforcement is disabled until Office explicitly enables each activity for a semester after configuring published periods. Missing/ambiguous periods fail closed after enabling. Prior requests remain reviewable under their existing rules.
- Only Supervisor application and Panel recommendation creation gain intake guards. Cross-programme lecturers remain eligible.
- Date-only calendar imports use complete Asia/Kuala_Lumpur calendar days. Operational timestamps preserve exact instants.
- Students never receive Marks period/task/extension data or private Panel workflow details.
- Existing records migrate additively with nullable links and no retrospective gates. No live academic submissions, test emails or notifications during verification.

## Task 1: Appointment periods and exceptions

Owner: period backend worker. Files: new academics/operational_period_models.py, operational_periods.py, operational_period_views.py, focused tests; import models from academics/models.py; additive academics migration; academics/urls.py; guards in appointments/serializers.py.

- [x] Test date/scope/publication validation, overlap rejection, Office permissions, enforcement opt-in, before/open/after cutoffs, direct API rejection and post-intake review preservation.
- [x] Implement OperationalPeriod with academic_semester, activity (SUPERVISOR_APPLICATION/PANEL_RECOMMENDATION), name, programme_scope ALL/SELECTED, programmes, opens_at/closes_at, lifecycle_status DRAFT/PUBLISHED/CLOSED/ARCHIVED, revision and audit. No level scope without authoritative stage data.
- [x] Implement reasoned period extension and bound student/participant extra time, history, renewal, revocation and expiry; eligibility is rechecked at use. Closed semester/archived period appointment exceptions remain disallowed.
- [x] List/create GET/POST /api/academics/operational-periods/?semesterId=N; detail PATCH /<id>/; POST /<id>/publish/, /<id>/extend/, /<id>/close/, /<id>/archive/; GET/POST /<id>/exceptions/ and POST /operational-exceptions/<id>/revoke/.
- [x] GET/POST /operational-periods/enforcement/ with semesterId, activity, enabled and reason; list response includes enforcement flags. GET /operational-periods/availability/?activity=...&studentId=... exposes only authorised own/contextual intake information.
- [x] Period payload: id, semesterId, activity, name, programmeScope, programmes, opensAt, closesAt, lifecycleStatus, effectiveStatus, revision; list {periods:[...],enforcement:{SUPERVISOR_APPLICATION:boolean,PANEL_RECOMMENDATION:boolean}}. Inputs use camelCase. Mutations reject stale expectedRevision when supplied; extend requires it. Exceptions include studentId, participantId, deadline, reason and history metadata. Candidates endpoint GET /<id>/exception-candidates/ provides eligible authorised student/participant choices for the Office form.
- [x] Guard validate and locked create paths; keep request review gates unchanged. Public availability returns enforcementEnabled, canSubmit, status, opensAt, closesAt, effectiveDueAt, message. Do not disclose another student's exception.

## Task 2: Timeline links and real upload preview

Owner: timeline import worker. Files: dashboard/models.py, additive dashboard migration, excel.py, serializers.py, views.py/urls.py (timeline-only sections); frontend timeline types/API and UploadTimelineDrawer; focused tests.

- [x] Nullable PROTECT operational_period and marks_period FKs on timeline entries, mutually exclusive, with owning-semester validation. Linked calendar dates/status are projected from owning records and direct date edits cannot bypass module mutation services. Existing rows remain informational.
- [x] POST /api/dashboard/timeline/upload/preview/ accepts file/semesterId, writes nothing, returns previewToken, warnings, rows (safe display facts), importedCount, requiresAcknowledgement. Confirm existing /upload/ requires original file, previewToken and acknowledgeWarnings; verifies file digest, semester/actor, age and current timeline/linked-period fingerprints atomically before replacing. Invalid preview/confirm preserves data. No legacy direct upload bypass.
- [x] Reject invalid ranges, expose old/out-of-semester warnings for informational imports, require explicit acknowledgement; operational mappings require in-semester dates and explicit existing period selection with no silent date overwrites. Legacy sheets remain informational. Optional Activity Code/Period ID columns or explicit row mapping in preview may be used; no inference by title. Preserve existing links on equivalent replacement or block replacement until explicitly resolved.
- [x] Template examples derive from selected semester and remain informational. The Preview UI no longer commits; Confirm commits only the reviewed file/token and resets when inputs change.
- [x] Timeline status Ended replaces date-derived Completed in timeline-only contracts, renderer/filter/display and tests; actual academic completion remains unchanged.
- [x] Test stale preview, actor/file tampering, replacement rollback, old-date acknowledgement, links, date projection, semester mismatch and student Marks privacy in active timeline responses.

## Task 3: Shared Office period/extension UI and intake feedback

Owner: frontend period worker. Files: new OperationalPeriodManagement.tsx and operationalPeriodsApi.ts/types; TimelineManagement.tsx; StudentSupervisorApplications.tsx and RecommendPanelMemberDrawer.tsx intake feedback; relevant frontend tests. Do not edit UploadTimelineDrawer/timelineApi/types owned by Task 2.

- [x] One section in Timeline Management manages Supervisor/Panel periods and existing Marks periods for selected semester, plus informational event extensions. Reuse PortalCard/PortalButton/PortalSelect/DecisionDialog and date utilities. Disable during requests, surface failures and guard stale loading.
- [x] Office configures/publishes appointment periods and explicitly enables enforcement. Shared Extend deadline form for everyone vs selected cases/tasks. Marks extension uses existing updateEvaluationPeriod({closesAt},reason), selected Marks uses existing completion windows/tasks through the same section, without inventing a second Marks date store.
- [x] Show ordinary events from existing getActiveTimeline(); their extension uses a reasoned timeline extend endpoint (root will add /dashboard/timeline/entries/<id>/extend/ body {deadlineEnd,reason}) and refresh callback. Calendar-linked events point to corresponding operational card; no duplicate independent editor.
- [x] Appointment extra time uses eligible candidate picker, required reason/deadline and history/revoke. Marks task selection stays in scope; submitted/archived guards remain backend-owned. Include current vs personal deadlines and Malaysia timezone.
- [x] Fetch authorised availability for Student's own Supervisor submission / current supervisor's Panel recommendation. Show period feedback, retain draft work and prevent blocked submissions without hiding historical review.
- [x] TypeScript, affected frontend tests and build; no browser, no native selects.

## Task 4: Reminders, informational extensions and integration

Owner: root. Files: focused academics/period_notifications.py (or existing notification conventions), announcements/reminders.py and command; dashboard/actions.py/reports.py/serializers.py integration if needed after worker; informational extend endpoint; scheduling helper/README; focused tests.

- [x] Opening and distinct 3-day/1-day closing notices for mapped operations, reasoned extension announcements and effective personal deadline reminders. Existing ordinary timeline reminders retained without duplicates for linked events. Marks reminders use effective unfinished-task deadlines; suppress revoked/expired/ineligible work and student exposure.
- [x] Derive grant/extension events from committed period/task/audit records; persist notification/email outbox entries during the reminder job, with delivery retries and recipient/event uniqueness. Do not send in-app/email during live migrations or tests outside isolated fixtures.
- [x] Add command --dry-run and run status/delivery summary; install a hidden Windows scheduled recurring invocation with explicit repo Python, working directory and lock to avoid concurrent runs. Runtime mails remain governed by existing configuration/preferences; report verification limits.
- [x] Add reasoned informational event extension with original/new facts in timeline audit; parent semester restrictions and stale updates enforced.
- [x] Update plan/proposal and root documents with real progress/evidence; run full affected suites plus integration/migration and type/build checks. Apply additive migrations only after backup and clean migration verification, leaving enforcement disabled.

## Progress ledger

- Initial scan: Tasks 1/2 share an FK interface only; Task 2 owns dashboard models/migration and timeline services; Task 3 consumes the Task 1 API and owns TimelineManagement; Task 4 waits before modifying worker-owned files. Shared root docs are root-owned.
- Approved implementation starts with existing Marks logic preserved and a single Office Timeline Management entry point. No work is marked complete until verified.
- Task1: complete. Office period/exception APIs, bound grants, opt-in enforcement, immutable audits, locked validation/create checks, real PostgreSQL serialization and review/cross-programme regressions verified.
- Task2: complete. Same-semester links and owning projections, signed preview/confirmation, explicit warning review, replacement protection, selected-semester templates and Ended status verified. Cross-review added locking and prevented linked Marks draft semester reassignment.
- Task3: complete. Shared Timeline hub, existing Marks extension routing, availability feedback and explicit calendar link picker delivered. Closed-semester Marks recovery, approved/legacy programme choices, published-period action guards and selected-semester templates verified. Full frontend193 checks plus latest focused18 files, TypeScript and build pass.
- Task4: complete for application behaviour and preview scheduling. Opening/phase-specific closing/extension events, effective task deadlines, current recipient privacy, durable optional mail retry, invalid-queue suppression and run evidence implemented. Local15minute hidden Windows task is installed in preview mode, not live delivery. No recipients contacted.
- Integration: four additive migrations applied after a verified local DB backup. API restarted and HTTP/read-only authorised/anonymous smoke checks pass; enforcement stays disabled and live academic records were not submitted or changed.
- Broad backend604 checks initially had602passes and two historical test-graph errors. Both test states were corrected against the actual applied graph with preservation assertions intact; targeted7 migration/invariant checks pass. Latest notification/projection/extension suite94checks pass; final period/case-normalization and cross-programme run passes 34 checks, including four regressions first observed failing.
- Cross-review rulings: retain closed-semester selected Marks recovery; never offer whole-period reopening for explicitly Closed Marks. Lock owning periods on timeline links and reject linked draft moves. Refresh stale semester/participant facts under locks; invalid queued recipients never receive staff reminders. P1/P2 is display-only until authoritative student-stage data exists.
- Runtime activation remains explicit: the preview job currently finds24 calendar/0 appointment/0 Marks pending notices. Enabling delivery would contact existing recipients according to their preferences; preview installation and tests do not constitute SMTP certification.
