# Appointment workspace simplification implementation plan

**Later correction (2026-10-20):** The user explicitly replaced the Panel Current/Past switch with an Appointments filter inside the filter grid and removed the duplicate Manage capacity entry from Office Panel Tools. Supervisor retains its switch. The implementation/verification below describes the earlier completed increment; PROJECT_STATUS.md records the latest correction.

**Goal:** Keep one lecturer-first staff browsing flow and the Current/Past switch, removing the redundant Panel grouping modes.

**Approved design:** The user's final correction keeps Current/Past as switch buttons. Coordinator and Office retain their main module navigation, lecturer → students → exact details, student-or-lecturer search, existing filters, pagination and exports. Remove By lecturer/By student controls and ignore obsolete saved grouping preferences. Supervisor retains its existing primary/supporting counts, current teams, past appointment history, programme transfers and role scope. The dropdown mockup and earlier student-first mode are superseded.

**Architecture:** Reuse the existing light Supervisor switch treatment through one AppointmentViewSwitch in RequestWorkspacePrimitives. Supervisor's CoordinatorTeamViewSwitch adapts its existing requests/history state to current/past without changing stored values or data loaders. Panel consumes the same presentation, uses lecturer groups whenever no lecturer is selected, and renders its student table only inside a selected lecturer. Existing API, data filtering, lifecycle and detail/return controllers remain unchanged.

**Constraints:** Work in the existing dirty checkout. No reset, cleanup, commit, push, new dependencies, migrations, academic mutations, scope expansion, Student/Lecturer navigation changes or redesign of request approval forms.

## Critique and decisions

1. The earlier plan added a separate student mode even though student search already locates lecturer groups. Remove the mode, not the search.
2. Consistency is not a reason to rewrite working Supervisor browsing or collapse primary/supporting facts. Share presentation only.
3. The user's switch instruction overrides the rejected preview's dropdown proposal. Keep one labelled Current/Past switch below main navigation.
4. Existing shell memory may contain grouping=student. Stop consuming that obsolete field, rather than hiding controls around an active flat mode.
5. Tests must exercise the simplified path and protect current/past records, exact historical identity, search inheritance, return state and full matching export.

## Tasks

- [x] **Reproduce the rejected structure.** Add frontend/src/components/AppointmentWorkspaceStructure.test.tsx: render staff Panel with ListState containing PanelAssignments:<role>:grouping=student, assert no By lecturer/By student or grouping control and require the lecturer table, current/past labels and search. Run `node node_modules/tsx/dist/cli.mjs src/components/AppointmentWorkspaceStructure.test.tsx` from frontend; expect failure against the current structure.
- [x] **Share the switch and remove Panel modes.** Add AppointmentViewSwitch({view,onChange,label,currentLabel,pastLabel}) to frontend/src/components/RequestWorkspacePrimitives.tsx using existing native buttons, aria-pressed and Supervisor switch classes. Adapt CoordinatorTeamViewSwitch in CoordinatorSupervisorWorkspace.tsx to this shared component. In PanelAssignmentsWorkspace.tsx remove private ViewSwitch/grouping state, use `const grouped = !lecturer`, and retain only AppointmentViewSwitch in the toolbar. Preserve role-specific labels and every existing table/detail callback.
- [x] **Update mounted scenarios.** Adjust frontend/tests/panelAssignments.fixture.tsx to reject both grouping buttons for both roles, replay obsolete grouping memory, open past assignments through lecturer → students, and retain checks for exact historical records, date/programme/search filters, export and return state. Add shared-switch coverage through the existing Supervisor toolbar. Keep all reads mocked and isolate browser profiles.
- [x] **Verify and review.** Run the new structural check, Panel/Coordinator hierarchy/rendering/navigation/helper checks, mounted desktop/mobile scenarios, TypeScript, production build and scoped whitespace checks. Inspect screenshots and request an independent focused review. Fix actual findings and update all three root governance docs with evidence and limits.

## Files and responsibility

- RequestWorkspacePrimitives.tsx: shared native Current/Past switch only.
- CoordinatorSupervisorWorkspace.tsx: existing Supervisor state adapter; data and navigation unchanged.
- PanelAssignmentsWorkspace.tsx: one lecturer-first route and one switch.
- AppointmentWorkspaceStructure.test.tsx and panelAssignments browser fixture/runner: structural and interaction regressions.
- PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md, PROJECT_STATUS.md: final requirement, shared design and verification record.

## Completion evidence (2026-10-20)

The structural regression failed against the old controls and stale student preference, then passed after the correction. All 12 scoped frontend scripts, 22 mounted scenarios at desktop/390px across Coordinator/Office Panel and Supervisor, TypeScript and the production build pass. The existing ExcelJS chunk-size advisory remains. Desktop/mobile screenshots were visually inspected. Independent focused review found no actionable findings. Supervisor detail opening is verified at the callback boundary; the downstream detail route was not mounted in these scenarios. Root requirements, architecture and status are updated, and the earlier browsing plan/preview are marked superseded. No live academic records, backend, dependencies or migrations changed; no commit or push was made.
