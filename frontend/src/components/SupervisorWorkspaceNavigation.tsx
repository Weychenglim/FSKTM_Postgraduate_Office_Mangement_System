import React from 'react';
import { BookOpen, ClipboardList, ArrowRightLeft, UsersRound, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { supervisorWorkspaceLinks, supervisorWorkspaceSection } from '../utils/supervisorWorkspace';
import type { SupervisorWorkspaceRole } from '../utils/supervisorWorkspace';

export function SupervisorWorkspaceNavigation({ role }: { role: SupervisorWorkspaceRole }) {
  const { pathname } = useLocation();
  const selected = supervisorWorkspaceSection(role, pathname);
  const icons: Record<string, LucideIcon> = { overview: role === 'Student' ? UsersRound : LayoutDashboard, applications: ClipboardList, requests: ClipboardList, supervisees: UsersRound, research: role === 'Programme Coordinator' ? ArrowRightLeft : BookOpen };
  return <nav aria-label="Supervisor workspace" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
    {supervisorWorkspaceLinks(role).map(item => { const Icon = icons[item.section]; return <Link key={item.section} to={item.route}
      aria-current={selected === item.section ? 'page' : undefined}
      className={`card-value inline-flex items-center gap-2 rounded-lg px-4 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy ${selected === item.section ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-white'}`}>
      <Icon aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0" strokeWidth={1.75} />{item.label}
    </Link>; })}
  </nav>;
}
