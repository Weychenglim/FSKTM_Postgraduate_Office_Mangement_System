/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// FAQ chatbot API (UC28). Live data only: errors are shown with Retry.

import type { FaqFeedbackReply, FaqReply, FaqStart } from '../types';
import { request } from './apiClient';

const BASE = '/faq';

const post = <T>(path: string, body: unknown) => request<T>(`${BASE}${path}`, { method: 'POST', body: JSON.stringify(body) });

export function getFaqStart(): Promise<FaqStart> {
  return request<FaqStart>(`${BASE}/start/`);
}

export function askFaq(question: string): Promise<FaqReply> {
  return post<FaqReply>('/ask/', { question });
}

/** A choice or related question the student picked. */
export function openFaqAnswer(entryId: string, asked?: { questionId: string; token: string }): Promise<FaqReply> {
  return post<FaqReply>('/ask/', { entryId, ...(asked ?? {}) });
}

export function sendFaqFeedback(questionId: string, token: string, helpful: boolean): Promise<FaqFeedbackReply> {
  return post<FaqFeedbackReply>('/feedback/', { questionId, token, helpful });
}
