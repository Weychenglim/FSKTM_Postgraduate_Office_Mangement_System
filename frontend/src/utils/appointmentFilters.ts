/** Clear list controls without changing the current view, page size or record-return context. */
export function clearAppointmentFilterParams(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const key of ['q', 'type', 'status', 'programme', 'semester', 'from', 'to', 'sort', 'page']) next.delete(key);
  return next;
}
