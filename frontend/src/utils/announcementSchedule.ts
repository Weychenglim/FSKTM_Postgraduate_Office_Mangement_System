/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Publish times for announcements. Form values are datetime-local strings
// read as Malaysia time, like the rest of the portal.

import { malaysiaDeadline } from './malaysiaDateTime';

/** The ISO time for a datetime-local value, or null when it is empty. Throws when invalid. */
export function scheduleTime(value: string): string | null {
  return value.trim() ? malaysiaDeadline(value.trim()) : null;
}

/** True when publishing with this time schedules the announcement instead. */
export function isScheduledFor(publishAt: string, now: Date = new Date()): boolean {
  try {
    const iso = scheduleTime(publishAt);
    return iso !== null && Date.parse(iso) > now.getTime();
  } catch {
    return false;
  }
}

/** "12 Oct 2026, 9:00 am" in Malaysia time, for list rows and messages. */
export function formatScheduleMoment(iso: string | null | undefined): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return '';
  return parsed.toLocaleString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
