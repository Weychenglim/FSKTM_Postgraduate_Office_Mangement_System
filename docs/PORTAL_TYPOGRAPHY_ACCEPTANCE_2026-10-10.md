# Portal typography acceptance - 2026-10-10

Source audit covers all 109 production TSX components in `frontend/src/components`. Rendered checks pass for 53 role/page combinations and 67 page/state checks across Student, Lecturer, Programme Coordinator, Office Staff/Admin and shared sign-in. A pass confirms the rendered semantic text roles available in that state; it does not imply every record, modal or workflow combination was populated.

## Shared text roles

| Text role | Size | Weight |
|---|---:|---:|
| Section heading / compact heading | 18 / 14 px | 800 |
| Card label | 12 px | 600 |
| Card value | 12 px | 700 |
| Supporting text | 12 px | 500 |
| Secondary caption | 10 px | 500 |
| Summary count | 24 px | 800 |
| Table heading | 10 px | 800 |
| Table cell / emphasized cell | 12 px | 600 / 700 |
| Form label / control | 10 / 12 px | 800 / 700 |

Inter is the ordinary UI family. Existing mono identifiers, status badges, navigation/action buttons, large page/authentication headings, score displays and official document previews keep their deliberate roles. The FAQ answer editor retains user-selected bold/italic formatting, explicitly marked as formatted content; the rendered check verifies size/family without treating these formatting controls as inheritance bugs.

## Findings corrected

- Parent font inheritance affected populated team/research cards, labels, histories, decision forms and shared feedback. Card/control roles now reset ordinary text to Inter and normal font style/case/spacing; explicit local identifier or semantic color treatments remain available.
- Student, Lecturer, Coordinator and Office detail metadata had inconsistent 9-13 px treatments; equivalent labels, values, supporting text and captions now use shared roles. Responsive paragraph overrides no longer change the role at wider breakpoints.
- Equivalent dashboard/management counts now use the shared metric role. Active semester labels/values use card roles across dashboards.
- Live checks reproduced five File Repository filter controls at 11 px. Removed local size overrides and verified the 12 px control role.
- Live populated Office tables exposed residual Timeline action, Supervisor workload and Panel record/workload overrides. Replaced redundant size/weight utilities with the appropriate shared table role; subsequent rendered checks pass.
- Shared email/password labels and controls, validation messages, empty/loading states, modal descriptions and authentication support text now use consistent roles.

## Rendered coverage

| Role | Requested route / state | Rendered heading | Text roles checked | Result |
|---|---|---|---:|---|
| Student | `/dashboard` | Student Dashboard | 20 | Pass |
| Student | `/files` | Earlier authenticated route check | 6 | Pass |
| Student | `/panel-appointments` | Earlier authenticated route check | 16 | Pass |
| Student | `/letters` | Earlier authenticated route check | 3 | Pass |
| Student | `/settings` | Earlier authenticated route check | 30 | Pass |
| Student | `/notifications` | Earlier authenticated route check | 4 | Pass |
| Student | `/faq` | Earlier authenticated route check | 5 | Pass |
| Student | `/dashboard/progress` | My Academic Record | 35 | Pass |
| Lecturer | `/dashboard` | Lecturer Dashboard | 16 | Pass |
| Lecturer | `/supervisor-appointments` | Supervisor Appointments | 94 | Pass |
| Lecturer | `/panel-appointments` | Panel Appointments | 41 | Pass |
| Lecturer | `/marks` | Marks Entry | 18 | Pass |
| Lecturer | `/files` | File Repository | 22 | Pass |
| Lecturer | `/announcements` | Draft New Announcement | 7 | Pass |
| Lecturer | `/settings` | Settings | 30 | Pass |
| Lecturer | `/dashboard/reports` | Workflow Analytics | 79 | Pass |
| Lecturer | `/supervisor-appointments/history` | Supervisor Request History | 22 | Pass |
| Lecturer | `/supervisor-appointments/supervisees/DEMO-STUDENT-001` | Active Supervisee Detail | 24 | Pass |
| Shared | `/login` | Sign In | 5 | Pass |
| Programme Coordinator | `/dashboard` | Programme Coordinator Dashboard | 20 | Pass |
| Programme Coordinator | `/supervisor-appointments` | Supervisor Appointment Approvals | 17 | Pass |
| Programme Coordinator | `/panel-appointments` | Panel Recommendation Coordinator Review | 22 | Pass |
| Programme Coordinator | `/dashboard/reports` | Workflow Analytics | 21 | Pass |
| Programme Coordinator | `/registry` | Student Registry | 28 | Pass |
| Programme Coordinator | `/marks` | Marks & Evaluation Management | 27 | Pass |
| Office | `/dashboard` | Administration Dashboard | 32 | Pass |
| Office | `/dashboard/semesters` | Academic Semesters | 11 | Pass |
| Office | `/dashboard/timeline` | Timeline Management | 85 | Pass |
| Office | `/dashboard/participant-lifecycle` | Participant Lifecycle Management | 82 | Pass |
| Office | `/dashboard/workflow-reconciliation` | Workflow Reconciliation Centre | 2 | Pass |
| Office | `/dashboard/lecturer-capacity` | Lecturer Capacity Management | 52 | Pass |
| Office | `/registry` | Student Registry | 28 | Pass |
| Office | `/registry#staff` | Staff and Lecturer Accounts | 15 | Pass |
| Office | `/files` | File Repository | 22 | Pass |
| Office | `/letters` | Letter Generation | 15 | Pass |
| Office | `/announcements` | Draft New Announcement | 7 | Pass |
| Office | `/faq` | Academic FAQ Editor | 14 | Pass |
| Office | `/supervisor-appointments` | Supervisor Appointment Management | 143 | Pass |
| Office | `/supervisor-appointments/workload` | Supervisor Workload Monitoring | 42 | Pass |
| Office | `/supervisor-appointments/requirements` | Supervisor document requirements | 27 | Pass |
| Office | `/panel-appointments` | Panel Appointment Management | 113 | Pass |
| Office | `/panel-appointments/workload` | Panel Workload Monitoring | 54 | Pass |
| Office | `/marks` | Marks & Evaluation Management | 45 | Pass |
| Office | `/marks/config` | Mark Entry Periods | 16 | Pass |
| Office | `/marks/rubrics` | Rubric Version Management | 3 | Pass |
| Office | `/marks/tasks` | Evaluation Task Assignment | 59 | Pass |
| Office | `/marks/records` | Mark Entry Records | 32 | Pass |
| Office | `/dashboard/reports` | Workflow Analytics | 113 | Pass |
| Office | `/dashboard/progress/DEMO-STUDENT-001` | Student Progress Dossier | 26 | Pass |
| Office | `/settings` | Settings | 30 | Pass |
| Office | `/notifications` | Notifications & Announcements | 4 | Pass |
| Office | `/supervisor-appointments/3` | Supervisor Appointment Detail | 49 | Pass |
| Office | `/supervisor-appointments/3#closure-form` | Supervisor Appointment Detail | 50 | Pass |
| Office | `/panel-appointments/records/appointment-4` | Panel Appointment Detail | 47 | Pass |
| Office | `/panel-appointments/records/appointment-4#audit` | Panel Appointment Detail | 59 | Pass |
| Office | `/panel-appointments/records/appointment-4#mobile-audit` | Panel Appointment Detail | 59 | Pass |
| Office | `/dashboard#mobile` | Administration Dashboard | 30 | Pass |
| Office | `/faq#formatted-editor` | Academic FAQ Editor | 15 | Pass |
| Office | `/dashboard#default` | Administration Dashboard | 32 | Pass |
| Student | `/supervisor-appointments` | Supervisor Appointment | 81 | Pass |
| Student | `/supervisor-appointments#expanded` | Supervisor Appointment | 128 | Pass |
| Student | `/supervisor-appointments#mobile-expanded` | Supervisor Appointment | 128 | Pass |
| Student | `/supervisor-appointments#wide-expanded` | Supervisor Appointment | 128 | Pass |
| Student | `/dashboard/progress#panel` | My Academic Record | 20 | Pass |
| Student | `/dashboard/progress#milestones` | My Academic Record | 22 | Pass |
| Student | `/dashboard/progress#mobile-milestones` | My Academic Record | 22 | Pass |
| Student | `/dashboard/progress#default-restored` | My Academic Record | 35 | Pass |

Default browser viewport was 902 x 758. Additional checks cover expanded Student team/request/revision histories at 390 and 1536 px, Student milestone records at 390 px, and Office dashboard/expanded Panel audit history at 390 px. Temporary viewport overrides were reset. Student record tabs were checked individually: Supervision, Panel and Milestones.

## Limits and existing integration issues

- Student and staff Registry API reads return 404 in the current local environment. Browser acceptance covers filters, controls, metrics and error states; populated Registry rows and account editing are source-reviewed, without a populated browser acceptance claim. Registry backend integration is an existing project gap.
- The existing Coordinator manages Cyber Security; populated AI student approvals are outside that scope. Its authorized approval screens/delegation empty state pass. Populated team/amendment content is verified with the assigned Lecturer, Student and Office accounts. No scope or credential expansion was made.
- This Lecturer has no assigned Marks tasks; its Marks page passed in the empty state. Staff Marks administration, configuration, assignment and record-list screens were checked; populated score entry/correction and rubric-version drawers remain source-reviewed and covered by existing behavior/permission regressions.
- Reconciliation/rubric screens and unselected letter views contain little or no live data. A role check with a low count validates that visible state only. Official document output was deliberately preserved.
- Student direct `/dashboard/timeline` redirects to its Dashboard and is not counted as independent Timeline coverage. The Office Panel records landing route displays the same management screen and is not counted twice. A mistaken Lecturer numeric supervisee URL was excluded; the correct matric-number detail was opened from the visible table and passed.
- Source review does not establish production readiness or resolve unrelated teammate-owned backend integration. Existing student evaluation exclusion and populated Demo Student One data are retained.

## Validation

- All 75 frontend regression files pass.
- TypeScript (`npm run lint`), production build and both production artifact/security guards pass.
- `git diff --check` passes.
- The reusable `frontend/tests/portalTypography.browser.test.mjs` asserts computed family/size/weight, normal control style and document-level horizontal overflow. It caught the filter/table regressions above before their correction. Run it through the authenticated CUA tab after loading the route and required records.
- AST comparison of all 109 components against HEAD identifies 91 with only presentation attributes changed (styles and the explicit editor-format marker) and eight unchanged. Remaining differences were inspected: previously authorized Student record/enrolment changes, label elements, whitespace, style constants and nested JSX style attributes. No new workflow handler, authorization, API, database or dependency changes were made for this typography pass.
- Captured evidence is in the task visualization directory: `portal-typography-results.json`, `typography-student-record.png`, `typography-student-record-preview.png`, `typography-student-supervisor-audit.png`, `typography-lecturer-detail.png`, and `typography-office-dashboard.png`. The Office screenshot was recaptured after the final shared semester label/value adjustment; all 32 visible roles pass.

## Complete source inventory

- `AcademicFAQEditor.tsx`
- `AcademicSemesterManagement.tsx`
- `ActionButton.tsx`
- `ActiveSemesterContext.tsx`
- `ActiveSuperviseeDetail.tsx`
- `ActiveSuperviseesTable.tsx`
- `AddTimelineEntryDrawer.tsx`
- `AdministrationDashboard.tsx`
- `AlertListCard.tsx`
- `AlertMessage.tsx`
- `AnnouncementManagement.tsx`
- `AppLayout.tsx`
- `AppointmentEndControl.tsx`
- `AuditLogCard.tsx`
- `AuthLayout.tsx`
- `CapacityReassessments.tsx`
- `ChecklistCard.tsx`
- `ClosureReview.tsx`
- `CoordinatorDashboard.tsx`
- `CoordinatorDelegations.tsx`
- `CoordinatorSupervisorApprovals.tsx`
- `DashboardTimeline.tsx`
- `DataTable.tsx`
- `EditTimelineEntryDrawer.tsx`
- `EvaluationTaskAssignment.tsx`
- `FileRepository.tsx`
- `FilterCard.tsx`
- `ForgotPasswordFlow.tsx`
- `FormCard.tsx`
- `FormInput.tsx`
- `FormSelect.tsx`
- `FormTextarea.tsx`
- `LecturerCapacityManagement.tsx`
- `LecturerDashboard.tsx`
- `LecturerMarksEntry.tsx`
- `LecturerPanelAppointments.tsx`
- `LecturerProfileCard.tsx`
- `LecturerSupervisorAppointments.tsx`
- `LetterTemplateManagement.tsx`
- `LoginCard.tsx`
- `MarkEntryDetail.tsx`
- `MarkEntryPeriodConfig.tsx`
- `MarkEntryRecordDetail.tsx`
- `MarkEntryRecords.tsx`
- `MarksCompletionWindows.tsx`
- `MarksEntryHistory.tsx`
- `MarkSubmissionMonitoring.tsx`
- `MonitoringTasksCard.tsx`
- `NotificationsAnnouncements.tsx`
- `PanelAppointmentDetail.tsx`
- `PanelAppointmentManagement.tsx`
- `PanelAssignmentDetail.tsx`
- `PanelRecommendationRecordsTable.tsx`
- `PanelWorkflowTimeline.tsx`
- `PanelWorkloadMonitoring.tsx`
- `ParticipantLifecycleManagement.tsx`
- `PasswordInput.tsx`
- `PortalPrimitives.tsx`
- `QuickActionsCard.tsx`
- `RecentSupervisorAppointmentsCard.tsx`
- `RecentUpdatesCard.tsx`
- `RecommendationDetailsDrawer.tsx`
- `RecommendPanelMemberDrawer.tsx`
- `RequirementChecklist.tsx`
- `ResearchAmendments.tsx`
- `ResetPasswordPage.tsx`
- `RightDrawer.tsx`
- `RouteScrollRestoration.tsx`
- `RubricsManagementView.tsx`
- `SemesterTimeline.tsx`
- `SettingsView.tsx`
- `Sidebar.tsx`
- `StaffLecturersRegistry.tsx`
- `StateViews.tsx`
- `StatusChip.tsx`
- `StudentAppointmentStatusCards.tsx`
- `StudentDashboard.tsx`
- `StudentFAQChatbot.tsx`
- `StudentFileSubmission.tsx`
- `StudentLetterGeneration.tsx`
- `StudentLifecycleSummary.tsx`
- `StudentPanelAppointment.tsx`
- `StudentProgressDossier.tsx`
- `StudentRegistry.tsx`
- `StudentSupervisorAppointment.tsx`
- `SubmittedMarkDetail.tsx`
- `SubmittedMarksActions.tsx`
- `SubmittedRecommendationsPage.tsx`
- `SummaryCard.tsx`
- `SupervisorAppointmentApplicationPage.tsx`
- `SupervisorAppointmentManagement.tsx`
- `SupervisorDocumentRequirements.tsx`
- `SupervisorDocumentsList.tsx`
- `SupervisorRequestHistory.tsx`
- `SupervisorWorkloadMonitoring.tsx`
- `SupervisoryTeamManagement.tsx`
- `TimelineBar.tsx`
- `TimelineCalendar.tsx`
- `TimelineManagement.tsx`
- `TimelineNextActions.tsx`
- `ToggleSwitch.tsx`
- `TopHeader.tsx`
- `UploadNewDocument.tsx`
- `UploadTimelineDrawer.tsx`
- `ValidationRulesCard.tsx`
- `WorkflowAuditLog.tsx`
- `WorkflowReconciliationCentre.tsx`
- `WorkflowReports.tsx`
- `WorkloadSummaryCard.tsx`
