/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// In-app notification & feedback models (UC49).

export type NotificationPriority = 'high' | 'medium' | 'normal';

export interface NotificationItem {
  id: string;
  title: string;
  service: string;
  description: string;
  timeAgo: string;
  priority: NotificationPriority;
  isUnread: boolean;
  isAnnouncement: boolean;
  reference: string;
  recipient: string;
  detailedMessage?: string;
  moduleLabel?: string;
  targetModule?: string;
  recordType?: string;
  recordId?: string;
  // Set when the notification was delivered from an announcement that has a file.
  announcementId?: string | null;
  attachmentName?: string | null;
}
