/** Explain current-stage waiting without presenting a final outcome as an ongoing age. */
export function formatRequestStageWaiting(status: string | undefined, waitingDays?: number | null, waitingApplicable = true): string {
  const value = (status ?? '').trim().replaceAll(' ', '_').toUpperCase();
  if (value.startsWith('CANCELLED')) return 'Cancelled';
  if (value.startsWith('REJECTED') || value === 'RETURNED') return 'Rejected';
  if (value === 'APPROVED' || value === 'COMPLETED') return 'Completed';
  if (value === 'ENDED') return 'Ended';
  if (value === 'WITHDRAWN') return 'Withdrawn';
  if (value === 'EXPIRED') return 'Expired';
  if (value === 'NO_SUPERVISOR' || value === 'WORKLOAD_ALERT') return 'Not awaiting review';
  if (!waitingApplicable) return 'No longer waiting';
  if (waitingDays == null || !Number.isSafeInteger(waitingDays) || waitingDays < 0) return 'Not recorded';
  return `${waitingDays} calendar ${waitingDays === 1 ? 'day' : 'days'}`;
}
