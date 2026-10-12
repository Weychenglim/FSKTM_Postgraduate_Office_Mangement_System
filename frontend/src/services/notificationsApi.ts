/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// In-app notifications API (UC49). Talks to the real Django backend
// (`/api/notifications/`); each user only ever sees their own feed. Reads fall
// back to mock data when the backend is unreachable *and* mocks are enabled.

import { NotificationItem } from '../types';
import { MOCK_NOTIFICATIONS } from '../mocks/notifications';
import { USE_MOCKS, isTransportFailure, mockResponse, request } from './apiClient';

/** The signed-in user's own notification feed. */
export async function getNotifications(): Promise<NotificationItem[]> {
  try {
    return await request<NotificationItem[]>('/notifications/');
  } catch (err) {
    if (USE_MOCKS && isTransportFailure(err)) return mockResponse(MOCK_NOTIFICATIONS);
    throw err;
  }
}

/** Mark one notification read (or unread when `isRead` is false). */
export async function markNotificationRead(
  id: string,
  isRead = true,
): Promise<NotificationItem> {
  return request<NotificationItem>(`/notifications/${id}/read/`, {
    method: 'POST',
    body: JSON.stringify({ isRead }),
  });
}

/** Mark every unread notification of the signed-in user read. */
export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return request<{ updated: number }>('/notifications/mark-all-read/', {
    method: 'POST',
  });
}
