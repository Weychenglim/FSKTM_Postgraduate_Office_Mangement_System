# FSKTM PG Office - Django backend

Python/Django backend providing authentication, password reset, letter templates,
and the first persisted lecturer-side panel appointment workflow.

The frontend can still run most modules on mock data, but the panel
recommendation workflow now has real database persistence when
`VITE_USE_PANEL_BACKEND=true`.

## Stack

- Django 5.2 (LTS) + Django REST Framework
- JWT auth via `djangorestframework-simplejwt` (Bearer access token, 8h)
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

# 2. Environment
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
| POST | `login/` | `{identifier, password}` | `{token, user}` |
| POST | `logout/` | - | `{message}` |
| GET | `me/` | - (`Authorization: Bearer <token>`) | `user` |
| POST | `password-reset/` | `{email}` | `{message}` |
| POST | `password-reset/confirm/` | `{uid, token, new_password}` | `{message}` / 400 |

`user` shape: `{ id, email, role, fullName, department, studentId, staffId }`.

## Panel appointment endpoints (`/api/appointments/panel/`)

| Method | Path | Actor |
| ------ | ---- | ----- |
| GET | `eligible-supervisees/` | Lecturer supervisor |
| GET/POST | `recommendations/` | Lecturer supervisor |
| GET | `review-queue/` | Selected panel lecturer |
| POST | `recommendations/<id>/panel-accept/` | Selected panel lecturer |
| POST | `recommendations/<id>/panel-reject/` | Selected panel lecturer |
| GET | `coordinator-queue/` | Programme Coordinator |
| POST | `recommendations/<id>/coordinator-approve/` | Programme Coordinator |
| POST | `recommendations/<id>/coordinator-reject/` | Programme Coordinator |
| GET | `assignments/` | Lecturer panel member |

## Demo logins

| Role | Email / ID | Password |
| ---- | ---------- | -------- |
| Office Staff/Admin | `admin@fsktm.edu.my` (`M10492`) | `staffAdmin2026` |
| Programme Coordinator | `coordinator@fsktm.edu.my` (`C29402`) | `coordinator2026` |
| Lecturer / Supervisor | `lecturer@fsktm.edu.my` (`L84920`) | `lecturer2026` |
| Selected Panel Lecturer | `panelamina@fsktm.edu.my` (`A004812`) | `lecturer2026` |
| Student | `WEA200192@fsktm.edu.my` (`WEA200192`) | `student2026` |
| Panel Demo Student | `MEA2209841@fsktm.edu.my` (`MEA2209841`) | `student2026` |

## Password-reset email

- No Gmail credentials in `.env`: the email and reset link are printed to the `runserver` console.
- Gmail App Password set: a real email is sent via `smtp.gmail.com`.

The reset link points at `${FRONTEND_URL}/reset-password?uid=...&token=...`.

## Django admin

`http://localhost:8000/admin/` opens Django admin. Log in with the super admin
from setup step 4 to manage user accounts and appointment records.

## Notes

- Demo accounts live in `accounts_user`.
- Panel workflow records live in the `appointments_*` tables.
- The old Node `users` table, if present in the same DB, is unused.
