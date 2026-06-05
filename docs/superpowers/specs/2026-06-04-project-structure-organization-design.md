# Project Structure Organization Design

## Goal

Reorganize the project into a standard full-stack layout while preserving the existing React frontend, Django backend, project governance docs, and user work.

## Approved Structure

- Root-level governance docs remain at the project root:
  - `PROJECT_REQUIREMENTS.md`
  - `ARCHITECTURE_AND_CODING_DESIGN.md`
  - `PROJECT_STATUS.md`
- `frontend/` contains the Vite React application, including `src`, `index.html`, Vite/TypeScript config, package files, metadata, and frontend environment example.
- `backend/` contains the Django backend exactly as the application backend.
- `docs/` contains supporting documents and reference material, including PDFs, database setup notes, and Superpowers spec/plan files.
- Generated or local runtime artifacts are ignored by source control, including `node_modules`, `dist`, `.venv`, and log files.

## Migration Approach

The existing `fsktm-postgraduate-administrative-portal1` folder is treated as the source of truth. Its app files are moved into the new root-level structure without rewriting frontend or backend behavior. Existing uncommitted code changes are preserved.

## Verification

After moving files, run frontend TypeScript and production build checks from `frontend/`. Inspect the resulting structure and update the required governance documents to describe the new layout and current status.
