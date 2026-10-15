# Coordinator Supervisor workspace efficiency implementation plan

> For agentic workers: use subagent-driven-development for isolated backend and research tasks, followed by task and broad integration review.

**Goal:** Coordinator request review and supervision browsing that remain efficient as programme records grow.
**Architecture:** Opt-in paginated scoped read APIs and shared list controls alongside existing authoritative decision components. Lazy-load only the selected workspace or detail.
**Tech Stack:** Django/DRF, React/TypeScript, existing Portal primitives.
**Spec:** docs/superpowers/specs/2026-10-13-coordinator-supervisor-efficiency.md

## Constraints
Preserve all prior uncommitted work, role/delegation scope, Student cancellation hiding, full record navigation/return context, fonts and action permissions. No migrations/dependencies/commits/pushes/live academic decisions.

- [x] Backend Coordinator request/team/ended-history/carryover page and detail endpoints; add failing scoped pagination/identity tests, implement, run tests and review.
- [x] Coordinator research paged list/filter/history and targeted detail loading; preserve all other role endpoints/UI, run backend/render tests and review.
- [x] Shared Coordinator browse UI, grouped supervisor drilldown, appointment history and secondary carryover tool; preserve list state, existing single-record decision components and safe Next request; render regressions and TypeScript.
- [x] Integration review, targeted/full checks, read-only browser verification, three root documents and final status update.

## Rulings
- Retain the current feature branch and pending changes: user has explicitly continued this branch; a fresh checkout would omit approved work.
- Detail API access retains current scope and audit access; routine list pages hide Student withdrawals through existing helpers.
- Supervisor counts are relationship counts inside authorised programmes, not global capacity.

- Supervisor-name search narrows supervisor identities; Student identity/research search returns all relevant groups for matched Students.
- Next requires a known filtered list position; missing records never wrap to first row. Page context travels with next targets. Successful primary/supporting decisions may retain their known successor; research safely disables Next when the current row leaves scope.

## Completion evidence

115 broader backend regressions passed; after review refinements all 34 Coordinator workspace/research tests passed, including two reproduced failures. All 105 frontend scripts, TypeScript, production build, both production security checks, Django check and migration dry-run passed. Browser verified scoped group/student/detail returns, history search and page-size restoration, secondary capacity navigation, unified research focus controls and mobile no-overflow. Live demo lacks large/ended/supporting/research-decision datasets; fixtures cover those cases. No live decisions, commits or pushes. Root documentation updated.

Follow-up corrections: Requests is decision-only with focus selectors removed; status/date fields remain visible and Clear filters aligns at lower right. Team view switch is light and outside the card, renamed Past appointments. Grouping selector removed; supervisor grouping fixed, matric search verified through student drilldown. Focused frontend regressions, TypeScript/build and read-only desktop/mobile checks pass.
