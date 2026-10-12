# Supervisor workspace hierarchy across roles

Approved in conversation on 12 October 2026: challenge the proposed structure five times, plan and implement without a further approval gate.

## Shared hierarchy

Every list has the Supervisor Appointments heading and description, one Refresh action, role-specific navigation, optional relevant summaries, a section title/description with Requests/History where appropriate, filters, compact responsive records and 10/25/50 pagination. Existing Inter/table styles are mandatory. Full records/forms retain the independent RecordPage with one labelled return, no owning list tabs, draft/busy protection and preserved source context.

Student: My supervisors / Applications / Research changes. Current team members stay cards. Application rows identify the proposed supervisor, type, submitted date, actual stage, separate waiting age and View request. Request references remain searchable and in detail, not the row headline. Applications and research have independent ongoing/history views.

Lecturer: Appointment requests / My supervisees / Research changes. Preserve the already implemented hierarchy and capabilities.

Office: Appointment records / Supervisory teams / Research changes. Preserve status/programme/semester controls, exports, workload/capacity, requirements and appointment lifecycle management. Teams and research no longer appear above appointment records. Staff research uses the same request/header/filter/pagination structure.

Coordinator: Appointment requests / Supervisory teams / Research changes. Compact queue/history records open dedicated review/view pages. Primary and supporting decisions remain capability driven and programme scoped; active/ended appointment lifecycle actions remain in teams/appointment records. No approval controls in compact list rows.

## Data and safety

Add a narrowly scoped Coordinator request-history endpoint for terminal primary application statuses. Preserve coordinator-records as the existing approved appointment endpoint. Reject unrelated roles and programmes; retain acting delegation scope. Do not infer history from approved appointments. Research history means final request outcomes, not profile revision history. Current supervisors/active appointments and their endings remain distinct from request history.

Preserve all existing actions, authoritative APIs, role restrictions, notifications and route fallbacks. No live academic decisions, publication, cancellation, upload or submission during browser acceptance. No dependencies or schema change. Preserve branch and uncommitted work; no commit/push/merge.

## Verification

Rendering/projection regressions for compact rows, history partition, separate stage/wait, pagination and role-specific identity. Backend history tests for rejected/cancelled/approved records and regular/acting/unrelated scope. Full frontend suite, TypeScript, build/artifact guards, affected Django tests and representative desktop/mobile navigation checks. Update the three root documents with evidence and remaining limitations.

## Completed evidence

93 frontend scripts and 33 affected Django tests pass. After final wording changes, four affected rendering scripts, TypeScript, build and both production guards pass again; Django check/migration dry run and whitespace validation pass. Read-only review findings (Student filter transition, Sept date conversion, Coordinator lifecycle/dossier record identity) are fixed and scoped re-review is clear.

Representative browser checks passed for all roles using available demo records. Student application/research history returns retain page size; Office record/team returns retain searches; Coordinator primary queue/cancelled outcome/team routes resolve correctly. Student research and Coordinator records are stacked without document overflow at 390 px. No live mutations were submitted. Supporting nominations and approved Coordinator appointment/dossier roundtrip rely on fixtures/source review because those cases were not populated in the live programme. Existing local backend was reloaded to pick up the new history route. Changes remain uncommitted.
