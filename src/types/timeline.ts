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
  | 'Marks & Evaluation';

export type TimelineStatus = 'Completed' | 'Active' | 'Deadline' | 'Upcoming';
export type TimelineRole = 'STUDENT' | 'LECTURER';

export interface TimelineEntry {
  id: string;
  event: string;
  category: TimelineCategory;
  startDate: string;
  endDate: string;
  targetRole: TimelineRole[];
  status: TimelineStatus;
}
