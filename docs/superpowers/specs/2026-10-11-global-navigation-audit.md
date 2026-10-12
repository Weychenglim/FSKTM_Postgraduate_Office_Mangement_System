# Global navigation audit — 11 October 2026

Applies to active App dispatch and every supported role. Source authority: PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md, the approved record-navigation design, App.tsx, route/access helpers and each module call site. This is an audit of active navigation, not a redesign of business workflows.

## Standard

Lists keep their module heading, navigation and controls. Opening a full record or substantial form shows one record heading with one labelled return above it; owning list/module tabs are absent. Brief confirmations/help/previews use PortalModal. Contextual controls and permanent adjacent editors stay inline. Dossier section tabs describe one record and remain valid. Inter and existing portal typography are unchanged.

## Active module inventory

Role abbreviations: S Student; L Lecturer; C Programme Coordinator; O Office Staff/Admin. Role access is still determined by existing frontend guards and authoritative backend capabilities.

| Module / active components | Roles | Pattern and audit result |
| --- | --- | --- |
| Student/Lecturer/Coordinator/AdministrationDashboard, TimelineCalendar, ActionCentre | S/L/C/O | Landing lists and summaries; milestone preview is shared modal; research action targets now resolve the exact request rather than the module root. |
| StudentProgressDossier | S/L/C/O within scope | Dedicated routed record; labelled source return retained during loading, errors and unavailable records. Record section tabs remain. |
| StudentSupervisorAppointment, SupervisorAppointmentApplicationPage | S | Dedicated application/research/profile/form pages; existing notification routes and authorised records preserved; return context uses shared validated helper. |
| LecturerSupervisorAppointments, LecturerAppointmentRequests, LecturerResearchWorkspace, LecturerSuperviseesWorkspace, ActiveSuperviseeDetail | L | Three list tabs; request/supervision/profile forms and detail screens use shared RecordPage. Query view/search/page/size retained. |
| CoordinatorSupervisorApprovals | C | Queue still permits contextual decisions; Review request/deep link opens one authorised request page, rather than highlighting the full queue. Rejection drafts cleared after guarded abandonment; busy decisions disabled. |
| SupervisorAppointmentManagement, PanelAppointmentManagement, PanelAppointmentDetail | O | Routed records use shared frame including loading/error/not-found. Lifecycle controls report drafts/busy to the record. List controls retained across dossier remounts. |
| SupervisoryTeamManagement, CoSupervisionRequests, CarryoverCapacityReassessment | Permitted S/L/C/O capabilities | Existing adjacent team management and short nomination/decision controls remain contextual. No standalone overlay record call sites. |
| ResearchAmendments, StaffResearchWorkspace | S/L/C/O within scope | Staff embedded lists now open local record pages; staff notification research routes resolve dedicated records via the same authorised APIs. Comparisons, team retention, decision reasons and audit history preserved. Large staff request form uses shared page. |
| SupervisorRequestHistory, SupervisorDocumentRequirements | Permitted L/O | Lists and dedicated local record/form pages; brief confirmations shared. |
| StudentPanelAppointment | S | Top-level appointment workspace with current/history records shown in context; no standalone record overlay. |
| LecturerPanelAppointments, SubmittedRecommendationsPage, PanelAssignmentDetail, RecommendPanelMemberDrawer, RecommendationDetailsDrawer | L/C as permitted | Review, nomination and recommendation tracking pages use shared frame. Assignment has one labelled return; fallback states retain it. |
| SupervisorWorkloadMonitoring, PanelWorkloadMonitoring, LecturerCapacityManagement | O | Workload/capacity lists with dedicated record/plan/availability pages. Capacity list return now uses PageHeader rather than a right-side generic button. |
| StudentRegistry, StaffLecturersRegistry | O | Dedicated profile and registration/account pages; owning list tabs hidden; filters, page and module tab retained within signed-in shell. |
| CoordinatorDelegations | C/O within scope | Contextual programme delegation configuration and grant history; adjacent grant/revocation controls retain existing scope and audit rules. |
| LecturerMarksEntry, MarksEntryHistory, MarkEntryDetail, SubmittedMarkDetail | L | Lists remain mounted while record opens. Dedicated local records protect edited scores/comments and in-flight saves; Back names the actual source list/history. |
| MarkEntryRecords, MarkEntryRecordDetail, SubmittedMarksActions | O/other explicitly permitted administration roles | Routed record with fallback heading/return; local correction/reopening controls report draft/busy state. Staff filters/status/page retained; clamps wait for loaded data. |
| MarkEntryPeriodConfig, RubricsManagementView | Permitted administration roles | Contextual configuration workspace with existing short edits and shared confirmations. No separate overlay record/form. |
| EvaluationTaskAssignment | Permitted administration roles | Task list, brief task preview modal and dedicated backup evaluator form. |
| AcademicSemesterManagement, ParticipantLifecycleManagement, ClosureReview | O | Contextual version/lifecycle editing and closure workflow; no separate overlay record. Existing mutation confirmations preserved. |
| TimelineManagement, AddTimelineEntryDrawer, EditTimelineEntryDrawer, UploadTimelineDrawer | O | Timeline list with dedicated creation/edit/import page; native milestone previews. |
| WorkflowReports, WorkflowReconciliationCentre | L/C/O as permitted; reconciliation O | Report list/navigation; reconciliation review/repair uses shared dedicated page and protects reasons/save. |
| StudentFileSubmission | S | Top-level contextual upload workspace and own submissions; no nested record page or overlay. |
| FileRepository, UploadNewDocument | L/C/O as permitted | Permanent adjacent preview remains contextual; substantial upload uses RecordPage and draft guard. List remains mounted for focus/filter return. Existing simulated repository operations remain simulated. |
| StudentLetterGeneration, LetterTemplateManagement | S/O | Top-level letter workspace and permanent template/preview editor; short confirmations stay modal. No nested overlay record. |
| AnnouncementManagement | O | List is owning page; saved draft edit/publish/delete actions retained there. New/edit composer is dedicated RecordPage with draft/busy guard. Existing publication APIs unchanged. |
| NotificationsAnnouncements | S/L/C/O | Notification/announcement lists; brief notice preview shared modal; workflow targets retain role guards and record routes. |
| SettingsView, AcademicFAQEditor, StudentFAQChatbot | Roles permitted by access map | Contextual settings/FAQ editors and chat workspace; no standalone overlay record. |
| LoginCard, ForgotPasswordFlow, ResetPasswordPage | Authentication | Auth shell keeps its existing recovery hierarchy. Login guidance uses the shared native dialog with Escape/focus return; no new credential or access behavior. |
| Sidebar, TopHeader, AppLayout, PortalToast | S/L/C/O | Navigation/dropdown backdrops and toasts are shell controls, not record viewers. |

## State and scope

RecordPage keeps local owning lists mounted. Routed lists that remount retain UI-only controls in ListState, scoped by component and authenticated shell; logout destroys that memory. No academic records, tokens or draft contents are put in local/session storage. Return paths still use validated module paths/history indexes. Deep-link reload has an owning-list fallback.

Unused exports RequestReviewPanel in RequestWorkspacePrimitives and RightDrawer in LecturerSupervisorAppointments remain dormant; rg confirms no callers. Active RightDrawer imports refer to the RecordPage adapter. These unused legacy exports do not constitute an active role flow and were not deleted as part of navigation work.

## Verification

Final checks pass: 89/89 frontend regression scripts, TypeScript, production build, production demo isolation guard, production CSP/artifact guard and git diff whitespace validation. Read-only review findings were fixed and checked again; no remaining actionable findings. Existing backend permissions, APIs, schema and dependencies are unchanged in this follow-up.

Representative desktop acceptance covered Student research detail/return, Lecturer lists and empty Marks, Coordinator dashboard request and rejection draft discard/reopen, Office announcement/upload dirty navigation, supervisor/dossier return preserving search, staff research local and routed request pages, research form discard and retained student selection. Login help Escape/focus return passed. The corrected Office dashboard research target was checked live against request #2. No approval, marks submission, save, publication, deletion, closure or upload was executed. Populated Lecturer Marks and research successful/failed mutation lifecycle were reviewed in code and applicable fixtures, rather than submitted live.

Browser acceptance is representative, not every data/permission/error state. Empty demo datasets cannot prove populated mutation paths; existing fixtures and authoritative backend capabilities remain the authority. Local editor URLs still reload to the owning list. Saved global-coordinator-record.png and global-staff-research-record.png outside the repository; restored the Lecturer Supervisor Appointments workspace. All changes remain uncommitted.
