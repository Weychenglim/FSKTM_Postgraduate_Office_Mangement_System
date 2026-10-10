import React from 'react';
import { Link, useLocation } from 'react-router';
import { supervisorWorkspaceLinks, supervisorWorkspaceSection } from '../utils/supervisorWorkspace';

export function SupervisorWorkspaceNavigation({ role }: { role: 'Student' | 'Lecturer' }) {
  const { pathname } = useLocation();
  const selected = supervisorWorkspaceSection(role, pathname);
  return <nav aria-label="Supervisor workspace" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
    {supervisorWorkspaceLinks(role).map(item => <Link key={item.section} to={item.route}
      aria-current={selected === item.section ? 'page' : undefined}
      className={`card-value rounded-lg px-4 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy ${selected === item.section ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-white'}`}>
      {item.label}
    </Link>)}
  </nav>;
}
