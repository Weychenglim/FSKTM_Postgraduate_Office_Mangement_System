/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for staff & lecturer accounts (UC03/UC04). Swap for real API later.

import { StaffRecord } from '../types';

export const MOCK_DEPARTMENTS = [
  'Academic Affairs',
  'IT Support',
  'Administration',
  'Software Engineering',
  'Computer Science',
  'Information Systems',
];

export const MOCK_STAFF: StaffRecord[] = [
  // Office Staff
  {
    id: 'STF-2023-081',
    name: 'Sarah Ahmad',
    avatarText: 'SA',
    avatarBg: 'bg-blue-50 text-blue-600 border-blue-105',
    department: 'Academic Affairs',
    email: 'sarah.a@fsktm.edu.my',
    status: 'Active',
    role: 'Office Staff',
  },
  {
    id: 'STF-2021-042',
    name: 'Michael Lee',
    avatarText: 'ML',
    avatarBg: 'bg-slate-50 text-slate-600 border-slate-105',
    department: 'IT Support',
    email: 'm.lee@fsktm.edu.my',
    status: 'Inactive',
    role: 'Office Staff',
  },
  {
    id: 'STF-2019-112',
    name: 'Karthik Rajan',
    avatarText: 'KR',
    avatarBg: 'bg-rose-50 text-rose-600 border-rose-105',
    department: 'Administration',
    email: 'krajan@fsktm.edu.my',
    status: 'Suspended',
    role: 'Office Staff',
  },
  {
    id: 'STF-2022-015',
    name: 'Norhaliza Binti Idris',
    avatarText: 'NI',
    avatarBg: 'bg-indigo-50 text-indigo-600 border-indigo-105',
    department: 'Academic Affairs',
    email: 'norhaliza@fsktm.edu.my',
    status: 'Active',
    role: 'Office Staff',
  },
  {
    id: 'STF-2024-009',
    name: 'Steven Choong',
    avatarText: 'SC',
    avatarBg: 'bg-emerald-50 text-emerald-600 border-emerald-105',
    department: 'IT Support',
    email: 's.choong@fsktm.edu.my',
    status: 'Active',
    role: 'Office Staff',
  },
  // Lecturers
  {
    id: 'LEC-2015-092',
    name: 'Prof. Dr. Sarah Chen',
    avatarText: 'SC',
    avatarBg: 'bg-emerald-50 text-emerald-600 border-emerald-105',
    department: 'Software Engineering',
    email: 'sarah.chen@fsktm.edu.my',
    status: 'Active',
    role: 'Lecturer',
  },
  {
    id: 'LEC-2018-104',
    name: 'Assoc. Prof. Dr. Amina Malik',
    avatarText: 'AM',
    avatarBg: 'bg-purple-50 text-purple-600 border-purple-105',
    department: 'Computer Science',
    email: 'amina.malik@fsktm.edu.my',
    status: 'Active',
    role: 'Lecturer',
  },
  {
    id: 'LEC-2020-058',
    name: 'Dr. Robert Chen',
    avatarText: 'RC',
    avatarBg: 'bg-blue-50 text-blue-600 border-blue-105',
    department: 'Information Systems',
    email: 'robert.chen@fsktm.edu.my',
    status: 'Active',
    role: 'Lecturer',
  },
  {
    id: 'LEC-2021-073',
    name: 'Dr. Lim Jin Ho',
    avatarText: 'JH',
    avatarBg: 'bg-rose-50 text-rose-600 border-rose-105',
    department: 'Computer Science',
    email: 'jinho.lim@fsktm.edu.my',
    status: 'Inactive',
    role: 'Lecturer',
  },
  {
    id: 'LEC-2016-041',
    name: 'Prof. Dr. Jamaluddin',
    avatarText: 'JD',
    avatarBg: 'bg-amber-50 text-amber-600 border-amber-105',
    department: 'Information Systems',
    email: 'jamal.m@fsktm.edu.my',
    status: 'Active',
    role: 'Lecturer',
  },
  // Programme Coordinators
  {
    id: 'CRD-2017-005',
    name: 'Dr. Muhammad Fauzi',
    avatarText: 'MF',
    avatarBg: 'bg-teal-50 text-teal-600 border-teal-105',
    department: 'Academic Affairs',
    email: 'm.fauzi@fsktm.edu.my',
    status: 'Active',
    role: 'Programme Coordinator',
  },
  {
    id: 'CRD-2019-014',
    name: 'Dr. Evelyn Wong',
    avatarText: 'EW',
    avatarBg: 'bg-amber-50 text-amber-600 border-amber-105',
    department: 'Information Systems',
    email: 'evelyn.wong@fsktm.edu.my',
    status: 'Active',
    role: 'Programme Coordinator',
  },
  {
    id: 'CRD-2020-022',
    name: 'Prof. Madya Dr. Zulkifli',
    avatarText: 'ZK',
    avatarBg: 'bg-violet-50 text-violet-600 border-violet-105',
    department: 'Software Engineering',
    email: 'zulkifli.m@fsktm.edu.my',
    status: 'Active',
    role: 'Programme Coordinator',
  },
];
