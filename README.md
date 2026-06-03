# FSKTM Postgraduate Office Management System

Faculty postgraduate-admin portal. **React 19 + Vite + TypeScript** frontend with
an **Express + PostgreSQL** backend API.

## Quick start

```powershell
npm install
Copy-Item .env.example .env   # then set PGPASSWORD to your local Postgres password
npm run db:setup              # creates + seeds the database
npm run dev:server            # API  → http://localhost:4000
npm run dev                   # web  → http://localhost:3000
```

📄 **Full database + backend setup (for new teammates): [DATABASE_SETUP.md](DATABASE_SETUP.md)**

## Docs

- [DATABASE_SETUP.md](DATABASE_SETUP.md) — get the DB + API running locally
- [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md) — product scope & module requirements
- [ARCHITECTURE_AND_CODING_DESIGN.md](ARCHITECTURE_AND_CODING_DESIGN.md) — tech stack & structure
- [PROJECT_STATUS.md](PROJECT_STATUS.md) — what's done / known issues / next steps
