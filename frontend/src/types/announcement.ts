/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Announcement domain models (UC45).

export type AnnouncementTarget = 'All Students' | 'Lecturers' | 'Staff' | 'Coordinators' | 'All';
export type AnnouncementPriority = 'Urgent' | 'Info' | 'General';
export type AnnouncementStatus = 'Active' | 'Draft' | 'Scheduled' | 'Expired';

export interface AnnouncementItem {
  id: string;
  title: string;
  summary: string;
  target: AnnouncementTarget;
  priority: AnnouncementPriority;
  dateCreated: string;
  status: AnnouncementStatus;
  // Optional fields returned by the backend (absent in older mock rows).
  content?: string;
  createdBy?: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  /** Number of recipients reached, set on the create response when published. */
  deliveredTo?: number;
  /** Author's user id, and whether the caller may edit, publish or remove it. */
  createdById?: string | null;
  canManage?: boolean;
  /** When it publishes (null: when saved) and expires (null: never), with offsets. */
  publishAt?: string | null;
  expiresAt?: string | null;
  /** Registry targeting for student announcements; empty means every student. */
  targetProgrammes?: string[];
  targetIntakes?: string[];
}

/** What a student announcement can be narrowed to. */
export interface AnnouncementAudienceOptions {
  programmes: string[];
  intakes: string[];
}
