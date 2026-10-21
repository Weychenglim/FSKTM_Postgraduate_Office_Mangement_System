# Panel assignment browsing implementation plan

**Superseded browsing mode:** The later approved plan, `2026-10-19-appointment-workspace-simplification.md`, removes By lecturer/By student controls and the student-first mode. Current/Past remains a switch. Other assignment requirements and the historical verification below remain applicable.

**Goal:** Give Coordinator and Office Staff a clear lecturer → students → appointment flow alongside student-first browsing.

**Approved design:** The conversation's final critique and implementation instruction. Rename the staff destination to Panel assignments; provide By lecturer/By student, Current/Past assignments, search/filtering, record links and filtered Excel. Keep requests, confirmed assignment history and capacity monitoring distinct. Coordinator records stay within existing authorised programme/delegation scope; Office retains existing access. Lecturer/Student navigation and decisions remain unchanged.

**Architecture:** Compose existing table/filter/pagination, RecordPage, PortalSelect, PortalButton and Excel helpers in one staff assignments component. Pure helpers filter confirmed lifecycle records, deduplicate by appointment identity and group by lecturer identity. Reuse the full already-authorised record collections loaded by the existing Office/Coordinator hosts; no API, permission, migration or dependency changes. Store list controls in existing role-scoped ListState and selected lecturer in the URL, preserving exact appointment navigation and return context. Hide the lecturer drilldown RecordPage while the Coordinator's existing appointment detail is open to avoid simultaneous record hosts.

## Tasks

- [x] Write failing pure/rendering regressions for lifecycle filtering, unique counts, distinct lecturer identities, search/filter-before-grouping, safe missing metadata and staff-only navigation naming.
- [x] Implement `frontend/src/utils/panelAssignments.ts` and `frontend/src/components/PanelAssignmentsWorkspace.tsx` using existing authorised records and shared UI primitives. Reject unconfirmed rows from assignment results; count students separately from past appointment events. Use 10/25/50 pagination and export every matching record as literal-safe XLSX through the existing helper.
- [x] Integrate with Office PanelAppointmentManagement and Coordinator LecturerPanelAppointments; retain Lecturer PanelBrowse and all existing detail callbacks. Rename only staff assignment navigation and make return labels meaningful. Preserve Requests, Needs attention and Tools.
- [x] Add isolated mounted browser regressions for both hosts, lecturer drilldown, student-first browsing, current/past, filters, paging, record identity, back/context restoration and narrow layouts. Use mocked read APIs and no live academic mutations.
- [x] Run affected frontend checks, TypeScript and production build; inspect desktop/mobile screenshots and get independent code review. Resolve findings and update all three root governance docs with measured results and limits.

Verification: four pure helper regressions, 11 scoped frontend scripts, 18 mounted desktop/mobile scenarios, TypeScript and production build pass. Review's inherited-sort finding was reproduced and fixed. Full evidence and test limits are recorded in PROJECT_STATUS.md. No live academic mutations, backend/dependency changes, commit or push.

## Constraints and acceptance

Work in the existing dirty checkout without reset, unrelated cleanup, commit or push. Do not reuse the Office-only capacity endpoint for Coordinator. An accepted nomination awaiting Coordinator approval is a request, never a confirmed assignment. Rejected/cancelled requests never appear in Past assignments. Same-name lecturers with different staff identifiers remain separate; missing identities must not merge unrelated lecturers. Current assignments use active lifecycle status across semesters; Past assignments use ended/completed lifecycle records. Existing appointment detail actions and student-record access retain server-side authorization.
