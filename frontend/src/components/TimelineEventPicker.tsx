import React from 'react';
import type {SemesterTimelineEntry} from '../types/timeline';
import {formatMalaysiaDate} from '../utils/malaysiaDateTime';
import {SelectMenu} from './SelectMenu';

/** Search and results share one bounded popup, reused across period forms. */
export function TimelineEventPicker({id,entries,value,onChange,disabled=false,emptyLabel='Do not link now'}:{id:string;entries:SemesterTimelineEntry[];value:string;onChange:(value:string)=>void;disabled?:boolean;emptyLabel?:string}) {
  return <div className="space-y-2">
    <label htmlFor={id} className="form-label block">Timeline event</label>
    <SelectMenu id={id} disabled={disabled} value={value} onChange={onChange} placeholder="Choose a timeline event" aria-label="Timeline event" searchPlaceholder="Search events by title, phase or date" showSelectedDescription={false}
      options={[{value:'',label:emptyLabel},...entries.map(entry=>({value:String(entry.id),label:entry.title||entry.detail,description:`Research Project ${entry.level==='P1'?'1':'2'} · ${formatMalaysiaDate(entry.deadlineStart)} – ${formatMalaysiaDate(entry.deadlineEnd)}`}))]}/>
  </div>;
}
