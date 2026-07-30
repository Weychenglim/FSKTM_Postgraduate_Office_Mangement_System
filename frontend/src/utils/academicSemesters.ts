const WORDS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
  SEMESTER_I: 'Semester I',
  SEMESTER_II: 'Semester II',
  SPECIAL: 'Special semester',
};

export function isConsecutiveAcademicSession(value: string): boolean {
  const match = /^(\d{4})\/(\d{4})$/.exec(value.trim());
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

export function formatSemesterLifecycle(value: string): string {
  return WORDS[value] ?? value;
}

export function validateSemesterDates(startsOn: string, endsOn: string): string | null {
  if (!startsOn || !endsOn) return 'Start and end dates are required.';
  if (endsOn < startsOn) return 'End date must be on or after the start date.';
  return null;
}

export function academicSemesterErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'status' in error
    && (error as { status?: number }).status === 409
    && 'message' in error
  ) {
    return String((error as { message: unknown }).message);
  }
  return 'Semester changes could not be saved. Try again.';
}
