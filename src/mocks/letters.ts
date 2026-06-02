/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Demo data for letter templates (UC40). Swap for real API responses later.

import { LetterTemplate, StudentLetterTemplate } from '../types';

export const MOCK_LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Official Confirmation Letter',
    type: 'Academic Certification',
    status: 'Active',
    lastModified: 'Oct 12, 2023',
    modifiedBy: 'Dr. Azwan',
    description: 'Standard letter for enrollment verification and status.',
    content: `CONFIRMATION OF STUDENT STATUS\n\nThis is to certify that {{STUDENT_NAME}} (ID: {{STUDENT_ID}}) is a registered full-time postgraduate student at the Faculty of Computer Science and Information Technology, University of Malaya.\n\nThe student is currently pursuing the {{PROGRAMME_NAME}} and has completed {{CREDITS_EARNED}} credits to date. Their current CGPA is {{GPA}}.\n\nShould you require further clarification, please do not hesitate to contact the Postgraduate Office at +603-7967 6300.`,
  },
  {
    id: 'tpl-2',
    name: 'Visa Support Document',
    type: 'Academic Certification',
    status: 'Draft',
    lastModified: 'Sep 28, 2023',
    modifiedBy: 'Admin',
    description: 'Required for international student visa renewals.',
    content: `STUDENT VISA EXTENSION SUPPORT\n\nThis is to confirm that {{STUDENT_NAME}} (ID: {{STUDENT_ID}}) is a full-time candidate of {{PROGRAMME_NAME}} at Faculty of Computer Science and Information Technology, UM.\n\nTheir current academic performance is satisfactory with a CGPA score of {{GPA}}. The faculty fully supports their student visa renewal application to complete the remaining credits.`,
  },
  {
    id: 'tpl-3',
    name: 'Thesis Submission Notice',
    type: 'Academic Certification',
    status: 'Active',
    lastModified: 'Aug 05, 2023',
    modifiedBy: 'Prof. Lim',
    description: 'Formal notification for viva-voce and submission.',
    content: `NOTICE OF INTENT FOR THESIS SUBMISSION\n\nThis is to acknowledge receipt of notice for thesis submission submitted by {{STUDENT_NAME}} (ID: {{STUDENT_ID}}) enrolled in the {{PROGRAMME_NAME}} program.\n\nThe candidate maintains a solid score with {{CREDITS_EARNED}} credits completed, qualifying for academic committee evaluation step.`,
  },
  {
    id: 'tpl-4',
    name: 'Bursary Clearance Form',
    type: 'Academic Certification',
    status: 'Draft',
    lastModified: 'Jul 19, 2023',
    modifiedBy: 'Admin',
    description: 'Internal financial clearance letter for graduates.',
    content: `FINANCIAL BURSARY CLEARANCE ASSURANCE\n\nTo Whom It May Concern, this letter serves to confirm that FSKTM candidate {{STUDENT_NAME}} (ID: {{STUDENT_ID}}) has settled all outstanding dues for the current academic session.`,
  },
];

export const MOCK_STUDENT_LETTER_TEMPLATES: StudentLetterTemplate[] = [
  {
    id: 'enrollment',
    name: 'Confirmation of Enrollment',
    description: 'Official status verification for current students.',
    badge: 'Standard',
    refNo: 'UMF/PG/2024/0822',
    date: 'October 24, 2023',
    body: 'This is to confirm that the following student is currently registered at the Faculty of Computer Science and Information Technology, University of Malaya:',
    notes: 'The student is expected to complete their studies by March 2025, subject to fulfillment of academic requirements.',
  },
  {
    id: 'visa',
    name: 'Visa Support Letter',
    description: 'Embassy-ready documentation for travel or extension.',
    badge: 'Priority',
    refNo: 'UMF/PG/25/V-0918',
    date: 'November 12, 2025',
    body: 'This official document is issued to support the student visa renewal application with the Immigration Department of Malaysia for the following candidate:',
    notes: "The Faculty fully supports this progress review endorsement to allow completion of the candidate's thesis viva obligations.",
  },
  {
    id: 'completion',
    name: 'Completion Letter',
    description: 'Proof of degree fulfillment post-viva.',
    badge: 'Standard',
    refNo: 'UMF/PG/25/C-3294',
    date: 'December 05, 2025',
    body: 'We are pleased to verify that the following postgraduate scholar has satisfactorily fulfilled all coursework and research publication criteria for degree conferral:',
    notes: 'The final Senate approval is pending formal degree presentation at the upcoming university graduation ceremony.',
  },
  {
    id: 'sponsorship',
    name: 'Sponsorship Claim',
    description: 'Financial clearance and fee structure details.',
    badge: 'Standard',
    refNo: 'UMF/PG/25/S-7731',
    date: 'January 14, 2026',
    body: 'This statement is generated to verify candidate standing and fee ledger invoice details for external scholarship disbursement authorities:',
    notes: 'All academic performance standards are met. The student remains in good regular registration standing.',
  },
];
