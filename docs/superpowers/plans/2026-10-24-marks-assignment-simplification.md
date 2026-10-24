> Follow-up: the role-filter button design below was superseded by shared WorkspaceFilterCard role/status dropdowns on 24 October 2026; the two-card structure and collapsed supporting information remain current.

# Marks Assignment Simplification Plan

**Goal:** Shorten evaluation assignment to two main cards while retaining its actions and information.

**Scope:** Bounded presentation update to `EvaluationTaskAssignment.tsx`, its existing responsive fixture and mandatory project documentation. Preserve Inter, existing palette, accessible controls, service handlers, period targeting, generation gate, backup confirmation and task-detail access. Execute inline; keep work local and uncommitted.

## Critique and design

1. Four large summary cards delay access to the task list: replace them with counted role-filter buttons inside results.
2. Separate period and generation cards repeat context: combine their selector, primary action and brief guidance.
3. Four visible readiness rows and metadata dominate routine visits: retain them in a collapsed “Period details and readiness” disclosure.
4. Deadline and activity cards inflate the page: use a header shortcut for central deadlines and embed session activity in the task card.

The default page has two surfaces: period/generation, then task management. The task card keeps role/status filters, submission counts, backup entry, empty/table states and activity disclosure. Role buttons filter existing data; they are not navigation tabs. The central deadline entry point supports a compact rendering; retain the existing local completion-window fallback when central navigation is absent.

## Implementation and checks

- [x] Update `frontend/tests/marksVisualPolish.fixture.tsx` to cover two main surfaces, collapsed readiness with accessible content, retained role/status reset, task details, backup entry, deadline navigation and reduced task-list offset at desktop/mobile widths. Observe a failing run before implementation.
- [x] Combine period and generation in `frontend/src/components/EvaluationTaskAssignment.tsx`; remove large summary cards, add counted role buttons, collapse metadata/readiness, embed activity and use compact central deadline entry in the header.
- [x] Preserve no-period setup guidance, generation enablement for published scheduled/open periods, closed-period disabled generation, and distinction between ungenerated versus filtered empty results.
- [x] Run `npm.cmd run lint`, `npm.cmd run build`, five existing focused Marks files and the assignment/feedback browser fixtures serially. Inspect desktop and mobile screenshots, including the task list's vertical position.
- [x] Update `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, `PROJECT_STATUS.md`; review scoped changes and run `git diff --check`.

## Commands

From `frontend`, run the five files with `node node_modules/tsx/dist/cli.mjs`: `src/utils/marksAssignmentStudents.test.ts`, `src/utils/marksProductionManagement.test.ts`, `src/utils/marksPeriodTargeting.test.ts`, `src/components/MarksDeadlineEntryPoint.test.tsx`, `src/components/marksDecisionParents.test.ts`.

Set PowerShell `$env:MARKS_PAGES='assignment-empty,assignment-closed,assignment'`, then run `node --test --test-concurrency=1 tests/marksVisualPolish.browser.test.mjs tests/marksFeedback.browser.test.mjs` after building production CSS.

## Verification outcome

TypeScript, production build, five focused Marks files, nine assignment responsive scenarios and 16 contextual-feedback scenarios pass. Initial hierarchy regression and mobile role-filter layout both failed before their respective fixes. Desktop/mobile screenshots inspected; task management begins within the tested desktop/mobile vertical-offset limits. Source comparison confirms state/service handlers and backup/detail workflows are unchanged. All mandatory documents and whitespace checked. No commits or live data writes. Existing ExcelJS bundle advisory remains.
