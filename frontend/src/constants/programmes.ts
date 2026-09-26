export const PROGRAMME_OPTIONS = [
  'MASTER OF DATA SCIENCE (COURSEWORK)',
  'MASTER OF CYBER SECURITY (COURSEWORK)',
  'MASTER OF ARTIFICIAL INTELLIGENCE (COURSEWORK)',
] as const;

export type ProgrammeOption = typeof PROGRAMME_OPTIONS[number];


export function normaliseProgramme(value: string): ProgrammeOption | null {
  const cleaned = value.trim().toUpperCase();
  return PROGRAMME_OPTIONS.find((p) => p.toUpperCase() === cleaned) ?? null;
}
