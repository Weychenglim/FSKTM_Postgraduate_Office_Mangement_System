export interface DecisionOutcome { refreshFailed?: boolean; successMessage?: string }

/** Refresh is secondary to the committed action: never offer to submit it again. */
export async function completeDecision(save: () => Promise<unknown>, refresh?: () => Promise<unknown>): Promise<DecisionOutcome> {
  await save();
  if (refresh) {
    try { await refresh(); }
    catch { return { refreshFailed: true }; }
  }
  return {};
}

export function createDecisionSubmission() {
  let pending = false;
  let blocked = false;
  return {
    isBusy: () => pending,
    isBlocked: () => blocked,
    clearBlock: () => { blocked=false; },
    async run<T>(operation: () => Promise<T>): Promise<{started: false} | {started: true; value: T}> {
      if (pending || blocked) return { started: false };
      pending = true;
      try { return { started: true, value: await operation() }; }
      catch (failure) { if (decisionFailure(failure).blocked) blocked=true; throw failure; }
      finally { pending = false; }
    },
  };
}

export function decisionFailure(failure: unknown): {message: string; blocked: boolean} {
  const record = failure && typeof failure === 'object' ? failure as {status?: number; message?: string} : null;
  return {
    message: record?.message || 'The action could not be saved. Try again.',
    blocked: record?.status === 403 || record?.status === 409,
  };
}
