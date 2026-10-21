import React,{useState} from 'react';
import type {SemesterTimelineEntry} from '../types/timeline';
import {importEventDays} from '../utils/linkedWindowDates';
import {formatMalaysiaDate} from '../utils/malaysiaDateTime';
import {PortalConfirmModal} from './PortalPrimitives';

/** Import directly into the only schedule fields; preserve entered clock times. */
export function EventDateImport({entry,opensAt,closesAt,onApply}:{entry:SemesterTimelineEntry;opensAt:string;closesAt:string;onApply:(dates:{opensAt:string;closesAt:string})=>void}) {
  const [confirm,setConfirm]=useState(false);
  const apply=()=>{onApply(importEventDays(entry.deadlineStart,entry.deadlineEnd,opensAt,closesAt));setConfirm(false);};
  const replacing=!!opensAt.split('T')[0]&&opensAt.split('T')[0]!==entry.deadlineStart||!!closesAt.split('T')[0]&&closesAt.split('T')[0]!==entry.deadlineEnd;
  return <><button type="button" className="period-text-link whitespace-nowrap" onClick={()=>replacing?setConfirm(true):apply()}>Use these dates</button>
    <PortalConfirmModal isOpen={confirm} tone="warning" title="Replace entered dates?" message={`Use ${formatMalaysiaDate(entry.deadlineStart)} to ${formatMalaysiaDate(entry.deadlineEnd)} for this window? Your entered times will stay the same. The timeline changes only after saving the draft.`} confirmLabel="Replace dates" onCancel={()=>setConfirm(false)} onConfirm={apply}/>
  </>;
}
