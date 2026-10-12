import assert from 'node:assert/strict';

export async function assertVisibleAppointmentGuidance(tab) {
  const guidance = tab.playwright.getByRole('region', { name: 'Appointment guidance', exact: true });
  assert.equal(await guidance.count(), 1, 'Both Student appointment modules use the same guidance section');
  assert.equal(await guidance.getByRole('heading', { name: 'Appointment guidance', exact: true }).isVisible(), true, 'Guidance is visible without expanding anything');
  assert.equal(await guidance.getByRole('heading', { name: 'Approval process', exact: true }).count(), 0, 'Remove generic process filler');
  assert.equal(await guidance.getByRole('heading', { name: 'Need Assistance?', exact: true }).count(), 0, 'Retain the FAQ action without a generic help card');
  assert.equal(await guidance.locator('article').count() <= 2, true, 'Keep guidance focused');
  return { guidanceVisible: true, cards: await guidance.locator('article').count() };
}

export async function assertAppointmentRefresh(tab, sectionName) {
  const section = tab.playwright.getByRole('region', { name: sectionName, exact: true });
  await section.getByRole('button', { name: 'Refresh appointments', exact: true }).click();
  await section.getByRole('button', { name: 'Refresh appointments', exact: true }).waitFor({ state: 'visible' });
  await section.locator('article').first().waitFor({ state: 'visible' });
  assert.equal(await section.getByRole('button', { name: 'Refresh appointments', exact: true }).isEnabled(), true);
  return assertVisibleAppointmentGuidance(tab);
}

export async function assertReadableApplicationRows(tab) {
  const sizes = await tab.playwright.getByRole('region', { name: 'Previous applications', exact: true }).locator('article').evaluateAll(rows => rows.map(row => ({
    available: row.clientWidth - +(getComputedStyle(row).paddingLeft.replace('px', '')) - +(getComputedStyle(row).paddingRight.replace('px', '')),
    text: row.querySelector('p.card-value').getBoundingClientRect().width,
  })));
  assert.ok(sizes.length > 0);
  for (const size of sizes) assert.ok(size.text >= Math.min(200, size.available), `Application text is squeezed to ${size.text}px`);
  return { readableRows: sizes.length };
}
