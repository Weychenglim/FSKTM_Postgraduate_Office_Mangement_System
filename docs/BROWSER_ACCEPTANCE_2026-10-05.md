# Local browser acceptance — 2026-10-04 to 2026-10-05

The original five owned-module fixes are pushed to `main` as `30c63ba`.
This acceptance run covers those fixes, the shared authentication-cache follow-up
and bounded Timeline corrections discovered during browser verification.

## Environment and evidence

- Django/Python 3.12 and PostgreSQL 16, with a newly created synthetic acceptance
  database, separate from development academic records.
- React/Vite with Node.js 22.22.0, demo login and mock data disabled. Django and
  Vite listened only on loopback ports 8007 and 3007. No public deployment.
- All test accounts, proposals, marks, semesters and intentional stale requests
  were synthetic. SMTP credentials were unset for this test service.
- Private fixture helpers/credentials and logs are ignored. Local screenshots
  are in the ignored `frontend/acceptance-evidence/` directory; they are evidence
  on this workstation, not files shipped in the repository.

## Results

| Scenario | Observed result |
| --- | --- |
| Office Add Entry, Active semester | Creation succeeded; reload retained the entry and Office ADD_ENTRY audit on the selected Active semester. |
| Office Add Entry, Draft semester | Creation succeeded on the Draft semester; calendar, summary, table and audit agree after correction. |
| Rapid Active/Draft selection | Final Draft calendar contains its milestone and excludes the Active milestone. |
| Selected Timeline request failure | With only the isolated API stopped, selecting Draft hides the prior calendar/table/audits and shows Retry. Restoring the API and retrying restores Draft data. |
| Initial semester-list failure | Before correction, Retry after API restoration left three errors and no semester. After correction, the same flow reloads options and matching calendar without a page reload. |
| Lecturer semester filter | Options include current `Semester I 2099/2100` and historical `Semester II 2025/2026`; each selects tasks from the evaluation period despite retained historical profile labels. |
| Negative Marks input | Native minimum-zero form validation blocked a negative score before an API call. Backend validation-response behavior is covered separately by regression tests. |
| Valid Marks draft | Saving 30 + 50 succeeded; database assertions confirm DRAFT and total 80. |
| Historical Marks detail | Submitted total 80 remains visible and locked, with no editing controls; database assertions confirm unchanged SUBMITTED state. |
| Student replacement candidates | The active Panel lecturer is excluded; a valid alternative replacement proposal was submitted with its synthetic PDF. |
| Stale Coordinator final approval | The isolated pending request was deliberately prepared with a conflicting Panel lecturer. Approve returned the role-conflict error; request stayed pending and current primary appointment/profile remained unchanged, with no lifecycle approval event. |
| Settings across four roles | Office, Lecturer, Student and Coordinator phone and announcement preference changes survived reload. Persisted-data assertions confirmed all four values. Email remained Office-managed and unsupported notifications labelled unavailable. |
| Password negative validation | Empty new/confirmation fields show the minimum-length validation error, without changing credentials. Successful change/sign-out/re-login remains a human check. |
| Governed appointment admin | Existing primary appointment detail is viewable, with zero editable fields, Save controls or Delete links. Other governed appointment/configuration permissions are covered by HTTP regressions. |
| Timeline header and inline admin | Detail is viewable with zero editable fields, Save controls or Delete links after correction. HTTP regressions also deny audit forgery/add/delete and bulk deletion. |

Key local screenshots: `draft-timeline.jpg`, `timeline-failed-selection.jpg`,
`initial-semester-retry-before-fix.jpg`, `initial-semester-retry-after-fix.jpg`,
`historical-marks.jpg`, `negative-score-validation.jpg`, `valid-marks-draft.jpg`,
`locked-historical-marks.jpg`, `student-candidate-exclusion.jpg`,
`student-replacement-submitted.jpg`, `coordinator-role-conflict.jpg`, the four
role-specific Settings screenshots, `password-validation.jpg`,
`appointment-admin-read-only.jpg` and `timeline-admin-read-only.jpg`.

## Verification

- Earlier full owned-module backend run: **623 tests passed** in 519.465 seconds.
- Follow-up Accounts suite: **94 tests passed** in 397.647 seconds, including
  independent Django processes sharing PostgreSQL throttle budgets and returning
  HTTP 429 with positive Retry-After. This proves sequential worker sharing;
  DRF non-atomic history updates still permit simultaneous-request overrun.
- Follow-up Dashboard plus Timeline API suite: **87 tests passed** in 124.899
  seconds. The two new admin tests failed before the permission correction.
- All **64 frontend test scripts** passed. After the final Retry correction,
  affected rendering/integration scripts, TypeScript lint, production build and
  both production artifact guards passed again. npm security audit reported zero
  vulnerabilities.
- Django checks, migration-drift checks and whitespace checks passed. No model
  migration or dependency installation is required. Final read-only review found
  no remaining important findings within the change.

## Remaining release work

No hosting provider/domain/server/production database has been supplied or
provisioned. Follow `deploy/RELEASE_RUNBOOK.md` for cache-table setup, real proxy
client-IP validation, HTTPS/cookies, SMTP delivery, backup/restore and faculty
acceptance on the intended host. Local loopback testing does not establish these.

The browser tool requires a human handoff for credential changes: “Ask the user
to take over before any new credential is entered.” Consequently successful
browser password change, sign-out and sign-in with the new password are not
claimed. Backend password validation, revocation and Settings regressions passed.
Faculty rules and coordinator identity policy remain deferred.
