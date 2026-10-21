/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Calendar, Info, Mail, Send, User } from 'lucide-react';

import type { ActiveSuperviseeRow } from '../types';
import { PageHeader, PortalButton, StatusBadge } from './PortalPrimitives';
import { ResearchAbstract } from './ResearchAbstract';

interface ActiveSuperviseeDetailProps {
  onBack: () => void;
  onRecommendPanel?: (studentId: string) => void;
  supervisee: ActiveSuperviseeRow;
  hideHeader?: boolean;
  onViewStudentRecord?: () => void;
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
    <dt className="card-label uppercase tracking-wider text-slate-400">
      {label}
    </dt>
    <dd className="card-value mt-1 leading-relaxed text-slate-700">
      {value || 'Not recorded'}
    </dd>
  </div>
);

export const ActiveSuperviseeDetail: React.FC<
  ActiveSuperviseeDetailProps
> = ({ onBack, onRecommendPanel, supervisee, hideHeader = false, onViewStudentRecord }) => (
  <div
    id="active-supervisee-detail-page"
    className="space-y-6 animate-fade-in text-left"
  >
    {!hideHeader && <PageHeader
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
    />}
    {hideHeader && <div className="flex flex-wrap gap-2"><StatusBadge tone="info">{supervisee.status}</StatusBadge>{onViewStudentRecord && <PortalButton onClick={onViewStudentRecord}>View student record</PortalButton>}<PortalButton variant="primary" icon={Send} onClick={() => onRecommendPanel?.(supervisee.studentId)}>Recommend Panel</PortalButton></div>}

    <section className={hideHeader ? '' : 'grid grid-cols-1 gap-6 lg:grid-cols-12'}>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-5">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-black text-blue-700">
            {initialsFor(supervisee.studentName)}
          </div>
          <div className="min-w-0">
            <h2 className="section-label">
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

      {!hideHeader && <div className="border border-slate-200 bg-white p-6 lg:col-span-7">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <BookOpen className="h-4 w-4 text-brand-navy" />
          <h2 className="section-label">
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
          <dl><div><dt className="card-label">Research abstract</dt><dd className="mt-3"><ResearchAbstract value={supervisee.researchAbstract} /></dd></div></dl>
        </div>
      </div>}
    </section>

    <section className="border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Calendar className="h-4 w-4 text-brand-navy" />
        <h2 className="section-label">
          Appointment
        </h2>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DetailField
          label="Appointment date"
          value={supervisee.appointmentDate}
        />
        <DetailField label="Current status" value={supervisee.status} />
      </dl>
    </section>

    {!hideHeader && <div className="flex gap-3 border border-blue-100 bg-blue-50 p-5">
      <Info className="h-5 w-5 shrink-0 text-blue-700" />
      <p className="card-description">
        This read-only page shows persisted appointment data. Panel, marks,
        timeline, and workflow history remain available through the student
        record and their owning modules.
      </p>
    </div>}
  </div>
);
