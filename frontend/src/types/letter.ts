/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Letter generation domain models (UC40–UC42).

export type LetterTemplateStatus = 'Active' | 'Draft';

/**
 * A single official letter template. Staff author and manage these (name,
 * status, `content` with `{{PLACEHOLDER}}` tags); students generate a letter
 * from the `Active` ones by substituting their own details into the
 * placeholders. Shape matches the Django `LetterTemplate.to_public_dict`.
 */
export interface LetterTemplate {
  id: string;
  name: string;
  type: string;
  status: LetterTemplateStatus;
  lastModified: string;
  modifiedBy: string;
  description: string;
  content: string;
  /** Prefix used to build the student's reference number, e.g. "UMF/PG". */
  referencePrefix?: string;
}
