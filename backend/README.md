# FSKTM PG Office — Django backend (auth)

Python/Django backend providing the authentication API for the React frontend:
**login, logout, password reset (request + email + confirm)**, plus a **Django
admin** for creating and managing user accounts.

> Scope: this backend currently owns **auth only**. Every other screen in the
> frontend runs on mock data (`USE_MOCKS=true`) until those endpoints are built.

## Stack
- Django 5.2 (LTS) + Django REST Framework
- JWT auth via `djangorestframework-simplejwt` (Bearer access token, 8h)
- PostgreSQL (reuses the project's `fsktm_pg_office` database)
- Custom user model `accounts.User` (login by email / student ID / staff ID)

## Setup

From this `backend/` folder:

```powershell
# 1. Virtualenv + dependencies
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# 2. Environment
Copy-Item .env.example .env           # then edit .env (PG password, secret key, Gmail)

# 3. Database (creates tables in fsktm_pg_office; create that DB first if needed)
python manage.py migrate

# 4. Seed the 4 demo accounts + create your Django super admin
python manage.py seed_users
python manage.py createsuperuser

# 5. Run (port 8000 — the Vite dev server proxies /api here)
python manage.py runserver 8000
```

The frontend (`npm run dev`, port 3000) proxies `/api` → `http://localhost:8000`.

## Endpoints (`/api/auth/`)

| Method | Path | Body | Returns |
| ------ | ---- | ---- | ------- |
| POST | `login/` | `{identifier, password}` | `{token, user}` |
| POST | `logout/` | — | `{message}` |
| GET | `me/` | — (`Authorization: Bearer <token>`) | `user` |
| POST | `password-reset/` | `{email}` | `{message}` (always 200) |
| POST | `password-reset/confirm/` | `{uid, token, new_password}` | `{message}` / 400 |

`user` shape: `{ id, email, role, fullName, department, studentId, staffId }`.

## Demo logins (after `seed_users`)

| Role | Email / ID | Password |
| ---- | ---------- | -------- |
| Office Staff/Admin | `admin@fsktm.edu.my` (`M10492`) | `staffAdmin2026` |
| Programme Coordinator | `coordinator@fsktm.edu.my` (`C29402`) | `coordinator2026` |
| Lecturer | `lecturer@fsktm.edu.my` (`L84920`) | `lecturer2026` |
| Student | `WEA200192@fsktm.edu.my` (`WEA200192`) | `student2026` |

## Password-reset email

- **No Gmail creds in `.env`** → the email (with the reset link) is printed to the
  `runserver` console. Good enough to develop/demo the flow.
- **Gmail App Password set** → a real email is sent via `smtp.gmail.com`.

The reset link points at `${FRONTEND_URL}/reset-password?uid=...&token=...`, which
the React app opens as the "set new password" page.

## Django admin

`http://localhost:8000/admin/` → log in with the super admin from step 4 to create
user accounts (email, role, department, student/staff ID, password).

## Notes
- These accounts live in the `accounts_user` table. The old Node `users` table (if
  present in the same DB) is unused and can be dropped.
