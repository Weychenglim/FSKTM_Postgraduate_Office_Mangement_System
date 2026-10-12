import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortalToast } from './PortalPrimitives';

assert.equal(renderToStaticMarkup(<PortalToast message={null} />), '');
for (const tone of ['danger', 'info', 'success', 'warning'] as const) {
  const html = renderToStaticMarkup(<PortalToast message="Provide a title <before submitting>." tone={tone} />);
  assert.equal((html.match(/<button\b/g) ?? []).length, 1, `${tone}: exactly one dismiss control`);
  assert.equal((html.match(/lucide-x(?:\s|&quot;|")/g) ?? []).length, 1, `${tone}: exactly one X symbol`);
  assert.doesNotMatch(html, /lucide-circle-x|lucide-x-circle/, 'Error status must not resemble another close control');
  assert.match(html, /aria-label="Dismiss notification"/);
  assert.match(html, /Provide a title &lt;before submitting&gt;\./);
  assert.match(html, tone === 'danger' ? /role="alert"/ : /role="status"/);
  assert.match(html, /aria-atomic="true"/);
  assert.match(html, /max-w-\[calc\(100vw-2rem\)\]/, 'Long/mobile notifications stay within the viewport');
}
console.log('Toast tones expose one close symbol, appropriate announcements, safe text and viewport bounds');
