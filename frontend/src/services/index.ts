/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Barrel for the API service layer. Components should import data access from
// here, e.g. `import { getStudents } from '../services'`.

export * from './apiClient';
export * as authApi from './authApi';
export * from './studentsApi';
export * from './lecturersApi';
export * from './appointmentsApi';
export * from './marksApi';
export * from './filesApi';
export * from './announcementsApi';
export * from './notificationsApi';
export * from './timelineApi';
export * from './lettersApi';
export * from './workflowReportsApi';
export * from './studentProgressApi';
export * from './academicSemestersApi';
export * from './participantLifecycleApi';
export * from './workflowReconciliationApi';
export * from './lecturerCapacityApi';
