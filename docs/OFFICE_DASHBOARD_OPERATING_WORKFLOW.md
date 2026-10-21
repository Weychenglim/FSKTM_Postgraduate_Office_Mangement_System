# Office Dashboard: step-by-step operating workflow

Prepared 19 October 2026 from the current working tree and the session's source review.

This explains the Office user journey, rather than listing isolated button tests. Start with the setup phases for a new semester. During an existing semester, verify setup and enter the daily monitoring phase. Exception workflows apply only when needed. Terminal actions belong at the end of the relevant participant/semester's work.

No workflow was executed to prepare this document. Use fictional records for UAT. Current business requirements, backend validation and the latest project status remain authoritative.

## 1. Clarification for the Student Registry teammate

The proposed ownership is: **Student Registry is the main student-specific home for academic lifecycle management; Dashboard supplies monitoring and navigation.**

The current Registry already offers Change Academic Status and calls the shared lifecycle backend. Therefore, there is no missing status engine to move or rebuild.

| Existing responsibility | Recommended treatment in a future agreed consolidation |
| --- | --- |
| Registry student status action | Keep and review the existing integration |
| Student blockers, pending-work review and lifecycle audit in Manage Participants | Make accessible from the Student Record, through reused presentation or a focused link; agree the exact UI first |
| Dashboard student lifecycle navigation | Retain useful shortcut/attention links |
| `transition_student` and connected services/models | Reuse in place; moving UI does not require moving tables or replacing business logic |
| Lecturer lifecycle | Separate Staff & Lecturers responsibility |
| Acting Coordinator delegations | Separate Coordinator/administration responsibility; do not remove with student UI |

Do not delete the complete `/dashboard/participant-lifecycle` workspace before its remaining functions and all existing links have an agreed destination. Current requirements explicitly describe this route. The user has requested explanation and handoff; no production relocation has been carried out by this session.

Read [Student Registry lifecycle handoff](STUDENT_REGISTRY_LIFECYCLE_HANDOFF_2026-10-19.md) for file/API contracts and acceptance checks.

## 2. Before preparing a semester

1. Sign in as authorised Office Staff/Admin.
2. Open **Dashboard Overview** and check the displayed academic semester.
3. If operating an existing semester, confirm it is effectively Active and within its dates. Do not create/activate another semester merely to proceed through this guide.
4. Check Registry records for the intended students, eligible lecturers and correct programmes. Academic eligibility and sign-in status are separate checks.
5. Confirm a Programme Coordinator covers each intended student programme. An eligible lecturer may work across programmes; final Coordinator scope follows the student.
6. If a Coordinator temporarily needs additional programme authority, use the delegation workflow in phase 9. Do not bypass approval scope.
7. In UAT, record the semester, Student and lecturer IDs and label test entries/reasons. Preserve a separate spare participant for withdrawal/retirement cases.

Expected result: Office knows which semester and participants are being configured, and the responsible approval actors exist.

## 3. Create or inspect the Draft semester

1. Dashboard → academic semester **Manage**.
2. For an existing semester, click its row **Open** and inspect it. For a new one, click **New semester**.
3. Enter the consecutive academic session, permitted term, start date and end date.
4. Ensure its dates do not overlap another non-archived semester.
5. Click **Create draft**.
6. Re-open and correct Draft configuration with **Save changes**, if needed.
7. Record its identity. Leave it Draft while preparing the required capacity policy.

Expected result: the semester exists as Draft, without replacing the current operating semester.

## 4. Configure and publish Lecturer capacity

1. Click **Lecturer Capacity** from Academic Semesters or Dashboard.
2. Choose the target semester in **Academic semester**.
3. If no appropriate plan exists, click **New Draft** / **Create Draft plan**.
4. If revising an existing Published or Superseded same-semester plan, select its version and click **Clone Version** instead.
5. Search/filter the lecturer entries.
6. On each required entry click **Edit**, enter independent Supervisor and Panel limits for the roles held, then **Save Limits**.
7. Resolve every Publication blocker. Zero is a valid intentional limit; missing required limits are not a substitute for zero.
8. If comparing versions, click **Compare**, choose the comparison version, inspect differences and return.
9. Select the complete Draft and click **Publish Plan**.
10. Enter publication reason, tick the reviewed-limits confirmation and click **Publish Capacity Plan**.
11. Reload and verify the version is Published and the prior Published version, if any, is Superseded.

Expected result: the target semester has one complete Published policy. Draft changes alone do not affect eligibility. Changing limits never silently removes existing appointments.

Current UI note: New Draft creates a blank plan; Clone Version is same-semester versioning. There is no general visible previous-semester copy selector on the capacity screen. Do not invent that step; narrow eligible reconciliation cases may offer a copy repair.

## 5. Prepare the calendar and appointment intake

### Calendar

1. Dashboard → **Manage Timeline**.
2. Choose the target Draft/Active semester.
3. For individual events: **Add Timeline Entry** → title, P1/P2 category, start/end, target roles and description → **Add Entry**.
4. Use **Edit → Save Changes** to correct an independent informational event.
5. For spreadsheet setup: **Download Template**, fill the selected-semester schedule, then **Upload Timeline → Browse File → Preview**.
6. Read row count, dates, links and warnings. Preview saves nothing.
7. Tick warning acknowledgement if required and click **Confirm Import** only when the reviewed replacement is intended. Confirmation replaces that semester's current calendar.
8. Check both research phases, event details, total entries and Recent Timeline Updates.

### Appointment intake

1. In **Operational periods and extensions**, click **Create appointment period**.
2. Select Supervisor applications or Panel recommendations.
3. Enter name, All/Selected programme scope and exact Malaysia opening/deadline times within semester dates.
4. Click **Create draft**. Use **Edit draft → Save draft** with a reason for corrections.
5. Click **Publish period**, review scope/dates, then **Confirm change**.
6. Repeat for the other activity/programmes as required. Avoid overlapping published coverage for the same cohort/activity.
7. If the calendar needs to reflect that period, click **Link calendar event**, choose an existing unlinked event, then **Link event**. Linked dates follow their owner.
8. Review programme coverage before using **Enable enforcement**, supplying reason and confirmation. Prepare/enable in accordance with the intended launch; a Published period alone does not enable date enforcement.

Expected result: the calendar communicates activities, and configured intake rules can govern new submissions. P1/P2 calendar labels do not assign a student's project stage. An Ended event does not prove completion.

## 6. Activate at the intended handover

1. Return to Academic Semesters and **Open** the prepared Draft.
2. Confirm its Published capacity is complete, dates are correct and handover is intended.
3. Click **Activate** and enter the reason.
4. Review the unfinished Marks preview. If required, acknowledge the listed unfinished work/completion windows.
5. Click **Confirm closure / handover**.
6. If validation blocks activation, resolve the stated issue and obtain a fresh preview. Do not bypass the gate.
7. Verify the new semester's status, previous semester's closure where applicable, related Marks period states and semester audit history.
8. Return to Dashboard. Verify effective active context and timeline. Future dates or elapsed dates can still prevent new workflows even if a saved lifecycle label says Active.

Expected result: the intended faculty semester becomes authoritative. Activating a replacement can close the previous Active semester and its published Marks periods atomically.

## 7. Configure evaluation work when required

This is a necessary link into Marks, not a replacement for that module's full guide.

1. Open **Marks Entry** and its period/rubric configuration.
2. Prepare a ready rubric and a Draft period for the intended semester, programme scope, evaluator roles and dates.
3. **Create draft** / **Save changes**, then review recipient readiness before **Confirm and publish**. Publication requires the effective Active semester.
4. In Evaluation Task Assignment, select the intended period, review eligibility/readiness and use the available generation action for official Supervisor/Panel tasks.
5. Check generated rows and evaluator identities. Existing active appointments are the basis for official assignments; supporting supervision does not automatically create primary-Supervisor evaluation responsibility.
6. Verify no duplicate tasks on repeated generation. The system also has safety generation for eligible active periods; inspect actual saved tasks rather than assuming none exist until the manual button is used.
7. If a legitimate exception needs a backup evaluator, use **Assign Backup Evaluator**, choose eligible participants, supply reason and confirm. A backup task does not change official appointments.
8. Return to Timeline Management if an evaluation period needs a linked calendar event or deadline extension. Rubric/targeting/publication remain owned by Marks.

Expected result: lecturers can access the right assigned tasks during the allowed period. Office configures/monitors; assigned evaluators enter and submit their Marks.

## 8. Daily Office monitoring

1. Open Dashboard and confirm current semester context.
2. Review **Records Needing Attention** and **Action Centre**.
3. Open pending Supervisor or Panel records. Check current stage/responsible actor; follow up through the institution's normal process if required.
4. Keep the decision sequence intact: Student application → proposed Supervisor decision → Coordinator final decision; primary Supervisor Panel nomination → selected Panel decision → Coordinator final decision.
5. Open incomplete Marks records, identify assigned evaluator and effective deadline. Treat backup counts separately from incomplete counts.
6. Inspect timeline phase/event details for upcoming activities.
7. Open Panel Appointments → **Tools → Workload monitoring** for Panel workload. The Dashboard workload row currently routes to the general Panel workspace.
8. Open Supervisor Appointments → **Tools → Workload monitoring** for supervision workload.
9. Search/filter, click lecturer **View**, and compare actual items with occupied load/limit. Export **Excel** if needed; inspect all matching rows, not only the visible page.
10. Re-enter/reload after relevant decisions to verify Dashboard, workload and queues reflect the saved state.

Expected result: Office identifies work needing attention without acting as every approver. A pending nomination is not an active appointment.

Workload reminder: Supervisor occupied load is active primary plus supporting appointments across semesters. Pending Supervisor requests do not reserve slots. Panel occupied load is active appointments plus pending reservations; final approval converts a reservation without adding a second occupied slot.

## 9. Exception workflows: use only when needed

### Temporary lecturer unavailability

1. Dashboard → Lecturer Capacity → correct semester.
2. **Add Availability** → role → lecturer → valid start/end → reason → **Record Availability**.
3. Verify the restriction and public eligibility effect; existing appointments remain active.
4. To cancel a reachable current/upcoming restriction, open its row date link, enter reason, tick confirmation, then **Cancel Restriction**.
5. Inspect history. Do not delete records to erase restrictions. Some historical cancellation paths are supported by API but not exposed by the current UI; record an accessibility gap rather than a false success.

### Change capacity during an Active semester

1. Select the operative Published version → **Clone Version**.
2. Edit Draft limits, compare and resolve readiness.
3. Publish with reason/confirmation.
4. Verify candidate/workload views. Lowering capacity below existing load produces Over Capacity and blocks new work while preserving existing appointments.

### Extend a common deadline

1. Dashboard → Manage Timeline → correct semester/owning period.
2. **Extend deadline** → **Everyone in period scope**, where allowed.
3. Enter valid later deadline and reason → **Save extension**.
4. Check owning period, linked calendar, audience view and change history. Extending a semester end date alone does not do this.

### Grant selected extra time / recover unfinished Marks

1. Open the owning appointment/Marks period → **Extend deadline**.
2. Choose **Selected cases / tasks**.
3. Select eligible Student/participant or unfinished evaluation tasks; enter future Malaysia deadline and reason → **Save extension**.
4. Verify only intended cases gain access; all ordinary eligibility rules still apply.
5. For Closed Marks periods/semesters, use only permitted selected-task completion windows. Submitted work is not reopened, and the semester stays Closed.
6. Inspect **Period and extra time history** / **Completion window history**. Select evaluation task if needed. Revoke with reason/confirmation only when intended.

### Student lifecycle: current Registry entry point

1. Registry → Students → open the Student Record.
2. Review existing academic status. **Change Academic Status** offers only allowed next states.
3. Choose status, enter reason and click **Apply Status Change**.
4. If blocked, read the error/blockers. Use **Resolve in Participant Lifecycle** where offered for the existing review/cancellation/history workspace; this link is not a bypass.
5. Resolve work legitimately, refresh/review and retry only if the requested transition is still appropriate.
6. Verify status, appointments, task lifecycle and audits after success.
7. Use Dashboard → Manage Participants → Student **Review** where central review/history/pending-work tools are needed today. A later Registry consolidation may change navigation; no such move has been made here.

Active can become Deferred, Graduated or Withdrawn; Deferred can become Active or Withdrawn. Graduated/Withdrawn are terminal through this portal. Defer/reactivate affects unfinished tasks; graduation has blockers; withdrawal cancels/ends/retires relevant work while preserving submitted history. Account suspension is separate.

### Lecturer lifecycle and Coordinator cover

1. Dashboard → **Manage Participants**.
2. For lecturer eligibility: filter Lecturers → **Review** → permitted lifecycle action → reason → **Confirm**. Retiring blocks new work; final retirement needs responsibilities cleared and disables access. Keep this separate from student ownership.
3. For temporary Coordinator cover: **Grant acting access** → additional programme → eligible Coordinator → start/end → justification → **Create grant**.
4. Verify the grantee's additional scope during the dates; regular scope remains. **Revoke → Confirm revocation** requires reason and removes additional scope while preserving history.

### Reconcile inconsistent records

1. Dashboard → **Reconcile Workflows**.
2. Search/filter and **Preview** the issue.
3. Inspect affected IDs/current state/dependencies; use **Open Source Record** when useful.
4. If Review required, investigate/coordinate; no automatic Apply is offered.
5. If a permitted repair is appropriate, choose resolution/programme where required, enter reason, tick individual confirmation, then **Apply Audited Repair** and confirm.
6. Re-scan and inspect audit. On changed/stale state, get a fresh preview. Do not fabricate a broken record to make the repair button testable.

## 10. Reporting and individual record review

1. Dashboard → **View Workflow Reports**.
2. Choose semester, programme and dates → **Apply filters**. Use **Reset filters** for the default active view.
3. Review counts, waiting owners/age bands, evaluation completion/overdue and timeline/lifecycle information.
4. Use attention **Open / View team** links for the owning record.
5. Use **View student record** for the selected student's dossier.
6. Inspect available Office dossier tabs: Overview, Supervisor, Panel, Marks and Timeline. **Open record** returns to the source workflow; the dossier is a read-only aggregation.
7. Back in reports click **Download XLSX**. Verify workbook scope/numbers against applied filters; unapplied field edits do not change the download.

Expected result: a consistent operational picture. Reports show current state of records selected by relevant reporting dates; they do not reconstruct past point-in-time state. Record counts are not necessarily unique-student counts, and long waiting is not automatically overdue.

## 11. End of intake / semester handover

1. Review pending requests, unfinished Marks, completion windows and workload before closing anything.
2. If only application intake should stop, use **Close intake** on that appointment period with reason/confirmation. Do not close the whole semester for this purpose.
3. Resolve remaining work or grant eligible selected extra time where appropriate. Submitted requests can remain reviewable after intake ends under existing rules.
4. Export/review the required reports and inspect reconciliation findings.
5. If continuing the same semester, use **Extend end date** with a valid later date and reason; separately extend affected operational deadlines if intended.
6. For a handover, prepare the next non-overlapping Draft, its complete Published capacity and intended schedule first, then follow phase 6 at the intended transition.
7. For closure without handover: Academic Semesters → Open Active → **Close** → reason → review unfinished-work preview → acknowledge if required → **Confirm closure / handover**.
8. Confirm Closed state and audit. Preserve submitted scores/appointments/history according to lifecycle rules; closing a semester does not itself withdraw students or end every appointment.
9. Use selected Marks completion windows for eligible late recovery while Closed, if needed. Review any closed-semester pending appointment that needs the existing reasoned carryover capacity reassessment; do not assume a new semester automatically bypasses original capacity rules.
10. Archive only when ready and permitted: Open eligible Closed/Draft → **Archive** → reason → **Confirm**. Outstanding active completion windows can block archival. Active cannot archive directly; Closed cannot reactivate.

Expected result: controlled closure/handover with complete records retained and explicit treatment of unfinished work.

## 12. What to verify after every consequential step

- Correct Student, lecturer, programme and semester identities.
- Saved result survives refresh/re-login.
- Audit records the actual actor, reason and date; use Malaysia time for operational deadlines.
- Related views agree on appointments, occupied capacity and task state.
- A failed/blocked action leaves no partial result. Retry reads separately if a mutation succeeded but its follow-up read failed.
- Other roles retain only their authorised views/actions.
- Conditional action unavailable because a prerequisite is absent is different from a feature being broken.

For negative tests, every control and result recording, use [Office Dashboard manual test guide](OFFICE_DASHBOARD_MANUAL_TEST_GUIDE.md). Existing source-level gaps remain observations until reproduced or addressed; this operating guide is not a passing acceptance report. Reminder/live email delivery has separate activation/configuration and must not be inferred from calendar changes.
