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
}

export const DEMO_CREDENTIALS: Record<string, { email: string; pass: string; user: DemoUser }> = {
  admin: {
    email: "admin@siswa.um.edu.my",
    pass: "staffAdmin2026",
    user: {
      id: "usr001",
      email: "admin@siswa.um.edu.my",
      role: "Office Staff/Admin",
      fullName: "Puan Noraini binti Kamaruddin",
      department: "Postgraduate Office Division",
      staffId: "M10492"
    }
  },
  coordinator: {
    email: "coordinator@siswa.um.edu.my",
    pass: "coordinator2026",
    user: {
      id: "usr002",
      email: "coordinator@siswa.um.edu.my",
      role: "Programme Coordinator",
      fullName: "Dr. Adrian Tan Kok Seng",
      department: "Software Engineering Division",
      staffId: "C29402"
    }
  },
  lecturer: {
    email: "lecturer@siswa.um.edu.my",
    pass: "lecturer2026",
    user: {
      id: "usr003",
      email: "lecturer@siswa.um.edu.my",
      role: "Lecturer",
      fullName: "Prof. Dr. Ahmad Shahrir",
      department: "Artificial Intelligence Department",
      staffId: "L84920"
    }
  },
  student: {
    email: "WEA200192@siswa.um.edu.my",
    pass: "student2026",
    user: {
      id: "usr004",
      email: "WEA200192@siswa.um.edu.my",
      role: "Student",
      fullName: "Fatimah Al-Zahra",
      department: "Master of Computer Science (By Coursework)",
      studentId: "WEA200192"
    }
  }
};
