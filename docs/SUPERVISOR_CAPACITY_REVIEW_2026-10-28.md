# Supervisor capacity reservations: follow-up review

Reviewed 28 October 2026 after the user requested inspection of the implementation and concise warning. This review covers the reservation/closure feature and affected role UI, not every unrelated change in the shared checkout.

## Findings reproduced and fixed

1. **Office replacement recovery incorrectly invited Student self-application.** A capacity-closed Office replacement retained the incumbent appointment, but the Student detail still said to choose another Supervisor in a new application. Recovery now routes Office-origin or replacement-linked requests to the Postgraduate Office, and does not offer a Student new-application button. Ordinary recovery also checks lifecycle eligibility, active appointment and other pending requests. A mounted regression failed before the fix and now passes with both a populated incumbent projection and an absent incumbent projection. The backend remains authoritative and unchanged.

2. **Request detail invented numerical availability for missing/restricted policy.** The shared detail showed `0 available` for a missing policy. It now keeps factual active/reserved counts while showing **Availability not configured**, or **Unavailable for new requests** for temporary unavailability/ineligibility. A new rendered-component regression failed before the fix and passes for all three states.

3. **Publication regression retained the superseded acceptance rule.** The broader backend gate found a test expecting a zero Supervisor limit to publish while a primary request awaited Coordinator approval. That stage now reserves a place. The test is split explicitly: submitted/unaccepted requests and ended/terminal work do not reserve; accepted primary requests block a zero limit, allow a limit of one, remain pending and create no active appointment. No production validation was weakened.

## Fresh verification

| Gate | Result |
|---|---|
| Backend integration | **350 passed in 101.628s**, across capacity resolution/publication/workspace, primary and supporting workflows, PostgreSQL submission/acceptance concurrency, reassessment/archive guards, Office/replacement/history/export, cancellation visibility, reconciliation, dossier and reports. Disposable database destroyed. |
| Focused frontend component checks | **19 passed**: 14 capacity checks, shared request-layout checks and workflow tracking. |
| Capacity browser checks | **28 passed**, 14 cases at each exact 1440px/390px width, including Office replacement recovery and missing-incumbent projection. |
| Shared request browser checks | **45 passed** at desktop/tablet/phone widths after the fixes, including all four roles, permission-owned actions, retries, stale response protection, evidence, terminal outcomes and current sidebar hosts. |
| Adjacent mounted suites | All four reservation/shared-request/workload-detail/workload-summary browser suites passed before the two narrow UI fixes; the affected reservation and shared-request suites were then rerun as above. |
| Adjacent component rerun | Coordinator lifecycle, Office replacement form, supervision detail and detail feedback checks: **10 passed**. Earlier broad-run action-label failures in three of those files no longer reproduce in the settled checkout. |
| TypeScript/build | TypeScript passed; production build passed in **21.63s**. Existing ExcelJS chunk-size advisory remains. |
| Django/migrations/whitespace | Django checks pass; migration dry-run reports no changes; scoped diff whitespace checks pass. No migration or live academic writes during this review. |
| Whole frontend suite | **371/373 passed** in the final broad run. The two remaining failures below are outside the capacity feature and were not hidden, disabled or weakened. |

The initial broad backend run was 348/349 passing, with the obsolete publication expectation above. The corrected final 350-test run includes the additional accepted-stage regression. Earlier frontend broad results were affected by current concurrent appointment-layout edits; the final totals above supersede those interim runs.

## Remaining whole-frontend failures

- `frontend/src/components/PanelSpecializedTools.test.tsx:31`: Panel details are compared with an exact legacy `typography.heading` class string. This is the previously documented baseline failure; capacity values/labels in that test pass. Panel runtime/typography code was not changed by this review.
- `frontend/src/components/SupervisionApplicationNavigation.test.tsx`: the approved-application action is absent for its partial DTO containing an approved application ID but no detailed appointment projection. The current shared supervisory-team route places that action inside the appointment-record branch. That route is part of concurrent appointment-layout work and is outside these capacity changes; this review did not alter it. This should be resolved in that UI work before claiming a fully green frontend suite.

## Independent review and limits

### Commit isolation verification

After the user authorized commit/push, a feature-only Git index was exported into a temporary checkout. It excludes unrelated Office authorization/admin, Marks, carryover and concurrent appointment-layout edits, including mixed-file hunks. That exact snapshot passed **350 backend tests in 76.790s**, **19 focused frontend checks**, **28 capacity browser scenarios**, TypeScript and a **12.43s production build**. The two approved-application navigation checks and seven adjacent Coordinator/Office/feedback checks passed in the isolated snapshot. Thus the shared-checkout navigation failure described above is not part of this scoped commit; the baseline Panel typography issue remains documented. No environment/credential files are staged, and credential-pattern/whitespace scans pass. These checks use disposable records and do not change academic data.

An independent reviewer traced primary acceptance, own-reservation conversion, supporting/reconciliation activation, per-request effective-policy closure, archive/stale/missing-policy preservation, replacement incumbents, release, publication projections and audit/notification privacy. They found no actionable backend defect. They separately reviewed the two narrow UI corrections and the publication-test split without additional findings. Their pass was static; executable evidence above was gathered by the primary agent.

The feature's scoped gates are green. This does not establish defect-free operation across the whole application: two unrelated frontend checks remain failing, and mounted isolated UI/API tests are not a live full-portal academic mutation journey. No secrets/environment files, commit, push or deployment changed. Existing unrelated checkout edits remain preserved.
