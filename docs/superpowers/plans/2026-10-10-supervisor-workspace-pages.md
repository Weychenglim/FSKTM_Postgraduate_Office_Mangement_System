# Supervisor workspace pages implementation plan

> Execute sequentially with the executing-plans workflow in the current feature branch.

**Goal:** Replace the combined Student/Lecturer Supervisor pages with the page structure approved in chat on 2026-10-10.

**Architecture:** Keep existing API permissions, mutation handlers and detail components. Add shared route navigation for Student My supervisors / Applications / Research changes and Lecturer Requests / My supervisees / Research changes. Research request lists navigate to individual comparisons and review history; supervision details retain team management. Academic record links use View student record.

**Tech stack:** React, React Router, TypeScript, existing portal primitives and Django APIs.

**Approved design:** User accepted the three-page proposal in this conversation. Guidance remains visible and relevant; no Student Marks, new authority, database fixtures, dependencies or backend schema changes.

- [x] Add route helpers/navigation and regression coverage for deep links, reserved route names and active sections.
- [x] Split Student overview and pending/completed application lists; preserve new/replacement application, audit and cancellation behavior.
- [x] Split Lecturer review queues and supervisee list; move supervisory teams to individual supervision details while retaining supporting reviews and historical supporting appointments.
- [x] Add research list/detail/profile/form routes with existing permitted decisions, cancellation, revisions and staff defaults retained.
- [x] Rename staff academic-record buttons consistently and make affected generic actions specific. Update existing integration checks for the new labels.
- [x] Run all frontend regressions, TypeScript, build/security guards and read-only browser checks for Student/Lecturer navigation, deep links and retained form/review actions. Update the three root documents, review and commit on codex/portal-consistency-and-toast.
