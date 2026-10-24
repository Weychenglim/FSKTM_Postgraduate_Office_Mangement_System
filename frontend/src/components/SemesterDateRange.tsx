import React from 'react';
import {formatMalaysiaDate} from '../utils/malaysiaDateTime';

/** Academic dates are independent of the uploaded timeline and its events. */
export function SemesterDateRange({startsOn, endsOn}: {startsOn: string; endsOn: string}) {
  return <p className="text-[13px] font-medium leading-6 text-slate-600" aria-label="Semester dates">
    <time dateTime={startsOn}>{formatMalaysiaDate(startsOn)}</time>
    {' – '}
    <time dateTime={endsOn}>{formatMalaysiaDate(endsOn)}</time>
  </p>;
}
