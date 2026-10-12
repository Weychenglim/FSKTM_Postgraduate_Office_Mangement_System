import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export function PortalModal({ isOpen, onClose, busy = false, labelledBy, children, className = 'max-w-lg p-6' }: {
  isOpen: boolean; onClose: () => void; busy?: boolean; labelledBy?: string; children: React.ReactNode; className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  const node = <dialog ref={dialog} aria-labelledby={labelledBy} aria-modal="true"
    onCancel={event => { event.preventDefault(); if (!busy) close.current(); }}
    onClick={event => {
      if (busy || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close.current();
    }}
    className={`m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white text-left font-sans shadow-xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-[2px] ${className}`}>
    {children}
  </dialog>;
  return typeof document === 'undefined' ? node : createPortal(node, document.body);
}

export function useModalTitle() { return useId(); }
