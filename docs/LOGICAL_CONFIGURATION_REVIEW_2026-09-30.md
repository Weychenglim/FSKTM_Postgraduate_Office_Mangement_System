# Logical Configuration Review — 2026-09-30

Scope: follow-up inspection of the current working tree, including the uncommitted carryover-capacity feature. This is a bounded review, not a claim that every possible workflow is defect-free. Application code was not changed during this review.

## Original confirmed findings (all three fixed on 2026-10-01)

### 1. Spreadsheet exports interpret user text as formulas — high priority

- `backend/dashboard/reports.py:1020` appends raw record values to openpyxl cells. Supervisor report rows include the student's submitted research title (`reports.py:316`), which is accepted as an ordinary CharField (`appointments/serializers.py:960`).
- Isolated reproduction passed `=1+1` through the real sheet writer, saved and reopened the XLSX, and observed cell `data_type='f'`. The supplied title is therefore a formula rather than literal research text.
- `frontend/src/utils/csvExport.ts:13` also escapes CSV delimiters but does not protect formula-leading text. Both export paths need review as one fix.
- Recommended control: explicitly write untrusted XLSX values as text; neutralize spreadsheet-interpreted strings in CSV while preserving numeric values. Add save/reopen and CSV regression cases.

### 2. Reassigning a backup evaluator can return a retired task — high priority

- `backend/marks/services.py:716` searches backup tasks by profile/evaluator/period/role without restricting lifecycle status. The API reports HTTP 201 (`marks/views.py:1209`) even when this returns an old retired task.
- Isolated reproduction used a Published future-opening period: assign backup, pause tasks for deferral, resume before opening (existing lifecycle logic retires them), open the period, then assign the same backup again. Result: the same task ID was returned with `lifecycle_status='RETIRED'`.
- Recommended control: distinguish active assignments from historical tasks, preserve retired rows, create a new active task where appropriate, and avoid misleading success/audits for unusable assignments.

### 3. Period deadline entry and completion windows use different time zones — medium priority

- `frontend/src/components/MarkEntryPeriodConfig.tsx:276` parses timezone-free datetime-local values using the browser's local timezone. Its displayed times likewise omit an explicit timezone.
- `frontend/src/components/MarksCompletionWindows.tsx:8` explicitly parses Malaysia time.
- Reproduction with browser-equivalent Node timezone UTC and input `2026-10-01T12:00`: period conversion yields `12:00Z`; completion-window conversion yields `04:00Z`. An Office user on a non-Malaysia device can therefore configure a deadline eight hours away from the intended Malaysia noon.
- Recommended control: use a shared explicit Malaysia-time parser and formatter, label the period fields, and test differing device timezones.

## Existing unresolved items, not new findings

- The coordinator/lecturer separate-account identity and self-approval policy remains deferred. Separate logins allow the responsibilities to be separated, but do not establish whether two accounts represent the same person.
- Settings contact/password/preferences are still local-only (`frontend/src/components/SettingsView.tsx:68-108`); the password form displays success without an API call. This is a known wider-application production gap outside the five owned modules.
- Faculty policy/template confirmation and staging/browser acceptance remain separate release work.

## Evidence and limits

- Two isolated Django observation probes confirmed the export formula and retired-backup outcomes. Test database was created and destroyed; no production/development academic records were modified.
- Node timezone probe confirmed the eight-hour conversion difference.
- The preceding 573-test regression run and final focused checks still describe the prior feature verification; existing passing tests did not cover these newly identified scenarios.
- No fixes, commits or pushes were performed as part of this review. Reproduction scripts are local ignored scratch files.

## Resolution — 2026-10-01

All three findings are fixed. XLSX strings remain literal on every report sheet, and CSV formula-leading strings are neutralized while numeric values retain their type. Backup creation ignores retired history and creates a fresh active task, while existing non-retired assignments return 409 without another audit. Period configuration and completion-window controls share explicit Malaysia parsing, edit formatting and display.

Verification: 166 affected backend tests passed in 148.956 seconds, including five backup reassignment/duplicate tests and real workbook round-trip coverage. All 60 frontend scripts, lint, production build, artifact guards, Django system checks, migration-drift checks and whitespace checks passed. Four targeted frontend tests passed under each of UTC, Malaysia and New York timezones. Independent scoped review found no remaining actionable findings. No new migration, commit or push; existing carryover work remains preserved. Browser acceptance remains pending.
