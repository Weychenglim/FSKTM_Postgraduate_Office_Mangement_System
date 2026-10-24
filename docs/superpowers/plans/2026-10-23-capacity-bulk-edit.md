# Capacity Bulk Editing Implementation Plan

**Goal:** Populate and revise capacity drafts in one reviewed batch, retaining individual exception edits.

**Architecture:** Add a strict Office-only batch PATCH endpoint with the existing semester/plan/entry/lecturer lock order and content fingerprint. Apply role-specific patches transactionally and audit changed entries. The editor owns cross-page selection; a dedicated modal owns configuration, preview and guarded submission. Backend publication rules remain authoritative.

**Tech stack:** Django REST Framework, React, TypeScript, shared portal modal/table/filter components.

**Approved design:** User-approved proposal in this chat: fill missing by default, explicit replacement, selection across pages, preview, draft-only changes, existing workload minimums and audit safeguards.

- [x] Add failing API tests for missing-only/replacement/partial patches, atomic validation, stale fingerprints, role eligibility and permissions.
- [x] Implement batch serializer, service and route; run the new and existing capacity suites.
- [x] Add pure preview tests, then build role-aware preview logic including required missing roles and workload warnings.
- [x] Add editor selection with explicit current-page/all-matching actions and a shared modal for configuration then preview.
- [x] Verify mounted bulk flows, cross-page selection, confirmation/cancel, failures and duplicate/busy protection at desktop/mobile widths.
- [x] Update project requirements, architecture and status; inspect screenshots; run TypeScript/build and relevant regressions.

No schema migration, published-policy mutation, dependency, availability change, spreadsheet import or automatic workload reduction.

Final review: resolved obsolete-role preview validation before completion. Backend, frontend, responsive browser and build checks pass; local backend reloaded and protected route health verified.
