export const MAX_CACHED_PAGES = 10;
export const MAX_ZIP_FILES = 50;

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the preview.'));
    reader.readAsDataURL(blob);
  });
}

export function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page) || pageCount < 1) return 1;
  return Math.min(Math.max(Math.round(page), 1), pageCount);
}

/** Keeps the most recently seen preview pages, so paging back is instant without holding every page. */
export class PreviewPageCache {
  private pages = new Map<string, string>();

  constructor(private readonly limit = MAX_CACHED_PAGES) {}

  get(key: string): string | undefined {
    const value = this.pages.get(key);
    if (value !== undefined) {
      this.pages.delete(key);
      this.pages.set(key, value);
    }
    return value;
  }

  set(key: string, value: string): void {
    this.pages.delete(key);
    this.pages.set(key, value);
    while (this.pages.size > this.limit) {
      const oldest = this.pages.keys().next().value;
      if (oldest === undefined) break;
      this.pages.delete(oldest);
    }
  }

  get size(): number {
    return this.pages.size;
  }
}

export function zipFileName(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '00';
  return `documents-${part('year')}${part('month')}${part('day')}-${part('hour')}${part('minute')}.zip`;
}

/** Toggle one id in a selection, refusing to grow past the ZIP limit. */
export function toggleSelection(selected: number[], id: number): { selected: number[]; full: boolean } {
  if (selected.includes(id)) return { selected: selected.filter(item => item !== id), full: false };
  if (selected.length >= MAX_ZIP_FILES) return { selected, full: true };
  return { selected: [...selected, id], full: false };
}
