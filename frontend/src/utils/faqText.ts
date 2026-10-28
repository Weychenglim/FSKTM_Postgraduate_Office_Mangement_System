/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FaqPortalLink } from '../types';
import { APP_ROUTES } from '../constants/routes';

// FAQ answers use the same light formatting as letters: **bold**, "- " bullets,
// and [text](address) links. Web and email addresses written out become links.
// Anything else stays plain text, and only web, email and portal addresses
// are ever linked.

export type FaqInline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'link'; text: string; href: string; internal: boolean }
  | { kind: 'break' };

export type FaqBlock = { kind: 'paragraph'; parts: FaqInline[] } | { kind: 'list'; items: FaqInline[][] };

const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>"]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const TRAILING = /[.,;:!?)\]]+$/;
const BULLET = /^\s*(?:[-*•])\s+(.*)$/;

export function safeHref(raw: string): { href: string; internal: boolean } | null {
  const href = raw.trim();
  if (/^https?:\/\/[^\s]+$/i.test(href) || /^mailto:[^\s]+$/i.test(href)) return { href, internal: false };
  if (/^\/(?!\/)[^\s]*$/.test(href)) return { href, internal: true };
  return null;
}

export function parseInline(text: string): FaqInline[] {
  const parts: FaqInline[] = [];
  let last = 0;
  const push = (part: FaqInline) => {
    const previous = parts[parts.length - 1];
    if (part.kind === 'text' && previous?.kind === 'text') previous.text += part.text;
    else if (part.kind !== 'text' || part.text) parts.push(part);
  };
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    push({ kind: 'text', text: text.slice(last, start) });
    const [whole, bold, label, address, url, email] = match;
    if (bold !== undefined) {
      push({ kind: 'bold', text: bold });
    } else if (label !== undefined) {
      const safe = safeHref(address);
      push(safe ? { kind: 'link', text: label, ...safe } : { kind: 'text', text: label });
    } else if (url !== undefined) {
      const tail = url.match(TRAILING)?.[0] ?? '';
      const clean = url.slice(0, url.length - tail.length);
      push({ kind: 'link', text: clean, href: clean, internal: false });
      push({ kind: 'text', text: tail });
    } else if (email !== undefined) {
      push({ kind: 'link', text: email, href: `mailto:${email}`, internal: false });
    } else {
      push({ kind: 'text', text: whole });
    }
    last = start + whole.length;
  }
  push({ kind: 'text', text: text.slice(last) });
  return parts;
}

export function parseFaqText(text: string): FaqBlock[] {
  const blocks: FaqBlock[] = [];
  let lines: string[] = [];
  const flush = () => {
    if (!lines.length) return;
    const parts: FaqInline[] = [];
    lines.forEach((line, index) => {
      if (index) parts.push({ kind: 'break' });
      parts.push(...parseInline(line));
    });
    blocks.push({ kind: 'paragraph', parts });
    lines = [];
  };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const bullet = raw.match(BULLET);
    if (bullet) {
      flush();
      const previous = blocks[blocks.length - 1];
      const item = parseInline(bullet[1].trim());
      if (previous?.kind === 'list') previous.items.push(item);
      else blocks.push({ kind: 'list', items: [item] });
    } else if (raw.trim()) {
      lines.push(raw.trim());
    } else {
      flush();
    }
  }
  flush();
  return blocks;
}

export const FAQ_PORTAL_LINKS: Record<Exclude<FaqPortalLink, ''>, { label: string; route: string }> = {
  SUPERVISOR_APPOINTMENTS: { label: 'Open Supervisor Appointments', route: APP_ROUTES.supervisorAppointments },
  PANEL_APPOINTMENTS: { label: 'Open Panel Appointments', route: APP_ROUTES.panelAppointments },
  LETTERS: { label: 'Open Letter Generation', route: APP_ROUTES.letters },
  FILES: { label: 'Open File Submission', route: APP_ROUTES.files },
  ANNOUNCEMENTS: { label: 'Open Announcements', route: APP_ROUTES.announcements },
};

const comparable = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Whether to show "Matched: ..." above an answer: only when the student asked differently. */
export const askedDifferently = (asked: string, question: string): boolean => comparable(asked) !== comparable(question);
