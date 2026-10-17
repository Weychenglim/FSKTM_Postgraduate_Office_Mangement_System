/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** "Good Morning", "Good Afternoon" or "Good Evening" for the time in Malaysia. */
export function greetingFor(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', hourCycle: 'h23' }).format(now),
  );
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}
