import React, { useCallback, useEffect, useState } from 'react';
import type { SupervisorSectionASnapshot } from '../types/supervisorSectionA';
import { formatMalaysiaDateTime } from '../utils/malaysiaDateTime';
import {SupervisorRequestField, SupervisorRequestDisclosure} from './SupervisorRequestFields';
import { ErrorState, LoadingState } from './StateViews';

type StudentFacts = { studentName?: string; studentId?: string; programme?: string; semester?: string };

export function withSubmittedSupervisorParticulars<T extends StudentFacts>(request: T, record: SupervisorSectionASnapshot | null): T {
  if (!record) return request;
  const facts = record.studentParticulars;
  return { ...request, studentName: facts.name, studentId: facts.studentId, programme: facts.programme, semester: facts.semester };
}

/** Kept separate from list DTOs: sensitive data is fetched for the exact application only. */
export function useSupervisorSectionA(applicationId?: number | string) {
  const key = applicationId == null ? null : String(applicationId);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string | null; record: SupervisorSectionASnapshot | null; loading: boolean; error: string | null }>({ key: null, record: null, loading: false, error: null });
  const onRetry = useCallback(() => setAttempt(value => value + 1), []);

  useEffect(() => {
    if (key === null) return;
    let current = true;
    setState({ key, record: null, loading: true, error: null });
    import('../services/supervisorSectionAApi')
      .then(api => api.getSupervisorApplicationSectionA(key))
      .then(response => {
        if (current) setState({ key, record: response.sectionA, loading: false, error: null });
      })
      .catch(reason => {
        if (current) setState({ key, record: null, loading: false, error: reason instanceof Error ? reason.message : 'Submitted Section A could not be loaded.' });
      });
    return () => { current = false; };
  }, [key, attempt]);

  if (key === null) return { record: null, loading: false, error: null, onRetry };
  if (state.key !== key) return { record: null, loading: true, error: null, onRetry };
  return { record: state.record, loading: state.loading, error: state.error, onRetry };
}

export function SupervisorSectionAParticulars({ record, loading, error, onRetry }: {
  record: SupervisorSectionASnapshot | null; loading: boolean; error: string | null; onRetry: () => void;
}) {
  if (loading) return <LoadingState message="Loading submitted particulars…" className="py-4" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} className="py-4" />;
  if (!record) return <p className="card-description border-t border-slate-200 pt-4">No submitted Section A was recorded for this application. Student particulars above come from the current profile; historical identity, contact details, course results and declaration are unavailable.</p>;
  const facts = record.studentParticulars;
  return <SupervisorRequestDisclosure title="Contact and identity details">
    <dl data-submitted-particulars>
      <SupervisorRequestField label={facts.identityType === 'PASSPORT' ? 'Passport number' : facts.identityType === 'NRIC' ? 'NRIC number' : 'NRIC / passport number'} value={facts.identityNumber} />
      <SupervisorRequestField label="Email address" value={facts.email} />
      <SupervisorRequestField label="Contact number" value={facts.phone} />
      <SupervisorRequestField label="Address" value={facts.address} />
    </dl>
  </SupervisorRequestDisclosure>;
}

export function SupervisorSubmittedCourses({record}: {record: SupervisorSectionASnapshot}) {
  return <SupervisorRequestDisclosure title={`Course results${record.noCoursesTaken ? ' · None declared' : ` · ${record.courseResults.length}`}`}>
    <p className="text-xs text-slate-600">Declared by the student with this application.</p>
    {record.noCoursesTaken ? <p className="text-sm text-slate-900">No completed courses declared.</p> : <div role="region" aria-label="Submitted course results" tabIndex={0} className="overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Course results submitted with this application</caption>
        <thead className="bg-slate-50 text-xs text-slate-600"><tr>{['Course', 'Code', 'Semester / session', 'Grade'].map(label => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 text-slate-900">{record.courseResults.map((course, index) => <tr key={index}>
          <td className="min-w-40 whitespace-pre-wrap break-words px-4 py-3">{course.courseName}</td>
          <td className="break-words px-4 py-3">{course.courseCode}</td>
          <td className="min-w-36 break-words px-4 py-3">{course.semesterSession}</td>
          <td className="break-words px-4 py-3">{course.grade}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </SupervisorRequestDisclosure>;
}

export function SupervisorSubmittedDeclaration({record}: {record: SupervisorSectionASnapshot}) {
  return <section aria-label="Student declaration" className="space-y-2">
    <h4 className="text-sm font-semibold text-brand-navy">Student declaration</h4>
    <p className="text-xs leading-relaxed text-slate-600">Confirmed by {record.studentParticulars.name || 'the student'} on {formatMalaysiaDateTime(record.declaration.acceptedAt)}.</p>
    <SupervisorRequestDisclosure title="View full declaration">
      <p className="whitespace-pre-wrap text-sm font-normal leading-7 text-slate-900 [overflow-wrap:anywhere]">{record.declaration.text}</p>
    </SupervisorRequestDisclosure>
  </section>;
}
