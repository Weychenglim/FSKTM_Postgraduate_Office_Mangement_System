# Database Setup Guide

How to get the database + backend API running on your own machine. Each teammate
runs their **own local PostgreSQL** — the setup script recreates an identical
database and seed data for everyone, so there is nothing to copy between machines.

> Current scope: only **authentication** (the `users` table) is stored in
> PostgreSQL today. Every other API route still returns mock data from
> `src/mocks/`. So "the database" right now is a single `users` table plus four
> demo login accounts.

---

## 1. Prerequisites

- **Node.js** 18+ (check: `node --version`)
- **PostgreSQL** 16 or newer — https://www.postgresql.org/download/
  - During installation you set a password for the `postgres` superuser.
    **Write it down** — you need it in step 3.
  - Keep the default port **5432** if you can. If you already have another
    PostgreSQL version installed, the installer may use **5433** instead — note
    which port yours ended up on.

---

## 2. Install dependencies

From the project folder (`FSKTM_Postgraduate_Office_Mangement_System`):

```powershell
npm install
```

---

## 3. Create your `.env`

Copy the template and fill in your local PostgreSQL password:

```powershell
Copy-Item .env.example .env      # PowerShell
# cp .env.example .env           # macOS / Linux
```

Then open `.env` and set **`PGPASSWORD`** to the password you chose when
installing PostgreSQL. Adjust `PGPORT` if your server runs on 5433.

```ini
JWT_SECRET=change-me-to-a-long-random-string
API_PORT=4000

PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_postgres_password   # <-- set this
PGDATABASE=fsktm_pg_office
```

`.env` is gitignored, so your password stays on your machine only.

---

## 4. Make sure PostgreSQL is running

On Windows it normally runs as a service automatically. To confirm:

```powershell
Get-Service -Name 'postgresql*'
```

You should see `Running`.

---

## 5. Create + seed the database

```powershell
npm run db:setup
```

This is **idempotent** (safe to run repeatedly). It:

1. Creates the `fsktm_pg_office` database if it doesn't exist.
2. Applies `server/schema.sql` (the `users` table + indexes).
3. Seeds the four demo login accounts (passwords stored as bcrypt hashes).

Expected output ends with:

```
✓ Schema applied
✓ Seeded Office Staff/Admin      admin@fsktm.edu.my
✓ Seeded Programme Coordinator   coordinator@fsktm.edu.my
✓ Seeded Lecturer                lecturer@fsktm.edu.my
✓ Seeded Student                 WEA200192@fsktm.edu.my

Database setup complete. You can now start the API with: npm run dev:server
```

---

## 6. Run the app

Two terminals:

```powershell
# Terminal 1 — backend API (http://localhost:4000)
npm run dev:server

# Terminal 2 — frontend (http://localhost:3000)
npm run dev
```

Health check: open http://localhost:4000/api/health → should return
`{ "status": "ok", ... }`.

---

## Demo login accounts

You can log in with **email + password**, or with the student/staff ID instead
of the email. All seeded by `npm run db:setup`.

| Role                 | Email / ID                              | Password          |
| -------------------- | --------------------------------------- | ----------------- |
| Office Staff/Admin   | `admin@fsktm.edu.my` (staff `M10492`)   | `staffAdmin2026`  |
| Programme Coordinator| `coordinator@fsktm.edu.my` (`C29402`)   | `coordinator2026` |
| Lecturer             | `lecturer@fsktm.edu.my` (`L84920`)      | `lecturer2026`    |
| Student              | `WEA200192@fsktm.edu.my` (`WEA200192`)  | `student2026`     |

---

## Troubleshooting

**`password authentication failed for user "postgres"`**
`PGPASSWORD` in `.env` doesn't match your PostgreSQL install password. Fix it in
`.env` and re-run `npm run db:setup`.

**`ECONNREFUSED` / `could not connect to server`**
PostgreSQL isn't running, or `PGPORT` is wrong. Start the service (step 4) and
confirm the port. If you have two PostgreSQL versions, try `PGPORT=5433`.

**`database "fsktm_pg_office" does not exist`**
You skipped step 5. Run `npm run db:setup`.

**Which port is my server on?**
```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 5432,5433 }
```

> You don't need `psql` on your PATH — the setup script connects through the
> Node `pg` driver, not the command-line client.
