export const MAX_DOCUMENT_TAGS = 10;

/** Trim, drop a leading #, and collapse spaces. Empty when nothing is left. */
export function cleanTag(value: string): string {
  return value.trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim();
}

export function tagProblem(tag: string): string | null {
  if (tag.length < 2 || tag.length > 30) return 'A tag is 2 to 30 characters.';
  if (/[,#]/.test(tag)) return 'A tag cannot contain commas or #.';
  return null;
}

/** Add typed or pasted tags (split on commas), ignoring capitals for repeats. */
export function addTags(current: string[], raw: string): { tags: string[]; problem: string | null } {
  const tags = [...current];
  let problem: string | null = null;
  for (const part of raw.split(',')) {
    const tag = cleanTag(part);
    if (!tag) continue;
    const issue = tagProblem(tag);
    if (issue) {
      problem = issue;
      continue;
    }
    if (tags.some(existing => existing.toLowerCase() === tag.toLowerCase())) continue;
    if (tags.length >= MAX_DOCUMENT_TAGS) {
      problem = `A file can have at most ${MAX_DOCUMENT_TAGS} tags.`;
      break;
    }
    tags.push(tag);
  }
  return { tags, problem };
}
