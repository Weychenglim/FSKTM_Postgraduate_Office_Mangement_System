# Semester periods improvement proposal

Date: 16 October 2026. Status: approved for implementation by the user's later instruction to implement, with one Office extension entry point in Timeline Management. The delivered implementation and verification are recorded in PROJECT_STATUS.md and docs/superpowers/plans/2026-10-16-connected-operational-periods.md. Live notification delivery remains a separate activation step.

## Goal

Make operational opening/closing dates, calendar displays, authorised extensions and reminders agree across Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks Entry and Workflow/Approval Tracking. Configure each operational period once. Dashboard and Tracking consume period information rather than introducing two more submission gates.

## Verified starting point

- Timeline entries store dates and P1/P2 levels, titles, descriptions, action owners and target roles. They have no stable operational activity mapping. Their dates drive calendar/dashboard display, not Supervisor or Panel intake.
- Supervisor application and Panel recommendation creation require an effective academic semester and existing eligibility/capacity rules, without entry-specific opening/closing guards.
- Marks owns EvaluationPeriod, including timestamps, semester, programme scope, evaluator roles, rubric, publication/closure/archive and audited published-period extensions. Published periods permit a reasoned later closing timestamp; explicitly Closed/Archived periods cannot be edited through that operation.
- Marks also owns task-specific TaskCompletionWindow grants, renewal/supersession, revocation, expiry and immutable audits. Eligible unfinished tasks can receive recovery access after period/semester closure. Archived/ineligible/submitted work remains protected. Effective task deadlines already account for the base period and task window.
- Existing deadline reminder commands cover timeline end dates and ordinary Marks period deadlines. They do not implement dedicated opening, extension-announcement or task-completion-window reminder events. No matching Windows scheduled task was found locally during the investigation; production scheduling/delivery was not verified.
- The supplied Excel file contains two past example rows (March and June/July 2026). Its actual archive/row validation returned no errors as of 16 October 2026. Upload does not compare row dates with the selected semester. Template generation contains these fixed example dates. The upload validation action currently commits imported records rather than providing a separate dry-run preview.
- Timeline status currently uses Completed when the date range ends; it does not establish completion of an academic action.

## Recommended ownership

Keep existing Marks records and mutation services authoritative for Marks. Add equivalent operational period controls for Supervisor and Panel, with a shared availability interface for calendar, forms, tracking and reminder consumers. Reuse presentation and event patterns while keeping module-specific validation in its owning service.

Alternatives considered: replacing Marks with a new generic period engine creates migration and regression risk; copying dates between independent calendar and module fields creates conflicting deadlines. The recommended approach links calendar entries to authoritative operational records and reads their effective dates.

Calendar-only events retain ordinary editable dates. Linked entries show dates from their operational period and provide a governed Edit period route. Editing raw timeline dates cannot bypass publication, extension, scope or audit restrictions. An individual exception never changes the public period for everyone.

## Proposed rules

1. Use explicit activity identifiers, starting with Supervisor application submission, Panel recommendation submission and Marks entry. Titles remain editable text, never the source of permissions. P1/P2 and programme targeting require verified workflow data and explicit scope selection, not inference from a title or lecturer department. A presentation remains a calendar event unless explicitly mapped to an implemented action.
2. Define publication and availability separately: Draft, Scheduled, Open, Ended and Archived presentation. An extension is an audited change/annotation, not evidence that a request was approved or work was completed. Calendar-only date ranges use Upcoming/Active/Ended; retain true workflow completion from its recorded outcome.
3. Appointment intake windows control new submissions. Reviewing, rejecting and approving an already submitted request retain existing permissions and lifecycle/capacity checks after the intake deadline. Historical records remain readable. Separate review deadlines require a later explicit policy rather than reusing the intake end date.
4. Period scope follows the student's applicable semester/programme/project stage where authoritative data exists. Cross-programme lecturer eligibility remains intact. Ambiguous or overlapping operational scopes block publication until resolved; missing stage data must be resolved rather than guessed.
5. Date-only imports cover the full stated day in Asia/Kuala_Lumpur. Preserve exact existing Marks timestamps and deadline behaviour. Display timezone and test start/end boundaries consistently.
6. Office controls publication and reasoned date changes. Extend period changes the normal deadline for its whole scope. Grant extra time authorises selected unfinished tasks/cases until a stated deadline, with actor, reason, old/new facts, expiry and revocation history. Neither action grants a new role or bypasses academic eligibility, conflicts, capacity or ownership.
7. Preserve Marks' current distinction: a Published period can receive its existing reasoned closing-time extension; an explicitly Closed period uses selected completion windows for recovery. Submitted Marks remain submitted, and archived records remain locked. Existing renewals, revocation, task deadlines and history are retained.
8. Appointment extra-time grants bind to the relevant student, action, period and authorised participant context, rather than unlocking an account generally. Recheck current eligibility when used. Initial appointment exceptions stay within an effective active semester; do not introduce general closed-semester appointment recovery. Preserve existing Marks recovery policy.
9. Upload is Preview then Confirm. Preview writes no academic state and sends no notifications. Show selected semester, date span, past rows, proposed links, existing-period conflicts and changes. Confirm checks a server-issued preview version/fingerprint so intervening edits require a fresh preview.
10. Reject invalid ranges and mismatched semester dates for operational publication. Flag an entirely past schedule and allow only an explicitly acknowledged informational import; it cannot publish an operational window or backdate access. A legitimate mid-semester upload may contain earlier events. Any out-of-semester informational event needs an explicit exception classification and reason; it cannot control operational access.
11. Existing spreadsheets may import as calendar-only data. New operational mapping is explicit in the preview or a versioned Activity Code column. Never infer module links from titles. Existing mapped links are immutable during a silent replacement. A replacement previews retained links and any requested changes rather than cascading deletion of periods or grants.
12. Marks mapping selects an unambiguous existing period or directs Office to prepare one through Marks configuration. Upload alone cannot choose a rubric, create assignments or publish a Marks period. A different imported date is a proposed governed change, not a second deadline or automatic overwrite. New appointment periods are prepared as Draft and published explicitly after readiness checks.
13. Notifications use the existing notification module, respecting preferences and module ownership. Proposed events: opening, three days before closing, one day before closing, extension granted and one day before a personal extension ends. Remind only people with a relevant action still outstanding. Do not remind completed work, revoked grants or stale deadlines.
14. Deduplicate by recipient, operational period/task, deadline version and event type. Linked calendar and Marks records generate one operational reminder, not two. Individual Marks reminders use effective task deadlines. Grant/extend/revoke events invalidate pending notices for obsolete deadlines. Queue delivery after the academic transaction commits, with retries and a deduplication record; email failure cannot roll back the academic action.
15. Students receive only authorised public appointment information. Marks periods, evaluator tasks, scores and extensions remain staff-only, including in calendars, tracking, notification audiences and payloads. Appointment reminders must preserve the existing student Panel privacy projection.

## Five challenges and resulting corrections

1. A calendar without backend checks is a sign saying Closed on an unlocked door. Add explicit action mappings and server-side enforcement, including direct API requests.
2. Two independently editable deadlines are two clocks telling staff different times. Keep one authoritative record per operational period and project it into other screens. Preserve Marks rather than adding another Marks deadline store.
3. Closing submissions and freezing every approval would strand requests that arrived on time. Separate intake availability from continued authorised review, and keep real completion distinct from elapsed dates.
4. Reopening the whole class because one lecturer forgot is too broad. Retain scope-wide extensions and selected-case extra time as separate audited actions. Reuse existing Marks completion windows and their protections.
5. Green upload ticks and reminder code are insufficient when an old file passes and no scheduled delivery runs. Add real preview/date/semester checks, event deduplication, effective-deadline targeting and an observable scheduled job.

## Phased delivery and acceptance

### Phase 1: Safe upload and explicit links

Affected areas: backend/dashboard/excel.py, serializers.py, models.py, views.py and urls.py; frontend/src/components/UploadTimelineDrawer.tsx, AddTimelineEntryDrawer.tsx, EditTimelineEntryDrawer.tsx and TimelineManagement.tsx; frontend timeline types/API/validation; existing timeline tests plus new preview tests.

- [ ] Separate preview from commit, with expiry/version checking and atomic confirmation.
- [ ] Add explicit informational/operational mapping and scoped link conflict previews. Keep ordinary legacy sheets usable as informational imports.
- [ ] Validate semester/range/past-date semantics; replace fixed template example dates with selected-semester examples labelled as examples.
- [ ] Cover no-write preview, unchanged live state on failure, old-file acknowledgement, out-of-semester operational rejection, concurrent replacement, duplicate/ambiguous mappings and preserved historical links.

### Phase 2: Appointment periods and backend availability

Affected areas: new focused operational-period models/services/API under backend/academics following its audited configuration conventions; appointments/serializers.py and authoritative mutation paths; shared read adapter consuming marks/models.py and marks/completion_windows.py without replacing those records; new isolated period/availability tests.

- [ ] Add scoped Draft/publish/end/archive controls and immutable period-change history for Supervisor and Panel.
- [ ] Expose shared availability and date metadata; linked timeline responses project owning dates.
- [ ] Enforce intake on the server while retaining existing review, ownership, active-semester, programme approval, capacity and conflict checks.
- [ ] Cover before opening, opening instant, final allowed instant, after closing, missing/ambiguous scope, direct API bypass, current-stage resolution, cross-programme lecturer selection and review of a timely existing request after closure.

### Phase 3: Extensions and shared Office presentation

Affected areas: new appointment period/exception services and focused frontend period controls; frontend/src/components/MarkEntryPeriodConfig.tsx, MarksCompletionWindows.tsx and EvaluationTaskAssignment.tsx; existing Marks configuration/completion APIs; and shared calendar/tracking components.

- [ ] Provide shared period cards showing opening, normal closing, status and authorised Edit/Extend controls. Preserve Marks rubric, programme targeting, evaluator roles, recipient previews and lifecycle configuration.
- [ ] Keep existing Marks completion windows and add bound appointment case exceptions with reason, future deadline, renewal, revocation, expiry and eligibility checks.
- [ ] Show Your deadline or task deadline when different from the normal period. Keep personal grants out of public calendar dates.
- [ ] Cover period-extension/task-window interaction, max applicable effective deadline, revocation returning to ordinary access where still open, expired exceptions, changed ownership, submitted work, archived/closed guards and immutable audit facts.

### Phase 4: Reminders and tracking

Affected areas: backend/announcements/reminders.py, management/commands/send_deadline_reminders.py and its notification event/audience tests; dashboard/actions.py and reports.py; frontend calendar, next-action, tracking and period presentation; deployment scheduling documentation. Coordinate changes with the Notifications/Announcements owner.

- [ ] Implement opening, versioned closing reminders and extension events through the existing notification module.
- [ ] Use effective task deadlines, eligible outstanding actors and existing privacy projections; suppress duplicate linked-calendar notifications.
- [ ] Configure a recurring job during the implementation/deployment stage, with dry-run support and last-success/failure evidence. Confirm automatic invocation separately from simulated notification tests. Verify email delivery only against authorised configured mail infrastructure.
- [ ] Cover repeated job runs, extended/revoked deadlines, submitted tasks, multiple scope targets, student privacy, notification preferences, transaction rollback, retry and job catch-up after downtime.

### Phase 5: Migration and final validation

- [ ] Start with an inventory/preview of existing periods, timelines and links. Existing Marks records, task windows, scores and audits remain authoritative and preserved.
- [ ] Do not retroactively apply newly introduced appointment windows to historical requests. Existing unmapped timeline rows remain informational. Enable new enforcement for a semester only after explicit Office configuration/readiness acknowledgement, with visible setup status; avoid silently locking all current applicants after deployment.
- [ ] Test migration on disposable data, including multiple existing Marks periods and mismatched historical dates. Demonstrate that upload replacement cannot delete periods or grants.
- [ ] Run focused backend API/permission/concurrency/migration tests, affected frontend tests, TypeScript and production build. Use isolated databases, temporary uploads and test email delivery. No live academic submissions or browser acceptance without an explicit change to the user's existing no-browser preference.
- [ ] Update PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md and PROJECT_STATUS.md with implemented scope and actual evidence. Review legacy notification documentation against current code rather than treating old unavailability notes as authoritative proof that reminder code is absent.

The proposal was converted into the approved implementation plan after the user's instruction to implement. Existing student data does not provide an authoritative P1/P2 stage: operational scope uses semester, activity and programme, while calendar level remains descriptive. See the implementation plan and maintained root status for delivered scope, verification and local preview-only scheduling.
