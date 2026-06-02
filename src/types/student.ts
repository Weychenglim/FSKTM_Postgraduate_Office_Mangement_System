/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Student Registry domain models (UC05–UC09).

export type StudentAcademicStatus = 'Active' | 'Pending' | 'Graduated' | 'Suspended';
export type StudentAccountStatus = 'Verified' | 'Unverified' | 'Archived';

export interface StudentRecord {
  id: string; // e.g. "WGA210045"
  name: string;
  avatarText: string;
  avatarBg: string;
  programme: string;
  academicStatus: StudentAcademicStatus;
  accountStatus: StudentAccountStatus;
  semester: string;
  email: string;
  phone: string;
  supervisor: string;
  intakeDate: string;
}
