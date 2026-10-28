# Supervisor capacity reservations implementation

Spec: `docs/superpowers/specs/2026-10-27-supervisor-capacity-reservations.md`.

Completed 28 October 2026. Final evidence, the unrelated whole-frontend baseline failure and integration limits: `docs/SUPERVISOR_CAPACITY_RESERVATIONS_2026-10-28.md`. Migration 0019 was applied locally after a plan/SQL check confirmed no table/data changes.

Subsequent user authorization on 28 October: commit and push the completed capacity changes. The implementation-phase no-commit/no-push restriction below is superseded for this scoped release. The exact feature-only index snapshot was separately verified; unrelated shared-checkout edits remain excluded.

Execution authorized by the user's "roast it 5 more times strictly then go". Preserve the existing dirty checkout, especially prior accounts/Marks/Office UI work. No commit, push, deployment or live academic writes. Use isolated test databases and independent agents with disjoint backend/frontend ownership, then review the combined change.

## Task 1: Authoritative backend policy and outcomes

Owner: backend implementer. Read capacity resolver, reassessment and approval locking, workflow serializers, notification and reporting projections before editing. Own `backend/` only. First add a dedicated regression suite, run it and record expected assertion failures. Use the existing test helpers for published policies. Example invariant:

```python
first = client.post(f"/api/appointments/supervisor/applications/{a.pk}/accept/")
second = client.post(f"/api/appointments/supervisor/applications/{b.pk}/accept/")
assert first.status_code == 200
assert second.status_code == 409
```

Use actual registered URLs from the repository. Extend `_workloads`, batched counts and resolver exclusions with `exclude_supervisor_application_id`; only an accepted request excludes itself. Check acceptance under the existing lock order and recheck at final activation. Add `CANCELLED_CAPACITY_FULL` through a forward migration, closure service with idempotent audit/notifications, and call it after primary/supporting activation. Count active and reserved separately in every changed projection. Expose the exact acceptanceCapacity contract from the spec, including Student list DTOs. Update terminal history/status integrations throughout backend. Run targeted and adjacent policy/workflow/concurrency tests with distinct test database names. Do not edit frontend or root documents.

## Task 2: Capacity UI and Student recovery

Owner: frontend implementer. Own `frontend/` only. Follow the contract in the spec and reuse established portal components. First add behaviour tests that fail on the missing reservation/closure presentation. Add optional typed capacity fields and preserve them in API adapters. Show active/reserved/available in existing load presentation; scope acceptance warning/disable to the selected request's authoritative capacity. Keep Reject enabled and ordinary Student cancellation available. Display system closure as Capacity full in details/history/approval progress, with no false rejected reviewer. Candidate rows show reservations and honest availability. Verify real mounted components at 1440 and 390px, keyboard/dialog operation, no overflow; inspect screenshots. Run affected frontend tests plus TypeScript and production build. Do not edit backend or root documents.

## Task 3: Integration, review and documentation

Owner: primary agent and independent reviewer. Check Task 1 and Task 2 contracts match; ensure primary reservations cannot be stolen through supporting approvals and different semester limits are respected. Re-run meaningful affected tests, Django checks/migration drift and combined frontend gates. Review scoped diff for security, policy and UI regressions. Fix actionable findings and recheck. Update `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md` and `PROJECT_STATUS.md` with the superseding policy, implementation and exact test evidence/limitations.
