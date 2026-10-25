# Five-module feedback audit

Approved scope: Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks and Workflow/Approval Tracking, including their shared academic configuration. Preserve the existing application architecture and business rules.

| Area | Changes and reviewed boundaries |
| --- | --- |
| Shared presentation | AlertMessage supports contextual title/body/actions and correct information/warning semantics. FormFeedback/FieldError expose structured errors and focus controls. Route-scoped compact read failures preserve other module defaults. |
| Dashboard/Timeline | Monitoring failures stay in the monitoring section. Semester discovery and timeline reads have separate retry paths. Add/edit/upload failures stay with entered data; download failures have an explicit error tone. |
| Academic dependencies | Semester validation is inside the form and maps explicit backend date keys to controls. Lifecycle saves retain returned state before refresh. Capacity errors stay in their existing dialogs. Period form errors and information use shared notices; history has contextual read recovery. |
| Supervisor/Panel | Exact Panel recommendation retry repeats the exact GET. Panel and supporting-supervisor nomination errors stay inside forms. Conflict recovery preserves candidate/justification, blocks writes until eligibility is reconciled and remains available after cancellation. |
| Marks | Period and rubric loading, selection and mutation feedback are separate. Explicit validation keys attach to fields. Operational guidance belongs beside configuration actions. Draft-save failures stay beside Save draft. Completion history retries its own GET. Saved components/periods cannot be created again to recover failed refreshes. |
| Workflow/Approval Tracking | A failed initial reconciliation preview remains visible with Retry. Same-issue reload preserves reason/programme while requiring fresh confirmation. Repair actions stay blocked during failed/stale preview reads. Report filter validation stays beside filters and export outcomes have accurate tones. |

Existing safe decision paths reviewed and preserved: Coordinator Supervisor approvals, Lecturer Panel review/withdrawal, supporting-supervisor decisions, Panel appointment ending, submitted Marks corrections/reopening, Office Supervisor replacement and required-document configuration. Business-rule checks, signed preview approvals, audit and authorisation behavior are unchanged.

The audit does not claim live end-to-end acceptance for every role/branch. Regression fixtures mount real components with isolated HTTP responses and make no live academic writes. Final verification evidence is recorded in PROJECT_STATUS.md and output/five-module-feedback-20261022.
