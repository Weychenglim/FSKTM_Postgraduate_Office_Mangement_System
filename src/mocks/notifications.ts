/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for in-app notifications (UC49). Swap for real API responses later.

import { NotificationItem } from '../types';

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Supervisor Request Submitted',
    service: 'System Sync Service',
    description: 'A new supervisor preference request has been submitted for Application #4421. The student has selected Dr. Sarah Chen...',
    detailedMessage: 'A new supervisor preference request has been submitted for Application #4421. The student has selected Dr. Sarah Chen as their primary choice.\n\nPlease review the attached academic credentials and approve the allocation within 48 hours to comply with the department SLAs.',
    timeAgo: '14 Nov 2023 — 09:42 AM',
    priority: 'high',
    isUnread: true,
    isAnnouncement: false,
    reference: 'APP-4421',
    recipient: 'Office Staff — Wey Cheng',
    moduleLabel: 'Supervisor Appointment',
  },
  {
    id: 'notif-2',
    title: 'Thesis Proposal Approval Notice',
    service: 'Academic Office',
    description: 'The thesis proposal submitted by candidate #9023 has been accepted by the review committee panel.',
    detailedMessage: 'The thesis proposal submitted by candidate #9023 has been officially verified and accepted by the review committee panel for Session 1 2024/2025. Please finalize the documentation logs inside the master schema.',
    timeAgo: '13 Nov 2023 — 11:15 AM',
    priority: 'medium',
    isUnread: true,
    isAnnouncement: false,
    reference: 'THESIS-9023',
    recipient: 'Office Staff — Wey Cheng',
    moduleLabel: 'Supervisor Appointment',
  },
  {
    id: 'notif-3',
    title: 'System Maintenance Window Scheduled',
    service: 'Database Manager',
    description: 'Filing repositories of the Postgraduate center will be temporarily offline for infrastructure redundancy updates.',
    detailedMessage: 'Filing repositories of the Postgraduate center will be temporarily offline for infrastructure redundancy updates from 02:00 AM to 05:00 AM. Access may be restricted during this time.',
    timeAgo: '12 Nov 2023 — 03:00 PM',
    priority: 'normal',
    isUnread: false,
    isAnnouncement: true,
    reference: 'SYS-MNT-92',
    recipient: 'All Staff Members',
    moduleLabel: 'General Notification',
  },
  {
    id: 'notif-4',
    title: 'Google Sheets Calendar Sync Complete',
    service: 'System Sync Service',
    description: 'Synchronization of candidate enrollment records from UM registrar database completed under token #2ECA.',
    detailedMessage: 'Synchronization of candidate enrollment records from UM registrar database completed under token #2ECA. All schedules are updated.',
    timeAgo: '11 Nov 2023 — 08:30 AM',
    priority: 'normal',
    isUnread: false,
    isAnnouncement: false,
    reference: 'SYNC-2ECA',
    recipient: 'Office Staff — Wey Cheng',
    moduleLabel: 'System Sync Logs',
  },
];
