import React from 'react';
import {DashboardTimeline} from './DashboardTimeline';

/** Office retains its narrower home column while using the same timeline as other roles. */
export function OfficeCalendarPreview({onOpen}:{onOpen:()=>void}) {
  return <section className="home-calendar min-w-0" role="region" aria-label="Semester Timeline">
    <DashboardTimeline onManageTimeline={onOpen}/>
  </section>;
}
