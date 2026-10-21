# Supervisor appointment: digital Section A

The user authorized execution after five critiques and a final critique on 17 October 2026. This supersedes the narrow 13 October course-code-only scope for the student application. Reuse the current `codex/portal-consistency-and-toast` checkout and preserve all unrelated uncommitted work. No commit, push, live academic decisions or worktree reset.

## Final critique and decisions

1. A field existing in a database is not an implemented student review flow. Resolve particulars server-side, show missing values honestly, and provide truthful correction guidance.
2. Re-entering particulars introduces competing identities. Read name/email/phone from User, student ID/programme from Student, identity/address from StudentRegistry and session from the effective application semester. Do not use intake or the registry's free-text semester as the application session. Do not claim a live Maya connection.
3. Cosmetic consistency cannot meet Section A coverage. Include research/course text, courses taken, title origin, applicable proposal evidence and a declaration. This explicitly expands earlier exclusions. Course results are student-declared supporting information, separate from project assessment Marks. No course catalogue, enrolment validation or arbitrary grade scale.
4. Live values cannot describe historical submissions. Store a server-owned immutable JSON record at submission; never accept identity/contact/declaration wording/actor/time from the browser. Existing records retain a null Section A and a clear legacy explanation; never backfill guessed values.
5. Sensitive particulars belong only on authorized exact views. Add a dedicated Section A endpoint using the existing application access check, not ordinary queues/candidate/list/export payloads. Keep Student -> Supervisor -> Coordinator and existing document security/capacity/replacement rules.

## Contract

`GET /api/appointments/supervisor/application-prefill/` (eligible authenticated Student only) returns `{studentParticulars, proposalRequirementCode, declarationText}`. Particulars keys: `name`, `studentId`, `programme`, `semester`, `identityNumber`, `identityType` (`NRIC`, `PASSPORT`, or blank), `email`, `phone`, `address`. Proposal code identifies the existing active `research-proposal` requirement or null. Missing registry/values are blank; no new completeness gate for identity data.

Multipart submissions add a `sectionA` JSON field: `{version:1, titleOrigin:'STUDENT'|'SUPERVISOR', noCoursesTaken:boolean, courseResults:[{courseName,courseCode,semesterSession,grade}], declarationAccepted:true}`. Rows are trimmed, bounded (name 255, code 64, semester/session 64, grade 32; max 50 rows), all four values required per nonempty row; either results or explicit none, never both. This is a versioned additive contract: older clients omitting sectionA keep existing submission behavior and receive no fabricated declaration/results. Malformed or partial Section A is rejected. New portal submissions always use version 1.

Student-proposed titles under version 1 require an upload against active `research-proposal` (even if configured optional). Supervisor-proposed titles still honor all globally required uploads. If the proposal requirement is unavailable, show a configuration error for the student-title path; do not silently invent a document category or weaken validation. Preserve file validation, five-file/10 MB limits, atomicity and private downloads.

Store nullable `SupervisorApplication.section_a` JSON containing `{version:1, studentParticulars, titleOrigin, noCoursesTaken, courseResults, declaration:{text,acceptedAt,acceptedBy}, capturedAt}`. GET `/api/appointments/supervisor/applications/<id>/section-a/` returns `{sectionA: object|null}` for existing permitted exact-record readers only. Research title/field/abstract/course text remain in the original application fields. Snapshot identity overrides live profile values in the exact request summary after loading. Legacy values are explicitly labeled as current profile data.

## UI

One page with linked sections: Student particulars; Research details; Courses taken; Supervisor selection; Supporting documents; Review and declaration. Reuse portal typography/cards/buttons/selects. Read-only particulars and a missing-data/correction note. Repeatable accessible course rows (no ten mandatory blank rows), explicit no-courses choice, no automatic claim of verified results. Explicit title-origin choice with conditional proposal explanation. Review submitted content and files, require confirmation and preserve draft/error guards. Replacement prefill may reuse research/course content, but new particulars come from the current server and declaration must be freshly accepted. Submitted detail uses the same record for Student/Supervisor/Coordinator/Office, with loading/retry/legacy states and no sensitive list expansion. Blank Supervisor course codes display Not recorded.

## Verification and limits

Backend API tests cover prefill ownership/missing data, JSON parsing/bounds, proposal rules, authoritative snapshot/actor/time, snapshot stability, legacy behavior, role/programme privacy and unchanged approval/replacement flow. Frontend tests cover multipart preservation/validation, rendered section coverage, no-courses/results/review/declaration, record rendering and legacy blanks. Run affected backend suites on an isolated test database, full frontend scripts/typecheck/build, Django check/migration check and task whitespace checks. Apply only the new additive migration locally after checking current migration state; preserve live academic data. Signature is an authenticated declaration, not a drawn signature or a claim of faculty/legal equivalence. Printing and Office/Dean stages remain outside scope.

## Completed reference coverage

| Reference item | Implemented treatment |
| --- | --- |
| Course checkboxes | Manual project course-code text, preserving the existing decision against a fixed catalogue |
| Name as in Maya | Saved account name, read-only review and server capture; no claim of direct Maya verification |
| NRIC/passport | Own StudentRegistry identity value/type, missing values explicit, exact-view snapshot only |
| Student ID and programme | Student profile values reviewed and captured server-side |
| Semester/session | Effective application AcademicSemester label, captured with the submission |
| Contact number/email/address | User phone/email and Registry address reviewed and captured; corrections retain existing ownership |
| Research field/title | Existing persisted application research area/title, shown consistently with the submitted record |
| Proposal for Student title | Explicit title-origin choice plus secure research-proposal upload enforcement for version 1 |
| Results of courses taken | Complete bounded repeatable rows or explicit no-completed-courses declaration; student-declared, separate from Marks |
| Date/signature | Authenticated declaration wording/actor/time saved server-side; no invented signature image or faculty-equivalence claim |

Final verification: 96 affected backend tests and all 207 frontend checks pass; TypeScript/build, Django checks and migration checks pass. Migration 0017 applied locally without changing the seven historical records. Standard queues remain free of sensitive snapshot data and sensitive exact responses are non-cacheable. Confirmation clears when the reviewed draft changes. No commit/push or academic decision was executed.
