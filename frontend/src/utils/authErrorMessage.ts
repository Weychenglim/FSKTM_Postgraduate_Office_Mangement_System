export function authenticationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && 'status' in error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 429) {
      return 'Too many attempts. Please wait and try again later.';
    }
    return error.message;
  }
  return fallback;
}
