# Database Setup Guide

Each teammate runs a local PostgreSQL database and Django backend. Local
credentials and development fixtures stay in ignored environment files.

## Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 16+

## Backend Setup

From the repository root:

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set the PostgreSQL values in the ignored `backend/.env`, then run:

```powershell
python manage.py migrate
python manage.py check
python manage.py runserver 8000
```

The frontend development server proxies `/api` to Django.

## Development Demo Accounts

Demo accounts are optional, fictional fixtures. The seed command refuses to
run unless all of these conditions are true:

- `DJANGO_DEBUG=True`
- `ENABLE_DEMO_ACCOUNTS=true`
- `DEMO_ADMIN_PASSWORD` is non-blank
- `DEMO_COORDINATOR_PASSWORD` is non-blank
- `DEMO_LECTURER_PASSWORD` is non-blank
- `DEMO_STUDENT_PASSWORD` is non-blank

Set those values only in the ignored `backend/.env`, then run:

```powershell
python manage.py seed_users
```

Passwords are not stored in Python, TypeScript, or tracked documentation. Seed
reruns update the same users and role profiles. For an existing local database,
`DEMO_LEGACY_EMAIL_MAP` may contain a JSON old-to-new email mapping; the command
renames those users in place so protected workflow, timeline, and audit foreign
keys keep their original user IDs.

## Frontend Demo Prefills

Create an ignored `frontend/.env.development.local` and set:

```ini
VITE_ENABLE_DEMO_LOGIN="true"
VITE_DEMO_ADMIN_PASSWORD=""
VITE_DEMO_COORDINATOR_PASSWORD=""
VITE_DEMO_LECTURER_PASSWORD=""
VITE_DEMO_STUDENT_PASSWORD=""
```

Fill the blank values locally with the matching backend role passwords. The
testing console appears only in Vite development mode when every value is
present. Manual login remains available when the console is disabled.

## Production Check

```powershell
Set-Location frontend
npm run test:production-security
npm run build
```

The security test performs a production build with canary demo passwords and
fails if a password or demo-console marker appears in generated HTML or
JavaScript.

## Troubleshooting

**PostgreSQL password authentication failed**

Confirm `PGUSER`, `PGPASSWORD`, `PGHOST`, and `PGPORT` in `backend/.env` match
your local PostgreSQL installation.

**`seed_users` refuses to run**

Keep the refusal in place. Confirm this is a local development environment,
then set the explicit demo flag and all four local password variables.
