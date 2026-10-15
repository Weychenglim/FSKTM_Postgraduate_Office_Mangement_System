# FSKTM PG Office - Django backend

Python/Django backend providing authentication, password reset, letter templates,
and the first persisted lecturer-side panel appointment workflow.

The frontend can still run most modules on mock data, but the panel
recommendation workflow now has real database persistence when
`VITE_USE_PANEL_BACKEND=true`.

## Stack

- Django 5.2 (LTS) + Django REST Framework
- JWT auth via `djangorestframework-simplejwt` (15-minute bearer access token,
  7-day rotating HttpOnly refresh cookie, and server-side blacklist)
- PostgreSQL (reuses the project's `fsktm_pg_office` database)
- Custom user model `accounts.User` (login by email / student ID / staff ID)
- `appointments` app for student research profiles, panel recommendations, and final panel appointments

## Setup

From this `backend/` folder:

```powershell
# 1. Virtualenv + dependencies
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade "pip>=26.2,<27"
python -m pip install -r requirements.txt

# 2. Environment (set PostgreSQL plus local demo flags/passwords in .env)
Copy-Item .env.example .env

# 3. Database
python manage.py migrate

# 4. Seed demo accounts / panel workflow data + create your Django super admin
python manage.py seed_users
python manage.py createsuperuser
#    The superuser is a Technical Administrator: Django admin only, no portal sign-in.

# 5. Run
python manage.py runserver 8000
```

The frontend (`npm run dev`, port 3000) proxies `/api` to `http://localhost:8000`.
For production, follow [`deploy/nginx/README.md`](../deploy/nginx/README.md) to
build the frontend, collect Django Admin static files, and roll the same-origin
Content Security Policy from report-only mode to enforcement.

## Auth endpoints (`/api/auth/`)

| Method | Path | Body | Returns |
| ------ | ---- | ---- | ------- |
| POST | `login/` | `{identifier, password}` | `{token, user}` plus refresh cookie |
| POST | `refresh/` | `{}` plus refresh cookie | `{token}` plus rotated refresh cookie |
| POST | `logout/` | `{}` plus refresh cookie | `{message}` and cookie deletion |
| GET | `me/` | - (`Authorization: Bearer <token>`) | `user` |
| POST | `password-reset/` | `{email}` | `{message}` |
| POST | `password-reset/confirm/` | `{uid, token, new_password}` | `{message}` / 400 |

`user` shape: `{ id, email, role, fullName, department, studentId, staffId }`.

Normal APIs remain bearer-authenticated. Frontend JavaScript keeps the access
token in memory and cannot read the HttpOnly refresh cookie. Login, refresh, and
logout use JSON requests; run `python manage.py migrate` after installation so
SimpleJWT's outstanding-token and blacklist tables are available.

Technical Administrator accounts (created by `createsuperuser`) are for Django
admin only. Portal login returns 403 with code `technical_account`, existing
tokens and refresh sessions are refused, and password reset emails are not sent
to them. Recover their access on the server with
`python manage.py changepassword <email>`.

## Panel appointment endpoints (`/api/appointments/panel/`)

| Method | Path | Actor |
| ------ | ---- | ----- |
| GET | `eligible-supervisees/` | Lecturer supervisor |
| GET/POST | `recommendations/` | Lecturer supervisor |
| GET | `review-queue/` | Selected panel lecturer |
| POST | `recommendations/<id>/panel-accept/` | Selected panel lecturer |
| POST | `recommendations/<id>/cancel/` | Submitting supervisor, only while awaiting selected-panel review |
| GET | `recommendations/<id>/` | Involved lecturers, programme coordinator, or Office Staff/Admin |
| POST | `recommendations/<id>/panel-reject/` | Selected panel lecturer |
| GET | `coordinator-queue/` | Programme Coordinator |
| POST | `recommendations/<id>/coordinator-approve/` | Programme Coordinator |
| POST | `recommendations/<id>/coordinator-reject/` | Programme Coordinator |
| GET | `assignments/` | Lecturer panel member |

## Supervisor appointment endpoints (`/api/appointments/supervisor/`)

| Method | Path | Actor |
| ------ | ---- | ----- |
| GET | `candidates/` | Student |
| GET/POST | `applications/` | Student |
| GET | `requests/` | Requested supervisor |
| POST | `applications/<id>/supervisor-accept/` | Requested supervisor |
| POST | `applications/<id>/supervisor-reject/` | Requested supervisor |
| GET | `coordinator-queue/` | Programme Coordinator |
| POST | `applications/<id>/coordinator-approve/` | Programme Coordinator |
| POST | `applications/<id>/coordinator-reject/` | Programme Coordinator |
| POST | `applications/<id>/cancel/` | Submitting student, only before supervisor action |
| GET | `applications/<id>/` | Student, requested supervisor, programme coordinator, or Office Staff/Admin |

## Marks endpoints (`/api/marks/`)

| Method | Path | Actor |
| ------ | ---- | ----- |
| GET | `/api/marks/` | Office Staff/Admin |
| GET | `periods/` | Office Staff/Admin |
| GET | `assignment-options/` | Office Staff/Admin |
| GET | `rubric-components/` | Office Staff/Admin |
| GET | `records/<recordId>/` | Office Staff/Admin |
| POST | `records/<recordId>/correct/` | Office role + staff + `marks.change_markentry` |
| POST | `records/<recordId>/reopen/` | Office role + staff + `marks.change_markentry` |
| POST | `periods/<id>/generate-tasks/` | Office Staff/Admin |
| POST | `periods/<id>/manual-overrides/` | Office Staff/Admin |
| GET | `my-evaluation-tasks/` | Lecturer |
| PUT | `tasks/<id>/draft/` | Assigned lecturer |
| POST | `tasks/<id>/submit/` | Assigned lecturer |

Submitted marks are locked. Authorized Office Staff/Admin users correct or reopen
them through the existing Office portal record detail with a mandatory reason,
reviewed record version and audit record. Reopening requires an open period;
reasoned corrections remain permitted after closure. Django admin is inspection-only.
Evaluation tasks are generated for active supervisor and panel appointments;
backup/manual-override evaluator tasks require an Office Staff/Admin reason and
audit record.

## Letter request endpoints (`/api/letters/`)

| Method | Path | Actor |
| ------ | ---- | ----- |
| POST | `requests/` (`{templateId, note?}`) | Active student |
| GET | `requests/` | Student (own requests) or Office Staff/Admin (`search`, `status` (one or several, comma separated), `from`, `to` on the issue date) |
| GET | `requests/counts/` | Office Staff/Admin |
| GET | `requests/<id>/` | The request's student or Office Staff/Admin |
| POST | `requests/<id>/withdraw/` | The request's student, while Pending |
| POST | `requests/<id>/approve/` (`{values: {NAME: text}}`) | Office Staff/Admin, while Pending |
| POST | `requests/<id>/reject/` (`{reason}`) | Office Staff/Admin, while Pending |
| GET | `requests/<id>/pdf/` | The letter's student or Office Staff/Admin, once Issued |
| POST | `requests/<id>/resend-notification/` | Office Staff/Admin, once Issued |
| POST | `requests/<id>/revoke/` (`{reason}`) | Office Staff/Admin, once Issued |
| POST | `requests/<id>/reissue/` (`{values?}`) | Office Staff/Admin, an Issued appointment letter |
| GET | `appointment-letters/missing/` | Office Staff/Admin |
| POST | `appointment-letters/create/` (`{all: true}` or `{appointments: [{kind, id}]}`) | Office Staff/Admin |
| GET | `appointment-letters/received/?student=` | A lecturer: the appointment letters sent to them |

The office's `GET requests/` also takes `madeBy=request|automatic`.

**Requesting.**
- A student asks for a letter from an Active template, with an optional note.
- The request is `Pending`: it has no wording, reference number or date yet. Students never get a template's wording, so a letter cannot be copied before it is approved.
- One request per letter per student can be pending at a time (409 `letter_request_pending`).
- Office staff are notified in the app.

**Reviewing.**
- The office's `GET requests/<id>/` adds the template's current wording and `fields`: each placeholder value the letter needs, from the student's record or `needed` from the office.
- Office-filled fields (a template's `customFields`, such as attendance worked out in another system) are always typed in, as are record fields the student's record leaves blank.
- Values are at most 300 characters on one line.

**Deciding.**
- Approving fills the wording, issues the next reference number for the template's prefix and year (`UMF/PG/2026/0001`) and saves the letter.
- Rejecting needs a reason, which the student sees.
- Either way the student is notified in the app, and by email when "Email alerts" is on.
- A student can withdraw a pending request.
- A template with pending requests cannot be deleted.
- Approval is refused once the student is no longer Active.

**The PDF.** The download is a PDF built with `reportlab`, locked against editing (printing and copying text stay allowed), so a letter cannot simply be changed. Its reference number lets anyone verify it with the office. Revoked letters keep their number but can no longer be downloaded.

**Appointment letters (UC22).**
- **Template purpose.** A template's `purpose` is `REQUEST` (students ask for it), `SUPERVISOR_APPOINTMENT` or `PANEL_APPOINTMENT`.
  - Only one Active template per appointment purpose is allowed (409 `appointment_template_already_active`).
  - Students never see appointment templates.
  - Appointment templates may also use the appointment placeholders, each in the letter kinds listed in `letters/placeholders.py`. Examples: `{{RESEARCH_TITLE}}`, `{{COURSE_CODES}}`, `{{PANEL_NAME}}`, `{{COORDINATOR_NAME}}`, `{{SEMESTER}}`.
- **When a letter is made.**
  - `letters/signals.py` hears a new active `SupervisorAppointment` or `PanelAppointment`, which the coordinator's final approval creates. Once that approval commits, it makes the letter (`letters/appointment_letters.py`).
  - The appointment code is not changed, and a failed letter never undoes an approval.
- **Recipients.**
  - The student and the supervisor.
  - For a panel letter, also the panel member, with the current primary supervisor in copy.
  - Each gets an in-app notice (`APPOINTMENT_LETTER`, opening `/files/letters/<id>`) and an email when "Email alerts" is on.
- **Waiting letters.** If a value is blank, or the template has office-filled fields, the letter waits as `Pending` in the office's requests. The office issues it there, and students do not see it until then.
- **No usable template.** The office gets one notice per appointment (`APPOINTMENT_LETTERS_MISSING`). `appointment-letters/missing/` lists active appointments with no letter, and `create/` makes them.
- **Limits.** One live letter per appointment is guarded by the database.
- **Reissue.** It issues a new letter with the current details and revokes the old one as "Replaced by <ref>.".
- **Signatory.** Each template's `signatoryName` and `signatoryTitle` are printed on its letters, and every letter keeps its own copy.

## Staff account endpoints (`/api/registry/staff/`)

Office Staff/Admin only (UC03). Everyone else gets 403. Students and Technical Administrator accounts are not staff accounts and answer 404.

| Method | Path | Body or query | Returns |
| ------ | ---- | ------------- | ------- |
| GET | `/` | `search`, `role` (OFFICE, LECTURER, COORDINATOR), `status` (ACTIVE, NOT_ACTIVATED, SIGN_IN_OFF), `page`, `pageSize` (25, at most 100) | `{count, page, pageSize, results}` |
| POST | `/` | `{role, name, email, staffId, phone, department, title, researchArea, position, duties, programme, sendActivation}` | `{account, activation: sent, failed or held}` |
| GET | `options/` | | `{departments, programmes: [{programme, coordinator}]}` |
| GET, PATCH | `<id>/` | `{name, email, phone, staffId, department, title, researchArea, position}` | the account page (the account plus `capacity`, `activeWork`, `deletion`); PATCH returns `{account, oldAddressTold}` |
| DELETE | `<id>/` | | 204, only for an unused account |
| POST | `<id>/duties/` | `{duties: [Supervisor, Panel]}` | the account page |
| POST | `<id>/programme/` | `{programme, check}` (blank means none) | the account page; with `check`, `{from, to}` and the approvals waiting in each |
| POST | `<id>/sign-in/` | `{on, reason}` (a reason is needed to turn it off) | the account page |
| POST | `<id>/send-link/` | | `{kind: activation or reset, sent}` |
| POST | `<id>/activation-link/` | | `{link}`, only before activation |
| GET | `<id>/history/` | | newest first, at most 200 |

**Creating.**
- No password is made. The account gets the activation link with no time limit, as imported students do.
- Office accounts also get `is_staff` and the marks permissions, as `seed_users` gives the demo office, because the office screens built on them need both.
- Lecturers get a Supervisor and a Panel row for each duty ticked. Coordinators get their programme; a programme already managed by a coordinator who can sign in is refused.

**Unique details.**
- Email ignores letter case.
- A Staff ID is unique across office staff and lecturers, and must not be a student's matric number, because sign-in accepts all three.
- A refused duplicate names the account that holds it under `existing`, so the screen can link to it.

**Editing.**
- The role cannot be changed. Duties and programme have their own actions.
- An email change tells the old address, but only for an activated account. Older activation and reset links stop working.

**Links.**
- `send-link` sends whichever fits: activation until a password is set, then the 30-minute reset link. It is refused while sign-in is off, and limited per account by `REGISTRY_ACCESS_LINK_THROTTLE_RATE`.
- Only an activation link can be copied, so the office can never sign in as someone who already has a password.

**Duties and programme.**
- Only lecturer accounts have duties. A coordinator who also supervises needs a separate lecturer account.
- A duty is added only while the lecturer is active and can sign in. Until Lecturer capacity has a limit for it, the account page shows `NOT_CONFIGURED`, and students cannot pick the lecturer.
- A duty is removed only when nothing open needs it. For Supervisor that means active supervision or co-supervision, and supervisor requests or co-supervisor nominations still waiting. For Panel it means active panel appointments and nominations still waiting. A limit left behind in Lecturer capacity shows as `LIMIT_WITHOUT_DUTY`.
- A coordinator can move to a programme no other coordinator who can sign in manages, or to none.

**Sign-in.**
- Turning it off ends every session and needs a reason.
- It is refused for your own account and for the last office account that can sign in. It is also refused while the participant lifecycle's `lecturer_blockers` shows open work, and that work is listed under `blockers`. A coordinator moves to no programme first.
- Turning it back on is refused for a retired lecturer, and for a coordinator whose programme another coordinator now manages.

**Deleting.**
- Only for an account that has never signed in and that no record points to: every table that links to the account or its lecturer profile is checked, apart from its own profile, duties, notices and history.
- Otherwise the reasons come back under `blockers`, and the office turns sign-in off instead.
- The history keeps a "deleted" row with the name, email, role and Staff ID.

**History.** Every change is an `AccountChange` row with who, when and what. Rows cannot be edited or deleted, and keep the name and email as text after an account is deleted.

## FAQ knowledge base endpoints (`/api/faq/`)

The chatbot's answers (UC28, UC29). Everything below is for Office Staff/Admin only.

| Method | Path | Body or query | Returns |
| ------ | ---- | ------------- | ------- |
| GET | `entries/` | `search`, `category` (id), `status` (PUBLISHED, DRAFT, NEEDS_CHECKING, ARCHIVED), `page`, `pageSize` | `{count, page, pageSize, statusCounts, results}` |
| POST | `entries/` | `{question, answer, category, portalLink, altQuestions, publish}` | the entry (a draft unless `publish`) |
| GET, PATCH, DELETE | `entries/<id>/` | `{question, answer, category, portalLink, altQuestions}` | the entry with its other ways of asking, PDF text and history |
| POST | `entries/<id>/publish/`, `checked/`, `archive/`, `restore/` | | the entry |
| GET, POST | `categories/` | `{name, position}` | categories with entry counts per status |
| PATCH | `categories/<id>/` | `{name, position}` | the category |
| GET | `review-list/` (`?all=1` for every entry) | | an Excel file of the entries to check |

**Statuses.**
- Students only ever see Published entries.
- Needs checking holds imported rows that came out damaged. "Mark as checked" makes one a draft; publishing it straight away also counts as checked.
- Publishing needs a question and an answer. Archived entries can be restored as drafts.

**Answers** can use the same light formatting as letters. Links must start with `https://`, `http://`, `mailto:` or `/`, so an answer can never carry a script link.

**History.** Every change is a `FaqChange` row. Rows cannot be edited or deleted, and keep the question as text after an entry is deleted.

**Importing the office's FAQ.**
```
python manage.py import_faq            # docs/faq/faq-entries.json
python manage.py export_faq_review     # the review list for the office, as Excel
```
- Clean rows from the six category sheets are Published: 56 at the start.
- Damaged rows (37), and the 24 rows found only on the PDF's "ALL" sheet, wait as Needs checking: 61 in all. The PDF's own text is kept beside them.
- The 46 "ALL" rows that repeat a categorised question are skipped.
- Running the import again adds nothing and never overwrites the office's edits.

## File Management endpoints (`/api/documents/`)

| Method | Path | Actor |
| ------ | ---- | ----- |
| GET | `options/` | Everyone: the types they may choose, semesters, programmes |
| GET | `students/?search=`, `students/<matric>/` | Staff: students they may tag, and one student's header |
| GET, POST | `/` (list with `view`, `q`, `type`, `semester`, `student`, `uploader`, `status`, `kind`, `from`, `to`, `tag`, `archived`; multipart upload) | Everyone, by the access rules below |
| GET | `summary/`, `tags/?search=` | Everyone (tab counts, tag suggestions) |
| GET, PATCH, DELETE | `<id>/` | View right; edit by the uploader or the office; delete by the uploader |
| GET | `<id>/download/?version=`, `<id>/preview/`, `<id>/preview/pages/<n>/` | View right |
| POST | `download-zip/` (`{ids}`) | View right on every file |
| POST | `<id>/versions/` (multipart) | The uploader or the office |
| POST | `<id>/check/` (`{decision: ACCEPT or RETURN, reason, expectedVersion}`) | Office Staff/Admin |
| GET, PUT | `<id>/sharing/` | The office, or the staff member who uploaded it |
| POST | `<id>/archive/` (`{reason}`), `<id>/restore/` | Office Staff/Admin |
| GET, POST | `types/`, PATCH `types/<id>/` | Office Staff/Admin |
| GET | `tags/?manage=1`; PATCH, DELETE `tags/<id>/`; POST `tags/<id>/merge/` (`{into}`) | Office Staff/Admin |
| GET | `history/?show=&q=` | Office Staff/Admin |
| GET | `required/`, `required/<typeId>/students/?show=todo,waiting,done` | Office Staff/Admin, and programme coordinators for their programmes |
| POST | `required/<typeId>/remind/` | Office Staff/Admin, once a day per type |
| GET | `required/mine/` | Student |

**Who sees what.**
- The office sees every file. Uploaders see their own. Students see only what they uploaded.
- Staff see a student's files through real relationships, ticked per file: supervisors and co-supervisors (active appointments), the panel member (active panel appointment), and the programme coordinator (acting delegations included).
- Staff files (about no student) go to all lecturers and coordinators, coordinators only, or the office only, optionally narrowed to programmes. Students never see them.
- Archived files are seen by the office only. A file someone may not see answers 404, the same as a missing one.

**Uploads.**
- Up to 10 MB (`DOCUMENT_MAX_UPLOAD_BYTES`) and 100 an hour per person (`DOCUMENT_UPLOAD_THROTTLE_RATE`).
- PDF, Word and images for everyone; Excel and PowerPoint for staff only.
- Checks: real file signatures; no hidden inner extensions; PDFs without JavaScript, attachments or passwords and at most 500 pages (`pypdfium2`); Office files without macros, ActiveX, OLE objects or external links; images re-saved upright without hidden data (`Pillow`).
- Files are stored under `MEDIA_ROOT/documents/<year>/<month>/` with random names and are only served through the permission-checked download, as attachments.
- Previews are drawn on the server as PNG pages, because the production security policy blocks the browser's own PDF viewer.

**Checking and versions.** For types the office checks, uploads wait in "To check". Returning needs a reason; the uploader is told in the app, and by email when "Email alerts" is on. A new version waits again.

**Settings and history.** The office edits types (who uploads, who sees, checks, required, switched on), renames, merges and removes tags, and reads the history, which keeps deleted files as text. New sharing on a type reaches files students uploaded; what staff chose when uploading stays.

**Required documents.** A type can be required of every Active student, or of chosen programmes only. A returned file still counts as owed. Remind sends a notice, and an email to students with "Deadline reminders" on.

## Scheduled commands

There is no background worker. These management commands are safe to run
repeatedly, so schedule them every few minutes:

| Command | What it does |
| ------- | ------------ |
| `release_announcements` | Publishes scheduled announcements that are due and expires finished ones. The announcement and notification list endpoints also do this on every read, so the command only matters when nobody is signed in. |
| `send_deadline_reminders --days 3` | Reminds people of active-timeline deadlines (by the entry's target roles) and of Marks periods closing within the days given (evaluators with unsubmitted tasks). One reminder per person per deadline. |
| `send_weekly_summary` | Emails everyone who turned the weekly summary on a list of their unread notifications from the past seven days. One email per person per week. |
| `check_document_storage [--remove-orphans]` | Reports stored File Management files that are missing, and left-over files nothing refers to. With `--remove-orphans` it deletes left-overs more than an hour old. Run it weekly, or after restoring a backup. |

Each person's Settings switches decide what they get: no reminders when
"Deadline reminders" is off, and email copies of announcements and reminders
only with "Email alerts" on. Run `release_announcements` every 5 minutes,
`send_deadline_reminders` daily and `send_weekly_summary` weekly.

Windows Task Scheduler:

```powershell
$py = "C:\path\to\backend\.venv\Scripts\python.exe"; $manage = "C:\path\to\backend\manage.py"
schtasks /Create /TN "FSKTM release announcements" /SC MINUTE /MO 5 /TR "\"$py\" \"$manage\" release_announcements"
schtasks /Create /TN "FSKTM deadline reminders" /SC DAILY /ST 08:00 /TR "\"$py\" \"$manage\" send_deadline_reminders --days 3"
schtasks /Create /TN "FSKTM weekly summary" /SC WEEKLY /D MON /ST 08:00 /TR "\"$py\" \"$manage\" send_weekly_summary"
```

cron:

```
*/5 * * * * cd /path/to/backend && .venv/bin/python manage.py release_announcements
0 8 * * *   cd /path/to/backend && .venv/bin/python manage.py send_deadline_reminders --days 3
0 8 * * 1   cd /path/to/backend && .venv/bin/python manage.py send_weekly_summary
```

## Development demo logins

Demo fixtures use fictional `example.test` emails and `DEMO-*` identifiers.
They are disabled by default. To use them locally, set
`ENABLE_DEMO_ACCOUNTS=true` and all four `DEMO_*_PASSWORD` values in the
ignored `backend/.env`, then run `python manage.py seed_users` while
`DJANGO_DEBUG=True`.

The command refuses to modify data if any guard is missing. Passwords are not
stored in source or documentation. The optional `DEMO_LEGACY_EMAIL_MAP` JSON
setting can rename existing local fixtures in place so workflow and audit
foreign keys retain their user IDs.

## Password-reset email

- No Gmail credentials in `.env`: the email and reset link are printed to the `runserver` console.
- Gmail App Password set: a real email is sent via `smtp.gmail.com`.

The reset link points at `${FRONTEND_URL}/reset-password?uid=...&token=...`.

## Django admin

`http://localhost:8000/admin/` opens Django admin. Log in with the super admin
from setup step 4 to manage user accounts and appointment records.

## Notes

- Opt-in development demo accounts live in `accounts_user`.
- Panel workflow records live in the `appointments_*` tables.
- The old Node `users` table, if present in the same DB, is unused.
