# Periods and deadlines clarity implementation plan

**Goal:** Make submission dates, date restrictions, calendar links and Marks ownership understandable using existing portal components.

**Approved design:** The user approved the 21 October in-chat overview and selected-activity design, and explicitly instructed implementation after the final critique.

**Architecture:** Keep operational periods and Marks models/services authoritative. Compose a shared-table activity overview, a selected activity section and a guarded window record. Use existing DecisionDialog for publication, restrictions, extensions and calendar linking. Add linked events with one existing timeline POST, never create then link in two writes.

**Constraints:** Preserve approval access after submission deadlines, Draft/Active mutation rules, Closed recovery, audit reasons, programme scope and Malaysia time. Do not modify shared primitive styling, protected participant/delegation features or unrelated working-tree changes. Preserve existing period anchors. No live data writes or commits.

## Task 1: Overview and rule explanation
- [x] Add failing coverage/overview tests, including case-insensitive programme scope, Draft exclusion, and unavailable calendar state.
- [x] Add period presentation helpers and a focused overview component. Replace button tabs with three activity rows and selected details. Use a plainly labelled semester dropdown outside a card.
- [x] Replace period action clusters with one Manage window entry and a guarded record with state-appropriate controls.
- [x] Keep enforcement as its existing independent operation; review published dates and uncovered programmes with explicit acknowledgement before enabling.

## Task 2: Calendar and Marks context
- [x] Test linked event creation uses one semester-scoped POST with owning period and Malaysia-derived dates.
- [x] Expose missing/loading/error/ready calendar states, existing links and guarded create/link actions. Missing timelines route to the existing calendar setup.
- [x] Carry semester and optional period into Marks configuration. Validate the requested context; never silently select another semester or period. Preserve ordinary unscoped Marks behaviour.

## Task 3: Verification and documentation
- [x] Exercise actual components with isolated mocked APIs at desktop/mobile widths: overview selection, anchors, draft creation, management, restrictions, calendar linking/create, Marks context, closed semester and failed refresh.
- [x] Run relevant existing tests, TypeScript and production build; inspect screenshots.
- [x] Update PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md and PROJECT_STATUS.md with completed scope and verification limits.

Execution note: Kept the existing dirty feature checkout and all unrelated work. Final verification evidence is recorded in PROJECT_STATUS.md; no commits or live data writes.
