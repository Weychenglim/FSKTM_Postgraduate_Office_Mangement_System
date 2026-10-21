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
| `send_deadline_reminders --days 3` | Creates opening, approaching/one-day/due-day and extension notices for informational timelines, enabled appointment periods and eligible unfinished Marks tasks using effective personal deadlines. Linked calendar entries do not duplicate operational reminders. Optional emails use a durable retry queue and current audience/deadline checks. |
| `send_deadline_reminders --dry-run` | Reports pending recipient/event counts without creating notifications, run records or email deliveries. |
| `send_weekly_summary` | Emails everyone who turned the weekly summary on a list of their unread notifications from the past seven days. One email per person per week. |
| `check_document_storage [--remove-orphans]` | Reports stored File Management files that are missing, and left-over files nothing refers to. With `--remove-orphans` it deletes left-overs more than an hour old. Run it weekly, or after restoring a backup. |

Each person's Settings switches decide what they get: no reminders when
"Deadline reminders" is off, and email copies of announcements and reminders
only with "Email alerts" on. Run `release_announcements` every 5 minutes,
`send_deadline_reminders` every 15 minutes and `send_weekly_summary` weekly.

For connected periods, Office uses Dashboard → Timeline Management to configure
appointment intake, explicitly enable its date rules, link calendar events and
extend deadlines for everyone or selected eligible cases/tasks. Marks keeps its
existing period configuration/rubrics and completion-window history. Closed
semesters remain accessible for eligible selected Marks recovery; they do not
reopen calendar edits or appointment intake. An entirely past informational
spreadsheet requires warning acknowledgement and cannot publish intake rules.

The local Windows installer is `scripts/install-deadline-reminders.ps1` from the
repository root. It registers a hidden job every 15 minutes using the repository
virtual environment and backend working directory. Its default is **preview
only**, so installing it does not contact users. After approving real delivery,
run that installer with `-EnableDelivery`. Jobs use an interactive current-user
principal and run while that user is signed in. Production requires an appropriate
host scheduler/service identity; no credentials are stored by this installer.
Stdout/stderr are in `%LOCALAPPDATA%/FSKTM/deadline-reminders/`. Actual job results
and pending/retried optional email copies are inspection-only records in Django
admin (`DeadlineReminderRun`, `DeadlineEmailDelivery`). A PostgreSQL advisory lock
prevents concurrent actual runs. Delivery honours existing notification/email
preferences. Console mail backend success is not proof of SMTP delivery.

Windows Task Scheduler:

```powershell
$py = "C:\path\to\backend\.venv\Scripts\python.exe"; $manage = "C:\path\to\backend\manage.py"
schtasks /Create /TN "FSKTM release announcements" /SC MINUTE /MO 5 /TR "\"$py\" \"$manage\" release_announcements"
# From the repository root, install safe preview mode first:
./scripts/install-deadline-reminders.ps1
schtasks /Create /TN "FSKTM weekly summary" /SC WEEKLY /D MON /ST 08:00 /TR "\"$py\" \"$manage\" send_weekly_summary"
```

cron:

```
*/5 * * * * cd /path/to/backend && .venv/bin/python manage.py release_announcements
*/15 * * * * cd /path/to/backend && ../.venv/bin/python manage.py send_deadline_reminders --days 3
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
