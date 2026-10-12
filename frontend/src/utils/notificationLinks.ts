/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Where a notification leads, shared by the bell dropdown and the
// Notifications page so both open the same record.

import { NotificationItem } from '../types';
import { routeForNotificationTarget } from '../constants/routes';

/** How many notifications the bell dropdown shows. */
export const BELL_PREVIEW_COUNT = 5;

/** The newest notifications for the bell. The feed arrives newest first. */
export function latestNotifications(items: NotificationItem[], count = BELL_PREVIEW_COUNT): NotificationItem[] {
  return items.slice(0, count);
}

/**
 * The page of the record a workflow notification is about, or null for an
 * announcement or a note with no record, which is read in the feed's detail view.
 */
export function notificationRecordRoute(notification: NotificationItem): string | null {
  if (notification.isAnnouncement || !notification.targetModule || !notification.recordId) return null;
  return routeForNotificationTarget(notification);
}

/** Router state that asks the Notifications page to open one notification. */
export interface OpenNotificationState {
  openNotificationId?: string;
}
