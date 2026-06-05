/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for letter templates (UC40). Used only as an offline fallback when
// the backend is unreachable — the real source is the Django `letters` API.
// The body content uses the same {{PLACEHOLDER}} tags the frontend substitutes.

import { LetterTemplate } from '../types';

export const MOCK_LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Confirmation of Enrolment',
    type: 'Academic Certification',
    status: 'Active',
    lastModified: 'Oct 12, 2023',
    modifiedBy: 'Dr. Azwan',
    description: 'Official status verification for currently registered students.',
    referencePrefix: 'UMF/PG/ENR',
    content: `To Whom It May Concern,\n\nThis is to certify that {{STUDENT_NAME}} (Matric No: {{STUDENT_ID}}) is a bona fide postgraduate student at the Faculty of Computer Science & Information Technology, Universiti Malaya.\n\nThe student is currently pursuing the {{PROGRAMME_NAME}} and their present registration status is {{CURRENT_STATUS}}. This letter is issued upon the student's request for official purposes.`,
  },
  {
    id: 'tpl-2',
    name: 'Visa Support Letter',
    type: 'Visa & Immigration',
    status: 'Active',
    lastModified: 'Sep 28, 2023',
    modifiedBy: 'Admin',
    description: 'Embassy-ready documentation supporting a student visa application.',
    referencePrefix: 'UMF/PG/VS',
    content: `To Whom It May Concern,\n\nThis letter is issued to support the student visa application of {{STUDENT_NAME}} (Matric No: {{STUDENT_ID}}) with the Immigration Department of Malaysia.\n\n{{STUDENT_NAME}} is a full-time candidate of the {{PROGRAMME_NAME}} and is currently {{CURRENT_STATUS}}. The Faculty fully supports the continuation of their studies.`,
  },
  {
    id: 'tpl-3',
    name: 'Supervisor Confirmation Letter',
    type: 'Academic Certification',
    status: 'Active',
    lastModified: 'Aug 05, 2023',
    modifiedBy: 'Prof. Lim',
    description: "Confirms the student's appointed research supervisor.",
    referencePrefix: 'UMF/PG/SUP',
    content: `To Whom It May Concern,\n\nThis is to confirm that {{STUDENT_NAME}} (Matric No: {{STUDENT_ID}}), a candidate of the {{PROGRAMME_NAME}}, is currently under the supervision of {{SUPERVISOR_NAME}} at the Faculty of Computer Science & Information Technology, Universiti Malaya.\n\nThe candidate's registration status is {{CURRENT_STATUS}}.`,
  },
  {
    id: 'tpl-4',
    name: 'Completion Letter',
    type: 'Academic Certification',
    status: 'Draft',
    lastModified: 'Jul 19, 2023',
    modifiedBy: 'Admin',
    description: 'Proof of degree fulfilment, issued after the viva.',
    referencePrefix: 'UMF/PG/CMP',
    content: `To Whom It May Concern,\n\nWe are pleased to verify that {{STUDENT_NAME}} (Matric No: {{STUDENT_ID}}) has satisfactorily fulfilled all academic requirements for the {{PROGRAMME_NAME}}.\n\nThe final Senate approval is pending formal conferral at the upcoming university graduation ceremony.`,
  },
];
