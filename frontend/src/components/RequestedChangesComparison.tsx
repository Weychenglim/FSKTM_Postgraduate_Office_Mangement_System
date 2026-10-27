import React from 'react';
import type { ResearchSnapshot } from '../services/researchAmendmentsApi';
import { requestBodyTextClass } from './RequestDetailPrimitives';
import { ResearchAbstract } from './ResearchAbstract';

/** Displays saved snapshots; never substitutes the student's live profile. */
export function RequestedChangesComparison({ before, after, applied = false, revision = false, initialRecord = false }: {
  before: ResearchSnapshot;
  after: ResearchSnapshot;
  applied?: boolean;
  revision?: boolean;
  initialRecord?: boolean;
}) {
  const fields = ['programme', 'title', 'abstract'] as const;
  const label = (field: typeof fields[number]) => field.charAt(0).toUpperCase() + field.slice(1);
  if (initialRecord) return <dl className="space-y-4">{fields.map(field => <div key={field} className="space-y-2">
    <dt className="card-value">{label(field)}</dt>
    {field === 'abstract' ? <dd><ResearchAbstract value={after[field]} /></dd> : <dd className={`${requestBodyTextClass} rounded-lg bg-slate-50 p-3`}>{after[field] || 'Not recorded'}</dd>}
  </div>)}</dl>;
  const changed = fields.filter(field => before[field] !== after[field]);
  if (!revision) return <div className="space-y-8" data-request-comparison>
    {changed.length ? changed.map(field=><section key={field} aria-label={`${label(field)} comparison`} className="min-w-0 space-y-4">
      <h3 className="text-sm font-semibold text-brand-navy">{field==='programme' ? 'Programme' : `Research ${field}`}</h3>
      <dl className={`grid min-w-0 gap-5 ${field==='abstract' ? '' : 'sm:grid-cols-2'}`}>
        {[before,after].map((snapshot,index)=><div key={index} className={`min-w-0 space-y-3 border-l-2 pl-4 ${index ? 'border-blue-200' : 'border-slate-200'}`}>
          <dt className={`text-xs font-medium leading-6 ${index ? 'text-blue-700' : 'text-slate-600'}`}>{index ? `${applied ? 'Approved' : 'Proposed'} ${field}` : 'Before this request'}</dt>
          <dd className="whitespace-pre-wrap text-sm font-normal leading-7 text-slate-900 [overflow-wrap:anywhere]">{field==='abstract' ? <ResearchAbstract value={snapshot[field]} inset={false}/> : snapshot[field] || 'Not recorded'}</dd>
        </div>)}
      </dl>
    </section>) : <p className="card-description">No changed fields were recorded.</p>}
  </div>;
  return <div className="space-y-4">
    {changed.length ? changed.map(field => <div key={field} className="space-y-2">
      {revision?<h4 className="card-value">{label(field)}</h4>:null}
      <dl className={`grid gap-3 ${field === 'abstract' ? '' : 'sm:grid-cols-2'}`}>
        {[before, after].map((snapshot, index) => <div key={index} className={`rounded-lg border p-3 ${index?'border-blue-100 bg-blue-50/50':'border-slate-100 bg-slate-50'}`}>
          <dt className="card-label">{index ? revision ? 'Recorded after revision' : `Requested ${field}` : revision ? 'Recorded before this revision' : `Original ${field}`}</dt>
          <dd className={field === 'abstract' ? 'mt-3' : `${requestBodyTextClass} mt-2`}>{field === 'abstract' ? <ResearchAbstract value={snapshot[field]} inset={false} /> : snapshot[field] || 'Not recorded'}</dd>
        </div>)}
      </dl>
    </div>) : <p className="card-description">No changed fields were recorded.</p>}
  </div>;
}
