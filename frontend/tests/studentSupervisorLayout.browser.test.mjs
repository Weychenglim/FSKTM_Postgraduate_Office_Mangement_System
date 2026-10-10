import assert from 'node:assert/strict';

// Run against Demo Student One with its approved title and pending abstract changes.
export async function assertStudentSupervisorOverview(tab) {
  assert.equal(await tab.playwright.getByRole('combobox', { name: /^student$/i }).count(), 0, 'Students must not select their own record, including while a request is pending');
  for (const name of ['My supervisors', 'Research change requests', 'Previous applications']) {
    assert.equal(await tab.playwright.getByRole('heading', { name, exact: true }).isVisible(), true, `${name} section is visible`);
  }
  assert.equal(await tab.playwright.getByText('Timeline and progress', { exact: true }).count(), 0, 'Academic milestones belong on the Dashboard and Academic Record');
  const requests = tab.playwright.getByRole('region', { name: 'Research change requests', exact: true });
  for (const name of ['Abstract change', 'Title change']) {
    assert.equal(await requests.getByRole('heading', { name, exact: true }).isVisible(), true);
  }
  const details = requests.getByText('View details', { exact: true });
  assert.equal(await details.count(), 2);
  assert.equal(await requests.getByText('Previously', { exact: true }).first().isVisible(), false, 'Comparisons start collapsed');
  assert.equal(await requests.getByText('Submitted', { exact: false }).count() >= 2, true);
  return { sections: 3, requests: 2, comparisonsInitiallyCollapsed: true };
}
