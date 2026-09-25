import type { StudentProgressDossier } from '../types';
import { request } from './apiClient';

export const getStudentProgressDossier = (
  studentId: string,
): Promise<StudentProgressDossier> =>
  request<StudentProgressDossier>(
    `/dashboard/progress/${encodeURIComponent(studentId)}/`,
  );
