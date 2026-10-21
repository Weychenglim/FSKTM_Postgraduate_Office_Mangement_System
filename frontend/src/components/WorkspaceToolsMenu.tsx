import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { PortalButton } from './PortalPrimitives';

export interface WorkspaceToolGroup {
  label: string;
  items: { title: string; description: string; icon: LucideIcon; onSelect: () => void }[];
}

/** Return the menu offset from the trigger, retaining a 16px viewport inset. */
export function workspaceToolsMenuLeft(triggerLeft: number, triggerRight: number, viewportWidth: number, menuWidth = 256): number {
  const width = Math.min(menuWidth, Math.max(0, viewportWidth - 32));
  return Math.max(16, Math.min(triggerRight - width, viewportWidth - 16 - width)) - triggerLeft;
}

export function WorkspaceToolsMenu({ label, groups }: { label: string; groups: WorkspaceToolGroup[] }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, width: 288 });
  const wrapper = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const positionMenu = () => {
      const anchor = wrapper.current?.querySelector<HTMLButtonElement>('[data-tools-trigger]');
      if (!anchor || !wrapper.current) return;
      const trigger = anchor.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const width = Math.min(288, Math.max(0, viewportWidth - 32));
      setMenuPosition({
        left: trigger.left - wrapper.current.getBoundingClientRect().left
          + workspaceToolsMenuLeft(trigger.left, trigger.right, viewportWidth, width),
        width,
      });
    };
    positionMenu();
    window.addEventListener('resize', positionMenu);
    return () => window.removeEventListener('resize', positionMenu);
  }, [open]);

  const itemClass = 'group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30';
  const iconClass = 'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/70 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:text-brand-navy';
  const visibleGroups = groups.filter(group => group.items.length);
  return <div ref={wrapper} className="relative" onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      wrapper.current?.querySelector<HTMLButtonElement>('[data-tools-trigger]')?.focus();
    }
  }}>
    <PortalButton data-tools-trigger variant="secondary" size="sm" icon={ChevronDown} iconPosition="right"
      aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}>Tools</PortalButton>
    <div id={menuId} role="group" aria-label={label} hidden={!open}
      style={{ left: menuPosition.left, width: menuPosition.width }}
      className="absolute top-full z-30 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/10">
      {visibleGroups.map((group, index) => <React.Fragment key={group.label}>
        {index ? <div className="mx-3 my-2 border-t border-slate-100" /> : null}
        <p className="px-3 pb-1 pt-1.5 text-xs font-medium text-slate-500">{group.label}</p>
        {group.items.map(({ title, description, icon: Icon, onSelect }) => <button key={title} type="button" className={itemClass} onClick={() => { setOpen(false); onSelect(); }}>
          <span className={iconClass}><Icon aria-hidden="true" className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block text-sm font-semibold leading-5 text-slate-800">{title}</span><span className="mt-0.5 block text-xs font-normal leading-5 text-slate-500">{description}</span></span>
        </button>)}
      </React.Fragment>)}
    </div>
  </div>;
}
