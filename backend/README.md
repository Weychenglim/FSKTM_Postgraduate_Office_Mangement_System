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
pip install -r requirements.txt

# 2. Environment (set PostgreSQL plus local demo flags/passwords in .env)
Copy-Item .env.example .env

# 3. Database
python manage.py migrate

# 4. Seed demo accounts / panel workflow data + create your Django super admin
python manage.py seed_users
python manage.py createsuperuser

# 5. Run
python manage.py runserver 8000
```

The frontend (`npm run dev`, port 3000) proxies `/api` to `http://localhost:8000`.

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
| POST | `periods/<id>/generate-tasks/` | Office Staff/Admin |
| POST | `periods/<id>/manual-overrides/` | Office Staff/Admin |
| GET | `my-evaluation-tasks/` | Lecturer |
| PUT | `tasks/<id>/draft/` | Assigned lecturer |
| POST | `tasks/<id>/submit/` | Assigned lecturer |

Submitted marks are locked. Authorized Office Staff/Admin users correct or reopen
them through Django Admin with a mandatory reason and audit record.
Evaluation tasks are generated for active supervisor and panel appointments;
backup/manual-override evaluator tasks require an Office Staff/Admin reason and
audit record.

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
