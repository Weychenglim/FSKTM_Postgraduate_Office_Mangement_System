/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Who a confirmation letter is for, as the student entered it. The labels
// mirror PURPOSES and OPTIONAL_DETAILS in backend/letters/recipients.py; a test
// fails if they drift apart.

import type { LetterRequestDetails } from '../types';

export const RECIPIENT_PURPOSE_LABELS: Record<string, string> = {
  BANKING: 'Banking',
  GOVERNMENT: 'Government agencies',
  MOBILITY: 'Mobility (exchange programme)',
  NGO: 'Non-government agencies',
  SPONSORSHIP: 'Sponsorship',
  TRANSPORTATION: 'Transportation',
};

export const OPTIONAL_DETAIL_LABELS: Record<string, string> = {
  MIN_PERIOD: 'Minimum period of study',
  MAX_PERIOD: 'Maximum period of study',
  CURRENT_SEMESTER: 'Current semester',
};

export const EMPTY_REQUEST_DETAILS: LetterRequestDetails = {
  purpose: '',
  organisation: '',
  addressLine1: '',
  addressLine2: '',
  postcode: '',
  city: '',
  state: '',
  include: [],
};

/** The address under the organisation's name, one line each, with postcode and city together. */
export function recipientAddressLines(details: Partial<LetterRequestDetails> | undefined): string[] {
  if (!details) return [];
  const cityLine = [details.postcode, details.city].filter(Boolean).join(' ');
  return [details.addressLine1, details.addressLine2, cityLine, details.state].filter((line): line is string => Boolean(line));
}

/** The optional details the student asked to show, as readable labels. */
export function chosenDetailLabels(details: Partial<LetterRequestDetails> | undefined): string[] {
  return (details?.include ?? []).map((code) => OPTIONAL_DETAIL_LABELS[code] ?? code);
}
