import assert from 'node:assert/strict';
import { assertPortalTypography } from './portalTypography.browser.test.mjs';

// Invoke through authenticated CUA after opening a Lecturer team and its activity/date sections.
export async function assertLecturerExpandedTeamCard(tab) {
  const result = await tab.playwright.locator('#supervisory-team-management > details[open]').evaluate(card => {
    const disclosures = Array.from(card.querySelectorAll(':scope > div > details'));
    const activity = disclosures.find(details => details.querySelector('summary')?.textContent.includes('Appointment activity'));
    const dates = disclosures.find(details => details.querySelector('summary')?.textContent.includes('Semester dates'));
    return {
      labels: disclosures.map(details => details.querySelector('summary')?.textContent.trim()),
      activityNested: activity?.querySelectorAll('details').length ?? 0,
      activityRows: Array.from(activity?.querySelectorAll('li') ?? []).map(row => row.textContent),
      dateRows: Array.from(dates?.querySelectorAll('li') ?? []).map(row => row.textContent),
      profileClosed: !disclosures.find(details => details.querySelector('summary')?.textContent === 'Research profile')?.open,
      text: card.textContent,
      datesExplanation: dates?.querySelector('p')?.textContent,
      activityOpen: activity?.open,
      datesOpen: dates?.open,
    };
  });
  assert.ok(result.labels.includes('Research profile'));
  assert.ok(result.labels.some(label => label.startsWith('Appointment activity')));
  assert.ok(result.labels.some(label => label.startsWith('Semester dates')));
  assert.equal(result.activityNested,0,'Activity must open directly without another nested disclosure');
  assert.equal(result.profileClosed,true,'Full research profile remains closed for the overview check');
  assert.equal(result.activityOpen,true);
  assert.equal(result.datesOpen,true);
  assert.ok(result.activityRows.length > 0);
  assert.ok(result.dateRows.length > 0);
  for (const row of result.activityRows) assert.doesNotMatch(row,/Demo: Research proposal preparation|Demo: Literature review|Demo: Research progress discussion|Demo: Final project report/);
  for (const row of result.dateRows) assert.doesNotMatch(row,/Primary supervisor application|Panel recommendation/);
  assert.match(result.datesExplanation,/Office-managed dates|do not measure this student/);
  assert.doesNotMatch(result.text,/Timeline and progress/);
  return {activityRows:result.activityRows.length,semesterDates:result.dateRows.length,nestedActivity:false,...await assertPortalTypography(tab)};
}
