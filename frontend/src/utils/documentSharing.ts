import type { DocumentSharing, DocumentTypeOption, SharingPerson, StaffAudience, TaggableStudent } from '../types';

export const STAFF_AUDIENCES: Array<{ value: StaffAudience; label: string; hint: string }> = [
  { value: 'ACADEMIC', label: 'All lecturers and coordinators', hint: 'Everyone on the academic staff' },
  { value: 'COORDINATORS', label: 'Programme coordinators only', hint: 'Acting coordinators included' },
  { value: 'OFFICE', label: 'PG office only', hint: 'Only the office and the uploader' },
];

/** "Dr A, Dr B (co-supervisor)" for the people one sharing tick reaches. */
export function peopleLine(people: SharingPerson[], none: string): string {
  return people.length
    ? people.map(person => (person.role === 'co-supervisor' ? `${person.name} (co-supervisor)` : person.name)).join(', ')
    : none;
}

export function defaultSharing(type: DocumentTypeOption | null | undefined): DocumentSharing {
  return {
    supervisors: Boolean(type?.shareSupervisors),
    panel: Boolean(type?.sharePanel),
    coordinator: Boolean(type?.shareCoordinator),
  };
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

/** The people each tick reaches for the picked students. */
export function sharingNames(students: TaggableStudent[]): { supervisors: string[]; panel: string[]; coordinators: string[] } {
  return {
    supervisors: unique(students.flatMap(student => student.supervisors)),
    panel: unique(students.flatMap(student => student.panel)),
    coordinators: unique(students.flatMap(student => student.coordinators)),
  };
}

export function namesOrNone(names: string[], none: string): string {
  return names.length ? names.join(', ') : none;
}

/** What a student is told before uploading a type. */
export function studentAudienceSentence(type: DocumentTypeOption | null | undefined): string {
  if (!type) return '';
  const people = [
    type.shareSupervisors ? 'your supervisor' : '',
    type.sharePanel ? 'your panel member' : '',
    type.shareCoordinator ? 'your programme coordinator' : '',
  ].filter(Boolean);
  if (!people.length) return 'Seen by the PG office only.';
  const all = ['the PG office', ...people];
  return `Seen by ${all.slice(0, -1).join(', ')} and ${all[all.length - 1]}.`;
}

/** Types this staff member may pick: for staff files, or for every picked student through one of their roles. */
export function staffTypeChoices(
  types: DocumentTypeOption[],
  options: { isOffice: boolean; role: string; staffFile: boolean; students: Array<Pick<TaggableStudent, 'roles'>> },
): DocumentTypeOption[] {
  return types.filter(type => {
    if (options.staffFile) {
      if (type.kind === 'STUDENT') return false;
      if (options.isOffice) return true;
      return type.uploaders.includes('LECTURER') || (options.role === 'Programme Coordinator' && type.uploaders.includes('COORDINATOR'));
    }
    if (type.kind === 'STAFF') return false;
    if (options.isOffice) return true;
    if (!options.students.length) return type.uploaders.some(role => role === 'SUPERVISOR' || role === 'PANEL' || role === 'COORDINATOR');
    return options.students.every(student => student.roles.some(role => type.uploaders.includes(role)));
  });
}
