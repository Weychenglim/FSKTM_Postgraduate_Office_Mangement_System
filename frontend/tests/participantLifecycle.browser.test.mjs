import assert from 'node:assert/strict';

// Run through the documented CUA browser API against isolated acceptance data.
// The server must delay LIFE-RESUME's detail response by four seconds.
export async function selectLatestParticipant(tab) {
  await tab.playwright.getByRole('row').filter({ hasText: 'LIFE-RESUME ·' }).getByRole('button', { name: 'Review', exact: true }).click();
  await tab.playwright.getByRole('row').filter({ hasText: 'LIFE-WITHDRAW ·' }).getByRole('button', { name: 'Review', exact: true }).click();
  await tab.playwright.getByRole('complementary').getByRole('heading', { name: 'Lifecycle Withdrawal Student', exact: true }).waitFor({ state: 'visible' });
}

// Invoke after the server log confirms the delayed request has completed.
export async function assertLatestParticipant(tab) {
  assert.equal(await tab.playwright.getByRole('complementary').getByRole('heading', { name: 'Lifecycle Withdrawal Student', exact: true }).isVisible(), true,
    'A late detail response must not replace the latest participant selection');
}

// The server must return 503 for the participant list, after an earlier success.
export async function assertFailedRefreshClosesActions(tab) {
  await tab.playwright.getByRole('button', { name: 'Refresh', exact: true }).click();
  await tab.playwright.getByText('Controlled acceptance read outage.', { exact: true }).waitFor({ state: 'visible' });
  assert.equal(await tab.playwright.getByRole('button', { name: 'Deferred', exact: true }).count(), 0,
    'Failed refresh must remove stale lifecycle actions');
  assert.equal(await tab.playwright.getByRole('button', { name: 'Review', exact: true }).count(), 0,
    'Failed refresh must remove stale participant records');
}

// Supervisor list prerequisites: the isolated Student withdrawal/graduation ran.
export async function assertSupervisorLifecycleRows(tab) {
  await tab.playwright.getByRole('heading', { name: 'Supervisor Appointment Management', exact: true }).waitFor({ state: 'visible' });
  const ended = await tab.playwright.getByRole('row').filter({ hasText: 'LIFE-GRADUATE' }).innerText();
  assert.match(ended, /Ended/i, 'Completed appointments must display Ended');
  assert.doesNotMatch(ended, /Rejected/i);
  const cancelled = await tab.playwright.getByRole('row').filter({ hasText: 'LIFE-WITHDRAW' }).filter({ hasText: 'Lifecycle Spare Supervisor' }).innerText();
  assert.match(cancelled, /Cancelled/i, 'Office-cancelled requests must display Cancelled');
  assert.doesNotMatch(cancelled, /Pending|Cancelled by Student/i);
}

export async function assertInternalDossierLifecycle(tab) {
  const text = await tab.playwright.getByRole('main').innerText();
  assert.match(text, /Academic lifecycle/);
  assert.match(text, /Acceptance: temporary study deferral/);
  assert.match(text, /Lifecycle Office/);
  assert.match(text, /Malaysia, UTC\+08:00/);
}

export async function assertPanelLifecycleRows(tab) {
  await tab.playwright.getByRole('heading', { name: 'Panel Appointment Management', exact: true }).waitFor({ state: 'visible' });
  for (const id of ['LIFE-GRADUATE','LIFE-WITHDRAW']) {
    const cancelled = await tab.playwright.getByRole('row').filter({ hasText: id }).filter({ hasText: 'Lifecycle Spare Panel' }).innerText();
    assert.match(cancelled, /Cancelled/i, 'Office-cancelled Panel recommendations must display Cancelled');
    assert.doesNotMatch(cancelled, /Approved|Cancelled by Supervisor/i);
  }
}
