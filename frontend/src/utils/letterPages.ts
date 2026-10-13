/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Splitting a letter into A4 pages for on-screen viewing. Sizes are CSS pixels
// at 96 per inch, so one page is 210 x 297 mm, with the same margins as the
// PDF copy (18 mm top and bottom, 16 mm left and right).

export const A4_PAGE = {
  width: 794,
  height: 1123,
  marginX: 60,
  marginY: 68,
  /** Room kept at the bottom of every page for "Page 1 of 2". */
  footer: 28,
  /** Room kept at the top of pages 2 onwards for the "continued" line. */
  continuation: 34,
} as const;

export const A4_CONTENT_WIDTH = A4_PAGE.width - A4_PAGE.marginX * 2;
const PAGE_BODY = A4_PAGE.height - A4_PAGE.marginY * 2 - A4_PAGE.footer;
export const FIRST_PAGE_CAPACITY = PAGE_BODY;
export const LATER_PAGE_CAPACITY = PAGE_BODY - A4_PAGE.continuation;

/**
 * Block indexes for each page, filling pages in order. A block never splits;
 * one taller than a whole page still gets a page of its own.
 */
export function paginateBlocks(
  heights: number[],
  firstCapacity: number = FIRST_PAGE_CAPACITY,
  laterCapacity: number = LATER_PAGE_CAPACITY,
): number[][] {
  const pages: number[][] = [[]];
  let used = 0;
  let capacity = firstCapacity;
  heights.forEach((height, index) => {
    const page = pages[pages.length - 1];
    if (page.length > 0 && used + height > capacity) {
      pages.push([index]);
      used = height;
      capacity = laterCapacity;
      return;
    }
    page.push(index);
    used += height;
  });
  return pages;
}

/** The top-level paragraphs and lists of rendered letter HTML, one string each. */
export function splitLetterBlocks(html: string): string[] {
  if (!html.trim()) return [];
  if (typeof document === 'undefined') return [html];
  const template = document.createElement('template');
  template.innerHTML = html;
  return Array.from(template.content.children).map((element) => element.outerHTML);
}
