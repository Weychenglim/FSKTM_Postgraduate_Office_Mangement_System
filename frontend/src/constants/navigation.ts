/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Canonical sidebar / view identifiers.
 *
 * The app uses state-based routing (no React Router), so these strings are the
 * "routes". Import the constants instead of hardcoding strings so a rename is a
 * one-line change and typos become compile errors.
 */
export const SIDEBAR_ITEMS = {
  DASHBOARD: 'Dashboard Overview',
  REGISTRY: 'Registry Management',
  FAQ_CHATBOT: 'FAQ Chatbot',
  FILE_MANAGEMENT: 'File Management',
  SUPERVISOR_APPOINTMENTS: 'Supervisor Appointments',
  LETTER_GENERATION: 'Letter Generation',
  ANNOUNCEMENTS: 'Announcements',
  MARKS_ENTRY: 'Marks Entry',
  PANEL_APPOINTMENTS: 'Panel Appointments',
  SETTINGS: 'Settings',
  NOTIFICATIONS: 'Notifications & Announcements',
} as const;

export type SidebarItemId = (typeof SIDEBAR_ITEMS)[keyof typeof SIDEBAR_ITEMS];

/** Top-level sidebar entries, in display order. */
export const SIDEBAR_MENU_ORDER: SidebarItemId[] = [
  SIDEBAR_ITEMS.DASHBOARD,
  SIDEBAR_ITEMS.REGISTRY,
  SIDEBAR_ITEMS.FAQ_CHATBOT,
  SIDEBAR_ITEMS.FILE_MANAGEMENT,
  SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS,
  SIDEBAR_ITEMS.LETTER_GENERATION,
  SIDEBAR_ITEMS.ANNOUNCEMENTS,
  SIDEBAR_ITEMS.MARKS_ENTRY,
  SIDEBAR_ITEMS.PANEL_APPOINTMENTS,
  SIDEBAR_ITEMS.SETTINGS,
];

/**
 * Maps sub-view / drawer names back to the top-level sidebar entry that should
 * appear active while they are open. Anything not listed maps to itself.
 */
export const NAV_ALIASES: Record<string, string> = {
  'Office Dashboard': SIDEBAR_ITEMS.DASHBOARD,
  'Administration Dashboard': SIDEBAR_ITEMS.DASHBOARD,
  'Timeline Management': SIDEBAR_ITEMS.DASHBOARD,
  'Upload Timeline Drawer': SIDEBAR_ITEMS.DASHBOARD,
  'Add Timeline Entry Drawer': SIDEBAR_ITEMS.DASHBOARD,
  'Edit Timeline Entry Drawer': SIDEBAR_ITEMS.DASHBOARD,
  'Registry Management': SIDEBAR_ITEMS.REGISTRY,
  'Student Registry': SIDEBAR_ITEMS.REGISTRY,
  'Register New Students': SIDEBAR_ITEMS.REGISTRY,
  'Bulk Student Import': SIDEBAR_ITEMS.REGISTRY,
  'Single Student Registration': SIDEBAR_ITEMS.REGISTRY,
  'Staff and Lecturer Accounts': SIDEBAR_ITEMS.REGISTRY,
  'Office Staff Accounts': SIDEBAR_ITEMS.REGISTRY,
  'Lecturer Accounts': SIDEBAR_ITEMS.REGISTRY,
  'Programme Coordinator Accounts': SIDEBAR_ITEMS.REGISTRY,
  'Create New Account': SIDEBAR_ITEMS.REGISTRY,
  'Add New Account': SIDEBAR_ITEMS.REGISTRY,
  'Create Office Staff Account': SIDEBAR_ITEMS.REGISTRY,
  'Create Lecturer Account': SIDEBAR_ITEMS.REGISTRY,
  'Account Detail': SIDEBAR_ITEMS.REGISTRY,
  'Academic FAQ Editor': SIDEBAR_ITEMS.FAQ_CHATBOT,
  'File Repository': SIDEBAR_ITEMS.FILE_MANAGEMENT,
  'File Repository with File Preview Drawer': SIDEBAR_ITEMS.FILE_MANAGEMENT,
  'Upload New Document': SIDEBAR_ITEMS.FILE_MANAGEMENT,
  'Announcement Management': SIDEBAR_ITEMS.ANNOUNCEMENTS,
  'Letter Template Management': SIDEBAR_ITEMS.LETTER_GENERATION,
  'Template Editor': SIDEBAR_ITEMS.LETTER_GENERATION,
  'Supervisor Appointment Management': SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS,
  'Supervisor Appointment Detail': SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS,
  'Supervisor Workload Monitoring': SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS,
  'Lecturer Supervisor Appointments': SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS,
  'Supervisor Request History': SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS,
  'Pending Supervisor Request Detail': SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS,
  'Active Supervisee Detail': SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS,
  'Panel Appointment Management': SIDEBAR_ITEMS.PANEL_APPOINTMENTS,
  'Panel Appointment Detail': SIDEBAR_ITEMS.PANEL_APPOINTMENTS,
  'Panel Workload Monitoring': SIDEBAR_ITEMS.PANEL_APPOINTMENTS,
  'Lecturer Panel Appointments': SIDEBAR_ITEMS.PANEL_APPOINTMENTS,
  'Panel Assignment Detail': SIDEBAR_ITEMS.PANEL_APPOINTMENTS,
  'Marks & Evaluation Management': SIDEBAR_ITEMS.MARKS_ENTRY,
  'Mark Entry Period Configuration': SIDEBAR_ITEMS.MARKS_ENTRY,
  'Rubric Components Management': SIDEBAR_ITEMS.MARKS_ENTRY,
  'Evaluation Task Assignment': SIDEBAR_ITEMS.MARKS_ENTRY,
  'Mark Entry Records': SIDEBAR_ITEMS.MARKS_ENTRY,
  'Mark Entry Record Detail': SIDEBAR_ITEMS.MARKS_ENTRY,
  'Lecturer Marks Entry': SIDEBAR_ITEMS.MARKS_ENTRY,
  'Mark Entry Tasks': SIDEBAR_ITEMS.MARKS_ENTRY,
  'Mark Entry Form': SIDEBAR_ITEMS.MARKS_ENTRY,
  'Notifications & Announcements': 'None',
};

/** Resolves a sub-view name to the sidebar entry that should look active. */
export const resolveSidebarItem = (item: string): string => NAV_ALIASES[item] ?? item;
