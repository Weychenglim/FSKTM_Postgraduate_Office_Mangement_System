import assert from 'node:assert/strict';
import { assertPortalTypography } from './portalTypography.browser.test.mjs';

// Run through authenticated CUA after appointment data finishes loading.
export async function assertLecturerAppointmentLayout(tab, module) {
  const result = await tab.playwright.evaluate(() => {
    const main = document.querySelector('#lecturer-portal-workspace') ?? document.querySelector('#lecturer-panel-module-container');
    return {
      sections: Array.from(main?.querySelectorAll('section') ?? []).map(section => section.getAttribute('aria-label') || section.querySelector('h2')?.textContent.trim()),
      guidanceHidden: Boolean(main?.querySelector('[aria-label="Appointment guidance"]')?.closest('details:not([open])')),
      guidanceCards: main?.querySelector('[aria-label="Appointment guidance"]')?.querySelectorAll('article').length,
      text: main?.textContent ?? '',
      hiddenRosterActions: innerWidth >= 1200 ? Array.from(main?.querySelectorAll('#supervisees-table-block table button') ?? []).filter(button => {
        const bounds = button.getBoundingClientRect();
        const holder = button.closest('table').parentElement.getBoundingClientRect();
        return bounds.left < holder.left || bounds.right > holder.right;
      }).length : 0,
    };
  });
  const sequence = module === 'supervisor'
    ? ['Pending Supervisor Requests','Active Supervisees','Research change requests','Supervisory teams','Appointment guidance']
    : ['Selected Panel Review Queue','Panel Recommendations for My Supervisees','My Panel Assignments','Appointment guidance'];
  let previous = -1;
  for (const title of sequence) {
    const index = result.sections.indexOf(title);
    assert.ok(index > previous, `${title} must follow the previous section: ${JSON.stringify(result.sections)}`);
    previous = index;
  }
  assert.equal(result.guidanceHidden,false);
  assert.equal(result.guidanceCards,2);
  assert.equal(result.hiddenRosterActions,0,'Desktop roster actions must fit within the table container');
  assert.doesNotMatch(result.text,/Select another supervisee above|Assignments lookup filters applied/);
  const typography = await assertPortalTypography(tab);
  return {module,sequence,guidanceCards:result.guidanceCards,...typography};
}

// Uses an eligible populated request; opens/cancels the form without submitting a decision.
export async function assertLecturerResearchRefreshPreservesDraft(tab, studentLabel) {
  const section = tab.playwright.locator('[aria-label="Research change requests"]');
  await section.locator('select').selectOption({label:studentLabel});
  await section.locator('summary').filter({hasText:'View details'}).first().waitFor({state:'visible'});
  await section.locator('summary').filter({hasText:'View details'}).first().click();
  await section.getByRole('button',{name:'Endorse',exact:true}).click();
  const draft = 'Temporary layout check; do not submit.';
  await section.locator('textarea').fill(draft);
  const selected = await section.locator('select').evaluate(element => element.value);
  await tab.playwright.getByRole('button',{name:'Refresh appointments',exact:true}).click();
  await section.locator('textarea').waitFor({state:'visible'});
  assert.equal(await section.locator('textarea').evaluate(element => element.value),draft);
  assert.equal(await section.locator('select').evaluate(element => element.value),selected);
  await section.getByRole('button',{name:'Back',exact:true}).click();
  return {selectionPreserved:true,draftPreserved:true,decisionSubmitted:false};
}
