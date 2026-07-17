/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_USE_PANEL_BACKEND?: string;
  readonly VITE_MOCK_LATENCY_MS?: string;
  readonly VITE_ENABLE_DEMO_LOGIN?: string;
  readonly VITE_DEMO_ADMIN_PASSWORD?: string;
  readonly VITE_DEMO_COORDINATOR_PASSWORD?: string;
  readonly VITE_DEMO_LECTURER_PASSWORD?: string;
  readonly VITE_DEMO_STUDENT_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
