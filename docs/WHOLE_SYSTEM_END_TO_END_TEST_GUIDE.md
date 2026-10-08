# Whole-system manual end-to-end test guide

For a shorter first run, use the [simple role-by-role testing guide](SIMPLE_END_TO_END_TEST_GUIDE.md). It also explains the Office account's Marks-only Django admin permissions and separates working flows from missing integrations.

Participant lifecycle browser results and corrected record/dossier displays are recorded in [8 October acceptance](PARTICIPANT_LIFECYCLE_ACCEPTANCE_2026-10-08.md). Test daily lifecycle operations through Dashboard → Manage Participants; Django admin remains an inspection surface. Supporting-appointment, coordinator responsibility/delegation and other unexercised compound branches remain separate acceptance work.

Prepared 6 October 2026; refreshed 8 October 2026 for the current local `main` working tree, development database and actual frontend/backend routes, including submitted Marks portal actions. This is a test plan, not a claim that every scenario below has passed.

## Running application and account sheet

- Portal: **http://127.0.0.1:3001/**. Django: **http://127.0.0.1:8000/**; admin: **http://127.0.0.1:8000/admin/**.
- The local backend uses the existing **fsktm_pg_office** development database. The isolated acceptance databases from earlier sessions are separate.
- The existing Docker stack uses port 3000 when running. This session uses port 3001 with real authentication, `/api` proxying to port 8000, and **mock mode/demo login disabled**.
- All eight existing accounts are active. Their configured passwords were verified against their stored hashes and written to the **private, ignored** local file `backend/.env.local-test-accounts.md`. Passwords are deliberately absent from this committed guide. No password or account authority was changed during setup.
- Email delivery currently uses the Django console backend. Reset emails/links from the current launcher appear in the ignored `backend/.env.portal-main-server.log`; request/server diagnostics appear in `backend/.env.portal-main-server.err`. No real mailbox delivery is claimed.
- Use one role at a time and **Sign Out** before switching. Normal tabs share the refresh cookie; use distinct browser profiles/browsers for simultaneous actors.
- Prefix new records with `E2E-20261006` (or today's date). Test writes persist in this development database. Do semester closure, archival, retirement and password changes last.

| Role/use | Email login | Alternative ID | Initial state |
| --- | --- | --- | --- |
| Office | demo.office.admin@example.test | DEMO-ADMIN-001 | Django staff, Marks permissions; not a superuser |
| Coordinator | demo.coordinator@example.test | DEMO-COORD-001 | Regular programme is Cyber Security; no acting grants |
| Primary Supervisor | demo.supervisor@example.test | DEMO-LECT-001 | Supervisor capacity 5; Panel capacity 10 |
| Selected Panel | demo.panel@example.test | DEMO-PANEL-001 | Panel capacity 10; no supervision capacity configured |
| Fresh main-workflow Student | demo.student@example.test | DEMO-STUDENT-001 | AI programme; no primary appointment/application |
| Letter Student | demo.letter.student@example.test | DEMO-STUDENT-002 | Computer Science; registry-backed letter details |
| Existing supervised Student | demo.panel.student.one@example.test | DEMO-STUDENT-003 | AI; approved primary and confirmed Panel |
| Existing supervised Student | demo.panel.student.two@example.test | DEMO-STUDENT-004 | AI; approved primary; no active Panel |

Initial snapshot: Active Semester I 2026/2027, one Published capacity plan, two approved primary applications, one active Panel appointment, required Research Proposal document, no rubric, Marks period/task, letter template or announcement. Recheck the snapshot if someone else has since changed this database. There are four application roles; there is no separate Faculty login in the current account model.

## Coverage and current integration status

| Area | What to verify | Current persistence boundary |
| --- | --- | --- |
| Login, sessions, Settings | Identity, refresh/logout, own settings, password/reset | Live Django |
| Dashboard, timeline, semesters | Role-scoped actions, timeline changes, lifecycle/audits | Live Django |
| Capacity/availability | Plans, publication, load and assignment eligibility | Live Django |
| Supervisor, Panel, supporting supervision | Requests, decisions, replacements, histories, documents | Live Django |
| Research amendments/transfers | Sequential approvals, scope, revision/audit retention | Live Django |
| Marks | Rubrics, periods, tasks, drafts, submission, correction/recovery | Live Django |
| Reports, dossiers, reconciliation | Authorized views/exports and consistent persisted totals | Live Django |
| Announcements/notifications | Sender-to-recipient publication, attachments, unread/deep links | Live Django; teammate-owned risks still need acceptance |
| Letters | Stored templates, own Student details, preview and print/PDF | Live templates/details; browser document generation, no issued-letter ledger endpoint |
| Student/staff Registry | Registration/import/edit/account creation UI | Backend integration missing; `/api/students` and `/api/staff` are not implemented |
| General File Repository/student submissions | Upload/list/preview/download workflow | Backend integration missing; `/api/files` and `/api/student/submissions` are not implemented |
| FAQ editor/chatbot | Editor, simulator, suggestions, attachment UI | Local component state/simulated answers; no FAQ backend |

With mocks disabled, Registry/File reads can return errors/404. Record these as **integration gaps**, not successful empty registries. Supervisor-request document upload/download is a separate, live feature and must still be tested. General file preview/FAQ text/legacy EE no-records panels do not prove real storage, evaluation or faculty policy. Do not mark the whole system accepted while the missing integrations remain.

## 1. Establish roles, scope and configuration

- [ ] Sign in as each account using its email, and repeat representative logins using the alternative ID. Check the correct name, role and sidebar. Wrong password and unknown ID must reject access without a server error.
- [ ] Refresh an authenticated page, open a deep link, sign out and revisit it. Session restoration must retain the correct actor; logout must remove access. A Student must not gain Office configuration access through a pasted URL.
- [ ] **Required for the AI workflow:** Office → Dashboard → **Manage Participants** → **Acting coordinator delegations** → **Grant acting access**. Select **MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)** and the existing coordinator, start today in Malaysia, end after your planned test session, and enter a test justification. The human tester performs this explicit access grant; setup did not grant it automatically.
- [ ] Coordinator signs in again/refreshes its scope. Verify both regular Cyber Security and acting AI access. Before the grant, AI approval queues must be inaccessible; after it, pending AI work must be available.
- [ ] Office → **Lecturer Capacity**: inspect the Published plan, current loads and limits. Published configuration must remain immutable; clone/edit a Draft for changes. Verify invalid limits/blank reasons reject, publication readiness/audit is correct, and an unavailable/full/ineligible candidate cannot be activated.
- [ ] Office → Supervisor Appointments → document requirements: confirm required **Research Proposal**. Changes need the configured service/audit, and existing uploaded documents remain downloadable by authorized participants.

## 2. Timeline and academic-semester setup

- [ ] Office → Dashboard → **Manage Timeline**. Add a unique entry to the selected Active semester. Check calendar, entry list, project phase, dates, audience and audit after refresh.
- [ ] Edit/archive that test entry with the required reason. Verify role-facing calendars and history update; Student/Lecturer/Coordinator cannot write it.
- [ ] Exercise valid XLSX preview/import, then an invalid file, missing required columns and invalid dates. A rejected import must create no partial entries. Use the screen's actual template/columns.
- [ ] Office → Dashboard → **Manage** academic semester. Inspect lifecycle and audits. Draft-semester timeline setup must stay associated with that selected semester and must not overwrite the Active semester's calendar.

## 3. Fresh Supervisor request, including return/cancellation paths

Use **DEMO-STUDENT-001**, **DEMO-LECT-001**, and the coordinator with acting AI scope. Use a genuine small synthetic PDF and a sufficiently detailed abstract matching the form's validation.

- [ ] Student → Supervisor Appointments → new request: choose the eligible Supervisor, enter research title/area/abstract, attach the required Proposal, submit. Missing required content/file must reject. Successful submission appears in Student history and the requested Supervisor's queue.
- [ ] Before a Supervisor decision, Student cancels with a reason. It leaves the active queue, keeps actor/reason history and allows another request. A duplicate pending request must reject.
- [ ] Resubmit. Supervisor opens the request and document, then rejects with a reason. Student sees the return and can resubmit; no approved appointment is created.
- [ ] Resubmit and have Supervisor accept. Coordinator rejects with a reason. Check Supervisor/Student histories and the ability to submit a new request; no approved appointment is created yet.
- [ ] Resubmit → Supervisor accepts → Coordinator approves. The request moves through the correct queues in that order; an Office monitoring screen cannot substitute for the Coordinator decision.
- [ ] Without manually reloading, Coordinator history/team shows the Active primary appointment and research profile. Student sees the confirmed primary; Supervisor sees the active supervisee and dossier. There is exactly one active primary appointment, with immutable actor/status/date history.
- [ ] Refresh/re-login as all involved roles. Confirm the data persisted, Proposal download works for authorized actors, and unrelated Students/lecturers cannot open it. Completed decisions cannot be repeated.

## 4. Panel nomination and its alternative paths

- [ ] Primary Supervisor nominates **DEMO-PANEL-001** for **DEMO-STUDENT-001**, with justification. A first nomination must work without a replacement reason. It must go to the selected Panel lecturer first.
- [ ] Student sees the public processing state, without internal nomination/decision details. A duplicate nomination and nominating the student's own primary Supervisor must reject.
- [ ] Selected Panel accepts → Coordinator confirms. Confirm the selected actor, status progression, distinct active primary/Panel appointments, matching workload and read-only histories. Student now sees the confirmed Panel.
- [ ] For **DEMO-STUDENT-004**, first test Supervisor cancellation before Panel action with a reason; then nominate again and test Panel rejection; then nominate again, Panel accepts and Coordinator rejects. Each return keeps history, releases pending reservation correctly and permits a new nomination.
- [ ] Finally nominate again → Panel accepts → Coordinator confirms Student 004. Student 003 already has a confirmed Panel: verify its existing history instead of creating a duplicate.
- [ ] Only the selected Panel lecturer can accept/reject; only the scoped Coordinator can confirm. Wrong actors and decisions after cancellation/confirmation must reject.

## 5. Rubrics, period targeting and generated tasks

- [ ] Office → Marks Entry → Rubric Components: create `E2E-20261006-Rubric`, target 100, with **Problem Definition 40** and **Methodology 60**. Check readiness, invalid/negative maxima and missing components. Publication requires a ready rubric.
- [ ] Configure an evaluation period in **Semester I 2026/2027**, scoped to **AI**, including **Supervisor and Panel**. Open before the current Malaysia time and close in the future, within permitted semester dates.
- [ ] Review the recipient preview before publishing. After steps 3–4, the three AI Students should each have both official appointments: **six official tasks**. If counts differ, inspect missing appointments/scope first; do not assume every period has only the two tasks for Student 001.
- [ ] Publish. Draft fields become immutable; configuration audits show actors/actions. Generate again and confirm no duplicate tasks. A later eligible appointment must receive only the missing relevant task.
- [ ] Lecturer filters show actual period semesters, including current periods attached to older research-profile semester labels. No hardcoded semester choice or Student intake semester should override the period.
- [ ] Check programme/role targeting with a separate Draft/Published test period as needed. Co-supervisors must not receive official Marks tasks simply because they support the team.

## 6. Draft, validate, submit and lock Marks

- [ ] Supervisor signs in: only assigned tasks are available. For Student 001 enter **35/40 + 50/60 = 85/100**, save Draft, leave/reopen and verify persisted component values/total.
- [ ] Negative score, value above maximum, missing component, unknown/duplicate component and unassigned task must reject with validation/authorization responses, leaving the stored Draft intact.
- [ ] Submit the complete valid Draft. It becomes Submitted/read-only. Refresh and try to open its edit route: a second submission or ordinary edit must not overwrite it.
- [ ] Panel submits **30/40 + 50/60 = 80/100** for Student 001. Verify independence from the Supervisor's score and actor.
- [ ] Complete the remaining assigned tasks for Students 003/004. Office monitoring should reach **6/6 submitted, 0 incomplete** for this period. Filter/select the specific period so other test periods do not confuse totals.
- [ ] Office opens records and verifies all exact component scores/totals, submitted dates/evaluators, filters and export. Test correction/reopening through Marks Entry → View Mark Records → record detail, using an Office staff account with `marks.change_markentry`. Require a reason and confirmation; verify before/after audit, refreshed total, retained submission on correction and preserved Draft on reopening. Test a stale second tab and closed-period reopening rejection. Django admin must expose inspection only with no save/correction/reopening controls or governed model bypasses. See [portal acceptance](MARKS_PORTAL_ACTIONS_ACCEPTANCE_2026-10-07.md) for verified examples.

## 7. Reports, dossiers, audits and notifications

- [ ] Office → **View Workflow Reports**: filters, counts, drill-down and XLSX match persisted appointments/tasks/Marks. Coordinator sees only effective programme scope; Lecturer only authorized work; Student only its own dossier. Test direct foreign-record URLs.
- [ ] Dossiers tie together research profile, primary/Panel/team, documents, amendment history, periods and Marks. Pending Panel privacy must remain enforced on Student-facing team details.
- [ ] Audit histories have the correct actor, action, reason and Malaysia date/time. UTC-evening records must not shift to the previous day in another role's screen.
- [ ] Review Dashboard Action Centre before and after each decision. Requests move to the next responsible actor and disappear when completed; dashboard counts agree with queues.
- [ ] Open transition notifications/deep links for involved actors, test read/unread and persistence. Removed programme access/foreign targets must not expose record contents. Do not substitute an announcement notification for a missing workflow transition notification.
- [ ] Office → **Reconcile Workflows**: inspect findings and current previews. Healthy records remain unchanged. A reasoned repair must use the workflow service, recheck eligibility and record an audit; never fabricate a defect by editing DB rows during a browser acceptance run.

## 8. Announcements and Letters

- [ ] Office creates a uniquely named **Draft announcement** with a small synthetic attachment; it persists after refresh. Students/unintended recipients must not see the Draft or download its attachment.
- [ ] Publish to a selected supported audience. Matching recipients receive it; other roles do not. Verify unread count, marking one/all read, attachment access and download. Edit a test publication and check current content; test another sender's direct edit route for authorization. These teammate-owned checks have known unresolved authorization/attachment-validation risks; record failures as defects.
- [ ] Student cannot publish announcements. Try oversized/unsupported uploads and verify authoritative server rejection rather than a success toast alone.
- [ ] Office → Letter Generation: create/save a valid Active test template using the editor's supported placeholders. Refresh to prove persistence; Draft/inactive templates must not appear in the Student's active selector.
- [ ] **DEMO-STUDENT-002** opens Letter Generation: own name, ID, programme and registry details populate correctly. Check preview, browser print/Save as PDF, page layout and missing-field handling. Student cannot edit template/identity fields or read another Student's letter details.
- [ ] Generated references/PDFs do not establish a persistent issued-letter register or an approval workflow; those endpoints are absent. Official template/policy approval remains a separate requirement.

## 9. Advanced lifecycle branches before final closure

Some positive paths require additional real test actors/profiles. The existing Registry screen cannot provision them in Django. Mark an unprovisioned case **BLOCKED—fixture prerequisite**, not passed. Extra actors must be provisioned separately with legitimate roles, programme scope and published capacity; do not repurpose the Panel into the Student's primary to bypass overlap rules.

| Scenario | Actors/setup and expected result |
| --- | --- |
| Co-supervisor nomination/replacement/end | Additional eligible Supervisor-capable Lecturer. Primary nominates → selected lecturer accepts → scoped Coordinator approves; supporting team/workload/history persist. Reject/cancel/end require the appropriate reasons; no automatic official Marks tasks. |
| Primary replacement | Third eligible Supervisor distinct from the active Panel. Old primary stays active while request is pending; final approval ends/hands over atomically and retains history/co-supervisors. No duplicate active primary or inappropriate submitted-Marks reassignment. |
| Panel replacement | Additional eligible Panel distinct from current primary. Reason is required; old appointment remains until confirmation. Capacity failure preserves the prior appointment and pending request. Submitted results retain original evaluator history. |
| Research content amendment | Student proposes new title/abstract → primary Supervisor decision → scoped Coordinator decision. Test return/cancel and approved revision/audit. Pending edits must not overwrite the authoritative profile; stale decisions reject. |
| Programme transfer | Office initiates; source/destination coordinator authority and required acknowledgements must exist. Transfer follows the displayed stages, retains required team/task history, updates future scope and rejects stale/out-of-scope decisions. A second scoped Coordinator may be necessary. |
| Task handover/backup | Office reasoned assignment to another eligible Lecturer, with preview/history. Scope and one-task-per-assignment rules hold; submitted scores do not silently move. Needs another eligible evaluator for a distinct replacement. |
| Late completion | Create another period, submit all but one task, then close that period through its current unfinished-work preview. Office grants a future completion window to the remaining eligible task. Lecturer submits within the window while the period stays Closed. Revoke/expiry removes exceptional access; submitted work is never reopened by the window. |
| Delegation revoke/expiry | After completing AI decisions, Office revokes the test acting grant with a reason. Coordinator loses AI queues/dossiers/exports/action access, retains regular scope and its own delegation history; prior audit actors stay unchanged. |
| Graduation/withdrawal/retirement | Perform on a spare Student/extra Lecturer only after its work is checked. Preview blockers, reasoned pending cancellation and immutable participant history; ineligible participants stop receiving new work. Never retire the sole Office/Coordinator mid-run. |

## 10. Semester closure, carryover and archival—last

- [ ] Create the next Draft semester and its capacity plan/timeline through Office UI if testing handover. Review destination readiness and effective dates; do not activate an arbitrary overlapping semester just to force a transition.
- [ ] For carryover testing, deliberately leave a separate test request/task pending before closing the source semester. Check original ownership/history, unfinished-work preview, explicit acknowledgement and destination handover behavior. Closed-semester pending appointments requiring capacity reassessment must receive a reasoned Office reassessment against the effective Active plan before final approval; there must be no capacity bypass.
- [ ] For the completed main period, preview closure: no unfinished tasks should remain. Close the semester with a unique reason. Its published period closes; submitted scores remain 85/80 for Student 001, appointment history remains intact, and new ordinary requests/Marks writes are blocked as appropriate.
- [ ] The selected semester's **CLOSE audit appears immediately**. Test audit read failure/Retry if a controlled test environment is available: a successful closure must stay Closed when a later audit read fails, and Retry must not close it a second time.
- [ ] Check dashboards, dossiers, reports, reconciliation and read-only submitted Marks after closure/re-login. New-semester task dates/scope come from their new period, while historic period assignments/scores retain their original identity.
- [ ] Archive only after completing recovery/carryover checks. Active windows on unfinished tasks must block archival; archived records stay immutable and are available through appropriate history/archive filters.

## 11. Settings and password/reset checks

- [ ] Every role updates its own phone and announcement preference, saves, refreshes/re-logs in and verifies persistence. Email remains Office-managed/read-only. Editing another actor's settings must reject.
- [ ] On a spare test account at the end, perform a password change: wrong current password/weak replacement reject; successful change signs out existing sessions, old password fails and the new one works. The human tester enters and keeps the new password; the original private account sheet then becomes stale for that account.
- [ ] Forgot-password for known/unknown emails returns a non-enumerating response. Read the local console reset link, complete a valid reset and check one-use/expired-token behavior and old-session invalidation. Console delivery is local test evidence, not SMTP acceptance.

## 12. Unfinished-module UI checks and defect recording

- [ ] Registry: student/staff list, search/filter/pagination, manual registration, bulk preview/edit validation, CSV exports and account forms. With live mode the missing endpoints block persistence. In a separately configured UI preview, local-state changes may work but must be rechecked after reload/other-role login and recorded as prototype-only.
- [ ] General Files: filters, upload metadata/validation, preview/download, student submission/status and access boundaries. Require a real uploaded file and a persisted record across reload/role switch; a simulated preview/toast cannot pass this gate.
- [ ] FAQ: edit keywords/question/answer, run simulator, open Student suggestions, attach and ask an unsupported question. Verify cross-role publication and refresh persistence; current local component state/simulated attachment means this is not a live shared FAQ/chatbot acceptance pass. Answers are not confirmed faculty policy.
- [ ] Check narrow-screen layout, scrolling long review drawers, keyboard labels/focus, direct-route reload/back navigation, loading/empty/error/Retry states and console/network errors across every sidebar module.

For each scenario record: **PASS / FAIL / BLOCKED / PROTOTYPE ONLY**, actor, route, Student/record ID, inputs, expected/actual result, screenshot, HTTP status and whether the result survives reload/re-login. Never put passwords, bearer tokens, refresh cookies or reset tokens into committed evidence. A successful toast alone is insufficient; cross-role persistence and correct authorization are required.

Server setup verification for this delivery: latest-main/remote alignment, no unapplied development migrations, Django system check, direct and proxied health HTTP 200, and real Office browser sign-in/dashboard. Earlier regression/acceptance results remain in `PROJECT_STATUS.md` and the two acceptance reports; this guide is broader and its scenarios remain for the tester to execute.
