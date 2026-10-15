/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// FAQ chatbot (UC28) and its knowledge base (UC29).

export type FaqPortalLink = '' | 'SUPERVISOR_APPOINTMENTS' | 'PANEL_APPOINTMENTS' | 'LETTERS' | 'FILES' | 'ANNOUNCEMENTS';
export type FaqOutcome = 'ANSWERED' | 'CHOICES' | 'NO_MATCH';

export interface FaqLink {
  id: string;
  question: string;
}

export interface FaqAnswerCard {
  id: string;
  question: string;
  answer: string;
  category: string;
  portalLink: FaqPortalLink;
}

export interface FaqReply {
  outcome: FaqOutcome;
  answer: FaqAnswerCard | null;
  choices: FaqLink[];
  related: FaqLink[];
  contactText: string;
  mode: 'hybrid' | 'keywords';
  questionId: string;
  token: string;
}

export interface FaqStart {
  categories: { id: string; name: string; questions: FaqLink[] }[];
  commonQuestions: string[];
  contactText: string;
}

export interface FaqFeedbackReply {
  helpful: boolean;
  contactText: string;
}
