export const MAX_TIMELINE_UPLOAD_BYTES = 10 * 1024 * 1024;


export function validateTimelineUploadFile(
  file: Pick<File, 'name' | 'size'>,
): string | null {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return 'Only Excel .xlsx timeline files are accepted.';
  }
  if (file.size > MAX_TIMELINE_UPLOAD_BYTES) {
    return 'Timeline file must be 10 MB or smaller.';
  }
  return null;
}
