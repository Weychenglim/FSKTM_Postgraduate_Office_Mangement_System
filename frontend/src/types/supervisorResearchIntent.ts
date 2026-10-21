import type { SupervisorCourseResult, SupervisorTitleOrigin } from './supervisorSectionA';

/** Immutable submitted snapshot; shared title, area and abstract remain application fields. */
export interface SupervisorResearchIntent {
  version: 1;
  introduction: string;
  aim: string;
  researchQuestions: string;
  researchObjectives: string;
  significance: string;
  methodology: string;
  expectedOutcomes: string;
  skillsNeeded: string;
  timeline: string;
}
export type SupervisorApplicationStep = 1 | 2 | 3 | 4;
/** Owner-only incomplete text/choices; identity, declaration and files are never stored. */
export interface SupervisorApplicationDraftInput {
  version: 1;
  step: SupervisorApplicationStep;
  researchTitle: string;
  projectCodeEntries: string[];
  researchArea: string;
  researchAbstract: string;
  titleOrigin: SupervisorTitleOrigin | '';
  courseResults: SupervisorCourseResult[];
  noCoursesTaken: boolean;
  proposedSupervisorId: string | null;
  researchIntent: SupervisorResearchIntent;
}
export interface SupervisorApplicationDraftResponse {
  draft: SupervisorApplicationDraftInput | null;
  updatedAt: string | null;
}
