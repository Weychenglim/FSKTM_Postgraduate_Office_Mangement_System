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
  startDate?: string | null;
  expiryDate?: string | null;
  createdBy?: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  /** Number of recipients reached, set on the create response when published. */
  deliveredTo?: number;
}
