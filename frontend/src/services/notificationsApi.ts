/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// In-app notifications API (UC49). Returns mock data for now.

import { NotificationItem } from '../types';
import { MOCK_NOTIFICATIONS } from '../mocks/notifications';
import { USE_MOCKS, mockResponse, request } from './apiClient';

export async function getNotifications(): Promise<NotificationItem[]> {
  if (USE_MOCKS) return mockResponse(MOCK_NOTIFICATIONS);
  return request<NotificationItem[]>('/notifications');
}
