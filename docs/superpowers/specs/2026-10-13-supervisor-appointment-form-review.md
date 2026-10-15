# Supervisor appointment form review and proposed design

Date: 13 October 2026

Status: the user authorized the primary course-code increment after five critical review passes. The optional field, API and exact-record display are implemented; verification is complete (109 affected backend cases, all 106 frontend scripts, TypeScript, build/security checks and local migration verification). The form remains provisional. Approval and document policy are unchanged; optional later features remain deferred.

## User direction

Retain Student submission -> requested Supervisor acceptance/rejection -> final Programme Coordinator approval/rejection. No Dean sign-off, Office approval gate or additional approval stage.

Latest scope refinements:

- Students enter course code(s) directly. No programme-to-course mapping, approved-code catalogue or faculty-maintained dropdown.
- Existing Supervisor acceptance and research-amendment history are sufficient. No separate title-confirmation action, record, snapshot or state-machine change is proposed.
- No new proposal/results evidence requirement, transcript attachment, course-results table, title-origin field or conditional upload policy. Existing configured supporting-document requirements and validation stay unchanged; this is not a request to remove existing uploads.

## Source inspected

`C:/Users/User/Downloads/FORM OF APPOINTMENT OF SUPERVISOR AND CONFIRMATION OF TITLE FOR RESEARCH PROJECT.pdf` was text-extracted and visually inspected on both pages. It is a blank two-page form, reference `TD(IT):FSK29`, with no interactive fields and no visible revision date or final-version designation. Instructions inside the form are reference material rather than authorization to reproduce its whole process.

Source observations retained for traceability:

- Course checkboxes list WQD7002, WQD7023, WQD7025, WQE7006, WQE7023 and WQF7023. These are examples from the draft, not a portal allowlist or programme mapping.
- Section A asks for Student identity/contact information, programme, semester/session, research field/title, a proposal in one circumstance, a ten-row courses/results table and date/signature.
- Section B repeats Supervisor identity, department, research field/title and date/signature.
- Section C contains Office receipt/comments, Coordinator approval and Deputy Dean verification, plus an unlabeled date/signature. Dean verification is excluded by the user; do not infer a new action from the unlabeled signature.

## Current system and revised recommendations

| Form item | Current system | Revised response |
| --- | --- | --- |
| Approval process | Student request, Supervisor review, final Coordinator review | Keep unchanged |
| Course code(s) | No project-course field on SupervisorApplication | Add a short Student-entered text field; no programme mapping or code list |
| Student name/ID/programme | User and Student profiles already hold these | Reuse authoritative values for any Section A review |
| NRIC/passport/address | StudentRegistry holds these | Reuse permitted Registry data; do not make application submission a new identity-editing route |
| Email/contact | User email/phone already exist | Reuse them and show missing data honestly |
| Semester/session | Application has an AcademicSemester link | Use the linked application semester rather than intake or a later current semester |
| Research title/field | Existing application stores both; review screens display them | Keep existing capture/review |
| Supervisor acceptance | Existing action records acceptance actor/time and forwards to Coordinator | No extra title-confirmation work |
| Later title changes | ResearchAmendment and ResearchProfileRevision preserve changes | Keep existing mechanism; preserve original application data |
| Proposal/results instructions | Existing configurable private document uploads; no general coursework-results scope | No new evidence requirement or results feature |
| Abstract | Required by current application and profile handoff | Keep it |
| Office receipt/comments | No separate form receipt record | Optional administrative addition only if useful; never an approval gate |
| Complete printable form | No matching appointment-form print artifact found | Optional adapted print view after layout is settled; omit Dean sign-off |

## Primary proposed increment: manual course code(s)

Add `SupervisorApplication.project_course_codes` as a bounded text field with a blank default for historical records. New application UI label: **Course code(s)**. Example hint: `WQD7002` or `WQD7002, WQD7023`.

Proposed API key: `projectCourseCodes`. Store the entered text with outer whitespace trimmed and a maximum of 255 characters. Basic input validation does not assert that a course exists, belongs to the Student's programme, or is enrolled/completed. Do not impose the six draft codes as an allowlist. Do not split this into course registration records or attach it to semester-capacity rules.

The field is shown to the Student and authorized reviewing/monitoring staff on exact application records. Historical blanks display **Not recorded** and do not block already-submitted reviews. Whether the final form makes this field mandatory remains provisional; initially allow a blank value in the API to preserve existing clients and avoid silently adding a faculty requirement.

## What title confirmation meant

The earlier proposal meant that a Supervisor's acceptance would explicitly document agreement with the submitted title/field. The current application already stores those values and records who accepted the request and when. A separate confirmation record adds little value for this scope and has been removed from the plan.

Keep the existing acceptance action and display. After approval, retain the existing research-amendment route. Do not overwrite the original application title with a later profile title when displaying historical application details.

## Optional later additions

These remain suggestions rather than approved implementation scope:

1. **Section A review:** show existing authorized identity/contact values before submission. Corrections continue through their current profile/Registry owner. Missing identity details do not silently become new submission prerequisites.
2. **Stable identity/contact snapshot:** useful if a completed historical form is required, because current application serialization reads some live profile values. If introduced, capture only server-owned values for new submissions and restrict sensitive fields to authorized exact views. Do not reconstruct legacy identity values from today's profiles. No new Supervisor/title confirmation snapshot is needed.
3. **Office receipt/comments:** optional non-gating administrative data with an append-only correction audit. Do not reuse academic rejection reasons for Office notes or expose internal notes to Students by default.
4. **Print view:** use persisted application fields and existing decision events, plus identity snapshots if implemented. Clearly label actual state/dates; do not invent stamps/signatures or suggest the adapted portal record exactly reproduces the original PDF.

Keep the separately owned letter-template subsystem unchanged. Sensitive identity/contact information does not belong in ordinary lists, candidate APIs or default exports.

## Remaining decisions

Only the final form/version/layout, semester-label wording, optional Office metadata, and acceptable print/signature wording remain relevant follow-ups. Course mappings and new proposal/results requirements are no longer prerequisites. Dean sign-off is already excluded. Do not reopen these rejected additions because they appear in the paper form.

## Acceptance criteria

- Manual course code(s) accepts codes beyond the six examples without a programme mapping.
- Basic trimming/length validation is consistent between UI and API; blanks on legacy/existing clients remain supported.
- Existing Student -> Supervisor -> Coordinator approval, atomic activation/profile handoff, capacity rules, replacements and Panel/Marks behavior remain unchanged.
- No new title-confirmation action/record, Dean stage, transcript requirement, results table or conditional proposal policy.
- Existing uploads and research-amendment history are preserved.
- Optional identity snapshots/Office metadata/printing are implemented only if included in a later agreed scope.

Revised implementation plan: `../plans/2026-10-13-supervisor-appointment-form-alignment.md`.
