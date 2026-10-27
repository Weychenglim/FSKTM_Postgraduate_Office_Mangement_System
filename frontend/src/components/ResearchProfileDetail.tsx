import React from 'react';
import {BookOpen} from 'lucide-react';
import {PortalCard} from './PortalPrimitives';
import {ResearchAbstract} from './ResearchAbstract';
import {formatRequestDisplayDate} from './ApprovalProcess';
import {SupervisionDetailSection, supervisionDetailLabel, supervisionDetailBody} from './SupervisionDetailLayout';
import type {ResearchAmendmentOptions, ResearchRevision} from '../services/researchAmendmentsApi';

/** Current values only. Historical comparisons remain separate saved snapshots. */
export function ResearchProfileDetail({options, revisions, actions}: {
  options:ResearchAmendmentOptions; revisions:ResearchRevision[]; actions?:React.ReactNode;
}) {
  const profile=options.profile;
  if(!profile)return null;
  const student=options.students.find(row=>row.id===profile.studentId);
  const current=revisions.find(row=>row.revision===profile.revision
    && row.studentId===profile.studentId
    && row.after.title===profile.title && row.after.abstract===profile.abstract && row.after.programme===profile.programme);
  const recordedAt=current ? formatRequestDisplayDate(current.createdAt) : 'Not recorded';
  return <div className="space-y-7" data-research-profile-detail>
    <PortalCard padding="lg" role="region" aria-label="Student overview">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 space-y-2">
          <p className={supervisionDetailLabel}>Student</p>
          <h2 className="text-lg font-semibold leading-relaxed text-brand-navy [overflow-wrap:anywhere]">{student?.name || 'Student name not recorded'}</h2>
          {student?.matricNo ? <p className="text-sm text-slate-600 [overflow-wrap:anywhere]">{student.matricNo}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <dl className="mt-6 border-t border-slate-100 pt-5"><div className="space-y-2">
        <dt className={supervisionDetailLabel}>Current programme</dt><dd className={supervisionDetailBody}>{profile.programme?.trim() || 'Not recorded'}</dd>
      </div></dl>
    </PortalCard>
    <div data-current-research>
      <SupervisionDetailSection title="Current research" icon={BookOpen}>
        <dl className="grid gap-x-8 gap-y-4 border-b border-slate-100 pb-5 sm:grid-cols-3">
          <div className="space-y-1"><dt className={supervisionDetailLabel}>Current version</dt><dd className={supervisionDetailBody}>{profile.revision===0 ? 'Initial record' : `Version ${profile.revision}`}</dd></div>
          {recordedAt!=='Not recorded' ? <div className="space-y-1"><dt className={supervisionDetailLabel}>Latest recorded update</dt><dd className={supervisionDetailBody}>{recordedAt}</dd></div> : null}
          {current?.actorName && current.kind!=='BASELINE' ? <div className="space-y-1"><dt className={supervisionDetailLabel}>Recorded by</dt><dd className={supervisionDetailBody}>{current.actorName}</dd></div> : null}
        </dl>
        <dl className="space-y-6">
          <div className="space-y-2"><dt className={supervisionDetailLabel}>Research title</dt><dd className="text-lg font-normal leading-8 text-slate-900 [overflow-wrap:anywhere]">{profile.title?.trim() || 'Not recorded'}</dd></div>
          <div className="space-y-3 border-t border-slate-100 pt-6"><dt className={supervisionDetailLabel}>Abstract</dt><dd><ResearchAbstract value={profile.abstract} inset={false}/></dd></div>
        </dl>
      </SupervisionDetailSection>
    </div>
  </div>;
}
