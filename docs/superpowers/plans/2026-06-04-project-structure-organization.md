# Project Structure Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the FKSTM postgraduate management system into a clean full-stack project layout.

**Architecture:** Keep project governance documents at the root, place the Vite React app in `frontend/`, place the Django backend in `backend/`, and keep supporting references in `docs/`. Preserve existing code behavior and uncommitted edits.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Django, Django REST Framework.

---

### Task 1: Prepare Target Folders

**Files:**
- Create: `frontend/`
- Create: `backend/`
- Create: `docs/`
- Preserve: `PROJECT_REQUIREMENTS.md`
- Preserve: `ARCHITECTURE_AND_CODING_DESIGN.md`
- Preserve: `PROJECT_STATUS.md`

- [x] **Step 1: Create folders**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'frontend','backend','docs'
```

Expected: folders exist at the project root.

### Task 2: Move Files

**Files:**
- Move frontend app files from `fsktm-postgraduate-administrative-portal1/` to `frontend/`
- Move backend app files from `fsktm-postgraduate-administrative-portal1/backend/` to `backend/`
- Move project docs and PDFs into their approved locations

- [ ] **Step 1: Move frontend files**

Move `src`, `assets`, `index.html`, `metadata.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.env.example`, and `.gitignore` into `frontend/`.

- [ ] **Step 2: Move backend files**

Move the contents of `fsktm-postgraduate-administrative-portal1/backend/` into root `backend/`.

- [ ] **Step 3: Move governance docs**

Move `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, and `PROJECT_STATUS.md` to the project root.

- [ ] **Step 4: Move references**

Move `DATABASE_SETUP.md`, `FunctionalRequirements.pdf`, and `Use Case Description.pdf` into `docs/`.

### Task 3: Update Configuration and Documentation

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `PROJECT_REQUIREMENTS.md`
- Modify: `ARCHITECTURE_AND_CODING_DESIGN.md`
- Modify: `PROJECT_STATUS.md`

- [ ] **Step 1: Add root ignore rules**

Ensure root ignore rules cover `node_modules/`, `dist/`, `.venv/`, and log files.

- [ ] **Step 2: Update README**

Document frontend and backend startup commands from the new layout.

- [ ] **Step 3: Update governance docs**

Record the approved structure and testing status.

### Task 4: Verify

**Files:**
- Check: `frontend/package.json`
- Check: `frontend/src/main.tsx`
- Check: `backend/manage.py`

- [ ] **Step 1: Run frontend lint**

Run:

```powershell
npm.cmd run lint
```

Expected: TypeScript check exits with code 0.

- [ ] **Step 2: Run frontend build**

Run:

```powershell
npm.cmd run build
```

Expected: Vite build exits with code 0. Existing chunk-size warning may remain non-blocking.
