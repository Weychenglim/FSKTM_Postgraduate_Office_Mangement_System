import type { AcademicSemester, CapacityHistoryQuery, SemesterCapacityPlan } from '../types';

/** Traverse the existing bounded array contract; a short page marks completion. */
export async function readCompleteCapacityHistory<T>(read: (query: Required<CapacityHistoryQuery>) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const page = await read({limit, offset});
    rows.push(...page);
    if (page.length < limit) return rows;
  }
}

export function publishedOperationalPolicy(plans: SemesterCapacityPlan[]) {
  return plans.find(plan => plan.lifecycleStatus === 'PUBLISHED' && plan.isCurrentPublished) ?? null;
}

/** Match backend ordering: latest strictly-prior published semester, then plan ID. */
export async function findEligiblePriorCapacitySource(semesters: AcademicSemester[], target: AcademicSemester, readPlans: (semesterId: number) => Promise<SemesterCapacityPlan[]>) {
  const prior = semesters.filter(semester => semester.id !== target.id && semester.endsOn < target.startsOn)
    .sort((a,b) => b.endsOn.localeCompare(a.endsOn) || b.id - a.id);
  for (const semester of prior) {
    const published = (await readPlans(semester.id)).filter(plan => plan.lifecycleStatus === 'PUBLISHED').sort((a,b) => b.id - a.id);
    if (published.length) return published[0];
  }
  return null;
}

/** Cancellation preserves historical identity and is allowed for uncancelled windows. */
export function canCancelHistoricalRestriction(window: {isCancelled: boolean}) {
  return !window.isCancelled;
}
