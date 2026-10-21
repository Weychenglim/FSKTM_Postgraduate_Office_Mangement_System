# Lecturer capacity workspace redesign

**Goal:** Replace the dense version-first Office page with a workload overview and an explicit draft editor; let lecturers manage their own availability after confirmation.

**Approved design:** Conversation of 2026-10-20. Office controls published semester limits. Lecturers own availability, effective immediately within the declared dates after explicit confirmation. Active students, recommendations and enforced limits are separate quantities. Recommended planning baseline is total enabled lifecycle-active students divided by enabled lifecycle-active lecturers holding a capacity-managed role, across all portal faculties/programmes; show numerator/denominator and a decimal, never use it as an enforced Supervisor or Panel limit. No eligible lecturers means unavailable, never divide by zero.

**Architecture:** Keep existing audited capacity mutation services and published policy enforcement. Add a read-only Office roster projection covering eligible lecturers even when draft entries are absent. Add identity-scoped lecturer availability endpoints and a shared-component page. Keep the existing working checkout on `codex/portal-consistency-and-toast`, including unrelated local changes; no commits, pushes or live academic mutations.

**Global constraints:** Do not change participant lifecycle or acting coordinator delegation implementations. Do not change shared typography/primitives globally. Preserve historical records, zero limits, concurrency checks, role-specific availability, reservation semantics and existing assignments.

- [x] Task 1: Add and test lecturer-owned availability GET/create/cancel APIs. Require confirmation on mutations; derive lecturer identity server-side; preserve audits and date/overlap rules.
- [x] Task 2: Add and test lecturer availability form/history using existing PageHeader, selects, cards, pagination, DecisionDialog and toast behavior. Confirm exact dates/role/consequences before any POST.
- [x] Task 3: Add and test Office read-only roster projection with distinct active student totals, primary/supporting/Panel breakdown, published resolution and configurable missing rows.
- [x] Task 4: Restructure Office capacity into overview, draft preparation, read-only version inspection and history. Use shared responsive table/cards, filters and pagination. Make readiness issues actionable and retain every error.
- [x] Task 5: Calculate the user's student-to-lecturer planning baseline from authoritative portal records; show guidance separately from enforcement, including counts/scope and a no-lecturers state. No new stored preference or policy field is needed.
- [x] Task 6: Wire lecturer entry route and dashboard entry; update the three required project documents. Verify role boundaries, confirmation/no-save cancellation, draft creation/edit/publication, responsive rendering, lint/build and protected file hashes.

## Review and evidence

Record test commands/results, design rulings and remaining work here as implementation proceeds. No live database migrations or academic writes are authorized by a design preview/test.


## Completion evidence (2026-10-21)

- Retained existing working checkout and unrelated local edits; no Git integration requested.
- Backend: `manage.py test academics.test_capacity_workspace academics.test_lecturer_availability academics.test_capacity.CapacityResolverTests --keepdb --noinput`: 40 passed.
- Office browser fixture: 10 scenarios at four widths = 40 passes; lecturer fixture: 16 scenarios at three widths = 48 passes; existing Office Dashboard fixture: 16 scenarios at four widths = 64 passes.
- Reviewed and corrected historical roles, retained ineligible lecturers, unknown Panel identity totals, obsolete-draft recovery and unsaved/busy navigation. Stable record-page identity fixes nested preparation/copy navigation.
- Recommended baseline uses the user-approved student/lecturer calculation, not a stored preference or automatic policy. Zero denominator unavailable.
- Shared PageHeader, RecordPage, DecisionDialog, filter card, fields, responsive table/cards, pagination and feedback reused; protected implementation and shared base styles hashes unchanged.
- Runtime health/page routes checked after backend restart; all200 except authenticated self API intentionally401 anonymous. No live academic mutations or migrations.

- Final `npm.cmd run lint` and `npm.cmd run build` passed after the final historical-role filter fix. Existing ExcelJS size advisory only. Scoped whitespace checks pass.
