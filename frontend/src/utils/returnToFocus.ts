import { useEffect, useRef } from 'react';

export function listenForReturnToFocus(browser: EventTarget, page: EventTarget & { readonly visibilityState: string }, reload: () => void): () => void {
  let away = page.visibilityState === 'hidden';
  const leave = () => { away = true; };
  const resume = () => {
    if (!away || page.visibilityState !== 'visible') return;
    away = false;
    reload();
  };
  const visibility = () => { if (page.visibilityState === 'hidden') leave(); else resume(); };
  browser.addEventListener('blur', leave);
  browser.addEventListener('focus', resume);
  page.addEventListener('visibilitychange', visibility);
  return () => {
    browser.removeEventListener('blur', leave);
    browser.removeEventListener('focus', resume);
    page.removeEventListener('visibilitychange', visibility);
  };
}

export function useReturnToFocusReload(reload: () => void, enabled = true) {
  const latest = useRef({ reload, enabled });
  latest.current = { reload, enabled };
  useEffect(() => listenForReturnToFocus(window, document, () => {
    if (latest.current.enabled) latest.current.reload();
  }), []);
}
