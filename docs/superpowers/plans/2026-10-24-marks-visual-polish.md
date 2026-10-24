# Marks visual polish implementation plan

> Execute inline in the existing branch. User authorised implementation after the no-tab proposal and three additional critique rounds. Preserve all pre-existing workspace edits.

**Goal:** Make the Office and Lecturer Marks pages consistent with the portal, using grouped setup links and clear monitoring rather than a tab bar.

**Architecture:** Small presentational Marks primitives compose existing PortalCard, StatusBadge, Lucide icons and existing callbacks. Existing routes, queries, permissions, scoring, publication, draft/submission locks and correction logic remain authoritative.

**Tech stack:** React, TypeScript, Tailwind, existing Lucide icons. No dependencies or backend changes.

**Spec:** `docs/MARKS_UI_PROPOSAL_2026-10-24.md` (no-tab revision).

## Global constraints

- Retain Inter, navy/blue/slate palette and shared typography conventions.
- No tabs, second sidebar, forced wizard, new analytics or animation.
- Preserve existing role access, data scopes, record routes and safeguards.
- Supporting actions must remain reachable after consolidating duplicate Quick Actions.
- Preserve the existing dirty workspace and update the three required project documents.

## Additional critique rounds requested before implementation

11. A tall checklist would merely move the clutter: use three compact setup rows.
12. Removing tabs could add repetitive navigation: retain useful existing cross-links and consistent returns.
13. A polished overview with mismatched forms would remain inconsistent: apply shared hierarchy to Office and Lecturer pages.

## Tasks

- [x] Add `MarksPrimitives.tsx` with decorative MarksIcon, semantic MarksHeading and a no-animation accessible MarksSummaryCard. Keep SummaryCard's existing callers compatible while adding an explicit optional status tone.
- [x] Extract the Office overview into `MarksOverview.tsx`, using existing data/callbacks from App. Retain all four destinations in grouped setup/monitoring; remove the duplicate Quick Actions rendering. Distinguish loading/error from empty data.
- [x] Compact ChecklistCard to three setup rows; preserve original readiness calculations and describe configured/generated states precisely. Simplify zero-task attention and monitoring; preserve populated filters, records and supporting activity.
- [x] Align summary cards, headings, return labels and scoped text styling in period/rubric/task/record pages and Lecturer entry/history/detail. Preserve form handlers and locking. Add icons only where they identify meaningful sections.
- [x] Verify existing Marks utility/component tests, mounted Marks feedback and new mounted overview accessibility/navigation/empty/populated/error states at desktop/390/320px. Inspect screenshots; run TypeScript, production build and scoped diff checks.
- [x] Review only this task's changes against a pre-edit snapshot, update requirements/design/status and record verification limits.

New browser checks must use isolated fictional HTTP fixtures, not write live academic data. Existing meaningful workflow tests provide safeguard coverage; do not add tests that merely mirror CSS class names.

## Verification and review result

Completed all tasks. Final checks: TypeScript, production build, 14 focused Marks test files, existing feedback fixture (16 scenarios across desktop/mobile), and visual/navigation fixture (42 page/width combinations at 1440/390/320px) pass. Independent review caught the metadata-error navigation regression; fixed and verified with explicit mounted assertions and follow-up review. The test fixtures are fictional and do not validate authenticated live database flows. No changes committed.
