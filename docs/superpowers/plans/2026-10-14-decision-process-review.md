# Shared decision process independent review — 2026-10-14

## Resolution and follow-up — 15 October 2026

Both findings below are resolved. The submission controller retains its permission/conflict latch across dialog closure and reopening of the same record; only successful explicit latest-record review or a different record clears it. Nullable closed selections retain the last record identity. Office Marks correction/reopening disables further changes after a committed save until a successful latest-record reload, including ordinary network failures. The independent reviewer re-inspected these deltas and reported no remaining concrete defect. Root verification passed 140 frontend scripts, the final affected tests, TypeScript and production build; 100 scoped backend tests also pass. Historical findings are retained below for traceability. Browser QA previewed Coordinator decisions and Office confirmation without submitting academic mutations; full live mutation flows are not claimed.

Scope: current implementation of Tasks 1–5 and the available Office/Capacity followups, against the shared-decision plan and three task reports. Existing unrelated dirty-branch changes were excluded. Read-only source review; no live decisions or database tests were run. Only this report was written.

## Findings

### [P2] Keep permission/conflict blocking until the record is actually refreshed

Location: `frontend/src/components/DecisionDialog.tsx:46-49` (reset effect), with dismissal at lines 51–54.

After a save returns 403 or 409, the dialog correctly disables confirmation. However, its Back button still permits closing (or discarding), and the effect clears `blocked` on every `isOpen` change. Reopening the same action from the unchanged host record therefore immediately enables another submission without using “Review latest record.” For example, a research request rejected with a 409 can be closed and reopened from the same row, retaining its stale expected status and capabilities. This defeats the explicit fresh-review requirement and affects all hosts using the shared controller. Preserve invalidation by record/action beyond dialog visibility, or invalidate/reload host capabilities before allowing the action to open again. Verify close/reopen following 403 and 409, including dirty reason discard.

### [P2] Disable Office Marks actions after a committed save whose refresh fails

Location: `frontend/src/components/SubmittedMarksActions.tsx:62-63` (clears the form before refresh), and lines 31–32 / 74–76 (eligibility and action buttons).

A successful correction/reopening immediately resets `mode`, then calls `onReload`. If that GET fails with an ordinary network/500 error, `completeDecision` correctly returns a saved-with-refresh-warning outcome, but the old record retains its `SUBMITTED` status, capabilities and version. The Office user can immediately select correction/reopening again against the pre-save scores and version, despite the warning requiring a reload before another action. `MarkEntryRecordDetail` only clears capabilities on 403/404, so it does not close this path. Backend version checks should reject the subsequent save, but the UI still presents an obsolete submission as actionable and encourages a redundant mutation. Keep a committed/stale latch until a successful refresh supplies the latest record, or locally invalidate Office capabilities on successful mutation. Verify both correction and reopening with save success followed by a failing GET.

## Review observations and limits

- Save exceptions propagate through the inspected migrated callbacks, and the shared helper separates save failure from refresh failure.
- In-flight duplicate submission is guarded by the shared synchronous submission latch. Success feedback can survive host unmount via the provider; this was treated as the accepted architecture, not reported as a defect.
- Authoritative Panel scope uses linked Student programme agreement and locked mutation rechecks, including lifecycle closure. No additional actionable scope/privacy issue was identified in the inspected changes.
- OfficeSupervisorWorkspace and CapacityReassessments followups are present and use the shared dialog; neither was reported as missing.
- Tests in the task reports were not independently rerun. The inspected DecisionDialog test renders static markup, so it does not itself exercise dismissal/reopening or async state transitions. The two findings above follow directly from the current state transitions and should receive behavioral regression coverage during fixes.
