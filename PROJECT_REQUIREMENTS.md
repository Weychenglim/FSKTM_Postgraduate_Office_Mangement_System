# Project Requirements

## Student supporting appointment visibility (2026-10-12)

Students see confirmed current and former supporting appointments under My supervisors, with supervisor identity and appointment/end dates. They do not see supporting nominations, candidate justifications, staff decision reasons, workflow history or pending nomination dashboard tasks. Applications History contains only Student-submitted applications. In-app notifications alert Students when supporting appointments are confirmed or end and link to My supervisors; nomination activity remains within authorised staff workflow. Existing legacy nomination notices are excluded from Student feeds and direct read responses; legacy appointment notice bodies are sanitised.

## Office navigation feedback (2026-10-12)

Returning from an Office Supervisor appointment record uses the existing labelled Back action without a navigation-success toast. Completed actions and errors retain their feedback.

## Supervisor search verification (2026-10-12)

Office Appointment records search applies with Apply filters and matches loaded student names, matric numbers, supervisors, programmes and research titles case-insensitively with trimmed input. Research request search filters immediately within the selected ongoing/history view and student scope, and recognises displayed change types plus numeric/formatted research references as well as student identity and research title. Clearing search restores the remaining filtered records. Office Applications continues to redirect to Appointment records; the Student Applications route is unchanged.

## Supervisor hierarchy across roles (2026-10-12)

Supervisor lists share the module heading/Refresh, role navigation, relevant summaries, section heading with Requests/History where applicable, filters, responsive table and 10/25/50 pagination. Student retains My supervisors/Applications/Research changes and identifies proposed supervisors in application rows. Office uses Appointment records/Supervisory teams/Research changes. Coordinator uses Appointment requests/Supervisory teams/Research changes. Lecturer keeps its existing three tabs. Current Student supervisors remain member cards; record details retain the independent page standard.

Research requests separate ongoing records from final outcomes for every role; profile revisions remain separate. Coordinator request history includes scoped approved/rejected/cancelled applications through a separate read-only endpoint, without changing approved appointment records. Preserve all existing permissions, lifecycle controls, supporting nominations, administrative filters, exports, workload, requirements, carryover actions and notification links. Students see only confirmed current/former supporting appointments in My supervisors; supporting nominations remain within staff workflow, as specified above.

Design: docs/superpowers/specs/2026-10-12-supervisor-role-hierarchy.md.

This shared hierarchy supersedes older role-specific embedded-list presentation descriptions below. Existing workflow and capability requirements remain authoritative.

## Global navigation coverage (2026-10-11)

The approved record/list/brief-modal/contextual-inline standard applies to all active modules and supported roles. Coordinator and staff notification, report and dashboard action targets must resolve the selected authorised record. Lists retain their UI controls when returning from records or dossiers; drafts and in-flight saves on dedicated forms are protected. Successful local research creation returns to the list without a stale discard warning, while failed creation retains the form. Announcement creation/editing has Announcements as its owning list; saved draft actions remain available. Authentication keeps its own shell and uses shared brief guidance dialogs.

The active-module inventory and intentional contextual exceptions are recorded in docs/superpowers/specs/2026-10-11-global-navigation-audit.md. This requirement does not change workflow permissions or turn every inline setting/preview into a full page.


## Record navigation consistency (2026-10-11)

- Substantial records, reviews, comparisons and forms use an independent main-content page with one labelled Back link above its record/form heading. The originating module heading, tab bar, summary and filters appear on lists only. Use existing portal typography; no breadcrumbs.
- Review/View share a detail layout and retain API-authorised actions, documents and recorded progress. Return preserves the originating list context; existing notification/deep links remain supported. Local editors keep their owning workspace mounted but inaccessible while open and use a transient history entry without storing record payloads.
- Brief previews/confirmations use the shared accessible modal. Changed drafts require discard confirmation; in-flight mutations prevent navigation. Header refresh actions are unavailable while a draft or mutation is active. Successful saves may return immediately without a discard prompt. This policy supersedes older requirements prescribing drawers/modals for full record review and large forms. See docs/superpowers/specs/2026-10-11-record-navigation-design.md for migration scope.

## Lecturer record lists (2026-10-11)

- All three record tables use the portal's existing table typography and shared data-table/data-th/data-td/data-td-strong styles; no separate font-size, weight or heading casing rules are introduced.

- Supersedes the summary-card list presentation below: Appointment requests and Research changes use aligned desktop tables with Student, Request type, Submitted, Current stage, Waiting at this stage and Action columns. Waiting time is recorded calendar days at the current stage; final outcomes display a dash and unavailable waiting data displays Not recorded.
- My supervisees uses the same responsive table presentation with Student, Programme, Your role and Action. The role is determined from the signed-in lecturer's recorded active team membership, independently of decision/nomination capabilities. Research titles remain searchable and available in supervision details.
- Narrow screens show stacked records with explicit field labels and one action per record. Request lists omit programme names and request references; these remain available in details with a Copy reference action. Appointment references remain searchable.
- All three lists offer 10, 25 or 50 rows per page, defaulting to 10 and returning to the first page when the size changes. Appointment/research page sizes persist with their existing URL filter context. Existing workflow grouping, filters and authorised actions remain intact. This change does not introduce server-side pagination or change API permissions.

## Lecturer workspace presentation consistency (2026-10-11)

- Appointment requests, My supervisees and Research changes share one page-level Refresh action. Requests/History switches sit beside the section title and description; all filters share one bar below that header.
- Summary cards lead with the student name and matric/programme details, followed by the request type, submitted date/reference and recorded status/age where relevant. Actions align on the right and wrap on narrow screens. Use Review request for authorised decisions, View request for tracking/history, and View supervision for supervisees.
- Use consistent Malaysia dates, calendar-day waiting wording, Recorded progress headings, profile links and confirmation controls. All three lists use ten records per page with the same pagination layout. Domain-specific actions and permissions remain intact.

## Lecturer request workspace restructuring (2026-10-11)

- Lecturer Supervisor navigation uses Appointment requests, My supervisees and Research changes. Appointment requests combines primary and supporting records in one searchable list with type, actual-status, semester/date filters and local Requests/History views. Research changes has its own independent Requests/History views and student/search filters.
- Requests retains all ongoing records, grouped by Needs your review, Awaiting Coordinator approval and other ongoing work. Only permitted decisions count toward review badges; cancel-only nominations and ineligible participants do not inflate them. History contains final approved/rejected/cancelled request outcomes. Supporting appointment endings/replacements remain a separately identified activity section.
- Lecturer acceptance/endorsement is distinct from final approval. Lecturers can follow their authorised requests while Coordinator approval is pending, with recorded stages, dates, reasons and informational calendar-day waiting ages. No estimates, progress percentages or additional approval authority are introduced.
- Both appointment types open review panels with their existing permitted actions, documents and audit information. Lecturer research/supervision details retain dedicated routes, a stable module heading and contextual Back below module navigation. This supersedes the older Lecturer Back-above-navigation requirement; Student and embedded Office/Coordinator conventions remain unchanged.
- View, search, filters, pagination and research student selection survive detail/return navigation and reload through URL state. Current research profiles and saved revisions remain separate from request outcome history.

## Separate Supervisor workspace pages (2026-10-10)

- Student Supervisor navigation separates My supervisors, Applications and Research changes; pending applications are separate from completed history. The overview retains current members, a compact pending-request status and useful visible guidance.
- Lecturer navigation separates Requests, My supervisees and Research changes. Individual supervision details retain team actions/history; request queues retain primary/supporting reviews and reviewed history.
- Research lists open individual request comparisons/audit details. Current profile and change form have dedicated views. Preserve permissions, cancellation/review/replacement actions and existing Office/Coordinator behavior.
- Staff dossier links read View student record; Student My Academic Record remains a read-only consolidated record with no evaluations. Page-level navigation supports direct links, refresh and browser Back.
- Nested workspace pages have one page heading and one parent Back action above the module navigation. History and research detail/profile/form views must not repeat full page headers beneath that navigation.
- Supervisor Request History omits generic policy and assistance cards; it retains request records, filters, pagination, details and supporting appointment history.

## Recognisable report filters and useful Lecturer reporting (2026-10-10)

- Lecturer breakdowns label the total as Records involving you and explain its authorised record types, shared Lecturer milestones and record-versus-student counting. Office/Coordinator wording and backend scope remain unchanged.
- Reports use shared visible form controls, a labelled filter toolbar, explicit Apply filters/Reset filters actions, the applied semester/date/programme scope and a notice when draft changes have not been applied. Downloads use applied filters and are unavailable while report results load or fail.
- Lecturer reports prioritise waiting records and assigned evaluation work with navigation to the existing records/Marks workspace. Waiting counts include other reviewers and must not be labelled as requests requiring the Lecturer's own approval. Preserve the original statistics, lifecycle/waiting distributions and export behind an optional Lecturer breakdown section. Office/Coordinator summary statistics retain their reporting purpose.
- Capacity, participant-lifecycle and reconciliation controls reuse the same shared form-control styles; remove undefined form-input usage without changing their workflows or permissions.
- Pending authorised research amendments appear in the report attention list as well as the waiting count, with the same scoping and filters in JSON and XLSX exports.

## Immediate cancellation audit visibility (2026-10-10)

- A successful Supervisor cancellation response must include the newly persisted cancellation audit entry with actor, timestamp, reason and status transition. The Student drawer must receive the complete history immediately without requiring a page reload.
- The shared Supervisor/Panel audit writer must invalidate previously prefetched history on its owning record; persisted events, historical records and role permissions remain unchanged.

## Student Supervisor application clarity and concurrent submission (2026-10-10)

- The three application sections are available together. Their numbered navigation links use equal styling and jump to the matching section rather than implying a first-step-only wizard.
- Supervisor selection exposes an explicit Selected marker, pressed state and selected-person summary. Students can toggle the candidate off or clear selection, including when search hides the selected row. Backend candidate selectability remains authoritative.
- The new-application form uses the same visible Appointment guidance layout as the appointment overview, with only relevant pending-request and approval/replacement rules. Content may differ before submission; repeated generic help and prerequisites cards are removed.
- A Student may have only one pending primary Supervisor application and one active primary Supervisor appointment. Same-form repeat submission is blocked while a request is in flight; simultaneous server submissions return one creation and a controlled duplicate rejection. Historical applications and normal replacements remain supported. Submission does not promise replay of the original response through an idempotency key.

## Shared toast clarity and validation feedback (2026-10-10)

- Shared portal notifications use one clearly identifiable dismiss button. Error status uses an exclamation icon, while success, warning and information retain distinct status icons; status icons must not resemble a second close control.
- Notifications use solid white surfaces, restrained borders/shadows, shared supporting-text typography, keyboard-visible dismissal focus and viewport-constrained wrapping. Errors announce as alerts; other notifications announce as status updates.
- Student Supervisor application validation remains in the shared toast. Dismissed or expired errors can appear again on a later attempt, and replacing a notification restarts its dismissal timer without an earlier timer hiding the newer message. Preserve existing validation, document limits and submission authority.

## Lecturer supervisory team card contents (2026-10-10)

- Expanded Lecturer teams use the same primary/supporting supervisor presentation as Student cards. The default view contains current supervisors, relevant management actions and current research title; programme, enrolment status, area and abstract belong to the expandable research profile.
- Supporting appointment histories remain accessible with capability-gated actions. Appointment activity opens directly as dated rows with status badges, without nested history/timeline disclosures. Application rows represent latest recorded statuses; supporting rows represent audit events.
- Office-managed semester dates are separated from appointment activity and identified as a shared semester schedule. Completed/active/upcoming schedule statuses must not imply measured individual research progress. Preserve existing records, staff access and Student evaluation restrictions.

## Lecturer appointment consistency and sequence (2026-10-10)

- Extend Student section, summary, member-card typography, spacing and visible useful guidance to Lecturer Supervisor and Panel pages. Keep Lecturer review authority, multi-student selection and all recorded histories; Student evaluation restrictions remain intact.
- Supervisor list order: workload summary, pending requests, active supervisees, research change requests, supervisory teams and guidance. Panel list order: workload/review summary, selected Panel review queue, nominations for supervisees, Panel assignments and guidance. Remove repeated selection cards and filler placeholders; searches filter the actual rosters.
- Lecturer research requests show changed fields and full reasons/approval history on demand, with eligible decisions retained. Initial profiles display recorded fields once; later revisions compare changed fields. Current active-supervisee research information follows the linked current profile, while historical requests retain submitted values.
- Guidance stays visible and explains only consequential module rules: supervision handover/research endorsement and Panel eligibility/replacement. Existing candidate eligibility, workload checks, replacement reasons, primary/supporting permissions and Coordinator final approval remain authoritative.

## Student research profile history presentation (2026-10-10)

- Student initial research history displays the original programme, title and abstract once, without empty previous-value comparison boxes. Later revisions compare only changed fields. Initial and revision cards share header typography, spacing and field styling; stored attribution, dates and reasons remain visible. Staff comparisons and workflow permissions remain unchanged.

## Student appointment consistency and useful guidance (2026-10-10)

- Student Supervisor and Panel pages share section/card spacing, member-name typography, status badges, refresh controls, page-header treatment and a visible-by-default Appointment guidance section.
- Guidance contains only actionable, module-specific information: configured Supervisor document labels and upload limits, incumbent/replacement rules when a supervisor is assigned, and the appropriate next step or replacement route for each public Panel readiness state. Remove generic process/turnaround, repeated confirmation and large help cards; retain the FAQ action without its own filler card.
- Panel member identity, contact details, department and appointment date remain hidden until both public status and readiness state indicate confirmation. Supervisor/research/history features and staff workflows are preserved. This change is scoped to the two Student pages; it does not invent Student Panel histories or expose evaluation data.

## Student Supervisor page structure (2026-10-10)

- The Student Supervisor page presents My supervisors, Research change requests and Previous applications. Students automatically view their own scoped record; pending requests must never expose a Student selector.
- Research requests initially show the changed field type, recorded stage and submission date. View details reveals only changed fields, the full reason and recorded approval events; eligible cancellation and research submission remain available. Research profile and supporting appointment histories remain accessible on demand.
- Academic semester milestones stay on the Dashboard and My Academic Record. Current research information comes from the research profile, while previous applications keep their historical submitted titles. Student views exclude staff approval controls and transfer evaluation-task notes; existing staff workflows are preserved.

## All-role typography coverage (2026-10-10)

- Typography consistency applies to every Student, Lecturer, Programme Coordinator and Office Staff/Admin module, including populated tables, nested cards, form labels/values, drawers, expanded histories, error/loading states and shared authentication/shell components.
- Table cells use the existing 12 px/600 role or 12 px/700 emphasized role; local conflicting sizes/weights must not override these roles. Equivalent summary counts use 24 px/800. Ordinary card and control text must not inherit unintended mono, italic, uppercase or tracking styles.
- Verification must distinguish source review from rendered populated, empty and error-state checks. Preserve deliberate document, identifier, badge, action and rich-text formatting roles.

## Student evaluation visibility boundary (2026-10-09)

- Students view evaluations and results through the university's central system, outside this portal. Student-facing screens and API responses must not expose evaluation tasks, periods, deadlines, submission status, completion rates, scores or comments.
- The Student academic record contains Supervision, Panel and Milestones only. Its dossier must exclude MARKS from visible sections, return null Marks data/status and omit Marks attention items. Office Staff/Admin and assigned Lecturer Marks access remains subject to existing authorization; Programme Coordinators retain their current restricted dossier sections.
- This user-confirmed scope supersedes the older student Marks/evaluation wording in Functional Requirements FR-14/FR-30 and Use Cases UC06/UC14. The reference PDFs remain unchanged pending revision from editable academic sources. Do not add a central-system link or integration without its authoritative URL/interface.

## Portal typography consistency (2026-10-09)

- Populated records, comparison fields, collapsible summaries, expanded histories and decision forms must follow the same typography roles as empty/summary views. Verification must inspect inherited parent styles and nested labels, not only explicit paragraph classes.
- Equivalent card/section headings and supporting paragraphs across student and staff modules must use the shared typography roles. Compact section headings use 14 px/800; larger section headings retain 18 px/800; card labels use 12 px/600, values 12 px/700 and supporting text 12 px/500. Summary metrics retain a distinct 24 px/800 role and compact secondary captions use 10 px/500.
- Ordinary explanatory text must not switch to monospace or inconsistent 10–11.5 px bold treatments. Identifiers, tabular metadata, badges, navigation, form controls and official document previews retain their appropriate distinct treatments.
- The Inter font request must include all requested UI weights, including 900 for existing black-weight emphasis. Typography corrections must preserve all workflow data, controls, authorization, validation and document output.

## Student academic record clarity (2026-10-09)

- Student Dashboard remains the starting point for current appointment summaries, upcoming deadlines and required actions. Its record link is labelled "View My Academic Record".
- Student self-view at `/dashboard/progress` is labelled "My Academic Record" and opens on the first authorised history section, without duplicating the Dashboard's overview, attention count or summary cards. Supervision, Panel and Milestones retain the existing authorised history and status data; staff dossiers retain their operational Overview and authorised Marks sections.
- Student enrolment metadata is labelled "Enrolment Status" and appears compactly in the identity card. "Status changed on" appears only when a persisted change date exists, in Malaysia time. Private actor, reason and audit metadata remain limited to internal dossiers.
- Student cards and record metadata use the existing Inter family with shared heading, label, value and supporting-text styles. UI wording changes do not introduce course registration, credit tracking or general coursework results.

## Participant lifecycle acceptance corrections (2026-10-08)

- The participant lifecycle workspace must hide stale records and mutation controls during refresh or detail loading and after read failure. Only the latest list/detail request may update the displayed participant; an in-flight mutation prevents competing selection, filter and form actions.
- Office Supervisor and Panel records must label Office-cancelled requests as Cancelled and ended appointments as Ended. Cancellation labels must not attribute an Office action to a Student or Supervisor. Assigned Lecturer review history must retain Office cancellations even when no Lecturer decision preceded them.
- Progress dossiers render academic lifecycle status and its effective date in Malaysia time. Internal views render the persisted reason, actor and immutable lifecycle history; Student self-view shows only public status and effective date, even if private metadata is mistakenly included in a supplied frontend object.

## Submitted Marks portal actions (2026-10-07)

- Authorized Office Staff/Admin correct submitted component scores and overall comments, or reopen a submission for its assigned Lecturer, from the existing Marks record detail screen. The Office role, staff status and existing `marks.change_markentry` permission are required; other actors and inspection-only Office accounts receive no editing controls.
- Correction and reopening require a reason and the reviewed record version. Scores must be finite, nonnegative, within the persisted component maximum and limited to two decimal places. Unknown/duplicate components, forged fields, unchanged corrections and stale/replayed requests must leave Marks and audits unchanged.
- Reopening is a separate operation permitted only while the evaluation period and semester accept ordinary submissions. It preserves component scores/comments, returns the entry to Draft and records its audit. A completion window does not permit reopening submitted Marks after closure. Reasoned correction retains the existing submitted status/date/deadline snapshot and remains available after period closure under the existing policy.
- Every successful operation uses the existing transactional workflow service and records actor, reason, timestamp and before/after values. The portal refreshes the record and displays those values in correction history; failures must not show success or retain stale editing authority.
- Django admin exposes Mark Entries and component scores for inspection only, including for superusers. Correction/reopening, ordinary model saves, inline editing and deletion cannot provide a second mutation path.

## Advanced Marks acceptance correction (2026-10-07)

- Marks backup student selection must follow the selected period's programme scope without excluding current-period tasks whose research profiles retain an earlier semester. Assignment options must use authoritative linked Student programme data, including blanks, and fall back to the profile programme only for unlinked legacy profiles. Changing the backup period clears the selected student and original task.
- Office Marks monitoring must label the semester scope of its operational totals accurately. Totals across multiple semesters must not be described as belonging to the first record's semester or one active period; paused/retired records remain excluded.

## Appointment failure-path acceptance correction (2026-10-07)

- The Office Panel Appointment Management workload snapshot uses the backend capacity state when supplied, including temporary unavailability and ineligibility, rather than inferring availability only from occupied seats. A temporarily unavailable member may show the public end date; internal availability reasons remain confined to the authorized Office capacity workspace.

## Replacement acceptance corrections (2026-10-07)

- Student Dashboard appointment cards use persisted Supervisor applications and the public student Panel view. They retain the active incumbent during replacement review, show the successor after final approval, release the Panel identity only when confirmed, and hide appointment cards during loading or retryable read errors.
- Distinct Panel recommendation attempts remain visible in history even when the student, candidate, displayed date and status match. Deduplication uses persisted recommendation identity, with record identity as the legacy fallback.
- Marks submission monitoring excludes paused and retired tasks from completion denominators, follow-up counts, previews and recent activity. Authorized history retains their original draft values and handover audits.

## Owned-workflow Django admin acceptance (2026-10-06)

Direction agreed on 8 October: routine Office users should perform their work in the main portal; Django admin should be restricted to designated technical administrators for occasional maintenance/investigation. Business authorization must be separated from admin-site eligibility across the five owned modules and their dependencies, retaining required role, action permissions, scope, validation and audits. This separation is pending implementation. The technical account rule and retained maintenance edits require the scoped design review recorded as T01–T06 in [the pending-work register](docs/PENDING_WORK_REGISTER_2026-10-08.md); a generic portal permission editor and teammate-owned Registry integration are not silently added to this scope.

- Django admin must expose governed semester, capacity, availability, rubric, evaluation-period, evaluation-task and audit records for inspection without add/change/delete or bulk-delete bypasses. Their mutations remain in the existing audited portal workflows.
- Submitted Mark Entry correction/reopening now uses the authorized Office portal and existing services; Mark Entry admin is inspection-only. Draft editing remains in the assigned Lecturer workflow; entries and correction audits cannot be deleted through admin.
- Submitted Marks portal corrections reject negative/non-finite/over-maximum scores, unknown components and closed-period reopening with validation responses and no partial changes or new correction audits. Admin mutation attempts are denied. Valid portal correction retains submission locking and recalculates the total; valid reopening requires the period still to accept submissions. An audited correction remains permitted after closure.
- Acceptance evidence must distinguish automated HTTP checks, browser checks and requirements still awaiting acceptance. Scope remains the five owned modules; production hosting checks, faculty confirmation and coordinator identity policy are separate.

## Whole-system manual acceptance coverage (2026-10-06)

- The testing handoff covers every sidebar module plus authentication, settings, academic/configuration lifecycle, reporting, delegation, research amendments, supporting supervision, replacement and late-completion branches.
- Live persistence, local prototypes and missing backend integrations must be identified explicitly; a prototype interaction must not count as full end-to-end acceptance. Test actor/scope prerequisites and current database state must be recorded without committing credentials.

## Full workflow acceptance corrections (2026-10-06)

- A first Panel nomination must omit an absent replacement reason; genuine replacement nominations still require the validated reason.
- Coordinator decisions must refresh their pending queue, appointment history and supervisory teams. Semester lifecycle changes must refresh the selected semester's audit history, with failed reads shown as retryable errors.
- Appointment timestamp dates and semester audit times use Asia/Kuala_Lumpur, consistently with the faculty's existing Malaysia deadlines. Date-only appointment values retain their calendar date.
- Verify the owned Student request → Supervisor acceptance → Coordinator approval → Panel appointment → both Marks submissions → semester closure workflow with synthetic, isolated data and persisted audit assertions.

## Shared production authentication cache (2026-10-04)

- All API workers must share authentication throttle history through the same PostgreSQL database cache. Production startup rejects process-local or unsupported cache configuration; local single-process development retains its existing default.
- Cache-table provisioning and cross-worker verification are deployment gates. Shared history does not promise exact limits for simultaneous requests; the existing DRF throttles remain approximate under concurrency.

## Timeline acceptance corrections (2026-10-05)

- Office Timeline Management must show the selected semester consistently in its summary, calendar, entries and audit history. Loading or failed selections must suppress previously loaded records; Retry must recover both initial semester-list failures and selected Timeline failures.
- Django admin may inspect Timeline headers, inline entries and audit logs. Add, edit, delete and bulk-delete actions must be unavailable there, preserving the validated and audited Office workflow.

## Owned-module integrity corrections (2026-10-03)

- A lecturer cannot hold an active or pending primary Supervisor and Panel role for the same student. Submission and final approval must recheck both directions, including replacements and retained/unlinked matric-number profiles; rejection preserves existing appointments and history.
- Add Timeline Entry accepts the Office form's selected `semesterId`. The backend resolves the timeline and permits changes only for Draft or Active semesters; status, ordering and timeline identifiers remain system-derived.
- Django admin provides inspection of governed appointment requests, appointments, document requirements and audit history. Academic/configuration writes use the existing audited workflows. Initial research-profile provisioning remains supported; audited Marks correction/reopening uses the Office portal.
- Marks scores must be nonnegative and within the component maximum. Invalid drafts return validation errors without changing persisted scores, comments or submission state.
- Lecturer task semesters come from each evaluation period, including historical assignments after profile handover. Semester filter options come from returned assignments rather than fixed academic-year labels.

## Account Settings Persistence (2026-10-01)

- Authenticated users can update their own phone number and nonurgent in-app announcement preference. Email remains Office-managed; self-service Settings cannot change account identity, role, programme or another user's data.
- Password changes require the current password and the configured Django password validation rules. Successful changes end existing access/refresh sessions and require sign-in again; passwords retain intentional whitespace.
- Announcement preferences apply to future nonurgent announcement notifications. Urgent announcements, academic workflow notifications, existing notification history and authorized attachment access remain available. Email notifications, scheduled deadline reminders and weekly digests remain unavailable and must not appear to be configurable working services.
- Settings must load persisted values, expose loading/failure states, prevent duplicate saves, and report success only after the backend accepts a write. A delayed request from an older login must not terminate a newer session.

## Release preparation (2026-09-29)

- Complete regression verification and isolated role-based acceptance before releasing the acting-coordinator, Marks completion-window and research-amendment changes.
- Verify database backup restoration without changing working academic records. Prepare deployment, private-media backup, rollback and faculty acceptance instructions while hosting remains undecided.
- Research workflow actions must display readable programme, source and destination coordinator stage labels.

## Audited Research Amendments and Programme Transfers (2026-09-26)

- Students request substantive title/abstract changes through primary-supervisor endorsement and coordinator approval. Office may apply minor corrections with a reason and an explicit declaration that research meaning is unchanged.
- Office initiates programme transfers through source-coordinator endorsement and destination-coordinator approval. Both explicitly review retention of the current supervisory team and Panel. Transfers atomically update Student and research-profile programmes without changing appointments, workload, existing Marks, drafts or completion windows.
- One amendment may be pending per student. Transfers require resolved appointment nominations and block new nominations while pending. Proposals are immutable; corrections require cancellation and a new request. Decisions recheck eligibility, current authority, profile revision and the reviewed team.
- Immutable before/after revisions and decision history preserve original applications. Primary handover cancels pending research requests; graduation/withdrawal cancel pending amendments. Deferred students cannot receive decisions. Unlinked legacy profiles remain outside this workflow.
- Existing screens and tracking expose scoped amendment history, stages and outcomes without granting supporting supervisors administrative-note access. Academic decisions are never automatically repaired by reconciliation.
- Supervisor handover preserves recorded research baselines and approved revisions; replacement application wording cannot silently rewrite recorded research history.

## Task-Specific Marks Completion Windows (2026-09-22)

- Office may grant selected existing, active, unsubmitted and eligible evaluation tasks an immediate, reasoned completion deadline, either extending a Published period's effective deadline or allowing recovery after period/semester closure. Supervisor, Panel and existing Backup tasks are supported; windows create no assignments and never reopen submitted Marks.
- Draft or unopened periods, archived periods/semesters, paused/retired tasks and ineligible participants or required appointments cannot receive effective windows. Expiry and reasoned revocation remove exceptional access while ordinary submission rules remain available where applicable.
- Windows retain immutable grant, replacement and revocation history, survive semester handover, and never transfer to a replacement evaluator. Task pause or retirement permanently ends their authority. Submission preserves the deadline and window used.
- Office previews unfinished work before period closure, semester closure or handover and acknowledges it using a current server-issued preview token. Archived records remain locked; active windows on unfinished tasks block archival.
- Existing screens, Dashboard actions/counts, reports/exports, dossiers and reconciliation share task-level deadline rules without expanding role-based access. Otherwise eligible closed-period work remains available for an Office recovery decision instead of automatic retirement solely due to closure.
- Existing assigned tasks retain their ordinary open-period submission access; exceptional completion grants additionally require the current eligible appointment. Published periods without a finite deadline do not need an individual extension. Submitted results retain the deadline used even if it was unlimited.

## Temporary Acting-Coordinator Delegation (2026-09-20)

- Office may grant an active existing Coordinator account temporary full coordinator access to an additional recognised programme. Its regular coordinator retains authority. Only one non-revoked acting assignment may overlap a programme's inclusive Malaysia start/end dates, including concurrent requests.
- Grants require justification and a start date today or later; grant fields are immutable. Corrections require reasoned revocation and a new grant. A coordinator may cover multiple additional programmes, but cannot be delegated their own regular programme.
- Active grants cover existing pending Supervisor, Panel, and co-supervisor requests and the same programme-scoped lifecycle, Dashboard, dossier, report/export and notification access. Programme records stay in place and historical decision actors remain unchanged. Every request rechecks effective authority; final decisions serialize against revocation.
- Expiry and revocation remove delegated record access without a background job. Office retains all delegation history; recipients retain their own assignment history. Active and future grants block retirement until revoked, and inactive accounts never retain effective delegated access.
- Delegations belong to programmes and survive regular-coordinator changes until expiry or revocation. Permanent coordinator replacement, Lecturer-account access, identity linking and new self-approval policies remain deferred.

## Programme-Scoped Evaluation Periods (2026-09-16)

- Office configures each Marks period for all programmes or selected programmes, and Supervisor, Panel, or both official evaluator roles. Selected scope requires at least one nonblank programme and every period requires at least one official role. One rubric remains attached to each period; co-supervisors never receive official evaluator tasks through their supporting role.
- Programme matching trims whitespace and ignores case. Linked Student programme data is authoritative, including a blank value; only unlinked legacy profiles use their stored programme. Existing periods and API requests omitting targeting retain all programmes and both roles.
- Targeting is editable only in Draft and appears in configuration audits. Office reviews a refreshed, read-only recipient preview before UI publication, including current student/evaluator pairs, new/existing task counts, and missing eligible appointments. Empty periods may be published with a warning. Preview is an estimate; later eligible appointments receive tasks through existing generation triggers.
- Preview, generation, and missing-task reconciliation use the same official-role selection. New task creation rechecks eligibility under transaction locks. Programme changes preserve existing tasks and Marks history but govern new assignments, including replacement tasks.
- Manual backup assignments must stay within the period's programme scope. A linked original task must belong to the same period and student and use an included official role; standalone backups retain existing reasoned audit behavior within scope.
- Individual rosters, cohorts/stages, separate role rubrics, and coordinator-role redesign remain outside this slice.

## Student Panel Privacy in Supervisory Teams (2026-09-15)

- Student team detail, workspace, and embedded dossier timelines expose only the current public Panel state. Pending recommendations show `FACULTY_PROCESSING` without recommendation identifiers or internal timestamps; confirmed active appointments show `CONFIRMED` and the public appointment date.
- A confirmed active appointment takes precedence while a replacement is pending. With no active appointment or pending recommendation, the team timeline omits the Panel entry; rejected, cancelled, and ended attempts do not create student team history entries.
- The public timeline uses a stable key unrelated to internal records. Existing staff visibility, team authorization, and standalone Panel/dossier history policies remain unchanged.

## Product Scope

The application is **A Web-Based Postgraduate Administrative Workflow, Appointment, and Project Evaluation Management System for FSKTM Coursework Programmes**.

The owned product boundary covers Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking. Measurable outputs are persisted role-scoped workflow status; elapsed waiting duration and responsible stage; authoritative deadlines and Marks completion; immutable decision, appointment, and participant lifecycle audits; lifecycle eligibility enforcement; and role-scoped analytics and exports. Course registration, enrolment, credit accumulation, course scheduling, and general coursework results are explicitly outside this boundary.

The five owned completion modules are Dashboard/Timeline, Supervisor Appointment, Panel Appointment, Marks Entry, and Workflow and Approval Tracking. Notifications/Announcements is a separate integration module owned outside this slice; these workflows may expose audit and routing metadata for it, but this module does not own notification-center behavior.

## Programme Scope

- The system programme list is limited to `MASTER OF DATA SCIENCE (COURSEWORK)`, `MASTER OF CYBER SECURITY (COURSEWORK)`, and `MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)`.

## Repository Organization Requirements

- The backend security baseline requires Django `>=5.2.17,<5.3`, Django REST framework `>=3.17.2,<3.18`, and sqlparse `>=0.6.0,<0.7`. Environment setup must upgrade pip to `>=26.2,<27`; frontend installations must use the reviewed lockfile and the existing Node.js `>=22.22.0` requirement.
- The project root must remain the workspace entry point.
- `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, and `PROJECT_STATUS.md` must stay at the project root.
- Frontend source, configuration, package files, and frontend runtime assets must live under `frontend/`.
- Frontend environment examples must include only public `VITE_` variables; a frontend `.env` file is optional unless local overrides are needed.
- Django backend source, configuration, requirements, and backend environment example files must live under `backend/`.
- Supporting PDFs, setup notes, specs, plans, and reference material must live under `docs/`.
- Generated local artifacts such as `node_modules`, `dist`, `.venv`, logs, and local `.env` files must be ignored and kept out of source-controlled project structure.

## Main Roles

- Office Staff/Admin
- Student
- Lecturer, including supervisor and panel responsibilities
- Programme Coordinator, as a separate authenticated role for panel appointment confirmation

## Current Frontend Scope

- Office staff/admin portal shell with authentication demo state.
- Sidebar navigation for dashboard overview, supervisor appointments, panel appointments, marks entry, and related administrative modules.
- Dashboard overview for office staff to monitor postgraduate administrative status, semester timeline, workload-related attention records, and quick module navigation.
- Registry management UI for student records and staff/lecturer account management.
- File management UI for repository browsing, document preview, upload flow, metadata, and document status handling.
- FAQ chatbot administration UI for maintaining academic FAQ entries.
- Letter generation UI for managing letter templates and template editing workflows.
- Announcement management UI for composing, filtering, and managing announcements.
- Notification center UI for office staff alerts and announcements.
- Forgot-password UI for unauthenticated account recovery guidance.
- Clean URL routing for authenticated portal modules and selected workflow detail links, so refresh, bookmarks, browser history, and notification deep links preserve the intended screen.
- Routed page transitions must reset the window scroll position to the top while keeping hash-only navigation available for future anchor behavior.
- Production builds must keep authenticated route-level module screens code-split and shared vendors chunked so Vite does not emit its default oversized JavaScript chunk warning.
- Marks and evaluation management UI for mark entry period configuration, rubric management, evaluation task assignment, submission monitoring, and mark records.
- Supervisor and panel appointment management UI for appointment status and workload monitoring.
- Lecturer workspace UI for supervisor appointment requests, active supervisees, panel assignment details, recommendation submission, assigned mark-entry tasks, mark-entry forms, and submitted-mark review.
- Student workspace UI for FAQ support, supervisor appointment viewing/application, panel appointment viewing, file submission, letter generation, and student dashboard shortcuts.
- Panel appointment records must appear directly below the search/filter controls on desktop layouts, with attention and workload widgets remaining in the right-side column.
- Panel appointment records should fit the desktop records card without requiring a horizontal scrollbar by using a wider records column, fixed table layout, and wrapped cell content.
- Office Staff/Admin Panel Appointment Management must load monitoring records from the persisted appointments backend when panel backend mode is enabled.
- Office Staff/Admin Panel Appointment records must be available only to Office Staff/Admin users; other authenticated roles must receive a forbidden response from the backend monitoring endpoint.
- Office Staff/Admin Panel Appointment summary cards must be calculated from the loaded panel records instead of hardcoded mock counts.
- Office Staff/Admin Panel Appointment records must include confirmed appointed panels, in-progress recommendations, rejected recommendations, cancelled recommendations, and eligible student research profiles with no panel workflow yet.
- Office Staff/Admin Panel Appointment records must preserve each historical recommendation attempt, so an earlier rejected recommendation remains visible as a separate record after a later recommendation is approved; the approved recommendation and its resulting appointment must not appear as duplicate rows.
- Office Staff/Admin Panel Appointment records must retain the recommended panel member, rejection stage, rejection reason, and available workflow timestamps for rejected attempts.
- Office Staff/Admin Panel Appointment records must treat cancelled supervisor recommendations as a separate visible lifecycle state with stable record IDs, cancellation reason, cancellation timestamp, recommendation ID, and workflow audit history.
- Office Staff/Admin Panel Appointment Records must paginate the filtered historical dataset at 10 records per page while summary cards and CSV export continue to use all matching records.
- Office Staff/Admin Panel Appointment status tabs must represent persisted lifecycle states only: All Records, No Panel, Pending, Approved, Rejected, and Cancelled. Workload alerts must remain in the dedicated workload monitoring surface.
- Office Staff/Admin Panel Appointment Detail must render selected backend panel record fields rather than screenshot/demo placeholders, show the academic year as `Session YYYY/YYYY`, show the complete panel workflow status timeline with recorded date-times when available, show richer related panel status information, and show related files/evaluation as concise no-records states until those modules are connected.
- Office Staff/Admin Panel Appointment record detail and workload monitoring must be page-level routed at `/panel-appointments/records/<recordId>` and `/panel-appointments/workload`, with back actions returning to `/panel-appointments` and unknown records showing a clear not-found state.
- Office Staff/Admin Panel Workload Snapshot and Panel Workload Monitoring must load lecturer workload from the persisted appointments backend instead of hardcoded lecturer rows.
- Office Staff/Admin Panel Appointment Management and Panel Workload Monitoring must export the currently filtered records as downloadable CSV files, including persisted lifecycle identifiers, timestamps, rejection metadata, and cancellation metadata for panel appointment records.
- Panel workload monitoring must count confirmed active panel appointments plus active pending nominations, show confirmed and pending counts separately, and classify lecturers as Available, Near Limit, or Full Load.
- Panel workload utilization displays must clamp progress values to a valid 0-100% range even if persisted workload limits are zero or inconsistent.
- Panel workload monitoring must be read-only for Office Staff/Admin users.

## Dashboard Requirements

- `Dashboard Overview` must render a real administration dashboard instead of a placeholder.
- The office-staff dashboard must show semester timeline status, selected records needing attention, monitoring tasks, and dashboard actions.
- For the FYP presentation slice, Administration Dashboard must keep the focus on the working semester timeline and selected monitoring lists; dependent summary cards for unfinished modules can be hidden to avoid implying unavailable integrations.
- Office staff must be able to open timeline management from the dashboard and return to the dashboard.
- Dashboard actions must route to existing modules such as Supervisor Appointments, Panel Appointments, and Marks Entry without breaking those modules.
- Administration Dashboard must display semester timeline entries in a month-lane calendar-style P1/P2 phase view instead of Month/Quarter/Year timeline controls.
- Dashboard semester timeline headings for Office Staff/Admin, Student, and Lecturer must display the academic period as `Session YYYY/YYYY` rather than a semester label.
- Each timeline event in the month-lane calendar must render on its own row so overlapping or adjacent events remain readable.
- Month-lane timeline bars must be positioned proportionally by actual day within the displayed month range, so short ranges ending early in a month do not fill the entire month column.
- Timeline event bars must show the timeline `Title` without inline date text, wrap long labels onto additional lines, and leave exact dates/details to the click-through modal.
- Timeline event bars must avoid separate vertical marker decorations and use compact readable labels so short events do not visually dominate a whole month column.
- Timeline labels in the calendar-style view must be clickable and open a detail modal with phase, start date, end date, action/status context, and `Detail` as the description.
- The P2 phase must remain selectable and show an appropriate empty state when P2 entries are not available yet.
- Administration Dashboard phase controls must use the full labels `Research Project 1` and `Research Project 2`, placed beside the Refresh action.
- Administration Dashboard must not show dashboard-level `Export Report` or `New Entry` actions.
- Administration Dashboard must not show the old status legend or `View Full Timeline` action below the semester timeline calendar.
- Administration Dashboard must not show the four placeholder summary cards for students without supervisor, supervisor records, panel records, and mark entry setup.
- Records Needing Attention must remove the redundant Status column, show zero impact for unfinished dependency rows, omit mark-entry task generation rows for now, and calculate the lecturer panel workload impact count from the persisted panel workload data.
- The shared Dashboard Action Centre must load persisted, role-scoped actions from `/api/dashboard/tasks/`; it must provide loading, error/retry, and empty states and navigate using the returned module, record type, and record ID.
- `Manage Timeline` must behave as a direct button that navigates to Timeline Management.
- Dashboard page-level routing must support only `/dashboard` and Office Staff/Admin-only `/dashboard/timeline`; unsupported Dashboard nested URLs must redirect authenticated users back to `/dashboard`.
- All authenticated users must be able to retrieve the active semester timeline for Dashboard Overview.
- Student and Lecturer dashboard timeline views must only display entries targeted to their role; Office Staff/Admin dashboard and management views may display all timeline entries.
- Student and Lecturer dashboards must retain their role-scoped semester timeline visualization and use the shared persisted Dashboard Action Centre for workflow, Marks, and timeline actions.
- If no active semester timeline is available, the dashboard must display `No timeline available at now` while keeping the rest of the dashboard available.
- Office Staff/Admin users must be able to download the official structured Excel timeline template, upload a completed `.xlsx` timeline, replace the active semester timeline, edit individual timeline entries, and trigger audit logging.
- Office Staff/Admin users must be able to add individual timeline entries to the active timeline, move entries between Research Project 1 and Research Project 2, delete obsolete entries, and see those changes reflected in the schedule, entries table, dashboards, and audit log.
- Timeline Management must use persisted backend data for summary cards, active semester schedule, timeline entries, upload results, add/edit/delete actions, and recent timeline updates/audit log when timeline backend mode is enabled.
- Timeline Management Recent Timeline Updates must display the newest audit records in pages of 10 without removing or merging audit history.
- Timeline Management must use the same P1/P2 calendar-style timeline presentation as Administration Dashboard and must not show an overflow menu action.
- Add/Edit timeline entry drawers must restrict classification to Research Project (P1) and Research Project (P2), and must not expose or submit manual status-state selection because status is derived from the entry date range.
- Semester timeline upload validation must reject missing required columns, missing required fields, invalid P1/P2 levels, invalid dates, invalid target roles, and deadline end dates before start dates.
- Semester timeline uploads must be `.xlsx` files no larger than 10 MB. Before parsing, the backend must reject malformed or corrupt ZIP containers, missing workbook structure, encrypted entries, unsafe archive paths, macro payloads, archives with more than 1,000 entries, and archives expanding beyond 50 MB.
- Timeline upload validation failures must retain the API contract `400 {"errors": ["reason"]}`, and the frontend must reject files over 10 MB before submission.
- The supported timeline upload template must use structured rows with `Level`, `Title`, `Detail`, `Action`, `Deadline Start`, `Deadline End`, `Week Label`, and `Target Roles`. `Title` is shown on the schedule label, `Detail` is shown as the description when the user opens the entry, and `Target Roles` accepts only `STUDENT`, `LECTURER`, and `OFFICE_STAFF`. `Step` and `Status` are not user-entered template columns.

## Office Staff Module Requirements

- Sidebar navigation must expose Dashboard Overview, Registry Management, FAQ Chatbot, File Management, Supervisor Appointments, Letter Generation, Announcements, Marks Entry, Panel Appointments, and Settings.
- Header notifications must route to `/notifications`, and workflow notifications must deep-link authorized users to the relevant Supervisor Appointment, Panel Appointment recommendation, or Marks record route when a record identifier is available.
- Existing Dashboard Overview behavior must remain the default authenticated landing view for every role after a normal login.
- Login, forgot-password, and reset-password flows must remain available at `/login`, `/forgot-password`, and `/reset-password?uid=...&token=...` after logout without blocking direct office-staff UI review during development.
- Production frontend hosting for clean URLs must fall back unknown frontend paths to `index.html` so direct refresh works on routes such as `/marks/records/<recordId>`.
- Office Staff/Admin Supervisor Appointment record detail and workload monitoring must be page-level routed at `/supervisor-appointments/<applicationIdOrStudentId>` and `/supervisor-appointments/workload`, with back actions returning to `/supervisor-appointments` and unknown records showing a clear not-found state.

## Lecturer Module Requirements

- When an authenticated demo user has the `Lecturer` role, Supervisor Appointments, Panel Appointments, and Marks Entry must render lecturer-focused workflows rather than office-staff administrative workflows.
- Lecturer users must land on Lecturer Dashboard Overview after login; Marks Entry remains accessible from the sidebar rather than being the automatic landing module.
- Lecturer Dashboard Overview must render a lecturer-focused dashboard instead of the office-staff administration dashboard.
- Lecturer Dashboard Overview must show the role-scoped read-only semester timeline without the office-staff Manage Timeline action.
- Lecturer Dashboard Overview must not show office-staff Records Needing Attention or Office Monitoring Tasks.
- Lecturer Dashboard Overview must show two dashboard cards: Students Under Supervision and Panel Appointment for Students.
- Lecturer Dashboard Overview must reuse the shared persisted Dashboard Action Centre for assigned Supervisor requests, selected-panel reviews, Marks tasks, and Lecturer-targeted timeline actions.
- Lecturer Supervisor Appointments must support pending supervisor request review, active supervisee detail review, and supervisor request history.
- Lecturer Supervisor Appointments must expose request history and active supervisee detail as page-level routes at `/supervisor-appointments/history` and `/supervisor-appointments/supervisees/<studentId>`, while keeping review drawers, filters, pagination, and toasts local to the component.
- Lecturer Supervisor Appointment review drawers must keep approve/reject controls and rejection reason inputs inside the scrollable drawer body so long request details do not leave decision controls fixed outside the scroll region.
- Lecturer Panel Appointments must support assigned panel task review, supervisor panel recommendation submission, and submitted recommendation review.
- Lecturer Panel Appointments must expose submitted recommendations, reviewed requests, and assignment detail as page-level routes at `/panel-appointments/submitted`, `/panel-appointments/reviewed`, and `/panel-appointments/assignments/<studentId>`, while keeping drawers, filters, pagination, and toasts local to the component.
- Selected panel lecturers must retain a read-only Reviewed Requests history containing recommendations they personally accepted or rejected, including the later Programme Coordinator outcome when available.
- Selected-panel Reviewed Requests must open as a separate page from a text-only button positioned above the Selected Panel Review Queue table.
- Lecturer Panel Assignment Detail must render backend assignment fields rather than screenshot/demo placeholders, show the academic year as `Session YYYY/YYYY`, show the complete panel workflow status timeline with recorded date-times when available, and show related documents/EE evaluation as concise no-records states until those modules are connected.
- Supervisor panel recommendation is separate from the student supervisor appointment workflow and applies only after a student already has an approved supervisor.
- A supervisor panel recommendation must contain exactly one recommended panel lecturer for the student.
- A supervisor cannot create another panel recommendation for the same student while a recommendation is Submitted to Panel, Pending Coordinator, or Approved/Confirmed.
- Panel acceptance moves directly from `SUBMITTED_TO_PANEL` to `PENDING_COORDINATOR`; the unused `ACCEPTED_BY_PANEL` state is not part of the supported workflow.
- The submitting supervisor may cancel a panel recommendation only while its status is `SUBMITTED_TO_PANEL`; cancellation requires a non-empty reason, is immediate, and creates the terminal status `CANCELLED_BY_SUPERVISOR`.
- A cancelled panel recommendation must remain in supervisor, selected-panel, Programme Coordinator, and Office Staff/Admin history as `Cancelled by Supervisor`, must leave the selected panel's active queue, must release its reserved workload, and must permit a replacement recommendation for the same student.
- Cancellation controls must never be available to the selected panel member, Programme Coordinator, Office Staff/Admin, or student, and cancellation must be rejected after any selected-panel or coordinator decision.
- A student may cancel their Supervisor Appointment request only while it is `SUBMITTED_TO_SUPERVISOR`. Cancellation requires a reason, creates terminal `CANCELLED_BY_STUDENT`, removes the request from the supervisor queue, preserves audit history, and permits a replacement request.
- Supervisor and Panel transitions must create immutable audit events containing actor, role, previous status, new status, reason, and timestamp.
- Workflow and Approval Tracking must maintain persisted audit events and stable module/record identifiers that the separate Notifications module can consume for deep links. Office Staff/Admin monitor workflows through read-only records rather than receiving every transition as part of this module.
- A supervisor may create a new recommendation for the same student only after the selected panel member rejects it or the Programme Coordinator rejects it.
- Submitted panel recommendations must route first to the selected panel member for acceptance or rejection; selected panel rejection requires a rejection reason.
- Programme Coordinator confirmation or rejection must occur only after the selected panel member accepts the recommendation.
- The supervisor who submitted a panel recommendation must see only tracking/status information for that recommendation and must not be able to approve or reject it as the selected panel member or Programme Coordinator.
- Panel recommendation review actions must be role-gated: selected panel members may decide only recommendations submitted to them, and Programme Coordinators may decide only recommendations that have passed selected-panel acceptance.
- Panel recommendation role-gating must be enforced by the backend API and database workflow, not only by frontend button visibility.
- Programme Coordinator panel appointment confirmation must use the existing separate `Programme Coordinator` login role.
- Programme Coordinators must have a dedicated dashboard using the Lecturer dashboard structure, a read-only Lecturer-scoped semester timeline, and a persisted action centre limited to Supervisor and Panel approvals in the managed programme.
- Programme Coordinator dashboard cards must show live supervisor and panel approval counts from persisted backend workflow state, scoped to the coordinator's managed programme.
- Programme Coordinator panel queues, records, dashboard counts, and decision permissions must be restricted to `Coordinator.programme_managed`.
- A Programme Coordinator without an assigned managed programme must see an explicit no-programme state, no protected panel records, and no approval actions.
- Programme Coordinator Panel Appointments must show the final-approval queue plus a searchable, status-filtered, read-only full-lifecycle records table for the managed programme, paginated at 10 rows per page.
- Programme Coordinator Panel Appointments must continue to support `/panel-appointments/recommendations/<recommendationId>` as a direct recommendation drawer link while redirecting lecturer-only panel subpages back to `/panel-appointments`.
- Programme Coordinator approve/reject actions must remain available only from the pending final-approval queue; completed and non-actionable lifecycle records must open in read-only detail mode.
- Programme Coordinators do not require a separate decision-history page because their programme-wide lifecycle table is the audit surface.
- Programme Coordinator Supervisor Appointments must show the live final-approval queue for accepted supervisor applications in the coordinator's managed programme, including approve/reject actions, mandatory in-app rejection reasons, persisted workflow audit history, loading/error states, and a clear no-pending-approvals state.
- The backend must persist student research profiles, supervisor panel recommendations, and final approved panel appointments for the lecturer-side panel workflow.
- Panel recommendation decision drawers must keep confirm/reject controls and rejection reason inputs inside the scrollable drawer body so long research details do not leave decision controls fixed outside the scroll region.
- Submitted panel recommendation detail drawers must be the supervisor tracking surface and show a request progress timeline covering recommendation submission, selected panel review, Programme Coordinator confirmation, and appointed panel status.
- Panel recommendation timelines must display recorded submission and confirmation/rejection date-times when those timestamps are available from the backend.
- Panel recommendations must not support a save-as-draft flow; supervisors submit directly to the selected panel lecturer.
- Panel workload validation must count confirmed active panel appointments plus submitted/pending nominations, and the UI must explain that this reserved workload is used before submission.
- Panel appointment APIs must keep the frontend response contract stable while resolving lecturer staff numbers, departments, and student matric numbers from the normalized role-profile tables.
- Lecturer Marks Entry must support mark-entry task review, mark-entry form access, history review, and submitted mark detail review.

## Workflow Ageing and Deadline Requirements

- Pending Supervisor and Panel approvals must expose derived `waitingSince`, `waitingDays`, and `waitingOn` metadata without storing recurring ageing records or changing immutable workflow audit events.
- Supervisor submissions wait on `SUPERVISOR` from submission; accepted Supervisor applications wait on `PROGRAMME_COORDINATOR` from the Supervisor decision.
- Panel submissions wait on `SELECTED_PANEL` from submission; accepted nominations wait on `PROGRAMME_COORDINATOR` from the selected-panel decision.
- Historical records missing a stage timestamp must fall back to the matching workflow transition and then the record update timestamp. Future or malformed waiting timestamps must display zero elapsed calendar days.
- Approved, rejected, cancelled, completed, and otherwise terminal workflow records must return null waiting metadata. Approval ageing is informational and must not be described as an SLA, due-soon state, or overdue state.
- Marks tasks and monitoring records must derive `dueAt`, `daysUntilDue`, and `deadlineState` from `EvaluationPeriod.closes_at`. The supported states are `NO_DEADLINE`, `UPCOMING`, `DUE_TODAY`, `OVERDUE`, and `COMPLETE`; submitted Marks remain locked and do not gain an approval stage.
- Timeline action metadata must be derived from persisted entry start/end dates without changing timeline persistence or audit behavior.
- `/api/dashboard/tasks/` must return at most 20 role-scoped actions while retaining its existing fields. Priority order is overdue deadlines, due-today deadlines, oldest waiting approvals, active timeline entries, then upcoming deadlines nearest first.
- Office Staff/Admin may see actions across all five owned modules. Programme Coordinators may see only managed-programme Supervisor and Panel approvals. Lecturers may see only assigned Supervisor requests, selected-panel reviews, their Marks tasks, and Lecturer timeline entries. Students may see only their own Supervisor wait, generic faculty Panel processing, and Student timeline entries.
- Student Panel payloads and actions must use `FACULTY_PROCESSING` and must not expose the selected panel, coordinator stage, recommendation ID, or internal workflow timestamps. Students without an active recommendation receive null Panel ageing metadata.
- Office Supervisor and Panel monitoring lists must provide an optional Longest waiting order while retaining their normal default order. Lecturer and Programme Coordinator approval queues default to oldest waiting first.
- Existing Supervisor and Panel CSV exports must include waiting metadata. Marks records and Lecturer Marks tasks must display persisted deadline metadata; no separate reporting subsystem is introduced.

## Workflow Analytics and Reporting Requirements

- Authenticated Office Staff/Admin, Programme Coordinator, and Lecturer users must have a read-only workflow analytics workspace at `/dashboard/reports`; Students must not receive this administrative reporting surface.
- Reports must aggregate only records already authorized for the requesting role. Office Staff/Admin may report across all programmes or one selected programme, Programme Coordinators remain restricted to their managed programme, and Lecturers remain restricted to assigned Supervisor, selected-panel, Marks, and Lecturer-targeted Timeline records.
- Optional `startDate` and `endDate` filters must use ISO dates and reject malformed or reversed ranges. Supervisor uses submission date, Panel uses submission date with creation fallback, Marks uses evaluation-period closing date with assignment fallback, and Timeline uses deadline start date.
- Supervisor and Panel reporting must include lifecycle, waiting-owner, informational age-band, and longest-waiting summaries. Age bands are descriptive calendar-day groupings and must not be presented as service levels, due-soon states, or overdue states.
- Marks reporting must retain its tracking-only model and summarize task status, deadline state, evaluator role, completion, and authorized overdue tasks. Timeline reporting must summarize current status, P1/P2 level, and target role.
- JSON reports and XLSX exports must use the same role-scoped reporting service and active filters. Export workbooks must contain only sections the requesting role can access and must not persist generated files or database records.
- Reports show the current persisted state of records selected by their reporting date; they do not reconstruct historical point-in-time snapshots or trend lines.

## Student Progress Dossier Requirements

- The system must provide a read-only progress dossier that aggregates persisted Supervisor, Panel, Marks, active Student-targeted Timeline, and workflow-audit data without creating dossier records or changing workflow state.
- Office Staff/Admin may view every student and all dossier sections. Programme Coordinators may view managed-programme students with Supervisor, Panel, and Timeline sections only. Lecturers may view only connected students, and each Supervisor, Panel, or Marks section must contain only records assigned to that lecturer.
- Students may open only their own dossier. Unauthorized and nonexistent matric numbers must return the same `404` response so the endpoint does not disclose whether another student exists.
- Student dossier payloads must exclude the entire Marks/evaluation section, including task periods, deadlines, status and completion metadata, as well as internal Panel stages, recommendation identifiers, pending selected-panel identity and staff audit actors. Pending Panel work is represented only as `FACULTY_PROCESSING`.
- Dossiers must show current records before newest-first lifecycle history, reuse existing waiting/deadline derivations, and return null waiting metadata for terminal workflows.
- Dossier attention must order overdue authorized Marks tasks first, active workflow waits by longest age second, and active/upcoming Student Timeline milestones third.
- Dossier navigation metadata must use existing module, record type, and record identifier fields. Approval, rejection, cancellation, submission, printing, and export remain in their owning modules.
- Staff dossier routes use `/dashboard/progress/:studentId`; the Student self-view uses `/dashboard/progress`. The workspace remains outside the sidebar and is opened from existing workflow tables, report attention rows, and the Student Dashboard.
- Students without a research profile must still receive available Supervisor and Timeline information with an empty Panel section and no Marks section.
- Lecturer screens must reuse the current portal shell, sidebar, top header, typography scale, card surfaces, and shared Tailwind theme tokens so the experience remains visually consistent with the office-staff modules.
- Authenticated module pages must use the global portal footer only, avoiding duplicate page-level institutional footers inside individual modules.
- Administrative pages should avoid decorative blur-orb backgrounds and use restrained card surfaces suitable for repeated office workflows.
- Authenticated role workspaces must use consistent `rounded-2xl` card surfaces, subdued shadows, and shared brand color tokens.
- Repeated portal UI patterns such as page headers, action buttons, cards, status badges, toast notifications, tables, forms, and filter controls should use shared primitives or shared CSS classes where practical.
- Toast notifications should appear at the top-right of the viewport, below the sticky top header, and remain above app overlays.
- Irreversible confirmations such as cancellation, deletion, and final mark submission must use the shared portal confirmation modal instead of browser-native `window.confirm()` dialogs.
- Dashboard and panel appointment actions must use in-app portal toasts or inline validation instead of browser-default `alert()` popups.
- Frontend API base configuration must be driven by Vite environment variables. Global mock mode may remain only for unfinished or teammate-owned modules.
- Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking must always use Django. Their services and screens must not inspect global mock mode, use module-specific backend switches, or substitute demo records after an API error.
- Owned workflow screens must expose their existing loading, retry, and authorization states when Django is unavailable or rejects a request.
- Demo data for unfinished modules must remain outside owned-module services and runtime components.
- Generated Gemini or AI Studio environment requirements are out of scope for this portal frontend and must not be required to run the app.
- Demo accounts must use clearly fictional `example.test` emails, `DEMO-*` identifiers, and demonstration-only profile data with no national identity-number patterns.
- Django demo seeding must require `DEBUG=True`, an explicit `ENABLE_DEMO_ACCOUNTS=true` opt-in, and non-blank per-role passwords supplied only through an ignored local environment file.
- Frontend demo-login controls must appear only in Vite development mode when `VITE_ENABLE_DEMO_LOGIN=true` and all per-role local passwords are configured; normal manual login must remain available otherwise.
- Production frontend builds must not contain demo passwords, testing-console markup, or testing-console copy even when demo environment variables are supplied to the build process.
- Refreshing or renaming local demo accounts must preserve existing account identities and their audit, timeline, and appointment history through an optional validated legacy-email mapping.
- Django REST APIs must require authenticated access by default. Only login, password-reset request, and password-reset confirmation may explicitly allow anonymous DRF requests; `/api/health/` remains a minimal public Django health check.
- Logout must require a valid authenticated refresh session, blacklist that refresh token, and delete its cookie.
- Backend role and record scoping is authoritative: students may access only their own records, lecturers only assigned workflow records, Programme Coordinators only their managed programme, and Office Staff/Admin-only monitoring must reject every other role.
- Letter templates are readable by every authenticated role and writable only by Office Staff/Admin or Programme Coordinator users.
- Announcements and Notifications are teammate-owned and excluded from behavioral security changes in the current core-API hardening slice.
- Login must be limited to 10 attempts per minute per client IP, password-reset requests to 5 per hour per client IP, and password-reset confirmations to 10 per hour per client IP, with environment-configurable rates.
- Authentication throttles must return HTTP `429` with `Retry-After`, and authentication screens must show a clear retry-later message.
- When `DEBUG=False`, Django startup must fail closed unless `DJANGO_SECRET_KEY` is non-placeholder, at least 50 characters long, and contains at least 5 unique characters; `DJANGO_ALLOWED_HOSTS` must be explicit and non-wildcard; and `CORS_ALLOWED_ORIGINS` must contain at least one valid HTTPS origin.
- Production requests must use HTTPS redirection, secure HttpOnly `SameSite=Strict` session and CSRF cookies, content-type sniffing protection, a same-origin referrer policy, and frame denial. Local `DEBUG=True` HTTP hosts, CORS origins, and the development secret fallback must remain available.
- Production HSTS must begin with a staged one-hour duration without subdomain coverage or preload. Raising it to one year and enabling `includeSubDomains` or preload requires verified HTTPS coverage across all subdomains.
- Forwarded-protocol trust must remain disabled by default and may be enabled only when a trusted reverse proxy strips untrusted client forwarding headers and sets `X-Forwarded-Proto` itself.
- Access tokens must default to 15 minutes, remain only in frontend memory, and authenticate normal APIs through the bearer header. They must never be stored in browser storage, URLs, or logs.
- Refresh tokens must default to 7 days, rotate on every renewal, blacklist the replaced token, and remain only in an HttpOnly `SameSite=Strict` cookie scoped to `/api/auth/`; production refresh cookies must be Secure.
- Login, refresh, and logout must require JSON requests; refresh and logout additionally require a valid refresh cookie. Missing, malformed, expired, replayed, password-invalidated, or inactive-user refresh sessions must return `401` without exposing refresh-token values.
- Password resets and account deactivation must invalidate existing access and refresh sessions. Application startup and a single authenticated `401` retry may renew through the refresh cookie without converting normal APIs to cookie authentication.
- Production must serve the React application and Django routes from one HTTPS origin through the tracked Nginx template, with `/api/` and `/admin/` proxied to Django and collected Admin assets served from `/static/`. Unknown hosts must be rejected, canonical redirects must not reflect the request Host header, and Nginx must emit the sole public HSTS header.
- Production documents must receive a CSP that permits scripts and API connections from the same origin only, prohibits inline scripts, objects, frames, workers, and media, and allowlists only Google Fonts and Unsplash images as external resources.
- CSP rollout must begin with the report-only include and move to the equivalent enforced include only after all owned role workflows complete without browser-console violations. No unauthenticated CSP collection endpoint is required in this slice.
- Production Vite builds must explicitly disable source maps and fail their security guard if emitted files contain `.map`, `sourceMappingURL`, inline executable entry scripts, demo credentials, or testing-console content. Nginx must return `404` for all `.map` paths, including maps present in collected third-party static packages.
- Inline styles remain temporarily permitted for current React dynamic layout behavior, but generated letter documents must register print behavior from the trusted application bundle instead of embedding inline scripts.
- Frontend build tooling must keep Vite in `devDependencies` only on the patched 6.x line, keep `tsx` and its transitive `esbuild` on advisory-free versions, and provide an `npm run audit:security` command that fails on any known low-or-higher vulnerability.
- Frontend routing must use patched `react-router` 8.3.0 or newer with React/React DOM 19.2.7 or newer and Node.js 22.22.0 or newer. The removed `react-router-dom` compatibility package must not be reintroduced.
- All frontend dependency paths must resolve PostCSS to 8.5.18 or newer through the package-level npm override.

## Student Module Requirements

- When an authenticated demo user has the `Student` role, shared sidebar entries must render student-focused workflows rather than office-staff administrative workflows.
- Student users must be able to access FAQ Chatbot, Supervisor Appointments, Panel Appointments, File Submission, Letter Generation, Dashboard Overview, and Settings from the sidebar.
- Student Supervisor Appointments must support viewing current supervisor details and submitting supervisor appointment applications.
- Student Supervisor Appointments must expose the new application form as `/supervisor-appointments/new` and continue opening submitted application detail from `/supervisor-appointments/<applicationId>`.
- Student Panel Appointments must support viewing pending and confirmed panel appointment states.
- Student Panel Appointments must remain rooted at `/panel-appointments`; nested panel appointment URLs that do not apply to students must redirect back to `/panel-appointments`.
- Student Panel Appointments must load panel appointment status from the persisted backend panel workflow instead of a manual test toggle.
- Student users must see a pending state until Programme Coordinator confirmation creates an active appointed panel record.
- Student users without a linked research profile must also see the pending panel appointment state instead of a hard loading error.
- After Programme Coordinator confirmation, the student Panel Appointment page must show the appointed panel member, programme, semester, research title, appointment date, and panel contact email when available.
- The confirmed student Panel Appointment view should avoid staff ID and repeated supervisor/student metadata so the module stays focused on the appointed panel.
- Student panel visibility starts immediately after Programme Coordinator confirmation; no separate Office Staff/Admin release step is required for this slice.
- Student panel appointment data must be scoped to the authenticated student so a student cannot view another student's appointed panel.
- Student File Submission must support selecting a submission category and uploading/viewing submitted research documents.
- Student Letter Generation must support selecting a letter template, previewing content, and triggering generate/print actions.
- Student Dashboard Overview must show the shared semester timeline in a read-only student context without the office-staff Manage Timeline action.
- Student Dashboard Overview must not show the top-right Active Student summary card.
- Student Dashboard Overview must keep only two status/action cards below the timeline: Supervisor and Panel Appointment.
- Student Dashboard Overview must remove Semester Progress, academic-guidelines, and Profile Status Complete panels from the dashboard.
- Student Dashboard Overview must reuse the shared semester-timeline next-actions list for timeline events targeted to Student.
- Dashboard and panel-facing demo/profile data must use only the approved programme list.
- Student screens must reuse the current portal shell, global footer, typography scale, card surfaces, and shared Tailwind theme tokens.
- Student-facing toasts, status labels, action cards, and dashboard cards must follow the same shared portal primitives used by office staff and lecturer screens.
- Cross-role table actions, pagination controls, drawer close controls, modal actions, upload actions, page headers, sub-view back headers, segmented selectors, removable tag chips, progress bars, status dots, and reusable status badges should use shared portal primitives unless the control is a highly layout-specific visual element.

## Five-Module Completion Requirements

- Supervisor Appointment applications must persist project details, proposed supervisor, private supporting-document files and immutable metadata snapshots, decisions, reasons, and timestamps.
- A student may have only one active supervisor application; rejected applications may be followed by a new application.
- The requested supervisor decides first, followed by final Programme Coordinator approval scoped to the managed programme.
- Supervisor and Panel decisions must enforce each lecturer's configured workload limit.
- Supervisor and Panel workflows must audit actor, role, action, previous status, new status, reason, and timestamp.
- Supervisor document requirements, workload limits, rubrics, and mark components must remain configurable until official rules are received.
- Office Staff/Admin must configure Supervisor application document requirements without physical deletion. Requirement codes are immutable; activation, deactivation, ordering, and content changes require audited configuration records, while each submitted application retains the code and label used at submission time.
- New Supervisor applications must fail closed when no active document requirements exist and must atomically submit multipart research data with at most one file per selected requirement, five files total, and 10 MB combined.
- Supervisor application documents accept PDF and DOCX only. Django must validate file signatures and package integrity, reject unsafe PDF actions and encrypted, traversing, macro-enabled, oversized, or malformed DOCX content, and prevent duplicate file content within one application.
- Private Supervisor files must never expose storage URLs. Authenticated attachment downloads are limited to the owning Student, proposed Supervisor, managed-programme Coordinator, and Office Staff/Admin; unauthorized and unknown files return the same not-found response.
- Historical document metadata without stored content must remain visible as `Legacy Metadata` without a download action. Rejected and cancelled applications retain their immutable documents and workflow history.
- Student, Lecturer, Coordinator, and Office Supervisor views must render only persisted application fields and documents. They must not fabricate eligibility decisions, supporting files, research content, timestamps, feedback, or appointment letters.
- Official faculty templates, academic eligibility thresholds, antivirus scanning, post-submission file replacement, Notifications/Announcements, and File Repository integration remain outside Supervisor intake until authoritative rules or teammate-owned interfaces are available.
- Evaluation task generation must create role-specific mark-entry tasks for both active Supervisor Appointments and active Panel Appointments.
- Marks Assignment must provide production Office Staff/Admin controls for selecting evaluation periods, generating missing tasks, filtering tasks by role/status, and assigning backup evaluators without raw ID prompts.
- Office Staff/Admin may add a backup/manual-override evaluator only for exception cases, with a mandatory reason and audit trail; this must not change the official supervisor or panel appointment.
- If a mark entry period is active and tasks were not manually generated, the backend must safely generate missing tasks without duplicating or overwriting existing/submitted entries.
- Marks Entry overview and monitoring must use live mark periods, task totals, and mark records rather than hardcoded submission counts.
- Dashboard and Marks Entry monitoring actions must open Mark Entry Records with the relevant status filter selected.
- Office Staff/Admin mark records must show unsubmitted tasks as `Overdue` after the evaluation period close date while preserving submitted records as `Submitted`.
- Marks Entry uses only `Not Started`, `Draft`, and `Submitted`; it has no approval workflow.
- Lecturer submission immediately locks marks.
- Authorized Office Staff/Admin users may correct or reopen submitted marks through the existing Office portal with a mandatory reason, reviewed record version and before/after audit values.
- Mark totals must be recalculated by the backend and component marks must not exceed configured maximums.
- Dashboard summaries must use live Supervisor, Panel, and Marks data with role and programme scoping.

## Production Marks Management

- Marks configuration is faculty-wide and persisted. Office Staff/Admin is the only portal role allowed to create or change rubric versions, rubric components, and evaluation periods.
- Every rubric belongs to a stable version family, has a sequential version number and configurable target mark, and may reference the version it supersedes. A published-period or task-referenced version is immutable and must be cloned before further changes.
- A rubric version is ready for publication only when it has active components and their maximum marks total exactly the configured target. Components are deactivated rather than physically deleted.
- Evaluation periods follow `DRAFT`, `PUBLISHED`, `CLOSED`, and `ARCHIVED` lifecycle states. The UI derives `DRAFT`, `SCHEDULED`, `OPEN`, `CLOSED`, or `ARCHIVED` from lifecycle state and Kuala Lumpur timestamps.
- Draft periods permit configuration changes. Published periods lock their name, semester, and rubric; only a closing-time extension with a mandatory reason is permitted. Closed periods may be archived and archived periods are hidden by default.
- Publishing requires a ready rubric, a valid opening/closing range, and a unique non-archived faculty-wide name and semester. Evaluation and backup tasks may be created only for published periods that have not ended.
- Every configuration mutation records an immutable actor, action, entity, reason, before value, after value, and timestamp audit.
- Lecturer drafts and submissions are accepted only while a period is published and open. Submitted entries remain locked, duplicate submissions conflict, and authoritative totals are recalculated only from persisted component scores.
- Draft updates remove persisted optional scores omitted from the request. Submission rejects duplicate, unknown, negative, over-maximum, or missing required component scores.
- State conflicts, locked configuration, duplicate submission, and illegal lifecycle transitions return `409`; malformed input and score validation return `400`.
- Office Staff/Admin Mark Record Detail must load one persisted record by stable record ID and show assignment, student/research summary, deadline, rubric version, component scores, comments, total, lock state, overrides, and read-only correction history.
- Office Marks administration routes must fail closed in the frontend for Programme Coordinator, Lecturer, and Student users in addition to backend endpoint authorization.
- Submitted-mark reopening and direct score or comment corrections use authorized, audited Office portal actions; Django admin is inspection-only. Reopening is permitted only while the period still accepts submissions; an audited correction with a mandatory reason and before/after values may be made after closure.
- Marks production screens must not ship mock records, browser-local period/rubric mutations, simulated sync controls, unsupported mark-sheet/PDF downloads, fake supporting documents, or notification dispatch behavior.
- Marks remains tracking-only with `Not Started`, `Draft`, and `Submitted`; no approval or grade-classification stage is introduced.

## Backend-Only Owned Workflow Boundary

- Appointment and Timeline service functions must call their Django endpoints directly under every Vite environment combination.
- Supervisor workload monitoring must be derived from active persisted appointments and configured supervisor limits. A Lecturer's own workload must use an authenticated, role-scoped endpoint.
- Lecturer acceptance of a Supervisor application must remain pending Programme Coordinator approval and must not create or display an active appointment until the backend creates one.
- Active-supervisee detail, panel candidates, recommendation histories, timeline semester/session metadata, and timeline dates must come from persisted API responses or explicit user input; the UI must not invent fallback identities, records, dates, or files.

## Central Academic Semester Requirements

- Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking must share one faculty-wide academic-semester authority. At most one semester may have the persisted `ACTIVE` lifecycle at a time.
- Academic sessions use consecutive-year values such as `2026/2027`; terms are limited to Semester I, Semester II, or Special Semester. Non-archived semester date ranges must not overlap.
- Office Staff/Admin alone may create, edit, activate, extend, close, archive, or audit semesters. Every authenticated role may read the minimal active-semester context displayed on its dashboard.
- Semester lifecycle transitions are one-way: Draft may become Active or Archived, Active may become Closed, and Closed may become Archived. Activation, handover, extension, closure, and archival require immutable audit records and mandatory operational reasons.
- Activating a replacement semester must atomically close the previous active semester and its published Marks periods. An active semester past its end date is effectively expired and blocks new Supervisor, Panel, and Marks workflows until Office Staff closes or replaces it.
- New Supervisor applications and Panel recommendations bind to the effective active semester on the server. Clients cannot select or override this relationship; unresolved prior-semester approvals and cancellations remain actionable and are labelled as carryover records.
- Timeline versions belong to a persisted semester. Office Staff may prepare the current Timeline version for a Draft or Active semester; Closed and Archived semester Timelines are read-only. Role dashboards render only the effective active semester's current Timeline.
- Marks draft periods may be prepared for Draft or Active semesters. Publishing and task generation require the effective active semester, and the evaluation window must remain within its dates. Extending a semester never changes Marks deadlines automatically.
- Workflow Reports default to the active semester and permit authorized `all`, `unassigned`, or stable semester-code history filters. Progress dossiers retain authorized complete history.
- Historical workflow strings remain available for display, but records that cannot be linked without guessing must keep a null semester relationship and display `Legacy / Unassigned`.
- Appointment and Timeline mock datasets and legacy `VITE_USE_SUPERVISOR_BACKEND`, `VITE_USE_PANEL_BACKEND`, and `VITE_USE_TIMELINE_BACKEND` controls must not be present in source or production artifacts.

## Supervisor-to-Panel Research Profile Handoff

- New Supervisor applications require a persisted free-text Research Area in addition to the research title and abstract. Historical applications may retain a blank legacy value.
- Final Programme Coordinator approval is the authoritative point at which the system must atomically create or connect the student's research profile and create the active Supervisor appointment.
- Research profiles provisioned by approval use the Student account's matric number, name, and programme; the approved application's title, abstract, Research Area, and academic-semester label; and the approved Supervisor appointment.
- Matching unassigned legacy profiles must retain their primary keys. Unused profiles may be refreshed from the approved application, while profiles with Panel or Marks history must not have populated historical research data silently overwritten.
- Separate user-linked and matric-linked profiles, or downstream-used profiles assigned to a different Supervisor, must fail final approval with `409 Conflict` and no partial appointment, profile, approval event, or state transition.
- Panel-eligible supervisees require an active approved Supervisor appointment for the authenticated Lecturer. Panel recommendation submission must revalidate that relationship server-side and reject crafted student identifiers.
- Student Panel status must expose only public readiness states: Supervisor required, Supervisor approval pending, ready for Panel recommendation, faculty processing, or confirmed. Pending internal Panel actors and stages remain private.
- Marks task generation must resolve the profile created by Supervisor approval and continue producing separate Supervisor and Panel evaluator tasks after the respective appointments become active.
- Active-supervisee detail must provide a deep action into the existing Panel recommendation workspace with the eligible student preselected; no additional sidebar module is introduced.

## Supervisor and Panel Appointment Closure and Reassignment

- Supervisor and Panel appointments have a persisted active/ended lifecycle, controlled closure outcomes, mandatory reasons, server timestamps, actors, predecessor/successor links, and immutable lifecycle events.
- The database permits at most one active Supervisor appointment per Student and one active Panel appointment per research profile. Approved applications and recommendations remain historical approval records after an appointment ends.
- Office Staff/Admin may end any active appointment. Programme Coordinators may end only appointments in their managed programme. Direct closure supports `COMPLETED`, `WITHDRAWN`, and `OTHER`; `REPLACED` is reserved for approved handovers.
- Students request Supervisor replacement through the existing multipart application with fresh current documents and a reason. Current Supervisors request Panel replacement through the existing recommendation and approval chain.
- The incumbent remains active during review. Final Coordinator approval atomically ends it as `REPLACED`, activates the successor, updates the research-profile Supervisor when applicable, and records lifecycle events.
- Supervisor replacement preserves active Panel appointments and system-cancels the outgoing Supervisor's in-flight Panel recommendations with immutable workflow events.
- Closure retires unfinished official Marks tasks in scheduled/open periods. Draft values are retained in an immutable handover audit, submitted entries remain unchanged, and approved handovers create clean tasks for replacement evaluators.
- Retired Marks tasks remain visible in authorized history but are excluded from lecturer queues, active totals, overdue totals, reports, dashboard actions, and completion denominators.
- Monitoring, CSV, Workflow Reports, and Progress Dossiers expose authorized lifecycle metadata. Student Panel views remain redacted, and Notifications/Announcements behavior is unchanged.

## Academic Participant Lifecycle Management

- Office Staff/Admin must manage Student and Lecturer academic lifecycle through the nested `/dashboard/participant-lifecycle` workspace; no sixth sidebar module is introduced.
- Student lifecycle states are Active, Deferred, Graduated, and Withdrawn. Lecturer lifecycle states are Active, Retiring, and Retired. Every transition requires a reason, server timestamp, Office actor, immutable audit, and transactional side effects.
- Deferred Students retain active appointments and read-only historical access, cannot start or advance Supervisor/Panel workflows, and have unfinished Marks tasks paused and excluded from operational queues, reports, overdue counts, and completion denominators.
- Reactivation resumes paused Marks tasks only when their original period still accepts submissions and the relevant appointment remains active; otherwise those tasks are retired with immutable draft/comment snapshots.
- Withdrawal atomically cancels pending workflows, ends active appointments as Withdrawn, retires unfinished Marks tasks, and preserves submitted Marks and all history. Graduation is blocked by unresolved approvals or unfinished operational Marks tasks, then completes remaining active appointments and preserves read-only access.
- Retiring Lecturers remain able to resolve existing decisions but are excluded from all new Supervisor, Panel, backup-evaluator, and Marks-task assignments in both candidate queries and direct-ID validation.
- Final Lecturer retirement requires no active appointments, assigned pending decisions, or managed Programme Coordinator responsibility. It retires remaining unfinished tasks, disables login, revokes refresh sessions, and is terminal in the portal.
- Student and Lecturer lifecycle fields cannot be edited through ordinary Django Admin forms because that would bypass domain side effects. Immutable lifecycle and task audits remain readable in Django Admin.
- Office Workflow Reports include participant lifecycle counts and Deferred/Retiring attention records. Internal dossiers include full lifecycle reason/actor/audit data; Student self-view exposes only public status and effective date.
- `docs/Functional Requirements.pdf` and `docs/Use Case Description.pdf` are unchanged binaries. Their confirmation-letter content and older scope wording require later revision from editable academic source files.
- Co-supervisor support follows the agreed implementation policy: one primary and up to two supporting co-supervisors; primary nomination, candidate acceptance, and programme coordinator approval. Each active supporting appointment consumes one supervision capacity slot. Panel nomination and supervisor Marks remain primary responsibilities. Supporting lecturers have read-only research, team, timeline, and workflow access without application documents or Marks. Active supporting appointments survive primary handover; overlapping Panel membership is prohibited. Official faculty policy confirmation and document templates remain pending.
- Supporting nominations require a justification, an active Student and primary supervisor, an eligible candidate, and no duplicate or pending/active Panel conflict. Active appointments and pending requests share the fixed two-position limit; a pending replacement shares its predecessor's position, retaining the outgoing appointment until final approval. Pending requests do not reserve lecturer workload; final activation rechecks capacity and eligibility atomically.
- Candidates and programme-scoped coordinators may reject requests. The nominating primary supervisor or Office may cancel unfinished requests with a reason. Office and programme-scoped coordinators may close appointments with a reason. Rejected, cancelled, ended, and replaced records remain historical; another attempt creates a new nomination. Stale decisions must fail without partial state changes.
- Primary handover/closure cancels unfinished requests from the outgoing primary with an audit while preserving approved supporting appointments. Deferred Students retain appointments but cannot receive new ones. Graduation/withdrawal closure and lecturer retirement checks include supporting appointments and unfinished requests. Ending supporting membership removes current Student-detail access while preserving the lecturer's own history.
- Supporting workflow stages, waiting age, team membership, and lifecycle outcomes appear in existing Supervisor screens, Dashboard actions/timelines, reports/XLSX, workload exports, and authorized dossiers. Reconciliation findings for missing/inconsistent records, duplicates, team overflow, and Panel overlap require review; no automatic supporting-record repair is enabled. No new top-level module, document-upload/template requirement, or automatic promotion to primary supervisor is introduced.

## Workflow Data Quality and Reconciliation Centre

- Office Staff/Admin must have a live scan of persisted Dashboard/Timeline, Supervisor, Panel, Marks, and Workflow Tracking relationships at `/dashboard/workflow-reconciliation`; no issue-status table or sixth sidebar module is introduced.
- Each issue has a stable identifier, current-state fingerprint, module, severity (`BLOCKING` or `WARNING`), repairability (`REPAIRABLE` or `REVIEW_REQUIRED`), affected identifiers, dependencies, and navigation metadata.
- Every repair requires a fresh preview, matching fingerprint, explicit reason, individual confirmation, current-state validation, row locking, and one immutable audit containing actor, action, before/after values, fingerprint, and affected records. Changed or resolved issues return `409 Conflict`.
- Coordinator scope comes only from `Coordinator.programme_managed` after the Coordinator role gate. A missing profile or blank programme may be repaired only for an existing Lecturer account with Coordinator access and a programme represented by persisted Students.
- Legacy semester relationships may be assigned only when persisted labels and dates identify one non-conflicting semester. Historical free-text values remain unchanged; ambiguous records stay `Legacy / Unassigned`.
- Exact-matric unassigned research profiles may be linked only without competing profiles or downstream Panel/Marks history. Profile Supervisor synchronization requires exactly one authoritative active Supervisor appointment.
- Missing approved Supervisor or Panel handoffs require persisted Coordinator actor/date metadata and valid current identity, programme, semester, participant, workload, appointment, and uniqueness checks. Original approval attribution and date are retained while the present repair is audited separately.
- Unfinished Marks tasks may be paused, resumed, retired with snapshots, or generated idempotently. Submitted Marks, evaluator attribution, immutable workflow events, and downstream histories must never be rewritten.
- Role/profile mismatches, downstream-used identity conflicts, and appointment source/replacement-lineage inconsistencies are review-required and expose no Apply action.
- Office Dashboard and Workflow Reports expose reconciliation counts and blocking attention links. Coordinator, Lecturer, and Student users cannot access reconciliation list, preview, apply, or audit endpoints.

## Lecturer Capacity and Availability Management

- Supervisor and Panel capacity must become semester-specific, versioned, role-specific, and Office-configurable through a workspace outside the sidebar.
- A semester cannot activate until one complete capacity plan is published for every lifecycle-Active Lecturer who holds a Supervisor or Panel role.
- Published plans are immutable. Active-semester changes require a new Draft version and atomic publication/supersession with a mandatory reason and immutable audit.
- Office may record separate Supervisor and Panel unavailability windows within semester dates. Existing appointments remain active; new submissions and final activation must respect effective availability.
- Reducing capacity below current workload preserves existing appointments, exposes `OVER_CAPACITY`, and blocks new assignments until load falls below the limit.
- The shared read-only resolver must apply deterministic `INELIGIBLE`, `NOT_CONFIGURED`, `TEMPORARILY_UNAVAILABLE`, `OVER_CAPACITY`, `FULL`, and `AVAILABLE` precedence. Supervisor load counts active appointments globally; Panel load separately counts global active appointments and submitted/pending reservation recommendations. Zero is a valid limit, and resolution never changes existing workflow or appointment state.
- Candidate queries and final mutation endpoints must use this same authoritative capacity resolver. Students receive only public selectability and, when the final state is `TEMPORARILY_UNAVAILABLE`, the applicable availability end date. Every other state returns a null public availability date, and internal availability reasons must not appear in resolutions or conflict messages.
- New semesters may copy only the latest strictly prior semester's Published plan, ordered by semester end date and stable ID, into Draft for Office review. Same-semester, overlapping, future-to-past, and arbitrarily older copies are conflicts. Legacy global limits seed only documented migration baselines and are not authoritative for new semester-bound workflows.
- Capacity plan services create blank Drafts, copy only currently eligible source entries from the allowed prior Published plan, and clone a current Published or Superseded same-semester source into the next version. Every copied or cloned plan records that source through `supersedes`, including cross-semester copies, and exposes the source ID in snapshots and COPY audits. Newly eligible Lecturers and newly acquired roles remain explicit publication blockers instead of receiving guessed limits; ineligible historical source entries and availability windows are not copied. Creation, cloning, entry editing, publication, and new availability restrictions are limited to Draft or Active target semesters; Closed and Archived capacity history is read-only, while historical cancellation remains permitted.
- Draft entry editing and publication require the caller's current capacity-plan content fingerprint. The fingerprint is derived from canonical plan identity/lifecycle data and ordered entry identities, role limits, and update timestamps. Malformed fingerprints are validation errors; stale fingerprints are lifecycle conflicts detected after row locking and before mutation or audit. API write commands accept exact camelCase `expectedFingerprint` and `expectedVersion` fields; this adds no database column or migration.
- Publication requires a non-blank reason and complete role-aligned coverage for every lifecycle-Active Lecturer with a Supervisor or Panel profile. After locking the semester and all same-semester plans, publication locks all entries for those plans in deterministic plan/Lecturer/entry order before fingerprint/readiness validation and supersession; cross-semester entries are excluded. It atomically supersedes any current Published plan, publishes the target Draft, and rolls back every lifecycle and audit change if validation or persistence fails. Zero limits and reductions below current load are valid and never alter appointments or workflows.
- Availability services require a Draft or Active target semester, a lifecycle-Active Lecturer with the requested role, ordered semester-contained dates, a non-blank reason, and no overlapping active same-role window. Supervisor and Panel windows remain independent. Cancellation is append-only, requires its own reason, preserves the original dates/reason, rejects stale or repeated cancellation, remains available after semester closure or role/lifecycle removal only for the same persisted semester/Lecturer/role identity, and cannot reactivate a cancelled window. New fully cancelled rows and cancelled-row identity reassignments still require normal role eligibility.
- Every plan creation/copy, Draft entry save, publication/supersession, and availability creation/cancellation records an immutable actor-attributed audit with deterministic JSON-safe before/after snapshots and affected plan, semester, Lecturer, and window identifiers.
- Capacity-plan, entry, availability, cancellation, and capacity-audit management APIs are Office Staff/Admin-only. They expose stable plan/entry/window IDs, semester and version lineage, actors and timestamps, readiness errors, current-published state, current role-specific load/resolution metadata, and internal availability reasons. Other roles receive `403` and never receive these management payloads.
- Capacity management APIs return `400` for malformed camelCase values, `404` for unknown or unauthorized objects, and `409` for stale versions/fingerprints, invalid lifecycle transitions, overlap, publication/readiness conflicts, and concurrent capacity changes. Plans, entries, windows, and audits have no physical-delete API.
- Every capacity-management request body uses an exact field allowlist. Unknown, misspelled, wrong-case, snake_case, and surplus keys return `400` before any mutation or audit; clone accepts only an empty object. This strictness is capacity-specific and does not change existing Academic Semester API compatibility.
- Capacity-plan, capacity-audit, and availability-history lists retain array response bodies but require bounded `limit`/`offset` pagination. The default limit is 25, the maximum limit is 100, offset defaults to zero, and the maximum offset is 1,000,000; malformed, zero/negative limits, negative offsets, or excessive values return `400`. Successful list responses expose `X-Total-Count`, `X-Limit`, and `X-Offset`, including through configured CORS response-header exposure.
- The Office-only DRF permission is authoritative for every capacity management method. Authenticated Student, Lecturer, and Programme Coordinator requests receive `403` before object lookup or metadata dispatch, including `OPTIONS`, `HEAD`, and unsupported methods.
- Semester activation must fail closed with `409` unless the locked target Draft semester has exactly one complete Published capacity plan. The shared capacity-readiness rules are authoritative, and the gate runs before closing a prior semester, closing Marks periods, or writing semester/Marks audits.
- Capacity cutover creates a `MIGRATED_BASELINE` Published plan only for the current Active semester and semesters referenced by unresolved Supervisor or Panel workflows when no Published policy already exists. It preserves prior plan versions, workflow identifiers, relationships, and legacy semester labels; eligible active Lecturer role limits are copied independently and inactive accounts or Lecturers are excluded.
- Guarded fictional demo seeding publishes a complete policy before activating a newly created demo semester. Reruns are idempotent and neither demo seeding nor shared test fixtures may replace or supersede developer-created capacity plans.
- Supervisor applications and Panel recommendations must enforce the published policy for the workflow's persisted academic semester during both validated submission and the locked database mutation, except for an explicit Office carryover reassessment authorization at decision time as defined below. Direct Lecturer identifiers, replacement requests, and stale candidate screens cannot bypass this guard; capacity conflicts return `409` and create no workflow, document, appointment, profile, or audit side effect.
- Existing selected Lecturers remain visible on persisted applications and recommendations after capacity or availability changes. Supervisor and selected-Panel review decisions may continue, but final Programme Coordinator approval must recheck the source semester (or the explicitly authorized active-semester capacity policy) and leave the workflow in `PENDING_COORDINATOR` when activation is blocked.
- Supervisor and Panel candidate directories omit `INELIGIBLE` and `TEMPORARILY_UNAVAILABLE` Lecturers. `FULL`, `OVER_CAPACITY`, and `NOT_CONFIGURED` Lecturers remain visible but non-selectable. Candidate and workload rows expose semester, plan/version, state, load, limit, available slots, selectability, and the public availability end date.
- Panel final approval converts the recommendation's existing reservation into an active appointment. The recommendation being approved is excluded from the activation check so its reserved slot is not counted twice, while every other submitted or pending nomination remains part of global Panel load.
- Office Workflow Reports and Dashboard actions must expose role-specific capacity-state counts and attention for over-capacity, temporary-unavailability, and active-semester unconfigured policy states. Non-Office reports must not expose the faculty capacity summary or internal availability reasons.
- Existing Supervisor and Panel report/export rows must include the authorized semester, capacity plan/version, state, limit, current load, available slots, and public availability end date. Capacity reporting remains current-state operational reporting rather than historical reconstruction.
- Reconciliation must detect missing or incomplete current capacity plans, role/entry drift, multiple Published plans, overlapping active availability windows, and divergence between authoritative Published limits and legacy profile compatibility values. Only a Draft semester with no policy history and exactly one verified prior Published plan may offer `COPY_CAPACITY_PLAN`; every other capacity issue is review-required.
- Capacity reconciliation repairs must reuse preview fingerprints, mandatory Office reasons, transactional locks, and immutable `WorkflowReconciliationAudit` records. Closed and Archived semesters are historical policy, not missing-plan operational issues.
- The frontend capacity boundary must use typed, backend-only Django services for plan history, plan creation/copy/clone/publication, Lecturer entry updates, availability creation/cancellation, and immutable audits. No mock or silent fallback may be used for capacity configuration.
- `/dashboard/lecturer-capacity` is a lazy-loaded Office Staff/Admin route outside the sidebar. Authenticated non-Office users must be redirected to Dashboard before capacity management content is rendered.
- Shared frontend helpers must provide deterministic capacity labels, zero-safe and 0-100-clamped utilization, role-aware Draft entry validation, semester-bounded availability validation, and clear stale `409` guidance.
- The Office workspace must expose semester selection, complete plan/version history, blank and copied Draft creation, same-semester cloning, version comparison, role-specific limit editing, readiness blockers, reasoned publication, date-ranged availability, reasoned cancellation, and immutable audit history. Mutating plan and new-availability controls are unavailable for Closed and Archived semesters, while valid historical availability cancellation remains supported.
- The workspace must use Kuala Lumpur calendar dates for current/upcoming availability, retain an open command drawer when a stale `409` occurs, reload the latest policy, and require explicit reasons and confirmation for publication and cancellation.
- Office users must be able to reach capacity management from Dashboard, Academic Semester Management, Supervisor Workload Monitoring, Panel Workload Monitoring, and Workflow Reconciliation without adding a sidebar module.
- Student Supervisor selection and Lecturer Panel nomination must treat backend `selectable` as authoritative. Full, Over Capacity, and Not Configured candidates remain visible but disabled where returned; temporary unavailability may be shown only as a public resume date on an already persisted selection, never with the Office reason.
- Lecturer Dashboard, Supervisor Appointments, and Panel Appointments must show the authenticated Lecturer's current published-plan version, capacity state, load/limit, and public unavailability date. Panel capacity must include confirmed appointments plus pending nominations and must not use a fabricated fallback limit.
- A final Supervisor or Panel approval `409` must leave the persisted pending record visible, display the backend conflict, and reload the relevant approval queue. The client must remove a row only after a successful transition.
- Supervisor and Panel workload CSV exports must include Semester Code, Plan Version, Capacity State, Active Load, Reserved Load, Available Slots, and Unavailable Until. Utilization is null-safe and clamped to 0-100, and internal availability reasons are excluded.
- Release verification for this feature must cover all owned backend modules, every frontend TypeScript test, dependency audit, lint, production build and artifact guards, plus live role-scoped checks for Office, Lecturer, Programme Coordinator, and Student access. A browser-only visual pass must be recorded separately when the desktop browser runtime is unavailable rather than inferred from API or source-test results.

## Carryover Capacity Reassessment (2026-09-29)

- Office Staff/Admin may authorize a pending Supervisor application, co-supervisor nomination or Panel recommendation from a Closed semester to be assessed against the effective Active semester's Published capacity policy. The original semester, application documents and approval chain remain unchanged.
- Authorization requires a reason and preserves immutable grant, replacement, revocation and usage history. It does not approve the request, add capacity or reserve new workload. Final approval still enforces current workload, availability, participant eligibility, replacement rules and role conflicts.
- Each authorization is tied to one target semester. If it ceases to be the effective Active semester, Office must reassess again. Archived source records cannot use this route. Without an authorization, existing source-semester capacity rules continue.
- Office may revoke an unused authorization with a reason. Concurrent or stale decisions must fail without partial changes. Final usage records the policy version actually checked, rather than assuming the policy at grant remains current.
- The existing Supervisor Appointment/team workspace exposes original/current capacity and authorized staff history. Office controls mutations; programme-scoped regular and acting coordinators can read relevant records. Students and unrelated users cannot read internal reassessment history.
- Reassessment changes no Marks tasks, drafts, submitted results or completion windows. Normal appointment activation continues to use its existing Marks lifecycle behavior.

## Logical Configuration Corrections (2026-09-30)

- Spreadsheet reports must preserve untrusted text as literal XLSX text and neutralize formula-leading CSV strings, including leading whitespace/control prefixes. Real numeric cells remain numeric.
- Backup reassignment may create a new active task when only retired assignments exist. Retired tasks, drafts and audits remain unchanged. An existing non-retired backup assignment for the same student, evaluator and period returns a conflict without another assignment audit; this includes paused and submitted assignments.
- Marks period opening/closing configuration and task completion windows use explicit Malaysia time (UTC+08:00) for entry, editing and display regardless of device timezone. Invalid calendar dates must not silently normalize.
