/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Page numbers for a pager: the first and last page, the current page and its
 * neighbours, with `null` where pages are skipped. The pager stays the same
 * width however many pages there are.
 */
export function pageWindow(current: number, total: number): (number | null)[] {
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const result: (number | null)[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) result.push(null);
    result.push(page);
  });
  return result;
}
