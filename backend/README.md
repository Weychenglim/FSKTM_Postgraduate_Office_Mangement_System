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

## Issued letter endpoints (`/api/letters/`)

| Method | Path | Actor |
| ------ | ---- | ----- |
| POST | `requests/` (`{templateId}`) | Active student |
| GET | `requests/` | Student (own letters) or Office Staff/Admin (`search`, `from`, `to`, `status`) |
| GET | `requests/<id>/` | The letter's student or Office Staff/Admin |
| GET | `requests/<id>/docx/` | The letter's student or Office Staff/Admin |
| POST | `requests/<id>/resend-notification/` | Office Staff/Admin |
| POST | `requests/<id>/revoke/` (`{reason}`) | Office Staff/Admin |

Generating a letter fills an Active template from the student's record, issues
the next reference number for its prefix and year (`UMF/PG/2026/0001`), saves
the filled wording and notifies the student. If the template needs a detail the
record does not have, it returns 400 with `missingFields` and saves nothing.
The Word copy is built with `python-docx`. Revoked letters keep their number but
can no longer be downloaded.

## Scheduled commands

There is no background worker. These management commands are safe to run
repeatedly, so schedule them every few minutes:

| Command | What it does |
| ------- | ------------ |
| `release_announcements` | Publishes scheduled announcements that are due and expires finished ones. The announcement and notification list endpoints also do this on every read, so the command only matters when nobody is signed in. |
| `send_deadline_reminders --days 3` | Reminds people of active-timeline deadlines (by the entry's target roles) and of Marks periods closing within the days given (evaluators with unsubmitted tasks). One reminder per person per deadline. |
| `send_weekly_summary` | Emails everyone who turned the weekly summary on a list of their unread notifications from the past seven days. One email per person per week. |

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
