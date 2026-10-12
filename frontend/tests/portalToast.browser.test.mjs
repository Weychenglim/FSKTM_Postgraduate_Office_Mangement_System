import assert from 'node:assert/strict';

export async function assertVisibleToast(tab, message) {
  const result = await tab.playwright.evaluate(() => {
    const toast = document.querySelector('[role="alert"], [role="status"]');
    if (!toast) return null;
    const text = toast.querySelector('p');
    const style = getComputedStyle(text);
    const box = toast.getBoundingClientRect();
    return {
      text: text.textContent,
      closeButtons: toast.querySelectorAll('button[aria-label="Dismiss notification"]').length,
      xSymbols: toast.querySelectorAll('svg.lucide-x').length,
      errorXSymbols: toast.querySelectorAll('svg.lucide-circle-x,svg.lucide-x-circle').length,
      font: [style.fontSize, style.fontWeight, style.fontFamily],
      bounds: {left: box.left, right: box.right, width: box.width, viewport: innerWidth},
    };
  });
  assert.ok(result, 'Validation notification is visible');
  assert.equal(result.text, message);
  assert.equal(result.closeButtons, 1);
  assert.equal(result.xSymbols, 1);
  assert.equal(result.errorXSymbols, 0);
  assert.equal(result.font[0], '12px');
  assert.equal(result.font[1], '500');
  assert.match(result.font[2], /Inter/);
  assert.ok(result.bounds.left >= 0 && result.bounds.right <= result.bounds.viewport);
  return result;
}

export async function assertRepeatedValidation(tab) {
  const submit = tab.playwright.getByRole('button', {name:'Submit SV Request',exact:true});
  await submit.click();
  const first = await assertVisibleToast(tab, 'Provide your proposed research title.');
  await tab.playwright.getByRole('button',{name:'Dismiss notification',exact:true}).click();
  assert.equal(await tab.playwright.getByRole('alert').count(),0);
  await submit.click();
  const repeated = await assertVisibleToast(tab, 'Provide your proposed research title.');
  await tab.playwright.getByRole('button',{name:'Dismiss notification',exact:true}).click();
  return {first,repeated};
}

export async function assertToastTimerReplacement(tab) {
  const submit = tab.playwright.getByRole('button', {name:'Submit SV Request',exact:true});
  await submit.click();
  await assertVisibleToast(tab, 'Provide your proposed research title.');
  // Explicitly exercise the old timer's deadline after a newer validation error.
  await new Promise(resolve => setTimeout(resolve, 2800));
  await tab.playwright.getByRole('textbox',{name:'Research Title',exact:true}).fill('Unsubmitted notification test');
  await submit.click();
  await new Promise(resolve => setTimeout(resolve, 1600));
  const newer = await assertVisibleToast(tab, 'Provide your research area.');
  await new Promise(resolve => setTimeout(resolve, 2700));
  assert.equal(await tab.playwright.getByRole('alert').count(),0,'The latest notification eventually expires');
  await tab.playwright.getByRole('textbox',{name:'Research Title',exact:true}).fill('');
  return newer;
}
