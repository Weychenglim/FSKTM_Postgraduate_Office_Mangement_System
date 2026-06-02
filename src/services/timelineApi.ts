/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Semester timeline API (UC46–UC48). Returns mock data for now.

import { TimelineEntry } from '../types';
import { MOCK_TIMELINE_ENTRIES } from '../mocks/timeline';
import { USE_MOCKS, mockResponse, request } from './apiClient';

export async function getTimelineEntries(): Promise<TimelineEntry[]> {
  if (USE_MOCKS) return mockResponse(MOCK_TIMELINE_ENTRIES);
  return request<TimelineEntry[]>('/timeline');
}
