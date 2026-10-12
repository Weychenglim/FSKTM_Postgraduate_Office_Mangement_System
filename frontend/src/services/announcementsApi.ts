/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Announcement API (UC45 / UC42). Talks to the real Django `announcements`
// backend (`/api/announcements/`). Reads fall back to mock data when the
// backend is unreachable *and* mocks are enabled, so the UI still renders
// offline; writes always go to the backend (they require an authenticated
// sender — office staff, coordinator, or lecturer).

import { AnnouncementItem } from '../types';
import { MOCK_ANNOUNCEMENTS } from '../mocks/announcements';
import {
  USE_MOCKS,
  isTransportFailure,
  mockResponse,
  request,
  requestMultipart,
  requestBlob,
} from './apiClient';

/** Payload for publishing / drafting an announcement (frontend field names). */
export interface AnnouncementInput {
  title: string;
  content: string;
  target: AnnouncementItem['target'];
  priority: AnnouncementItem['priority'];
  status: AnnouncementItem['status'];
  attachment?: File | null;
}

/** Senders get every broadcast; students get only the live feed addressed to them. */
export async function getAnnouncements(): Promise<AnnouncementItem[]> {
  try {
    return await request<AnnouncementItem[]>('/announcements/');
  } catch (err) {
    // Only a genuine transport failure may fall back; a 401/403 must surface.
    if (USE_MOCKS && isTransportFailure(err)) return mockResponse(MOCK_ANNOUNCEMENTS);
    throw err;
  }
}

/** Publish or save a draft. Sent as multipart so a file attachment can ride along. */
export async function createAnnouncement(
  input: AnnouncementInput,
): Promise<AnnouncementItem> {
  const form = new FormData();
  form.append('title', input.title);
  form.append('content', input.content ?? '');
  form.append('target', input.target);
  form.append('priority', input.priority);
  form.append('status', input.status);
  if (input.attachment) form.append('attachment', input.attachment);
  return requestMultipart<AnnouncementItem>('/announcements/', form);
}

/** Update an existing announcement (edit a draft, or publish it). Multipart so a
 *  replacement attachment can ride along; omit `attachment` to keep the current one. */
export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput,
): Promise<AnnouncementItem> {
  const form = new FormData();
  form.append('title', input.title);
  form.append('content', input.content ?? '');
  form.append('target', input.target);
  form.append('priority', input.priority);
  form.append('status', input.status);
  if (input.attachment) form.append('attachment', input.attachment);
  return requestMultipart<AnnouncementItem>(`/announcements/${id}/`, form, {
    method: 'PATCH',
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await request<void>(`/announcements/${id}/`, { method: 'DELETE' });
}

/** Download an announcement's attachment (auth-checked) and save it to disk. */
export async function downloadAnnouncementAttachment(
  id: string,
  filename: string,
): Promise<void> {
  const blob = await requestBlob(`/announcements/${id}/attachment/`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'attachment';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
