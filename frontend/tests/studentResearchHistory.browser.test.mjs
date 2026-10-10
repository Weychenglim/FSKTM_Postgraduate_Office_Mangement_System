import assert from 'node:assert/strict';

export async function assertStudentResearchHistory(tab) {
  const history = tab.playwright.getByRole('region', { name: 'Research change requests', exact: true }).locator('details').filter({ has: tab.playwright.locator('summary').filter({ hasText: 'Research profile history' }) });
  const baseline = history.locator('article').filter({ has: tab.playwright.getByRole('heading', { name: 'Initial record', exact: true }) });
  assert.equal(await baseline.count(), 1);
  assert.equal(await baseline.getByText('Previously', { exact: true }).count(), 0, 'Initial record has no earlier profile to compare');
  assert.equal(await baseline.getByText('Recorded', { exact: true }).count(), 0, 'Initial profile fields appear once without comparison headings');
  for (const label of ['Programme', 'Title', 'Abstract']) assert.equal(await baseline.getByText(label, { exact: true }).isVisible(), true);
  const revision = history.locator('article').filter({ has: tab.playwright.getByRole('heading', { name: 'Revision 1 · Research', exact: true }) });
  assert.equal(await revision.getByText('Previously', { exact: true }).count(), 1);
  assert.equal(await revision.getByText('Recorded', { exact: true }).count(), 1);
  assert.equal(await revision.getByText('Programme', { exact: true }).count(), 0);
  assert.equal(await revision.getByText('Abstract', { exact: true }).count(), 0);
  assert.equal(await baseline.getAttribute('class'), await revision.getAttribute('class'), 'History cards share their outer presentation');
  return { initialProfileFields: 3, comparedRevisionFields: 1 };
}
