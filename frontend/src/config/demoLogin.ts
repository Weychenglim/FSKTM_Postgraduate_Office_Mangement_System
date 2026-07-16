import type { DemoUser } from '../types/auth';

export type DemoRoleKey = 'admin' | 'coordinator' | 'lecturer' | 'student';

interface DemoLoginEnvironment {
  DEV?: boolean;
  VITE_ENABLE_DEMO_LOGIN?: string;
  VITE_DEMO_ADMIN_PASSWORD?: string;
  VITE_DEMO_COORDINATOR_PASSWORD?: string;
  VITE_DEMO_LECTURER_PASSWORD?: string;
  VITE_DEMO_STUDENT_PASSWORD?: string;
}

interface DemoLoginCredential {
  email: string;
  password: string;
  displayIdentifier: string;
  user: DemoUser;
}

export type DemoLoginConfig = Record<DemoRoleKey, DemoLoginCredential>;

const DEMO_IDENTITIES: Record<
  DemoRoleKey,
  Omit<DemoLoginCredential, 'password'>
> = {
  admin: {
    email: 'demo.office.admin@example.test',
    displayIdentifier: 'DEMO-ADMIN-001',
    user: {
      id: 'demo-admin',
      email: 'demo.office.admin@example.test',
      role: 'Office Staff/Admin',
      fullName: 'Demo Office Administrator',
      department: 'Demo Postgraduate Office',
      staffId: 'DEMO-ADMIN-001',
    },
  },
  coordinator: {
    email: 'demo.coordinator@example.test',
    displayIdentifier: 'DEMO-COORD-001',
    user: {
      id: 'demo-coordinator',
      email: 'demo.coordinator@example.test',
      role: 'Programme Coordinator',
      fullName: 'Demo Programme Coordinator',
      department: 'Demo Programme Coordination',
      staffId: 'DEMO-COORD-001',
    },
  },
  lecturer: {
    email: 'demo.supervisor@example.test',
    displayIdentifier: 'DEMO-LECT-001',
    user: {
      id: 'demo-lecturer',
      email: 'demo.supervisor@example.test',
      role: 'Lecturer',
      fullName: 'Demo Lecturer Supervisor',
      department: 'Demo Artificial Intelligence Department',
      staffId: 'DEMO-LECT-001',
    },
  },
  student: {
    email: 'demo.student@example.test',
    displayIdentifier: 'DEMO-STUDENT-001',
    user: {
      id: 'demo-student',
      email: 'demo.student@example.test',
      role: 'Student',
      fullName: 'Demo Student One',
      department: 'Master of Computer Science (By Coursework)',
      studentId: 'DEMO-STUDENT-001',
    },
  },
};

export function createDemoLoginConfig(
  environment: DemoLoginEnvironment,
): DemoLoginConfig | null {
  if (
    environment.DEV !== true ||
    environment.VITE_ENABLE_DEMO_LOGIN !== 'true'
  ) {
    return null;
  }

  const passwords: Record<DemoRoleKey, string | undefined> = {
    admin: environment.VITE_DEMO_ADMIN_PASSWORD,
    coordinator: environment.VITE_DEMO_COORDINATOR_PASSWORD,
    lecturer: environment.VITE_DEMO_LECTURER_PASSWORD,
    student: environment.VITE_DEMO_STUDENT_PASSWORD,
  };

  if (Object.values(passwords).some((password) => !password?.trim())) {
    return null;
  }

  return Object.fromEntries(
    (Object.keys(DEMO_IDENTITIES) as DemoRoleKey[]).map((roleKey) => [
      roleKey,
      {
        ...DEMO_IDENTITIES[roleKey],
        password: passwords[roleKey] as string,
      },
    ]),
  ) as DemoLoginConfig;
}

const hasViteEnvironment = 'env' in import.meta;

export const DEMO_LOGIN_CONFIG =
  hasViteEnvironment && import.meta.env.DEV
    ? createDemoLoginConfig({
        DEV: import.meta.env.DEV,
        VITE_ENABLE_DEMO_LOGIN: import.meta.env.VITE_ENABLE_DEMO_LOGIN,
        VITE_DEMO_ADMIN_PASSWORD: import.meta.env.VITE_DEMO_ADMIN_PASSWORD,
        VITE_DEMO_COORDINATOR_PASSWORD:
          import.meta.env.VITE_DEMO_COORDINATOR_PASSWORD,
        VITE_DEMO_LECTURER_PASSWORD: import.meta.env.VITE_DEMO_LECTURER_PASSWORD,
        VITE_DEMO_STUDENT_PASSWORD: import.meta.env.VITE_DEMO_STUDENT_PASSWORD,
      })
    : null;
