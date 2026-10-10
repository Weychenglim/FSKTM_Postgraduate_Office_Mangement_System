import React from 'react';
import { Eye } from 'lucide-react';
import type { StudentSupervisorApplication } from '../types';
import { formatSupervisorWaiting } from '../services';
import { AppointmentSection } from './AppointmentPrimitives';
import { PortalButton, StatusBadge, getStatusBadgeTone } from './PortalPrimitives';
import { partitionSupervisorApplications } from '../utils/supervisorWorkspace';

export function StudentSupervisorApplications({ applications, onViewApplication, compact = false }: {
  applications: StudentSupervisorApplication[];
  onViewApplication?: (id: string) => void;
  compact?: boolean;
}) {
  const { pending, completed } = partitionSupervisorApplications(applications);
  const groups = compact ? [{ title: 'Current request', rows: pending }] : [
    { title: 'Pending applications', rows: pending },
    { title: 'Completed application history', rows: completed },
  ];
  return <div className="space-y-5">{groups.map(group => (
    <AppointmentSection key={group.title} title={group.title}>
      {group.rows.length ? <div className="divide-y divide-slate-100">{group.rows.map(app => (
        <article key={app.id} className="flex flex-col items-start justify-between gap-3 py-3 sm:flex-row">
          <div className="min-w-0 space-y-1">
            <h3 className="card-value font-mono">{app.id}</h3>
            {!compact && <p className="card-value break-words">{app.title}</p>}
            <p className="card-description">{app.supervisor} · Submitted {app.date}</p>
            {formatSupervisorWaiting(app) !== '-' && <p className="card-description">{formatSupervisorWaiting(app)}</p>}
            {app.unavailableUntil && <p className="card-description text-amber-700">Unavailable for new appointments until {app.unavailableUntil}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <StatusBadge tone={getStatusBadgeTone(app.status)} dot>{app.status}</StatusBadge>
            <PortalButton size="sm" icon={Eye} onClick={() => app.applicationId !== undefined && onViewApplication?.(String(app.applicationId))} title={`View application ${app.id}`}>View application</PortalButton>
          </div>
        </article>
      ))}</div> : <p className="card-description">{group.title === 'Completed application history' ? 'No completed applications yet.' : 'No pending supervisor application.'}</p>}
    </AppointmentSection>
  ))}</div>;
}
