/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Calendar, Info, Mail, Send, User } from 'lucide-react';

import type { ActiveSuperviseeRow } from '../types';
import { PageHeader, PortalButton, StatusBadge } from './PortalPrimitives';

interface ActiveSuperviseeDetailProps {
  onBack: () => void;
  onRecommendPanel?: (studentId: string) => void;
  supervisee: ActiveSuperviseeRow;
}

const initialsFor = (name: string): string => (
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
);

const DetailField: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div>
    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
      {label}
    </dt>
    <dd className="mt-1 text-xs font-bold leading-relaxed text-slate-700">
      {value || 'Not recorded'}
    </dd>
  </div>
);

export const ActiveSuperviseeDetail: React.FC<
  ActiveSuperviseeDetailProps
> = ({ onBack, onRecommendPanel, supervisee }) => (
  <div
    id="active-supervisee-detail-page"
    className="space-y-6 animate-fade-in text-left"
  >
    <PageHeader
      title="Active Supervisee Detail"
      subtitle="Persisted student, research, and supervisor appointment information."
      backLabel="Back to Supervisor Appointments"
      onBack={onBack}
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="info" dot>
            {supervisee.status}
          </StatusBadge>
          <PortalButton
            variant="primary"
            icon={Send}
            onClick={() => onRecommendPanel?.(supervisee.studentId)}
          >
            Recommend Panel
          </PortalButton>
        </div>
      )}
    />

    <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="border border-slate-200 bg-white p-6 lg:col-span-5">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-black text-blue-700">
            {initialsFor(supervisee.studentName)}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-brand-navy">
              {supervisee.studentName}
            </h2>
            <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">
              {supervisee.studentId}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DetailField label="Programme" value={supervisee.programme} />
          <DetailField label="Intake" value={supervisee.semester} />
          <DetailField
            label="Email"
            value={(
              <span className="inline-flex items-center gap-2 break-all">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {supervisee.email}
              </span>
            )}
          />
          <DetailField
            label="Supervisor"
            value={(
              <span className="inline-flex items-center gap-2">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {supervisee.supervisorName}
              </span>
            )}
          />
        </dl>
      </div>

      <div className="border border-slate-200 bg-white p-6 lg:col-span-7">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <BookOpen className="h-4 w-4 text-brand-navy" />
          <h2 className="text-xs font-black uppercase tracking-wider text-brand-navy">
            Research Information
          </h2>
        </div>
        <div className="mt-5 space-y-5">
          <DetailField
            label="Research title"
            value={supervisee.researchTitle}
          />
          <DetailField
            label="Research area"
            value={supervisee.researchArea}
          />
          <DetailField
            label="Research abstract"
            value={supervisee.researchAbstract}
          />
        </div>
      </div>
    </section>

    <section className="border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Calendar className="h-4 w-4 text-brand-navy" />
        <h2 className="text-xs font-black uppercase tracking-wider text-brand-navy">
          Appointment
        </h2>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DetailField
          label="Appointment ID"
          value={`SV-APT-${String(supervisee.appointmentId).padStart(5, '0')}`}
        />
        <DetailField
          label="Appointment date"
          value={supervisee.appointmentDate}
        />
        <DetailField label="Current status" value={supervisee.status} />
      </dl>
    </section>

    <div className="flex gap-3 border border-blue-100 bg-blue-50 p-5">
      <Info className="h-5 w-5 shrink-0 text-blue-700" />
      <p className="text-xs font-semibold leading-relaxed text-slate-600">
        This read-only page shows persisted appointment data. Panel, marks,
        timeline, and workflow history remain available through the student
        progress dossier and their owning modules.
      </p>
    </div>
  </div>
);
