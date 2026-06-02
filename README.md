# FSKTM Postgraduate Management System

Frontend portal for office staff, lecturers, and postgraduate students.

## Environment

Copy `.env.example` to `.env.local` for local overrides.

```bash
VITE_API_BASE_URL="/api"
VITE_USE_MOCKS="true"
VITE_MOCK_LATENCY_MS="500"
```

Set `VITE_USE_MOCKS="false"` and point `VITE_API_BASE_URL` at the backend when real endpoints are ready.
