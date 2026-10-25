# Five-module feedback implementation plan

**Goal:** Place accurate, readable feedback beside the affected field, form, action or read section in the five owned modules.

**Approved design:** Chat approval on 21 October 2026: shared feedback pattern across Dashboard/Timeline, Supervisor, Panel, Marks and Workflow/Approval Tracking, including academic semester/capacity/period dependencies. Preserve business rules, input, permission checks and stale-record safeguards. No unrelated page or navigation redesign.

**Architecture:** Extend existing AlertMessage with optional title, warning tone, supporting content and actions. Add shared field feedback and structured server-field extraction. Keep ErrorState for reads, with opt-in compact presentation for owned screens. Separate read and form/transition failure state where currently mixed; shared DecisionDialog retains its existing safe submission behavior.

**Execution:** Inline implementation with a read-only scope audit and final independent review. Existing codex/portal-consistency-and-toast working branch is reused; preserve all preexisting changes. No commits or live academic writes.

## Tasks

- [x] Shared feedback: first add failing renderer/field-extraction tests; extend AlertMessage, add FormFeedback/FieldError, opt-in compact ErrorState; verify tests. Keep default ErrorState layout compatible outside owned scope.
- [x] Academic semesters: first reproduce overlap save failure in mounted fixture; separate loading, save and lifecycle feedback, attach known server fields to accessible controls, focus invalid input, preserve values. Confirm reload does not dismiss invalid form and successful save plus failed refresh cannot be resubmitted as creation.
- [x] Marks: separate workspace/selection/form/transition errors in period and rubric configuration; put failures next to their actions, compact contextual preview failures, move operational help next to controls. Preserve recipient preview, closure and targeting gates.
- [x] Five-module audit and migration: inspect Supervisor/Panel/Workflow/Timeline and dependencies; migrate misleading or detached feedback to shared notices and compact section-read errors. Preserve already-correct decision/validation flows and teammate-owned screens. Record reviewed scope and findings.
- [x] Verification: test field extraction and renderer semantics; mounted desktop/mobile failures, correction/retry, selection failure, input retention and no duplicate writes; relevant existing tests, TypeScript, production build and scoped diff checks. Visually inspect representative screenshots.
- [x] Update PROJECT_REQUIREMENTS.md, ARCHITECTURE_AND_CODING_DESIGN.md and PROJECT_STATUS.md with final implementation and verified limits.

## Review rulings

- Use structured API field keys (including 400/409 academic validation), never guess target controls from human error text.
- No modal conversion of entire configuration flows: user approved feedback placement; preserve workflow structure.
- Shared visual changes are opt-in where defaults would affect teammate-owned modules.
- Review fixes: preserve a cancelled nomination's recovery action; show blocked Marks context failures outside the hidden form; distinguish committed rubric/semester/period changes from failed refreshes.
- Completed 22 October 2026. Verification and the pre-existing out-of-scope Registry assertion are recorded in PROJECT_STATUS.md.
