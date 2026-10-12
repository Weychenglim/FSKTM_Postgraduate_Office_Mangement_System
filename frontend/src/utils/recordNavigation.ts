import { isKnownAppPath } from '../constants/routes';

export type RecordReturn = { path: string; label: string; historyIndex?: number };

export function shouldBlockRecordNavigation(dirty: boolean, busy: boolean, complete: boolean, pageKey?: string, nextPageKey?: string): boolean {
  if (pageKey && pageKey === nextPageKey) return false;
  return !complete && (dirty || busy);
}

export function recordFilterParams(current: URLSearchParams, key: string, value: string): URLSearchParams {
  const next = new URLSearchParams(current);
  if (value || key === 'profileStudent') next.set(key, value); else next.delete(key);
  if (key !== 'page' && key !== 'profileStudent') next.delete('page');
  return next;
}

// Return targets are UI context, never authority to access a record.
export function recordReturn(value: unknown, fallback: RecordReturn, modulePath: string): RecordReturn {
  if (!value || typeof value !== 'object') return fallback;
  const target = value as Partial<RecordReturn>;
  if (typeof target.path !== 'string' || typeof target.label !== 'string' || !target.label.trim()) return fallback;
  if (!target.path.startsWith('/') || target.path.startsWith('//') || target.path.includes('\\')) return fallback;
  const path = target.path.split(/[?#]/, 1)[0];
  if ((path !== modulePath && !path.startsWith(`${modulePath}/`)) || !isKnownAppPath(path)) return fallback;
  return { path: target.path, label: target.label, ...(Number.isInteger(target.historyIndex) && target.historyIndex! >= 0 ? { historyIndex: target.historyIndex } : {}) };
}

export function recordBackSteps(currentIndex: unknown, source: RecordReturn): number {
  return Number.isInteger(currentIndex) && Number.isInteger(source.historyIndex) && source.historyIndex! >= 0 && Number(currentIndex) > source.historyIndex!
    ? Number(currentIndex) - source.historyIndex! : 0;
}

export function recordNavigationState(path: string, label: string) {
  return { recordReturn: { path, label } };
}

export function recordSourceLabel(path: string): string {
  if (/^\/supervisor-appointments\/research-changes\//.test(path)) return 'Research change request';
  if (/^\/supervisor-appointments\/supervisees\//.test(path)) return 'Supervision details';
  if (path === '/supervisor-appointments/supervisees') return 'My supervisees';
  if (path === '/supervisor-appointments/research-changes') return 'Research changes';
  if (/^\/supervisor-appointments\/(supporting-requests\/)?[^/]+$/.test(path) && !['history','workload','new','requirements','applications'].includes(path.split('/').at(-1)!)) return 'Appointment request';
  if (path.startsWith('/supervisor-appointments')) return 'Supervisor Appointments';
  if (path.startsWith('/panel-appointments/assignments/')) return 'Panel assignment';
  if (path.startsWith('/panel-appointments')) return 'Panel Appointments';
  if (path.startsWith('/marks')) return 'Marks Entry';
  if (path.startsWith('/registry')) return 'Student Registry';
  return 'Dashboard';
}
