import React from 'react';
import type { ResearchSnapshot } from '../services/researchAmendmentsApi';
import { requestBodyTextClass } from './RequestDetailPrimitives';

/** Displays saved snapshots; never substitutes the student's live profile. */
export function RequestedChangesComparison({ before, after, revision = false, initialRecord = false }: {
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
    <dd className={`${requestBodyTextClass} rounded-lg bg-slate-50 p-3`}>{after[field] || 'Not recorded'}</dd>
  </div>)}</dl>;
  const changed = fields.filter(field => before[field] !== after[field]);
  return <div className="space-y-4">
    {changed.length ? changed.map(field => <div key={field} className="space-y-2">
      {revision?<h4 className="card-value">{label(field)}</h4>:null}
      <dl className={`grid gap-3 ${field === 'abstract' ? '' : 'sm:grid-cols-2'}`}>
        {[before, after].map((snapshot, index) => <div key={index} className={`rounded-lg border p-3 ${index?'border-blue-100 bg-blue-50/50':'border-slate-100 bg-slate-50'}`}>
          <dt className="card-label">{index ? revision ? 'Recorded after revision' : `Requested ${field}` : revision ? 'Recorded before this revision' : `Original ${field}`}</dt>
          <dd className={`${requestBodyTextClass} mt-2`}>{snapshot[field] || 'Not recorded'}</dd>
        </div>)}
      </dl>
    </div>) : <p className="card-description">No changed fields were recorded.</p>}
  </div>;
}
