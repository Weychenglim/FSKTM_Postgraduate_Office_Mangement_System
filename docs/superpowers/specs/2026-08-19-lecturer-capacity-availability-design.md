# Lecturer Capacity and Availability Management Design

## Status

Approved for implementation on 2026-08-19. This document describes planned behavior; it does not claim that the feature is implemented.

## Summary

Add authoritative, semester-specific and versioned Supervisor and Panel capacity management for active Lecturers. Office Staff/Admin will prepare and publish one complete capacity plan before a semester can be activated, configure role-specific temporary unavailability, and review immutable change history.

The same backend policy will drive candidate selection, final appointment activation, replacement handovers, workload monitoring, Dashboard actions, Workflow Reports, and reconciliation. Existing appointments remain valid when capacity is reduced or a Lecturer becomes unavailable. New assignments fail closed.

## Goals

- Make the workload limits already enforced by Supervisor and Panel workflows configurable through the Office portal.
- Preserve the capacity policy that applied to each semester instead of rewriting one global value.
- Support independent Supervisor and Panel limits and availability.
- Keep existing appointments valid when a Lecturer becomes unavailable or over capacity.
- Prevent stale clients and direct-ID requests from bypassing current capacity or availability.
- Require reasons, transactions, concurrency checks, and immutable audits for every operational change.
- Keep public Student responses free of internal staffing reasons.

## Non-Goals

- Co-supervisor relationships or workload sharing.
- Supervisor or Panel SLA thresholds.
- Marks moderation or approval.
- Notification or announcement fan-out.
- Official document/rubric template configuration.
- Automatically ending, replacing, or cancelling existing appointments and pending workflows.

## Confirmed Product Decisions

1. Capacity is semester-specific and versioned.
2. Capacity may be reduced below current workload. Existing appointments remain active, the Lecturer is marked `OVER_CAPACITY`, and new assignments are blocked.
3. Availability is role-specific: Supervisor and Panel availability are independent.
4. Temporary unavailability uses date ranges contained within the academic semester.
5. A new semester starts with a Draft copy of the previous semester's published plan.
6. Semester activation requires a complete published capacity plan covering every eligible Lecturer.
7. Unavailability blocks final activation of already-pending workflows but does not hide or cancel those workflows.

## Domain Model

### SemesterCapacityPlan

One versioned plan belongs to one `AcademicSemester`.

- `academic_semester`
- `version`
- `lifecycle_status`: `DRAFT`, `PUBLISHED`, or `SUPERSEDED`
- optional `supersedes`
- `created_by`, `created_at`
- optional `published_by`, `published_at`, and mandatory publication reason
- origin: `CREATED`, `COPIED_FORWARD`, or `MIGRATED_BASELINE`

Constraints:

- Version numbers are unique within a semester.
- At most one plan is `PUBLISHED` for a semester.
- Published and superseded plans are immutable.
- Publishing a replacement Draft atomically supersedes the current published version.

### LecturerCapacityEntry

Each entry snapshots one Lecturer's semester policy within a plan.

- `plan`
- `lecturer`
- nullable `supervisor_limit` when the Lecturer lacks the Supervisor role
- nullable `panel_limit` when the Lecturer lacks the Panel role
- timestamps and the Office actor responsible for the latest Draft edit

Rules:

- Limits are non-negative integers.
- Zero is an explicit assignment block.
- Every lifecycle-Active Lecturer with a Supervisor or Panel role must have a matching entry before publication.
- A Lecturer without one role must not receive a limit for that role.
- Retiring and Retired Lecturers remain visible in historical plans but are not eligible for new assignments.

### LecturerAvailabilityWindow

Availability windows are semester-scoped operational exceptions independent of plan versions.

- `academic_semester`
- `lecturer`
- role: `SUPERVISOR` or `PANEL`
- `starts_on`, `ends_on`
- mandatory reason
- creator and creation timestamp
- optional cancellation actor, time, and mandatory cancellation reason

Rules:

- Dates must be ordered and contained within the semester.
- Active windows for the same Lecturer and role must not overlap.
- Windows are never physically deleted.
- Cancellation ends the restriction without rewriting its original dates or reason.
- Effective availability is derived using the Kuala Lumpur local date.

### LecturerCapacityAudit

Append-only audits record plan creation, copy, Draft entry edits, publication, supersession, availability creation, and availability cancellation. Each audit contains actor, action, reason, entity identifiers, before/after values, and server timestamp.

## Capacity Resolution Service

Add one shared, dependency-light service that resolves a Lecturer's semester and role capacity. Existing module helpers must delegate to this service instead of reading `Supervisor.max_supervisees` or `Panel.max_appointments` directly.

The result includes:

```text
semesterId
planId
planVersion
role
limit
activeLoad
reservedLoad
availableSlots
state
unavailableUntil
```

States are:

- `AVAILABLE`
- `FULL`
- `OVER_CAPACITY`
- `TEMPORARILY_UNAVAILABLE`
- `NOT_CONFIGURED`
- `INELIGIBLE`

Existing module workload semantics remain unchanged:

- Supervisor workload uses active Supervisor appointments.
- Panel workload uses active Panel appointments plus submitted/pending nominations that reserve capacity.
- The service clamps displayed utilization and available slots safely when a limit is zero.

## Workflow Enforcement

- Student Supervisor candidate queries use the effective active-semester Supervisor policy.
- Lecturer Panel candidate queries use the recommendation semester's Panel policy.
- Candidate query filtering is paired with mutation-time validation.
- New-selection candidate directories omit lifecycle-ineligible and currently unavailable Lecturers by default. Full and over-capacity Lecturers may remain visible as non-selectable so current capacity is understandable.
- Supervisor and Panel final approval re-resolve the policy under transaction and row locks.
- Replacement activation applies the same capacity and availability checks to the incoming Lecturer.
- Existing appointments remain active and counted when the Lecturer is unavailable, full, or over capacity.
- Pending workflows remain visible and reviewable during unavailability. Final activation returns `409` until availability resumes, the workflow is cancelled, or a valid replacement is selected.
- Existing selected/pending workflow responses retain the Lecturer identity and may expose only the public availability-resumption date; they do not expose the internal reason to Students.
- No capacity or availability change automatically cancels a workflow or ends an appointment.
- Prior-semester carryover decisions use that workflow's semester plan, not the current active semester.

## Semester Lifecycle Integration

- Office may prepare capacity plans for Draft or Active semesters.
- A Draft semester cannot activate without one complete published plan.
- Creating a semester offers an explicit command to copy the latest prior published plan into version 1 Draft.
- Copying includes currently eligible Lecturer entries; Lecturers who no longer exist or are Retired are retained only in the source history.
- Newly eligible Lecturers must be added before publication.
- Publishing an active-semester replacement plan is allowed with a mandatory reason and does not modify appointment history.
- Semester handover does not automatically copy availability windows.
- Plans, entries, windows, and audits have no physical-delete operation.

## APIs

Office Staff/Admin management endpoints:

```text
GET/POST  /api/academics/semesters/<semesterId>/capacity-plans/
GET/PATCH /api/academics/capacity-plans/<planId>/
POST      /api/academics/capacity-plans/<planId>/clone/
POST      /api/academics/capacity-plans/<planId>/publish/
PATCH     /api/academics/capacity-plans/<planId>/lecturers/<lecturerId>/

GET/POST  /api/academics/semesters/<semesterId>/availability/
POST      /api/academics/availability/<windowId>/cancel/
GET       /api/academics/semesters/<semesterId>/capacity-audits/
```

All management and audit endpoints are Office-only. Other roles receive capacity information only through existing role-scoped Dashboard, candidate, workload, approval, report, and dossier contracts.

Response extensions must expose stable IDs, plan version, role-specific limits, loads, availability state, public availability date, and derived capacity state. Internal availability reasons are limited to Office views and the affected Lecturer's own authenticated status. Students receive only selectable state and the date availability resumes.

## Error Handling and Concurrency

- `400 Bad Request`: malformed limits, invalid dates, unsupported role values, blank reasons, or invalid Draft fields.
- `403 Forbidden`: non-Office management or audit access.
- `404 Not Found`: unknown or unauthorized plan, semester, Lecturer, or availability window.
- `409 Conflict`: stale version, published-plan mutation, incomplete coverage, invalid lifecycle transition, overlapping window, unavailable/full final activation, concurrent publication, or missing authoritative policy.

Plan publication, semester activation, capacity-sensitive final approval, and replacement handover use `transaction.atomic` and appropriate `select_for_update` locks. Uniqueness conflicts are translated into stable `409` responses.

## Frontend Workspace

Add lazy Office-only route `/dashboard/lecturer-capacity`. It remains outside the sidebar and is linked from Office Dashboard, Semester Management, Supervisor Workload Monitoring, Panel Workload Monitoring, and Workflow Reconciliation.

The workspace contains:

- Semester selector and published-plan readiness summary.
- Draft, Published, and Superseded version history.
- Search and filters for Lecturer role, lifecycle, availability, and capacity state.
- One operational table with Supervisor and Panel load, limit, state, and availability columns.
- Draft capacity edit drawer.
- Role-specific availability window drawer.
- Clone, compare, publish, and audit commands.
- Mandatory reason confirmations and clear incomplete-coverage blockers.
- Loading, empty, forbidden, validation, stale-conflict, retry, and no-policy states.

Existing role surfaces are extended rather than duplicated:

- Lecturers see their own capacity and availability in current workload/Dashboard surfaces.
- Coordinators see explicit final-approval conflicts.
- Students see only public selectability and availability-resumption text.
- Office workload views show Full, Over Capacity, Unavailable, and Not Configured records.

## Reporting and Reconciliation

- Workflow Reports add role-specific capacity distribution and over-capacity/unavailable attention records for Office scope.
- Existing Supervisor and Panel workload exports include semester code, plan version, capacity state, limit, load, and public availability dates.
- Reconciliation detects missing semester plans, incomplete Lecturer coverage, role/entry mismatches, overlapping active windows, multiple published plans, and legacy-limit divergence.
- Repairable plan gaps still require preview, fingerprint, reason, and individual confirmation; unsafe policy guesses remain review-required.

## Migration Strategy

1. Create plan, entry, availability, and audit tables with constraints.
2. Create a published `MIGRATED_BASELINE` for the active semester and for semesters referenced by unresolved Supervisor or Panel workflows.
3. Populate baseline entries from current `Supervisor.max_supervisees` and `Panel.max_appointments` values.
4. Preserve the legacy fields for compatibility and rollback, but stop using them as the authority for semester-bound new workflows.
5. Do not fabricate plans for closed historical semesters with no unresolved work.
6. Preserve all users, appointments, applications, recommendations, workflow events, Marks tasks, semesters, and identifiers.

The migrated plan represents the cutover baseline, not a claim about earlier historical policy.

## Test Strategy

Backend coverage:

- Plan creation, copying, version sequencing, coverage validation, publication, supersession, immutability, and immutable audits.
- Semester activation success and fail-closed readiness.
- Role-specific availability date validation, overlap prevention, cancellation, and Kuala Lumpur effective dates.
- Available, Full, Over Capacity, Temporarily Unavailable, Not Configured, and Ineligible derivation.
- Candidate filtering and direct-ID bypass rejection.
- Pending final-activation conflict, later successful approval, and no automatic cancellation.
- Supervisor/Panel replacement, workload release, reservations, and prior-semester carryover.
- Migration baseline preservation and no fabricated closed-semester policies.
- Office authorization, Student privacy, reports, exports, dossiers, Dashboard actions, and reconciliation.

Frontend coverage:

- Mapping and formatting of plans, versions, limits, loads, availability, and states.
- Route protection, Draft editing, cloning, publication, comparison, availability controls, and mandatory reasons.
- Over-capacity and unavailable display without invalid utilization widths.
- Student public labels and Coordinator conflict handling.
- Loading, empty, validation, stale conflict, retry, and incomplete-policy states.

Verification includes the complete owned-module Django suite, every frontend `.test.ts` file, Django checks, migration dry-run, TypeScript lint, production build, dependency audit, production artifact guards, and four-role browser smoke.

## Documentation Impact

Implementation must update `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, and `PROJECT_STATUS.md`. Official rules can later replace configurable baseline values without changing the policy architecture.
