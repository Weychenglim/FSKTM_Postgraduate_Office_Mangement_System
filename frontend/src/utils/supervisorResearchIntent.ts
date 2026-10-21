import type { SupervisorApplicationDraftInput, SupervisorResearchIntent } from '../types/supervisorResearchIntent';

export const RESEARCH_INTENT_FIELDS = [
  { key: 'introduction', label: 'Introduction', group: 'Background and purpose', help: 'Describe the background, context and research problem.' },
  { key: 'aim', label: 'Statement of aim', group: 'Background and purpose', help: 'State the overall purpose of your research.' },
  { key: 'significance', label: 'Significance of the research', group: 'Background and purpose', help: 'Explain why this research matters and who may benefit.' },
  { key: 'researchQuestions', label: 'Research questions', group: 'Questions and objectives', help: 'List the questions your research will address.' },
  { key: 'researchObjectives', label: 'Research objectives', group: 'Questions and objectives', help: 'Describe the specific objectives of your research.' },
  { key: 'methodology', label: 'Methodology', group: 'Research plan', help: 'Describe your planned methods, data and approach.' },
  { key: 'expectedOutcomes', label: 'Expected outcomes', group: 'Research plan', help: 'Describe the results or contributions you expect.' },
  { key: 'skillsNeeded', label: 'Skills needed', group: 'Research plan', help: 'Describe the skills and experience you bring to this research, and any skills you need to develop.' },
  { key: 'timeline', label: 'Timeline', group: 'Research plan', help: 'Outline the planned activities, milestones and timeframes.' },
] as const;
export type ResearchIntentField = typeof RESEARCH_INTENT_FIELDS[number]['key'];

export function emptySupervisorResearchIntent(): SupervisorResearchIntent {
  return { version: 1, introduction: '', aim: '', researchQuestions: '', researchObjectives: '', significance: '', methodology: '', expectedOutcomes: '', skillsNeeded: '', timeline: '' };
}

export function validateSupervisorResearchIntent(value: unknown): { field?: ResearchIntentField; message: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { message: 'Complete your Research Intent.' };
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || Object.keys(data).length !== 10 || Object.keys(data).some(key => key !== 'version' && !RESEARCH_INTENT_FIELDS.some(field => field.key === key))) return { message: 'Research Intent must use the supported version and fields.' };
  for (const { key, label } of RESEARCH_INTENT_FIELDS) {
    const text = data[key];
    if (typeof text !== 'string' || !text.trim()) return { field: key, message: `${label} is required.` };
    if (text.trim().length > 10000) return { field: key, message: `${label} must not exceed 10,000 characters.` };
  }
  return null;
}

export function cleanSupervisorResearchIntent(value: SupervisorResearchIntent): SupervisorResearchIntent {
  return Object.fromEntries([['version', 1], ...RESEARCH_INTENT_FIELDS.map(({ key }) => [key, value[key].trim()])]) as unknown as SupervisorResearchIntent;
}

/** Compare saved writing exactly without depending on JSONB object-key order or progress alone. */
export function supervisorApplicationDraftFingerprint(draft: SupervisorApplicationDraftInput): string {
  return JSON.stringify([
    draft.version, draft.researchTitle, draft.projectCodeEntries, draft.researchArea, draft.researchAbstract,
    draft.titleOrigin, draft.noCoursesTaken, draft.proposedSupervisorId,
    draft.courseResults.map(row => [row.courseName, row.courseCode, row.semesterSession, row.grade]),
    draft.researchIntent.version, ...RESEARCH_INTENT_FIELDS.map(({ key }) => draft.researchIntent[key]),
  ]);
}
