/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Semester timeline API (UC46-UC48).

import {
  ActiveSemesterTimeline,
  DashboardTask,
  SemesterTimelineEntry,
  TimelineEntry,
  TimelineUploadResult,
} from '../types';
import { MOCK_IMPORTED_TIMELINE_ENTRIES, MOCK_TIMELINE_ENTRIES } from '../mocks/timeline';
import { USE_MOCKS, mockResponse, request, requestBlob } from './apiClient';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDisplayDate(value: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return `${String(day).padStart(2, '0')} ${monthNames[month - 1]} ${year}`;
  }
  return value;
}

function toIsoDate(value: string): string {
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parts = value.split(' ');
  if (parts.length === 3) {
    const month = monthNames.findIndex((name) => name.toLowerCase() === parts[1].slice(0, 3).toLowerCase()) + 1;
    if (month > 0) {
      return `${parts[2]}-${String(month).padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return value;
}

function legacyCategory(entry: SemesterTimelineEntry): TimelineEntry['category'] {
  return entry.level === 'P1' ? 'Research Project (P1)' : 'Research Project (P2)';
}

export function timelineEntryToLegacy(entry: SemesterTimelineEntry): TimelineEntry {
  return {
    id: String(entry.id),
    event: entry.detail,
    category: legacyCategory(entry),
    startDate: formatDisplayDate(entry.deadlineStart),
    endDate: formatDisplayDate(entry.deadlineEnd),
    targetRole: entry.targetRoles,
    status: entry.status,
  };
}

function legacyToSemesterEntry(entry: TimelineEntry, index: number): SemesterTimelineEntry {
  const level = entry.category === 'Research Project (P2)' ? 'P2' : 'P1';
  return {
    id: Number(entry.id.replace(/\D/g, '')) || index + 1,
    level,
    step: index + 1,
    detail: entry.event,
    action: entry.targetRole.includes('OFFICE_STAFF') ? 'TDIT Office' : entry.targetRole.join(' / '),
    deadlineStart: toIsoDate(entry.startDate),
    deadlineEnd: toIsoDate(entry.endDate),
    weekLabel: '',
    targetRoles: entry.targetRole,
    status: entry.status,
    displayOrder: index + 1,
  };
}

function mockActiveTimeline(entries = MOCK_TIMELINE_ENTRIES): ActiveSemesterTimeline {
  const semesterEntries = entries.map(legacyToSemesterEntry);
  return {
    available: true,
    id: 1,
    semester: 'Semester II',
    session: '2025/2026',
    sourceFilename: 'mock-semester-timeline.xlsx',
    uploadedAt: '2026-03-01T00:00:00+08:00',
    levels: (['P1', 'P2'] as const)
      .map((level) => ({
        level,
        entries: semesterEntries.filter((entry) => entry.level === level),
      }))
      .filter((group) => group.entries.length > 0),
  };
}

export async function getTimelineEntries(): Promise<TimelineEntry[]> {
  if (USE_MOCKS) return mockResponse(MOCK_TIMELINE_ENTRIES);
  const timeline = await getActiveTimeline();
  return timeline.levels.flatMap((group) => group.entries.map(timelineEntryToLegacy));
}

export async function getActiveTimeline(): Promise<ActiveSemesterTimeline> {
  if (USE_MOCKS) return mockResponse(mockActiveTimeline());
  return request<ActiveSemesterTimeline>('/dashboard/timeline/active/');
}

export async function uploadTimelineFile(
  file: File,
  semester = 'Semester II',
  session = '2025/2026',
): Promise<TimelineUploadResult> {
  if (USE_MOCKS) {
    return mockResponse({
      importedCount: MOCK_IMPORTED_TIMELINE_ENTRIES.length,
      timeline: mockActiveTimeline(MOCK_IMPORTED_TIMELINE_ENTRIES),
    });
  }

  const body = new FormData();
  body.append('semester', semester);
  body.append('session', session);
  body.append('file', file);
  return request<TimelineUploadResult>('/dashboard/timeline/upload/', {
    method: 'POST',
    body,
  });
}

export async function updateTimelineEntry(
  id: string,
  entry: Pick<TimelineEntry, 'event' | 'startDate' | 'endDate' | 'targetRole' | 'status'> & { weekLabel?: string },
): Promise<SemesterTimelineEntry> {
  if (USE_MOCKS) {
    return mockResponse({
      ...legacyToSemesterEntry({ ...entry, id, category: 'Research Project (P1)' }, 0),
      id: Number(id.replace(/\D/g, '')) || 1,
      weekLabel: entry.weekLabel || '',
    });
  }
  return request<SemesterTimelineEntry>(`/dashboard/timeline/entries/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      detail: entry.event,
      deadlineStart: toIsoDate(entry.startDate),
      deadlineEnd: toIsoDate(entry.endDate),
      targetRoles: entry.targetRole,
      status: entry.status,
      ...(entry.weekLabel !== undefined ? { weekLabel: entry.weekLabel } : {}),
    }),
  });
}

export async function downloadTimelineTemplate(): Promise<Blob> {
  if (USE_MOCKS) {
    return new Blob(['Mock FSKTM semester timeline template'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
  return requestBlob('/dashboard/timeline/template/');
}

export async function getDashboardTasks(): Promise<{ tasks: DashboardTask[] }> {
  if (USE_MOCKS) {
    return mockResponse({
      tasks: [
        {
          id: 'task_upload',
          name: 'Upload semester timeline',
          status: 'critical',
          statusText: 'Due in 2 days',
          target: 'Timeline Management',
        },
      ],
    });
  }
  return request<{ tasks: DashboardTask[] }>('/dashboard/tasks/');
}

export function saveBlob(blob: Blob, filename: string): void {
  const element = document.createElement('a');
  element.href = URL.createObjectURL(blob);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}
