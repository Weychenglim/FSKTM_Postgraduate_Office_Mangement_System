import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getOperationalAvailability} from '../services/operationalPeriodsApi';
import type {OperationalActivity, OperationalAvailability} from '../types/operationalPeriods';
import {formatMalaysiaDateTime} from '../utils/malaysiaDateTime';
import {PortalButton, StatusBadge, type BadgeTone} from './PortalPrimitives';

export function isOperationalIntakeBlocked(availability: OperationalAvailability | null) {
  return availability?.enforcementEnabled === true && !availability.canSubmit;
}

/** A failed advisory read leaves the authoritative creation endpoint in control. */
export function useOperationalIntake(activity: OperationalActivity, studentId?: number, enabled = true) {
  const [availability,setAvailability]=useState<OperationalAvailability|null>(null);
  const [loading,setLoading]=useState(enabled);
  const [error,setError]=useState<string|null>(null);
  const generation=useRef(0);
  const refresh=useCallback(async () => {
    const version=++generation.current;
    if(!enabled){setAvailability(null);setLoading(false);return null;}
    setLoading(true);setError(null);
    try {
      const result=await getOperationalAvailability(activity,studentId);
      if(version===generation.current)setAvailability(result);
      return result;
    } catch (failure) {
      if(version===generation.current){setAvailability(null);setError(failure instanceof Error?failure.message:'Intake availability could not be checked.');}
      return null;
    } finally {if(version===generation.current)setLoading(false);}
  },[activity,studentId,enabled]);
  useEffect(()=>{setAvailability(null);void refresh();return()=>{generation.current+=1;};},[refresh]);
  return {availability,loading,error,refresh,blocked:isOperationalIntakeBlocked(availability)};
}

export function OperationalIntakeFeedback({availability,loading,error,onRetry,activity = 'SUPERVISOR_APPLICATION'}: {
  availability: OperationalAvailability|null; loading:boolean; error:string|null; onRetry?:()=>void; activity?:OperationalActivity;
}) {
  const subject = activity === 'PANEL_RECOMMENDATION' ? 'Recommendations' : 'Applications';
  const ariaLabel = activity === 'PANEL_RECOMMENDATION' ? 'Recommendation availability' : 'Application availability';
  const unavailable = !loading && !error && availability !== null && !availability.canSubmit;
  const notice = unavailable || (!loading && !!error);
  let label = '';
  let tone: BadgeTone = 'neutral';
  let date: string | null = null;
  let dateLabel = '';
  let reason = '';

  if (availability && !loading && !error) {
    const personalDeadline = !!availability.effectiveDueAt && availability.effectiveDueAt !== availability.closesAt;
    const deadline = availability.effectiveDueAt || availability.closesAt;
    if (availability.canSubmit) {
      label = `${subject} open`;
      tone = 'success';
      if (availability.status !== 'UNRESTRICTED') {
        date = deadline;
        dateLabel = personalDeadline ? 'Your deadline' : 'Closes';
      }
    } else if (availability.status === 'UPCOMING') {
      label = `${subject} not open yet`;
      tone = 'info';
      date = availability.opensAt;
      dateLabel = 'Opens';
    } else if (['ENDED', 'CLOSED'].includes(availability.status)) {
      label = `${subject} closed`;
      date = deadline;
      dateLabel = personalDeadline ? 'Your deadline passed' : 'Closed';
    } else {
      label = `${subject} unavailable`;
      tone = 'warning';
      reason = availability.message;
    }
    // Keep the explanation when an unavailable period has no date to display.
    if (unavailable && !date) reason = availability.message;
  }

  return <aside aria-label={ariaLabel} aria-live="polite" aria-busy={loading} className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 card-description ${notice ? 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900' : ''}`}>
    {loading ? <span>Checking availability…</span> : error ? <>
      <span>Couldn’t check availability.</span>
      {onRetry ? <PortalButton size="sm" onClick={onRetry}>Retry</PortalButton> : null}
    </> : availability ? <>
      <StatusBadge tone={tone} dot>{label}</StatusBadge>
      {date ? <span>{dateLabel} <time dateTime={date}>{formatMalaysiaDateTime(date)}</time></span> : null}
      {reason ? <span>{reason}</span> : null}
      {unavailable && onRetry ? <PortalButton size="sm" onClick={onRetry}>Check availability</PortalButton> : null}
    </> : <span>Availability is checked when you submit.</span>}
  </aside>;
}
