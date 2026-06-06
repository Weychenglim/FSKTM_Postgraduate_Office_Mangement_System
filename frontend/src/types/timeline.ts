/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Semester timeline models (UC46–UC48).

export type TimelineCategory =
  | 'Supervisor Appointment'
  | 'Panel Appointment'
  | 'Document Submission'
  | 'Announcements'
  | 'Marks & Evaluation'
  | 'Research Project (P1)'
  | 'Research Project (P2)';

export type TimelineStatus = 'Completed' | 'Active' | 'Deadline' | 'Upcoming';
export type TimelineRole = 'STUDENT' | 'LECTURER' | 'OFFICE_STAFF' | 'ALL';
export type TimelineLevel = 'P1' | 'P2';

export interface TimelineEntry {
  id: string;
  event: string;
  category: TimelineCategory;
  startDate: string;
  endDate: string;
  targetRole: TimelineRole[];
  status: TimelineStatus;
}

export interface SemesterTimelineEntry {
  id: number;
  level: TimelineLevel;
  step: number;
  detail: string;
  action: string;
  deadlineStart: string;
  deadlineEnd: string;
  weekLabel: string;
  targetRoles: TimelineRole[];
  status: TimelineStatus;
  displayOrder: number;
}

export interface SemesterTimelineLevelGroup {
  level: TimelineLevel;
  entries: SemesterTimelineEntry[];
}

export interface ActiveSemesterTimeline {
  available: boolean;
  id?: number;
  semester?: string;
  session?: string;
  sourceFilename?: string;
  uploadedAt?: string;
  message?: string;
  levels: SemesterTimelineLevelGroup[];
}

export interface TimelineUploadResult {
  importedCount: number;
  timeline: ActiveSemesterTimeline;
}
