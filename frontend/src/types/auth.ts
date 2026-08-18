/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Authentication & role identity models.

export type UserRole = 'Office Staff/Admin' | 'Programme Coordinator' | 'Lecturer' | 'Student';

export interface DemoUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  department: string;
  avatarUrl?: string;
  studentId?: string;
  staffId?: string;
  participantLifecycleStatus?: string | null;
  accountAccess?: 'ACTIVE' | 'READ_ONLY' | 'DISABLED';
}
