/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Announcement API (UC45). Returns mock data for now.

import { AnnouncementItem } from '../types';
import { MOCK_ANNOUNCEMENTS } from '../mocks/announcements';
import { USE_MOCKS, mockResponse, request } from './apiClient';

export async function getAnnouncements(): Promise<AnnouncementItem[]> {
  if (USE_MOCKS) return mockResponse(MOCK_ANNOUNCEMENTS);
  return request<AnnouncementItem[]>('/announcements');
}
