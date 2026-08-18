# A Web-Based Postgraduate Administrative Workflow, Appointment, and Project Evaluation Management System for FSKTM Coursework Programmes

Full-stack portal for role-scoped postgraduate administrative workflow, appointment, timeline, and project-evaluation management.

## Owned Scope and Measurable Outputs

The five owned modules are Dashboard/Timeline, Supervisor Appointments, Panel Appointments, Marks, and Workflow/Approval Tracking. They provide measurable persisted outputs: current role-scoped workflow state, elapsed waiting days and responsible approval stage, deadline and Marks completion status, immutable decision/lifecycle audit coverage, participant eligibility enforcement, and authorized analytics/XLSX exports.

Course registration, enrolment, credit accumulation, course scheduling, and general coursework results are outside these five modules. Notifications/Announcements, Registry Management, and the wider File Repository retain their separate ownership boundaries.

`docs/Functional Requirements.pdf` and `docs/Use Case Description.pdf` remain reference binaries. Their older scope wording and confirmation-letter content must be revised later from the editable academic source files; this repository does not modify those PDFs in place.

## Project Layout

```text
.
├── frontend/   # React 19 + Vite + TypeScript portal UI
├── backend/    # Django authentication backend
├── docs/       # Supporting PDFs, setup notes, specs, and plans
├── PROJECT_REQUIREMENTS.md
├── ARCHITECTURE_AND_CODING_DESIGN.md
└── PROJECT_STATUS.md
```

The three project governance files stay at the project root so they are easy to find and update during implementation work.

## Frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:3000`.
The frontend `.env` file is optional because the app has safe defaults for mock mode and `/api`.
For development-only demo prefills, create the ignored
`frontend/.env.development.local` from the blank variables in
`frontend/.env.example`; enable the flag and use the same per-role passwords as
the backend. Production builds remove the entire demo console.

## Backend

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# In the ignored .env, explicitly enable demo accounts and set all four
# DEMO_*_PASSWORD values before seeding.
python manage.py migrate
python manage.py seed_users
python manage.py runserver 8000
```

The frontend proxies `/api` requests to `http://localhost:8000`.

## Docs

- [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md) - product scope and module requirements
- [ARCHITECTURE_AND_CODING_DESIGN.md](ARCHITECTURE_AND_CODING_DESIGN.md) - architecture, structure, and coding conventions
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - completed work, testing status, known issues, and next steps
- [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) - database and backend setup notes
