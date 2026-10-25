# Marks Assignment Hierarchy Implementation Plan

Follow-up: the larger card arrangement below was subsequently simplified at the user's request. The current two-card design is recorded in `2026-10-24-marks-assignment-simplification.md`; this completed plan remains as implementation history.

> **For agentic workers:** Execute inline using the existing development and verification workflow. Do not create a new checkout, commit unrelated working changes, or delegate this bounded page update.

**Goal:** Make evaluation assignment read in the order Office staff work: choose a period, inspect readiness, generate missing assignments, manage existing tasks.

**Architecture:** Keep `EvaluationTaskAssignment` as the existing service-backed workspace. Recompose its presentation using shared Marks primitives, Portal cards/buttons/selects and existing handlers. Retain generation eligibility, period targeting, backup confirmation and record access.

**Tech stack:** React, TypeScript, Tailwind, Lucide, existing router and fixture browser runner. No new dependency.

**Design:** In-chat wireframe and six critiques presented on 24 October 2026. Extend the already-approved restrained Marks styling.

## Constraints and design decisions

- Preserve Inter, white surfaces (#ffffff), page background (#f1f5f9), portal navy, slate body text (#475569), blue links and existing semantic status tones. No tabs, animation or new decoration.
- Align headings, metadata and controls left. Use shared 16px section headings, readable descriptions and consistent card padding.
- One period selector at the top with labelled rubric, dates and programme/evaluator scope; no period summary card repeating it.
- Four comparable count cards: total, Supervisor, Panel, Backup. Role cards keep their filtering actions.
- Readiness and generation share one card. Preserve the existing published/scheduled-or-open generation gate; readiness remains informative and server checks remain authoritative.
- The task card owns submitted/incomplete/overdue counts, role/status filters, Clear filters and the existing backup action. Clear filters resets role and status while retaining period selection.
- Merge student name/ID and evaluator/role cells to reduce table width without removing information. Keep a labelled, keyboard-scrollable table region.
- Distinguish no periods, no generated tasks and no filter matches. Do not render a horizontally scrolling empty table.
- Move deadline management below the task card. Preserve `MarksTaskDeadlineEntryPoint` and its standalone completion-window fallback.
- Collapse session-only activity in a native details element; retain its rows and explain its session scope.
- Keep all backup form, decision, draft protection, detail modal and existing service handlers.

## Tasks

### 1. Reproduce and cover the hierarchy

Files: `frontend/tests/marksVisualPolish.fixture.tsx`, `frontend/tests/marksVisualPolish.browser.test.mjs`.

- [x] Add empty and closed assignment fixtures with explicit mocked period/task reads.
- [x] Assert period context precedes generation; readiness is in the generation card; deadline tools follow tasks; activity starts collapsed.
- [x] Assert no-period action and disabled generation, closed-period disabled generation, role/status filtering and filter reset, task detail access and backup entry/cancel without mutation.
- [x] Run `MARKS_PAGES=assignment-empty` with `node --test tests/marksVisualPolish.browser.test.mjs` and record the expected failure before implementation.

### 2. Recompose the existing workspace

File: `frontend/src/components/EvaluationTaskAssignment.tsx`.

- [x] Move period selector and metadata into `assignment-period-card`; use `MarksSummaryCard` for the four counts.
- [x] Put informative readiness beside generation in `assignment-controls`; keep handlers and generation gate unchanged.
- [x] Consolidate task controls and counts in `evaluation-preview-card`, attach backup explanation/action, and use the appropriate empty state or populated table.
- [x] Relocate the deadline entry point and fold session activity into native details. Preserve the backup and detail interfaces below the main layout.

### 3. Verify and maintain documentation

- [x] Run TypeScript and production build: `npm.cmd run lint`, `npm.cmd run build` in `frontend`.
- [x] Run focused tests using `node node_modules/tsx/dist/cli.mjs`: `src/utils/marksAssignmentStudents.test.ts`, `src/utils/marksProductionManagement.test.ts`, `src/utils/marksPeriodTargeting.test.ts`, `src/components/MarksDeadlineEntryPoint.test.tsx`, `src/components/marksDecisionParents.test.ts`.
- [x] Run assignment fixtures at 1440/390/320px, then existing Marks feedback fixtures serially. Inspect desktop and mobile screenshots; resolve navigation, overflow or readability failures before finishing.
- [x] Update/check `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, `PROJECT_STATUS.md`; run `git diff --check` and review the final scoped diff. Keep changes local and uncommitted.

## Critique record

1. Deadline detour before the main task → move it below assignment management.
2. Period metadata repeated in three places → one context card.
3. Counts split across competing surfaces → comparable task cards and a compact submission strip.
4. Readiness detached from generation → one preparation surface.
5. Backup visually competes with normal generation → secondary task-table action with exception context.
6. Empty table and session activity add premature noise → purposeful empty states and collapsed activity.

References: [GOV.UK task order](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/), [Carbon data-table toolbar](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines).

## Verification outcome

TypeScript and production build pass. All five focused files pass. All nine assignment viewport cases and 16 existing contextual-feedback cases pass. Desktop/mobile screenshots inspected; original state/service handlers and backup/detail markup compared against the pre-change snapshot. No live data writes or commits. Existing ExcelJS size advisory remains.
