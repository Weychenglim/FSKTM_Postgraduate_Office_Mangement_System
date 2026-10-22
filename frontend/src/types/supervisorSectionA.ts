export interface SupervisorStudentParticularsData {
  name: string;
  studentId: string;
  programme: string;
  semester: string;
  identityNumber: string;
  identityType: 'NRIC' | 'PASSPORT' | '';
  email: string;
  phone: string;
  address: string;
}

export interface SupervisorCourseResult {
  courseName: string;
  courseCode: string;
  semesterSession: string;
  grade: string;
}

export type SupervisorTitleOrigin = 'STUDENT' | 'SUPERVISOR';

export interface SupervisorSectionAInput {
  version: 1;
  titleOrigin: SupervisorTitleOrigin;
  noCoursesTaken: boolean;
  courseResults: SupervisorCourseResult[];
  declarationAccepted: true;
}

export interface SupervisorSectionASnapshot {
  version: 1;
  studentParticulars: SupervisorStudentParticularsData;
  titleOrigin: SupervisorTitleOrigin;
  noCoursesTaken: boolean;
  courseResults: SupervisorCourseResult[];
  declaration: { text: string; acceptedAt: string; acceptedBy: number };
  capturedAt: string;
}

export interface SupervisorApplicationPrefill {
  studentParticulars: SupervisorStudentParticularsData;
  proposalRequirementCode: string | null;
  declarationText: string;
}

export interface SupervisorSectionADraft {
  titleOrigin: SupervisorTitleOrigin | '';
  noCoursesTaken: boolean;
  courseResults: SupervisorCourseResult[];
  declarationAccepted: boolean;
}
