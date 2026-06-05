/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Staff & Lecturer account models (UC03, UC04). Covers Office Staff,
// Lecturer, and Programme Coordinator accounts shown in the registry.

export type StaffStatus = 'Active' | 'Inactive' | 'Suspended';
export type StaffRoleLabel = 'Office Staff' | 'Lecturer' | 'Programme Coordinator';

export interface StaffRecord {
  id: string;
  name: string;
  avatarText: string;
  avatarBg: string;
  department: string;
  email: string;
  status: StaffStatus;
  role: StaffRoleLabel;
}
