# Simple end-to-end testing guide

Updated 8 October 2026. Use this for your first manual run; the [detailed guide](WHOLE_SYSTEM_END_TO_END_TEST_GUIDE.md) covers additional cases. This is a test plan, not a claim that all flows have passed.

Development priorities and decisions are consolidated in the [pending-work register](PENDING_WORK_REGISTER_2026-10-08.md). Technical-only admin access is the target and has not yet been implemented; current admin test instructions below describe the existing behavior.

## Open the system

- Main portal: http://127.0.0.1:3001/
- Technical inspection: http://127.0.0.1:8000/admin/
- Passwords: [private local account sheet](../backend/.env.local-test-accounts.md). This ignored file stays on your computer.
- These servers use the current `main` working tree, including uncommitted changes, and the existing development database. They are local development servers.
- Sign out before changing roles. For two people at once, use separate browser profiles. Identify test work with today's `E2E-20261008` prefix. Refresh after saving to check that the record persists.

## Accounts to use

| Role | Email | Use |
| --- | --- | --- |
| Office | demo.office.admin@example.test | Setup, monitoring, reasoned corrections and lifecycle actions |
| Student | demo.student@example.test | Supervisor application and tracking |
| Supervisor | demo.supervisor@example.test | Application decision, Panel nomination and Supervisor marks |
| Panel | demo.panel@example.test | Panel nomination decision and Panel marks |
| Coordinator | demo.coordinator@example.test | Final confirmation within authorized programme scope |
| Existing supervised Student | demo.panel.student.one@example.test | Inspect an existing Supervisor and Panel |
| Existing supervised Student | demo.panel.student.two@example.test | Inspect existing supervision and test a Panel flow |
| Letter Student | demo.letter.student@example.test | Test letter details and generation |

The Coordinator's regular scope is Cyber Security. The main demo Student is in AI. Before testing AI approvals, the human Office tester must grant a reasoned, time-limited AI acting delegation through Dashboard → Manage Participants → Acting coordinator delegations, then refresh the Coordinator session. This guide does not grant permissions. Check current records before starting; existing work may have changed since seeding.

## First run: one Student from application to submitted marks

| Step | Sign in as | What to do | What should happen |
| --- | --- | --- | --- |
| 1 | Office | Inspect active semester, published Lecturer capacity, document requirements and programme approval scope. Add one test timeline entry through Dashboard → Manage Timeline. | Setup is valid; the entry remains after refresh and appears only to its intended audience. |
| 2 | Student | Open Supervisor Appointments. Submit a research topic, eligible Supervisor and required valid Research Proposal file. | A pending request appears; the uploaded document and current status remain after refresh. If the Student already has an appointment, use an available fresh test record or follow the replacement flow. |
| 3 | Supervisor | Open the request and accept it. | It moves to Coordinator review. The Student sees the new status. |
| 4 | Coordinator | Confirm the request within the Student's programme scope. | One active primary Supervisor appears in Office, Student and Supervisor views. |
| 5 | Supervisor | Open Panel Appointments and nominate an eligible Lecturer. | A pending nomination reaches that selected Panel. The primary Supervisor cannot also be that Student's Panel. |
| 6 | Panel | Accept the nomination. | It moves to Coordinator confirmation. |
| 7 | Coordinator | Confirm the Panel. | One active Panel appears in all relevant views. |
| 8 | Office | In Marks Entry, configure a rubric, period and task assignment for the correct programme/semester and evaluator roles. Preview before publication/generation. | Expected Supervisor/Panel tasks are generated once; repeated generation does not duplicate them. |
| 9 | Supervisor, then Panel | Open your assigned task, save a draft, refresh, then submit valid scores/comments while submission is allowed. | Draft values persist. Submitted marks lock against ordinary editing. Each Lecturer sees only authorized tasks. |
| 10 | Office | View Mark Records. Correct a submitted record with a reason; inspect the before/after history. Reopen another submitted record while its period is open, with a reason. | Correction is audited. Reopening returns the assigned Lecturer's task to Draft. Lecturer revises and resubmits; history is retained. |
| 11 | Office, then Student | Check Dashboard, Workflow Reports, Progress Dossier and relevant exports. | Appointments, workflow stages and Marks agree. The Student sees public information only; internal reasons/audits remain private. |

For each step, record **Passed**, **Failed**, or **Blocked**, with the role, Student ID, action and actual result. A screenshot of a failure is useful. An empty page does not prove that data saved.

## Second run: check that mistakes are rejected

- Wrong password rejects login. Student/Lecturer accounts cannot open Office controls by pasting a URL.
- Missing required file, invalid file or unavailable/full candidate rejects the request clearly.
- Supervisor/Panel/Coordinator rejection requires a reason where applicable and remains visible in history. A later attempt does not erase the earlier one.
- Cancel or replace a pending appointment through its portal workflow. Check that an incumbent remains active until replacement is confirmed and that old history/submitted marks remain intact.
- Negative or excessive scores return a readable validation error; they do not crash or change saved marks.
- Empty correction/reopening reasons reject. Reopening after period closure rejects. A stale second-tab correction requires a reload rather than overwriting newer work.
- On a designated lifecycle test Student, defer and reactivate; inspect paused/resumed drafts. Test withdrawal/graduation last. On a designated Lecturer record, test Retiring/Retired last; unresolved responsibilities block final retirement.
- Inspect submitted Marks in Django admin. There should be no ordinary edit route that bypasses the portal's validated, audited workflow.

## Check the rest of the system separately

| Area | Simple check | Current limit |
| --- | --- | --- |
| Supporting supervision | Add/replace a supporting Supervisor through the team workflow; inspect membership and history. | Next owned-module acceptance slice; not fully browser accepted yet. |
| Research changes/transfers | Request a change, complete authorized approvals, then check the revised profile and retained history. | Remaining combinations need acceptance. |
| Acting delegation/carryover | Test expiry/revocation and semester handover against the detailed guide. | Remaining combinations need acceptance. |
| Announcements/notifications | Publish a test announcement; intended recipients see it and unread/deep links behave correctly. | Teammate-owned acceptance remains. |
| Letters | Use Letter Student; check stored details/template, preview and print/PDF. | No issued-letter ledger endpoint. |
| Registry | Try registration/import/edit screens and record the actual result. | Student/staff Registry APIs are missing; errors are integration gaps. |
| General files | Try upload/list/preview/download and record the actual result. | General repository/submission APIs are missing. Supervisor application documents are a separate working feature. |
| FAQ | Try editor/chatbot and refresh. | Local/simulated behavior; no FAQ backend. |

## Why Office sees only Marks in Django admin

The demo Office account is staff but is not a superuser. The seed command assigns Django model permissions only for the Marks app. Portal Office authority and Django admin model permissions are separate: being Office in the portal does not automatically grant access to every admin model.

Other information is registered in Django admin: accounts/Students/Lecturers, Supervisor/Panel records, semesters/capacity, timeline/audits, announcements/notifications and letter templates. A technical administrator with the appropriate permissions can inspect those sections. Governed appointment/configuration/Marks changes must still use their required workflow services; many admin screens are intentionally inspection-only.

Office users should do daily work in the main portal. The user has now chosen technical-only Django admin access; separating that access from Office business permissions is pending. No account authority was expanded during the server restart. Once implemented, run admin inspection checks as a designated technical account and verify ordinary Office admin access is denied.

## What to do now

Start at step 1 as Office, then complete the happy path with one labelled test Student. Use the private account sheet for passwords. Report the first Failed or Blocked step with its role and record ID. Development then continues with supporting supervision, research changes/transfers, delegation/carryover and remaining Dashboard/Timeline/report/export combinations. Deployment checks and deferred faculty/coordinator identity decisions are separate.
