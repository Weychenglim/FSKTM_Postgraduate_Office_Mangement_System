# Supervisor Replacement Review — 19 October 2026

Status: SR-01, SR-02 and SR-03 resolved after the user authorized planning and implementing the fixes one by one. Earlier Office-only replacement rules and the prominent button are preserved. The initial review stopped after recording findings; the separate authorized corrections and permanent regressions are now applied.

## Confirmed issues

### SR-01 — Ambiguous lecturer IDs cause a server error (P2)

- Location: backend/appointments/supervisor_replacement.py, candidate lookup inside initiate_replacement.
- Reproduce: existing eligible lecturer records have staff IDs NEW-001 and new-001. Both are permitted by the case-sensitive database uniqueness rule/default Lecturer admin. Office selects either ID for a replacement.
- Actual: case-insensitive User.objects.get raises MultipleObjectsReturned; only DoesNotExist is caught, so the endpoint returns HTTP 500.
- Impact: the affected candidate cannot be selected successfully. No replacement/audit is created and the incumbent stays active because the transaction rolls back.
- Implemented correction: return an actionable HTTP 409 for ambiguous identifiers without rewriting historical IDs. Permanent regression tries both case variants and verifies unchanged applications, audit events, notifications and active incumbent.
- Evidence: C:/Users/User/AppData/Local/Temp/office_replacement_backend_skeptical.py and office_replacement_backend_skeptical.log. Original isolated run: 28 passed, 1 failed, with expected controlled error versus actual 500.

### SR-02 — Blocked form cannot refresh availability without discarding its draft (P2)

- Location: frontend/src/components/OfficeSupervisorReplacementForm.tsx, context load and blocked-state rendering.
- Reproduce: open the Office replacement form while intake is closed; select a candidate and enter a reason. Let intake open or grant the applicable extension elsewhere.
- Actual: the form retains its original blocked context, has no Check availability action, and keeps Send for review disabled. Returning through Back prompts to discard the draft before the form can reload.
- Impact: valid work cannot be resumed with fresh eligibility while retaining the draft on the same page.
- Implemented correction: contextual Check availability in the blocked notice reuses the authoritative loader and preserves candidate/reason. The action is absent from the normal open state.
- Evidence: actual mounted Management/RecordPage/form exercised against isolated mocked APIs. Original GET count stayed 1 after external opening; draft remained blocked.

### SR-03 — Failed or unreadable submission leaves stale context and misleading retry controls (P2)

- Location: frontend/src/components/OfficeSupervisorReplacementForm.tsx, submit catch and error rendering.
- Reproduce A: another request is created or capacity changes while this form is open. Submit and receive a 409.
- Actual A: context is never refreshed; Send for review stays enabled using the old availability and repeated clicks send more failing POSTs.
- Reproduce B: a POST commits successfully, but its response cannot be read. The form reports failure and still offers another submission with the original context.
- Impact: confusing retry behavior and avoidable repeat requests. Server-side duplicate protection remains effective; this is not evidence of duplicate appointments being created.
- Implemented correction: await an authoritative context read after unsuccessful/unreadable responses before permitting another POST. Failed reads remove stale actions and offer Retry, retaining the draft and original error. Loading protects navigation and repeated submission. Confirmed successful responses keep their single-completion path.
- Evidence: mounted mocked API fixture reproduced POST409 with unchanged GET count and POST count increasing 1 to 2; unreadable committed POST201 retained stale open context. Fixture: C:/Users/User/AppData/Local/Temp/fkstm-replacement-review-20261019/serve.cjs. Disposable fixture server/tab stopped after review.

SR-02 and SR-03 shared a context-refresh weakness. They were implemented sequentially using the same existing loader.

## Verification and coverage limits

- Fresh pre-fix baseline: all 235 frontend checks and 131 affected backend tests passed. These suites did not cover the three cases above.
- Independent additional backend probes checked Coordinator scope, invalid JSON shapes, profile/stage rollback on handover failure, retirement recovery and stale-request cancellation. Cancellation recovery already exists through the Office participant pending-work control; this was investigated and is not a confirmed missing-cancellation defect.
- Frontend review checked role-specific actions, exact appointment matching, Office provenance, Student declaration omission, Student cancellation guards, Back/Keep editing and successful creation followed by a failed team refresh. No further concrete issue was found in those checks.
- Backend tests/probes used disposable PostgreSQL test databases. UI probes used isolated mocked APIs, not live academic requests. No live records, approvals or appointments were changed.
- Initial temporary corrections were reverted to honor the user's request to record issues first. Current completion evidence comes from fresh runs after the subsequent authorization: all 235 frontend checks, 132 affected backend tests, seven mounted browser scenarios, TypeScript and the production build pass. The existing ExcelJS chunk-size advisory remains.
- New regressions were observed failing before their fixes. Mounted browser coverage includes draft-preserving recheck, competing pending request, unreadable committed response, changed capacity, failed reconciliation/Retry, navigation protection during reconciliation and single-completion success. Run from frontend with `node --test tests/officeSupervisorReplacement.browser.test.mjs`; it uses installed Chrome/Edge or CHROME_PATH, a temporary profile and mocked APIs. The normal browser tool failed initialization, so these checks used isolated headless Chrome.
- Evidence logs: system Temp replacement-sr01-red.log, replacement-sr01-green.log, replacement-sr03-red.log, replacement-fixes-frontend.log, replacement-fixes-backend.log, replacement-fixes-browser.log and replacement-fixes-build.log. No live academic requests or appointments were changed.

## Completed follow-up work

- [x] SR-01: controlled handling of ambiguous staff identifiers and regression.
- [x] SR-02: draft-preserving availability recheck and mounted regression.
- [x] SR-03: failed/uncertain submission reconciliation and mounted regression.
- [x] Add the reproduced cases to permanent automated coverage.
