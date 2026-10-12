# Partly-Done Modules Completion Plan

Scope: finish the use cases in Xiang's modules that are partly built (UC01, UC02, UC04, UC05, UC06, UC21, UC23, UC30, UC33), plus one integration bug found after merging `main`. Use cases that are not started at all (UC03, UC22, UC24–UC27, UC28–UC29) are out of scope and get their own plan afterwards.

## Phase Status

| Phase | Scope | Size | Status | Commit(s) |
|---|---|---|---|---|
| 1 | Registry status changes go through participant lifecycle (bug) | S | Done | `9534304` |
| 2 | Sign-in safety: session-expired message, forced password change, office-sent access links (UC01, UC02) | M | Done | `b909876` |
| 3 | Student import: server-side CSV + XLSX with real import history (UC04) | L | Done | `639afe6` |
| 4 | Registry search and role-scoped read access (UC05) | M | Done | `9547ca4` |
| 5 | Letter templates: archive, placeholder registry and validation (UC21) | M | Done | `16fe84c` |
| 6 | Saved letter requests: reference numbers, history, Word export, notification (UC23) | L | Not started | |
| 7 | Announcement scheduling, expiry, and registry targeting (UC30) | M | Not started | |
| 8 | Notifications: bell dropdown, preference-driven email, deadline reminders, weekly summary (UC33) | L | Not started | |
| 9 | Student "My Records" page and documentation wrap-up (UC06) | M | Not started | |

Phases are ordered by dependency. Phase 6 needs Phase 5; Phase 9 needs Phase 6. Everything else can move if priorities change, but do one phase per session.

## How To Run A Phase

1. Read this file, then the newest section of `PROJECT_STATUS.md`.
2. Take the first phase whose status is `Not started`. Do only that phase.
3. Read every file under the phase's "Start here" before writing code. Items marked **Verify** are assumptions to confirm in the code first; if one turns out wrong, adapt and note it in the phase's commit message.
4. Build it, add the listed tests, and run the full verification below.
5. Commit on `Xiang` (one or more commits), then update this file: set the phase status to `Done` and fill in the commit hash(es). Add a short dated section to the top of `PROJECT_STATUS.md` in the same style as the existing entries.
6. Do not push and do not start the next phase. Report what was done and anything left open.

If a phase needs a change inside a teammate-owned file, stop and ask before touching it.

## Ground Rules

**Repository.** The git repo is `FSKTM_Postgraduate_Office_Mangement_System/` inside the `Final Year Project` folder. The parent folder is not the repo (the home directory also has a stray empty repo, so always run git inside the project folder). Work on branch `Xiang`.

**Ownership.**
- Xiang owns: `backend/accounts/` auth, settings and registry code (`views.py`, `serializers.py`, `throttles.py`, `registry_*.py`, `NotificationPreference`), `backend/letters/`, `backend/announcements/`, and the matching frontend screens and services (Registry, Settings, Letters, Announcements, Notifications, login/reset screens).
- The teammate owns: `backend/appointments/`, `backend/marks/`, `backend/dashboard/`, `backend/academics/`, `backend/accounts/participant_*.py`, `authentication.py`, `session_tokens.py`, `eligibility.py`, `authorization.py`, and their frontend screens and services. Calling their public functions and reading their models is fine; editing their files is not.
- Shared files (`config/settings.py`, `config/urls.py`, `accounts/models.py`, `App.tsx`, `apiClient.ts`, `permissions.ts`, `routes.ts`): additive changes only, keep their code intact.
- Settings exception (2026-10-08): the team adopted the teammate's Settings. `settings_view` and `settings_password_view` in `accounts/views.py`, `SettingsView.tsx`, `settingsApi.ts` and `User.announcement_alerts` are theirs, so agree any change with the teammate first.

**Code style.**
- Match the surrounding code. Do not add explanatory comments beyond the density already in the file.
- No mention of AI tools anywhere: code, comments, docs, commit messages. Commit messages are plain conventional commits (`feat:`, `fix:`, `test:`, `docs:`) with no `Co-Authored-By` trailer.

**Backend conventions.**
- DRF function views with `@api_view` / `@permission_classes`, camelCase JSON keys (see `User.to_public_dict()` and `registry_views.to_record()`), role checks through small helpers like `_require_office_admin`.
- Login, refresh and logout reject non-JSON bodies with 415, so tests that call them must use `format="json"`.
- Sessions: 15-minute access token in memory, 7-day rotating HttpOnly refresh cookie on `/api/auth/`, `CHECK_REVOKE_TOKEN=True` (a password change invalidates every existing token). See `accounts/views.py` and `accounts/session_tokens.py`.
- New migrations only in Xiang-owned apps. After adding one, `makemigrations --check --dry-run` must report no changes.
- Email goes through `send_mail(..., fail_silently=True)` like `accounts/views._send_password_reset_email`; the console backend is used when SMTP is not configured.

**Frontend conventions.**
- All HTTP goes through `request` / `requestBlob` / `requestMultipart` in `frontend/src/services/apiClient.ts`. Do not call `fetch` directly and do not store tokens in `localStorage` (a teammate test forbids it).
- New live features must not fall back to mock data. Existing Xiang services only fall back on a genuine transport failure (`isTransportFailure`).
- Do not reintroduce `VITE_USE_SUPERVISOR_BACKEND`, `VITE_USE_PANEL_BACKEND` or `VITE_USE_TIMELINE_BACKEND` (a teammate test forbids them). Read env values as `import.meta.env?.X` so `tsx` tests can import the module.
- Generated HTML (letters) must not contain inline `<script>`; the production CSP blocks it (see `utils/letterDocument.ts`).
- Frontend tests are standalone `*.test.ts` / `*.test.tsx` scripts using `node:assert/strict`, run with `npx tsx <file>` from `frontend/`.

**Environment.** Backend virtualenv is `backend/.venv` (Python 3.13, Django 5.2, DRF 3.17). Postgres 16 on port 5432, database `fsktm_pg_office`, settings from `backend/.env`. Node is 22.16 locally while `package.json` asks for 22.22+; npm warns, everything still runs. The Trading Log project often holds port 3000, so Vite may start this frontend on 3001.

## Verification (Every Phase)

From `backend/`:
```
.venv/Scripts/python.exe manage.py check
.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
.venv/Scripts/python.exe manage.py test accounts academics appointments dashboard marks letters announcements --parallel 2 --noinput
```
Use two workers. Since the 2026-10-08 merge, `--parallel 4` makes the teammate's PostgreSQL concurrency tests lose their connections on this machine.
From `frontend/`:
```
npm run lint
npm run build
npm run test:production-security
for f in $(find src -name "*.test.ts" -o -name "*.test.tsx"); do npx tsx "$f" || echo "FAIL $f"; done
```
From the repo root: `git diff --check`.

All of it must pass, including the teammate's tests. If a phase touches an HTTP flow, also run a live smoke check against `runserver` using temporary accounts (`smoke.*@example.test`) and delete them afterwards; never use or change real or demo accounts. If a phase adds migrations, apply them to the dev database only after taking a `pg_dump -Fc` backup into `Final Year Project/db-backups/`.

Smoke-check cautions:
- **Email.** `backend/.env` holds real Gmail SMTP credentials. Start the smoke server with `EMAIL_HOST_PASSWORD=""` in its environment so Django falls back to the console backend (`load_dotenv` does not override variables that are already set). Otherwise every activation, reset, or notification email really goes out.
- **Audits.** `ParticipantLifecycleAudit` rows are protected from deletion. Never trigger a successful lifecycle transition on the dev database, or the temporary accounts can no longer be deleted; cover that path with tests instead.
- **Tokens.** Before deleting temporary users, delete their `OutstandingToken` rows too.
- **Shutdown.** Stop the server by the PID listening on its port.

## Design Decisions Already Made

These keep the current behaviour and differ from the use-case document wording. Do not undo them; they are listed so the report can be updated.

- **D1** New accounts get an activation link instead of an emailed temporary password (UC02, UC03, UC04). `must_change_password` is still honoured when an administrator sets it (Phase 2).
- **D2** Login gives the same generic 401 for disabled accounts, and password reset gives the same response for unregistered emails, to avoid account enumeration (UC01, UC02).
- **D3** Students can edit their phone number but not their email, because email is the login identifier (UC06).
- **D4** Student status changes always require a reason, because the teammate's lifecycle service requires one (UC05 calls it an optional note).
- **D5** Saved letters store a filled snapshot plus a server-issued reference number. PDF comes from the browser print dialog rendered from that snapshot; Word comes from a server-generated `.docx` (Phase 6).
- **D6** There is no background worker. Scheduled work (announcement release, reminders, summaries) runs through idempotent management commands that the office schedules with Windows Task Scheduler or cron, and announcement release also happens lazily on read (Phases 7 and 8).

---

## Phase 1 — Registry Status Changes Go Through Participant Lifecycle

**Why.** `PATCH /api/registry/students/<matric>/` sets `student.status` directly when `academicStatus` is sent. The teammate's `transition_student()` in `backend/accounts/participant_lifecycle.py` is the real status transition: it enforces allowed transitions, requires a reason, pauses or retires Marks tasks, ends appointments, cancels pending workflow items, and writes an audit record. Withdrawing a student from the Registry today skips all of that and leaves active appointments and Marks tasks behind.

**Start here.** `backend/accounts/registry_views.py` (`student_record_detail_view`), `backend/accounts/participant_lifecycle.py` (`transition_student`, `ParticipantLifecycleConflict`, `student_blockers`), `backend/accounts/participant_views.py` (how it maps errors to HTTP), `backend/accounts/test_registry.py`, `frontend/src/components/StudentRegistry.tsx` (status edit UI), `frontend/src/services/studentsApi.ts`.

**Tasks.**
1. In the registry PATCH, when `academicStatus` differs from the current status, call `transition_student(matric_no=..., actor=request.user, target_status=<value upper-cased as the function expects>, reason=data["statusReason"])` instead of assigning the field. **Verify** the exact `target_status` format the function accepts.
2. Require `statusReason` whenever `academicStatus` changes (400 with a field error if missing). Map `ValueError` to 400 and `ParticipantLifecycleConflict` to 409 including its blockers, the same way `participant_views.py` does.
3. Keep the other editable fields (programme, intake, phone, account status) in the same request, but apply the status transition first and inside the same transaction so a refused transition changes nothing.
4. Frontend: the status edit in Student Registry asks for a reason, shows 409 blockers in readable form, and refreshes the record afterwards.

**Tests** (`backend/accounts/test_registry.py`):
- Status change without a reason is refused and leaves the record unchanged.
- A valid change is applied through the lifecycle, and its audit row exists. **Verify** the audit model name.
- A blocked change (for example Graduated with pending work) returns 409 and changes nothing, including the other fields in the same request.
- Withdrawn and Graduated are terminal, so a transition out of them returns 409.

**Done when** no code path in Xiang's files writes `Student.status` directly (grep for it), all tests pass, and the Registry UI shows a reason prompt.

---

## Phase 2 — Sign-In Safety (UC01, UC02)

**Current state.** Session expiry sends the user back to the login screen with no message. `User.must_change_password` exists but nothing checks it. Office staff cannot send a student a new access link.

**Start here.** `frontend/src/App.tsx` (`SESSION_EXPIRED_EVENT` listener, auth views), `frontend/src/components/LoginCard.tsx`, `frontend/src/components/SettingsView.tsx` (password form), `frontend/src/services/authApi.ts`, `backend/accounts/views.py`, `backend/accounts/models.py` (`to_public_dict`), `backend/config/settings.py` (`REST_FRAMEWORK`), `backend/accounts/registry_views.py` (`send_activation_email`, the `activated` flag in `to_record`).

**Tasks.**
1. **Session-expired message (UC01 exception 3).** When `SESSION_EXPIRED_EVENT` fires, show "Your session has expired. Please sign in again." on the login card. Don't show it after a normal logout.
2. **Forced password change (UC02 alternative flow 1).**
   - Add `mustChangePassword` to `User.to_public_dict()`. This is an additive key.
   - Enforce the flag in the backend with an authentication class that subclasses `JWTAuthentication` and is registered as the default. When the authenticated user has the flag set, it refuses every endpoint except `auth/me/` (GET), `auth/me/change-password/`, `auth/refresh/` and `auth/logout/`, returning 403 with a stable code (`password_change_required`). Only `refresh_view` and `logout_view` override `authentication_classes` today; **verify** that is still true.
   - Frontend: after login or session restore, if `mustChangePassword` is set, show a full-screen change-password step (reuse the Settings password form) before the app shell, then continue to the dashboard. If an API call returns `password_change_required`, go to the same step.
3. **Office-sent access link (UC02 alternative flow 2, using D1).**
   - Add `POST /api/registry/students/<matric>/send-access-link/`, office only.
   - If the account is not activated yet, it resends the activation email. If it is activated, it sends the normal password-reset email.
   - Return whether the email was sent. Throttle it per target account, following the style in `throttles.py`.
   - Add a Registry row action for it.

**Tests.** Backend:
- A flagged user is refused on a normal endpoint and allowed on the allowlisted endpoints.
- After a password change the flag clears and access returns.
- The access-link endpoint is office-only, picks the right email for activated and unactivated accounts, and is throttled.

Frontend script test:
- The forced-change step is shown when `mustChangePassword` is true.
- The session-expired message appears only after an expiry event.

**Done when** all verification passes and a live smoke check with a temporary flagged account shows the forced step, then normal access afterwards.

---

## Phase 3 — Student Import: Server-Side CSV + XLSX With Real History (UC04)

**Current state.** The browser parses CSV only (`frontend/src/utils/csvImport.ts`) and posts one row at a time. XLSX is not accepted. The "Recent Imports" panel in `StudentRegistry.tsx` is hardcoded ("View All" only shows a toast), and the upload box starts pre-filled with a fake file `student_registry_intake_sem1_2025.csv`. The approved programme list lives in `frontend/src/constants/programmes.ts` and is copied by hand as `APPROVED_PROGRAMMES` in `backend/accounts/registry_views.py`, with nothing checking that the two match.

**Start here.** `frontend/src/utils/csvImport.ts` and `csvImport.test.ts` (headers, validation rules, template), `frontend/src/components/StudentRegistry.tsx` (import drawer, preview, Recent Imports panel), `backend/accounts/registry_views.py` (`_create_student`, `send_activation_email`, serializer validation), `backend/requirements.txt` (`openpyxl` is already installed).

**Tasks.**
1. **Canonical programme list in the backend.**
   - Move `APPROVED_PROGRAMMES` out of `registry_views.py` into its own module, for example `accounts/programmes.py`, so import and announcements can reuse it.
   - Registry registration and import validate against it.
   - Add a test that reads the TypeScript file and asserts the two lists are identical, so they cannot drift.
2. **Import endpoint** `POST /api/registry/students/import/` (office only, multipart, one file):
   - Accept `.csv` and `.xlsx`. Anything else gets "Only XLSX or CSV files allowed". Cap the size, following `announcements/upload_security.py`.
   - Validate the header row against the template headers. Validate each row with the same rules as `csvImport.ts`: required fields, approved programme, email format, duplicates within the file, and existing matric or email in the database.
   - `dryRun=true` returns per-row results without writing anything.
   - Without `dryRun`, create each valid row in its own transaction by reusing `_create_student`. Skip duplicates and invalid rows, send activation emails, and return a summary: created, skipped duplicates, failed rows with reasons, and invitations not sent.
3. **Import history.**
   - Add a `RegistryImportBatch` model: file name, uploaded by, counts, a JSON list of row problems, and a timestamp.
   - Record one batch per non-dry-run import. Add `GET /api/registry/imports/?limit=5`.
4. **Frontend.**
   - The import drawer accepts `.csv,.xlsx` and uses `dryRun` for the preview, so XLSX gets the same preview as CSV.
   - Remove the pre-filled fake file and the hardcoded Recent Imports items. The panel lists real batches, and "View All" shows the full list.
   - Keep the CSV template download, generated from the same header list. Adding an XLSX template is optional.
   - Retire the client-side parsing in `csvImport.ts` only if nothing else uses it, and update `csvImport.test.ts` to match.

**Tests.**
- CSV and XLSX both import.
- A wrong extension or wrong headers is refused.
- Dry run writes nothing.
- Duplicates are skipped and reported.
- An invalid programme is reported.
- Each row is independent: one bad row does not block the others.
- A batch is recorded, and the endpoint is office-only.
- The programme-list parity test passes.

**Done when** a live smoke import of a small CSV and a small XLSX file (temporary data, removed afterwards) shows correct results and a real Recent Imports entry.

---

## Phase 4 — Registry Search and Role-Scoped Read Access (UC05)

**Current state.** The frontend filters by programme, semester and academic status (`selectedProgramme`, `selectedSemester`, `selectedAcademicStatus` in `StudentRegistry.tsx`). The API filters only by `search` and `status`. There is no supervisor filter or supervisor column. The API is office-only, but `frontend/src/auth/permissions.ts` gives Programme Coordinators every module, so a coordinator who opens Registry gets an error.

The screen also still shows invented content:
- All five summary cards are fabricated. They start from `totalStudentsOverall = 1248 + (students.length - 6)`, and `inactiveStudentsMetric` is a flat `145`. The "Intake Semester 1 2025" subtext is hardcoded too.
- The student panel's "Secured Verification Milestones" box includes "Credentials Review Verified by Wey Cheng" (a hardcoded name) and "Graduation Thesis Submission Logged". It also labels the intake date as the account-creation date.

**Start here.** `backend/accounts/registry_views.py` (`student_records_view`, `to_record`), `backend/appointments/models.py` (`SupervisorAppointment`: `student`, `supervisor`, `status`, read only), `backend/accounts/models.py` (`Coordinator.programme_managed`, the `Lecturer` profile), `frontend/src/auth/permissions.ts`, `frontend/src/components/StudentRegistry.tsx`.

**Tasks.**
1. **Supervisor data.**
   - Add `supervisorName` and `supervisorStaffNo` to each record, taken from the student's active primary `SupervisorAppointment`. **Verify** what the `student` foreign key points to, and how primary and co-supervisor appointments are told apart.
   - Add a `supervisor` query filter that matches the staff number or name. Avoid N+1 queries by prefetching.
2. **Read-only access for other roles.**
   - Programme Coordinators see students whose programme matches their managed programme.
   - Lecturers see their own active supervisees.
   - Both can only read: every write endpoint stays office-only.
   - **Verify** how the teammate scopes coordinators in `appointments` and reuse that rule rather than inventing a new one.
3. **Frontend.**
   - Add a supervisor filter and column.
   - Coordinators and lecturers get the Registry without write actions: no register, import, verify, status or account changes.
   - The Reset button clears every filter, including supervisor.
   - Show "No matching students found" when there are no results.
4. **Remove invented content.**
   - Compute the summary cards from real records: total, active, deferred, graduated or withdrawn, and new this intake. Use either the loaded list or a small summary endpoint; the list is not paginated today, so **verify** that before choosing.
   - Replace the milestones box with facts the record actually has: whether the account is activated, its account status, and the last login. Otherwise remove the box.

**Tests.**
- The supervisor field and filter are correct, including a student with no supervisor.
- Coordinator and lecturer scoping is right, and neither can see students outside their scope.
- Every write returns 403 for those roles.
- There are no extra queries per row: `assertNumQueries` on a list of several students.
- A frontend script test for the summary-count helper, and a source check that none of the old fabricated constants remain.

**Done when** a live smoke check with temporary office, coordinator and lecturer accounts shows the right rows and actions for each.

---

## Phase 5 — Letter Templates: Archive and Placeholder Validation (UC21)

**Current state.**
- Templates have `Active` and `Draft` statuses only, and there is no archive.
- Placeholders are free text. The backend never checks them, so a typo such as `{{STUDNET_NAME}}` is saved and then printed literally.
- The placeholders the frontend fills are listed in `utils/letterDocument.ts`, and the editor has a preview.

**Start here.** `backend/letters/models.py`, `serializers.py`, `views.py`, `urls.py`, `backend/letters/tests*.py`, `frontend/src/components/LetterTemplateManagement.tsx`, `frontend/src/utils/letterDocument.ts`, `frontend/src/components/StudentLetterGeneration.tsx`, `frontend/src/services/lettersApi.ts`.

**Tasks.**
1. **Archived status.**
   - Add `ARCHIVED` (with a migration). Students only ever see `Active`.
   - Add archive and restore actions for office staff. Archived templates keep their data.
2. **Placeholder registry.**
   - Add `backend/letters/placeholders.py` mapping each supported placeholder to a label and the student field it is filled from.
   - Today the frontend fills: `STUDENT_NAME`, `STUDENT_ID`, `PROGRAMME_NAME`, `CURRENT_STATUS`, `SUPERVISOR_NAME`, `REFERENCE_NUMBER`, `CURRENT_DATE`, `PASSPORT_NUMBER`, `COUNTRY`, `PROGRAMME_MODE`, `FIELD_OF_RESEARCH`, `MODE_OF_STUDY`, `INITIAL_SEMESTER`, `CURRENT_SEMESTER`, `MAX_SEMESTER`, `EXPECTED_COMPLETION`. **Verify** whether `{{TAG}}` in the editor is only help text.
   - Expose the registry at `GET /api/letter-templates/placeholders/`.
3. **Validation.** Create and update reject content that contains unknown placeholders, with 400 `{"unknownPlaceholders": [...]}`. Malformed braces such as `{{NAME}` also fail validation.
4. **Frontend.**
   - The editor lists the allowed placeholders with their labels from the endpoint, and clicking one inserts it.
   - The editor shows the backend's unknown-placeholder error next to the content field.
   - The preview marks unfilled placeholders.
5. **Parity test.** A frontend script test asserts that `letterDocument.ts` fills exactly the placeholders the backend registry lists, reading the Python file as text.

**Tests.**
- Archive and restore work, and students never see archived or draft templates.
- An unknown placeholder is rejected on both create and update, and a valid template passes.
- The placeholders endpoint requires authentication.
- The parity script passes.

**Done when** all verification passes and the editor refuses a misspelled placeholder with a clear message.

---

## Phase 6 — Saved Letter Requests (UC23)

**Depends on Phase 5.**

**Current state.**
- `StudentLetterGeneration.tsx` fills the template in the browser and opens the print dialog.
- The reference number comes from `generateReferenceNumber()` in the browser. It is not unique and not recorded anywhere.
- Nothing is saved or linked to the student, there is no Word export, no notification, and no warning about missing student details.

**Start here.** `frontend/src/components/StudentLetterGeneration.tsx`, `frontend/src/utils/letterDocument.ts`, `frontend/src/services/lettersApi.ts`, `backend/letters/*`, `backend/accounts/views.my_letter_details_view` (where student data comes from), `backend/announcements/models.py` (`Notification` fields `target_module`, `record_type`, `record_id`, `event_key`), `backend/config/urls.py`.

**Tasks.**
1. **Models** (letters app):
   - `LetterReferenceCounter`: prefix, year and last number, unique on (prefix, year). Numbers are taken under `select_for_update` so concurrent requests never share one.
   - `GeneratedLetter`:
     - who it is for: student, and template (use `SET_NULL`, and also store the template name and letter type as snapshots)
     - the letter itself: unique `reference_number` formatted `<prefix>/<year>/<NNNN>`, for example `UMF/PG/2026/0001`, and the filled content snapshot
     - a JSON snapshot of the student data used
     - requested by, created at, and status (`Issued` or `Revoked`)
2. **Endpoints**, mounted at `/api/letters/` in `config/urls.py` (additive):
   - `POST /api/letters/requests/` (students only; body `templateId`):
     - The template must be Active.
     - Fill it from the same data as `my_letter_details_view`.
     - If any placeholder used by this template resolves to blank, return 400 `{"missingFields": [labels]}` and create nothing (UC23 exception 1).
     - Otherwise save the letter, create an in-app notification for the student (`target_module` letters, `record_id` the letter id, idempotent `event_key`), and return the saved letter.
   - `GET /api/letters/requests/`: students see their own letters, and office staff see all, with student and date filters.
   - `GET /api/letters/requests/<id>/`: the owner or office staff.
   - `GET /api/letters/requests/<id>/docx/`: generated with `python-docx`. Add it to `requirements.txt` with a version range like the other packages.
   - `POST /api/letters/requests/<id>/resend-notification/`: office only (UC23 alternative flow).
3. **Frontend.**
   - Generation calls the API first, then prints from the returned snapshot using the server's reference number. Drop `generateReferenceNumber()` if nothing else uses it.
   - Show the missing-fields warning with "please contact the postgraduate office".
   - Add a "My Letters" list where students can print again or download the Word file.
   - Office staff get an issued-letters list with a resend action.
   - Keep the no-inline-script rule for the print window.

**Tests.**
- Reference numbers are sequential and unique, including concurrent creation (follow the teammate's `TransactionTestCase` concurrency tests).
- Missing fields block creation and list the labels.
- Draft and archived templates are refused.
- Students can only see their own letters.
- The Word download returns a valid `.docx` containing the reference number.
- The notification is created once.
- Resend is office-only.

**Done when** a live smoke run (a temporary student with a complete registry row) generates a letter, gets a reference number, sees it in My Letters, downloads the Word file, and receives the notification.

---

## Phase 7 — Announcement Scheduling, Expiry, and Registry Targeting (UC30)

**Current state.**
- `Announcement.Status` has `Scheduled` and `Expired`, but the model has no start or expiry date, so nothing ever publishes or expires. They are only labels.
- Audience is chosen by role only (`Audience` choices, `_recipients_for` in `announcements/views.py`). The panel feedback asked for registry-targeted announcements, meaning by programme and intake.

**Start here.** `backend/announcements/models.py`, `backend/announcements/views.py` (`_recipients_for`, `_fan_out`, `_retract`, `_publishable`, list and detail views), `backend/announcements/test_security.py` (existing rules that must keep passing), `frontend/src/components/AnnouncementManagement.tsx`, `frontend/src/services/announcementsApi.ts`, `frontend/src/constants/programmes.ts`.

**Tasks.**
1. **Model and validation.**
   - Add nullable `publish_at` and `expires_at` (with a migration).
   - If `publish_at` is not before `expires_at`, return 400 (UC30 exception 2).
   - "Publish now" means `publish_at` is empty or in the past. A future `publish_at` means `Scheduled`, and nothing is delivered yet.
2. **Release and expiry.**
   - Add `release_due_announcements(now=None)`. It publishes and fans out scheduled announcements that are now due, and marks announcements past `expires_at` as `Expired`. It is idempotent through the existing `event_key` delivery.
   - Expiry does not withdraw notifications. This matches the existing rule from commit `f5777d2`.
   - Call it at the start of the announcement and notification list endpoints.
   - Add a management command `release_announcements` for Task Scheduler (D6).
3. **Registry targeting.**
   - Add optional `target_programmes` and `target_intakes` JSON lists. When the audience includes students, only students who match reach the recipient list.
   - Validate programmes against the backend programme list from Phase 3. If Phase 3 is not done yet, add that list here first.
   - Add `GET /api/announcements/recipient-count/` so the composer can preview who will receive it.
4. **Frontend.**
   - The composer gets start and expiry fields, programme and intake selectors, and a recipient-count preview.
   - The list shows Scheduled and Expired states.

**Tests.**
- A scheduled announcement is neither visible nor delivered before its time, is delivered once when released, and is not delivered twice.
- An expired announcement leaves the active list but keeps its notifications.
- An invalid date order is refused.
- Programme and intake targeting reaches exactly the matching students, and role-only audiences behave as before.
- All existing `test_security.py` tests still pass.

**Done when** all verification passes and a live smoke check with a short future `publish_at` shows release on the next list call.

---

## Phase 8 — Notifications: Bell Dropdown, Preferences, Reminders, Weekly Summary (UC33)

**Current state.**
- The bell shows an unread badge and opens the full Notifications page instead of a dropdown.
- Clicking a notification opens its related record; this already works in `NotificationsAnnouncements.tsx`.
- The teammate's appointment workflows already create notifications (`backend/appointments/notifications.py`).
- Nothing creates deadline or Marks reminders.
- Since the 2026-10-08 merge, Settings is the teammate's version (`GET/PATCH /api/auth/settings/`). It stores only `User.announcement_alerts`, which already stops non-urgent announcement notifications. Email, deadline reminders and weekly summary are reported as unavailable `capabilities`. The older `NotificationPreference` table is no longer used by the frontend.

**Start here.** `frontend/src/components/TopHeader.tsx`, `frontend/src/context/NotificationsContext.tsx`, `frontend/src/components/NotificationsAnnouncements.tsx` (record navigation), `backend/accounts/views.py` (`settings_view`, `_settings_payload`; teammate-written, see Ownership), `backend/announcements/views.py` (`_fan_out`), `backend/dashboard/models.py` (`SemesterTimeline`, `SemesterTimelineEntry.deadline_start/deadline_end/target_roles`, read only), `backend/marks/models.py` (`EvaluationPeriod.closes_at` and evaluation tasks, read only), `backend/README.md`.

**Tasks.**
1. **Bell dropdown.**
   - Clicking the bell opens a dropdown with the latest five notifications, "Mark all as read", and "View all".
   - Selecting an item marks it read and opens the related record.
   - Move the navigation logic out of `NotificationsAnnouncements.tsx` into a shared helper so both use it.
   - Show "No new notifications" when the list is empty.
2. **Email that respects preferences.**
   - First agree with the teammate where the new preferences are stored. Either add fields next to `User.announcement_alerts`, or reuse or remove `NotificationPreference`. Then expose them through `/api/auth/settings/`, turning each `capabilities` flag on only once it works.
   - Add one helper (in the announcements app) that emails a list of users, but only those whose preferences allow that kind of message. Kinds: announcement (needs `email_notifications` and `announcement_alerts`), deadline (needs `email_notifications` and `deadline_reminders`), summary (needs `weekly_summary`).
   - Use `send_mass_mail` with `fail_silently=True`.
   - Announcement fan-out uses the helper.
3. **Deadline reminders.**
   - Add a management command `send_deadline_reminders --days N`. It creates in-app reminders, and emails where preferences allow, for:
     - active-timeline entries whose `deadline_end` falls within N days, sent to users in their `target_roles`
     - open evaluation periods closing within N days, sent to lecturers who still have unfinished tasks
   - Use one idempotent `event_key` per user, entry and deadline, so running it twice sends nothing new.
   - **Verify** how `target_roles` values map to user roles; the teammate's dashboard code has the mapping.
4. **Weekly summary.** Add a management command `send_weekly_summary` that emails each user who opted in a digest of their unread notifications from the past seven days. Skip users with nothing unread.
5. **Documentation.** Add a short section to `backend/README.md` on scheduling the commands with Windows Task Scheduler and with cron.

**Tests.**
- The email helper respects every preference combination (use `django.core.mail.outbox`).
- Reminders cover timeline and Marks deadlines and are idempotent.
- The summary skips users who opted out or have nothing unread.

Frontend script test: the dropdown helper returns the five newest notifications and the record navigation mapping.

**Done when** all verification passes and running each command twice in a row produces no duplicates.

---

## Phase 9 — Student "My Records" Page and Documentation Wrap-Up (UC06)

**Depends on Phase 6** for letters.

**Current state.**
- Students can edit their phone number in Settings.
- The teammate's progress dossier (`GET /api/dashboard/progress/<student_id>/`) already lets a student read their own supervisor, panel, Marks and timeline records; see `backend/dashboard/dossiers.py`.
- There is no single page for a student's profile and linked records.

**Start here.** `frontend/src/components/SettingsView.tsx`, `frontend/src/components/StudentProgressDossier.tsx` and `frontend/src/services/studentProgressApi.ts` (read only; reuse, do not edit), `frontend/src/constants/routes.ts`, `frontend/src/auth/permissions.ts`, the letters service from Phase 6, `frontend/src/services/notificationsApi.ts`.

**Tasks.**
1. **Student "My Records" page.** Use a new route, for example `/my-records`, visible to students only. It shows:
   - a profile summary: read-only fields, with a link to Settings for the phone number
   - a summary card per linked-record category with a count:
     - Supervisor and Panel, and Marks, from the dossier endpoint
     - Letters, from Phase 6
     - Announcements, from the student's notifications
     - Files, marked "Available when File Management is released"
   - drill-down tables for each category, with a "No records found" state
2. **Documentation.**
   - Add a dated `PROJECT_STATUS.md` section for this plan's completion.
   - In our own section, note that the announcement risks still listed under the teammate's "Known Issues" (and in `ARCHITECTURE_AND_CODING_DESIGN.md`) were fixed in `f5777d2`. Do not edit the teammate's lines; tell the user so they can ask the teammate.
   - Add a short "Design differences from the use-case document" list (D1–D6) to `PROJECT_STATUS.md` for the FYP report.
   - Mark this plan complete.

**Tests.** Frontend script tests cover the category summary counts and the empty state. No backend changes are expected. If one turns out to be needed, it goes in Xiang's apps with tests.

**Done when** all verification passes and a live check with a temporary student shows every category with correct counts.

---

## After This Plan

Not-started use cases, for the next plan: UC03 Manage User Account (including staff and lecturer accounts, replacing the mock `StaffLecturersRegistry` tab), UC22 appointment confirmation letters (needs an approval hook agreed with the teammate), UC24–UC27 File Management (official record-linked documents only, per the panel feedback), UC28–UC29 FAQ chatbot (after the 48 flagged rows in `docs/faq/faq-entries.json` are reviewed).
