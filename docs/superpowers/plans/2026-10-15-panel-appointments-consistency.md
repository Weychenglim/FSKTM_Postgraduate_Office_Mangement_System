# Panel Appointments consistency implementation plan

> Execute inline with the executing-plans skill. The user approved implementation with “make a final big roast then go”. Continue in the current branch; preserve existing work and current live academic records.

**Goal:** Match the approved Supervisor structure across Office, Lecturer and Coordinator Panel workspaces, including an accurate Office attention landing page.

**Architecture:** Panel-specific adapters feed a common recommendation renderer and lifecycle card. Neutral existing record, approval, decision and browse components provide the visual structure. Role hosts retain existing mutations and authorisation; new reads supply exact common facts and Office attention.

**Tech stack:** Existing React/TypeScript, Django/DRF and PostgreSQL; no new dependency.

**Spec:** `docs/superpowers/specs/2026-10-15-panel-appointments-consistency-design.md`, approved 15 October 2026.

## Constraints

- Inter: headings16/600, names14/600, labels12/600, ordinary values12/400; existing detail spacing and colours.
- One RecordPage wrapper; metadata below heading; approval progress visible, audit collapsed; appointment lifecycle separate.
- Office monitors; selected Panel accepts/rejects; Coordinator confirms/rejects. Preserve programme guards, delegations, capacity, replacement and Student privacy.
- No invented actors/dates, raw enum facts, visible internal references or empty document/evaluation sections.
- Keep existing API array contracts/deep links. New attention reads are explicitly paged. Back retains filters/page and supervision origins.
- No live academic mutations for screenshots. No automatic commit/push of this implementation.

## 1. Shared factual Panel presentation

Files: new `frontend/src/utils/panelPresentation.ts`, `panelPresentation.test.ts`, `components/PanelRecordDetails.tsx`, `PanelRecordDetails.test.tsx`; modify the four detail hosts, `types/appointment.ts`, staff serializers and record projections.

- [x] Add failing tests for truthful approval steps, cancelled/rejected stages, legacy uncertainty, matched detail sections across DTOs, separate lifecycle and hidden internal references.
- [x] Implement DTO-specific `toOfficePanelPresentation`, `toAssignmentPanelPresentation` and `toSubmittedPanelPresentation` adapters and `buildPanelApprovalSteps(record): ApprovalStep[]` using recorded workflow events and timestamp facts.
- [x] Implement `PanelRecommendationDetail({record,actions,administration})`, `PanelAppointmentRecordCard({record,actions})`, and `panelRecordMetadata(record)` using existing neutral primitives and detail typography.
- [x] Extend authorised staff DTOs with the common recommendation/contact/lifecycle facts. Reuse the same recommendation serializer; do not change Student payloads or grant new decisions.
- [x] Replace review/submitted/Office/assignment detail bodies, preserving stable DecisionDialog hosts, strict reload and exact record navigation. Keep exported legacy timeline adapters for existing consumers.
- [x] Run `node --import tsx --test src/utils/panelPresentation.test.ts src/components/PanelRecordDetails.test.tsx src/components/PanelReviewDecision.test.tsx src/components/LifecycleCancellation.test.tsx` and relevant staff/privacy backend tests.

## 2. Role navigation and shared browsing

Files: new `components/PanelWorkspaceNavigation.tsx`, `PanelBrowse.tsx`; modify Panel management/Lecturer hosts, submitted records, workload and nomination form, routes/App as needed.

- [x] Add failing rendering/filter tests for role navigation, request/history and active/ended separation, common readable table fields and retained filter/page context.
- [x] Implement a small navigation component using Supervisor navigation styling and Panel-owned section state/validated query parameters. Preserve old submitted/reviewed/workload/exact links.
- [x] Implement `PanelBrowse` with shared section header, visible filters, responsive table and WorkspacePagination (10/25/50). Keep exact IDs in row keys/actions and human labels in cells.
- [x] Office: Needs attention / Appointment requests / Panel appointments, workload under Tools. Coordinator: Appointment requests / Panel appointments. Lecturer: Appointment requests / My supervisees / My Panel students.
- [x] Migrate existing submitted/reviewed/current/past views and specialized workload/form presentation. Reuse existing candidate/validation/draft controls.
- [x] Verify direct links, read-only histories, existing outcome tests, TypeScript and build before proceeding.

## 3. Office attention and exact record reads

Files: new `backend/appointments/panel_workspace.py`, `test_panel_workspace.py`, `frontend/src/services/panelWorkspaceApi.ts`, `components/OfficePanelAttention.tsx`; modify existing URL registry and Office host.

- [x] Add backend fixtures covering missing, pending, rejected/cancelled-only, ended and active/replacement cases; unauthorized roles; filter/page/count correctness and current-semester capacity.
- [x] Add `GET panel/attention/summary/` and `GET panel/attention/?category=students|waiting|workload` with Office-only guards, existing eligibility rules and BrowsePage envelope.
- [x] Base Without Panel on active eligible linked Students with active primary supervision and no active Panel. Ongoing nominations remain visible as progress. Never treat all historical workflow as current coverage.
- [x] Waiting uses current-stage ageing, capacity uses existing current semester capacity resolution. Counts carry distinct units; facets precede table filters; matching export collects all pages.
- [x] Add exact staff Panel record/appointment reads where required, scoped by existing detail permission, and retain legacy read-only Coordinator monitoring without decision grants.
- [x] Implement attention cards/table/filters with common browse primitives, Retry and guarded focus reload; route each action to the exact record or workload context.
- [x] Run isolated Panel workspace/programme/privacy/lifecycle backend tests and relevant frontend tests.

## 4. Verification and documentation

- [x] Check all three root documents; mark approved design and actual implementation/evidence separately.
- [x] Run all frontend scripts, TypeScript, production build, scoped backend suites, Django check/migration dry-run and whitespace checks.
- [ ] Cross-role desktop/320px browser comparison: not completed. The user explicitly requested no further browser checks on final validation. Office attention/exact pending record was inspected live; other role rendering and permissions have automated coverage.
- [x] Verify Back/list context, historical states, capability differences and error/reload contracts through automated fixtures. No new live decision previews or mobile acceptance claim for this slice, following the user request to stop browser checks.
- [x] Report actual coverage and any remaining baseline failure. Known baseline: capacity migration test compares entire historical row dictionaries against latest schema and fails on the later project_course_codes field; do not weaken that test or silently claim green.
