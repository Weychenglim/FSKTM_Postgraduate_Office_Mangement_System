/** Keep the existing text API while giving students one input per code. */
export function parseProjectCourseCodes(value: string): string[] {
  const codes = value.split(',').map(code => code.trim()).filter(Boolean);
  return codes.length ? codes : [''];
}

export function serializeProjectCourseCodes(codes: string[]): string {
  return codes.map(code => code.trim()).filter(Boolean).join(', ');
}

export function validateProjectCourseCodes(codes: string[]): string | null {
  const seen = new Set<string>();
  for (const entry of codes) {
    const code = entry.trim();
    if (!code) continue;
    if (code.includes(',')) return 'Use one course code per entry.';
    if (seen.has(code.toLowerCase())) return `${code} is already entered. Remove the duplicate.`;
    seen.add(code.toLowerCase());
  }
  return serializeProjectCourseCodes(codes).length > 255 ? 'Course codes must fit within 255 characters combined.' : null;
}
