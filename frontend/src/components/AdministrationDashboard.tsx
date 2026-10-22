/** @license SPDX-License-Identifier: Apache-2.0 */
import React from 'react';
import {UsersRound,ChevronRight,CalendarDays,Gauge,FileChartColumn,BarChart3} from 'lucide-react';
import {PageHeader,PortalButton,PortalCard} from './PortalPrimitives';
import {EmptyState,ErrorState,LoadingState} from './StateViews';
import {APP_ROUTES,sidebarItemForPath} from '../constants/routes';
import {getDashboardSummary,getPanelWorkloads} from '../services';
import {getOfficeAttention,type OfficeAttentionSummary} from '../services/officeAttentionApi';
import {officeAttentionPreview,officeAttentionCategoryRoute} from '../utils/officeAttention';
import {useOfficeRead} from './useOfficeRead';
import {OfficeSemesterContext} from './OfficeSemesterContext';
import {OfficeCalendarPreview} from './OfficeCalendarPreview';
import type {MarkRecordStatusTab} from '../utils/markRecords';

interface AdministrationDashboardProps {
  onNavigateToTab:(tabName:string)=>void;
  onNavigateToRoute?:(route:string)=>void;
  onNavigateToMarksRecords?:(statusTab?:MarkRecordStatusTab)=>void;
  onNavigateToTimeline?:()=>void;
}

const toolGroups=[
  {name:'Semester and dates',icon:CalendarDays,items:[
    {label:'Academic semesters',detail:'Prepare, activate and close semesters.',route:APP_ROUTES.dashboardSemesters},
    {label:'Academic calendar',detail:'Manage research dates and events.',route:APP_ROUTES.dashboardTimeline},
    {label:'Periods and extensions',detail:'Set submission windows and extra time.',route:APP_ROUTES.dashboardPeriods},
  ]},
  {name:'Capacity and workload',icon:Gauge,items:[
    {label:'Lecturer capacity',detail:'Set Supervisor and Panel limits.',route:APP_ROUTES.dashboardLecturerCapacity},
    {label:'Supervisor workload',detail:'Review active supervision commitments.',route:APP_ROUTES.supervisorAppointmentWorkload},
    {label:'Panel workload',detail:'Review Panel assignments and limits.',route:APP_ROUTES.panelAppointmentWorkload},
  ]},
  {name:'Reports and checks',icon:FileChartColumn,items:[
    {label:'Reconciliation',detail:'Investigate inconsistent records.',route:APP_ROUTES.dashboardWorkflowReconciliation},
  ]},
];

export const AdministrationDashboard:React.FC<AdministrationDashboardProps>=({onNavigateToTab,onNavigateToRoute,onNavigateToMarksRecords,onNavigateToTimeline})=>{
  const attention=useOfficeRead(getOfficeAttention),summary=useOfficeRead(getDashboardSummary),workload=useOfficeRead(getPanelWorkloads);
  const preview=officeAttentionPreview(attention.data?.summary??[]);
  const groups={review:preview.filter(row=>row.responsibility==='review'),waiting:preview.filter(row=>row.responsibility==='waiting')};
  const navigate=(route:string)=>{
    if(onNavigateToRoute)onNavigateToRoute(route);
    else if(route===APP_ROUTES.dashboardTimeline&&onNavigateToTimeline)onNavigateToTimeline();
    else if(route===APP_ROUTES.marksRecords&&onNavigateToMarksRecords)onNavigateToMarksRecords('All Records');
    else onNavigateToTab(sidebarItemForPath(route));
  };
  const link=(route:string)=>({href:route,onClick:(event:React.MouseEvent<HTMLAnchorElement>)=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();navigate(route);
  }});
  const monitoringItem=(label:string,count:number,route:string)=><a key={label} {...link(route)} className="home-monitoring-item" aria-label={`${count} ${label}`}>
    <span>{label}</span><span className={`home-monitoring-count${count>0?' home-monitoring-nonzero':''}`}>{count}</span><span className="home-monitoring-action" aria-hidden="true">View<ChevronRight size={15}/></span>
  </a>;
  const attentionRows=(rows:OfficeAttentionSummary[],label:string)=>rows.length>0&&<div className={`home-attention-section${label==='Waiting on others'?' home-waiting':''}`}><h3>{label}</h3>{rows.map(row=><a key={row.id} {...link(officeAttentionCategoryRoute(row))} className="home-attention-link" data-office-attention={row.id}><div><span>{row.title}</span><small className={row.urgency!=='normal'?`home-${row.urgency}`:undefined}>{row.urgency!=='normal'&&<i aria-hidden="true"/>}{row.detail}</small></div><ChevronRight size={15} aria-hidden="true"/></a>)}</div>;
  return <div id="admin-dashboard-container" className="office-home text-left pb-12">
    <div><PageHeader title="Dashboard" actions={<div className="home-heading-actions"><PortalButton variant="secondary" icon={BarChart3} onClick={()=>navigate(APP_ROUTES.dashboardReports)}>View Workflow Reports</PortalButton><PortalButton data-office-preserve variant="secondary" icon={UsersRound} onClick={()=>navigate(APP_ROUTES.dashboardParticipantLifecycle)}>Manage Participants</PortalButton></div>}/></div><OfficeSemesterContext compact onNavigate={navigate}/>
    <div className="home-layout-container"><div className="home-overview-grid">
      <PortalCard padding="none" id="office-needs-attention" className="home-attention" role="region" aria-label="Needs attention">
        <header><h2 className="section-heading">Needs attention</h2></header>
        {attention.loading?<LoadingState message="Loading attention records…" className="home-state"/>:attention.error?<ErrorState message={attention.error} onRetry={attention.reload} className="home-state"/>:!groups.review.length&&!groups.waiting.length?<EmptyState title="No outstanding attention records" description="Office tools remain available below." className="home-state"/>:<>
          {attentionRows(groups.review,'For Office review')}{attentionRows(groups.waiting,'Waiting on others')}
        </>}
        <div className="home-attention-footer"><PortalButton size="sm" variant="ghost" onClick={()=>navigate(`${APP_ROUTES.dashboardAttention}?view=all`)}>View all attention</PortalButton></div>
      </PortalCard>
      <OfficeCalendarPreview onOpen={()=>navigate(APP_ROUTES.dashboardTimeline)}/>
    </div></div>
    <section className="home-tools" aria-labelledby="office-tools-title"><div className="home-tools-heading"><h2 className="section-heading" id="office-tools-title">Office tools</h2><p>Open the workspace for the task you need.</p></div>
      <div className="home-tool-groups">{toolGroups.map(group=><section className="home-tool-group" key={group.name}><h3><group.icon size={17} aria-hidden="true"/>{group.name}</h3><ul>{group.items.map(item=><li key={item.route}><a {...link(item.route)} data-office-tool={item.route} className="home-tool-link"><div><span>{item.label}</span><small>{item.detail}</small></div><ChevronRight size={15} aria-hidden="true"/></a></li>)}</ul></section>)}</div>
      <section className="home-monitoring" aria-label="Monitoring counts">
        <div className="home-monitoring-heading"><h3 className="section-label">Monitoring</h3><span>Count</span></div>
        <div className="home-monitoring-grid">
          {summary.loading?<span role="status">Loading monitoring counts…</span>:summary.error?<div role="alert">{summary.error} <PortalButton size="sm" onClick={summary.reload}>Retry counts</PortalButton></div>:summary.data&&<>
            {monitoringItem('Pending Supervisor requests',summary.data.pendingSupervisorRequests,APP_ROUTES.supervisorAppointments)}
            {monitoringItem('Pending Panel approvals',summary.data.pendingPanelApprovals,APP_ROUTES.panelAppointments)}
            {monitoringItem('Incomplete evaluations',summary.data.incompleteMarkEntries,APP_ROUTES.marksRecords)}
            {monitoringItem('Backup evaluator assignments',summary.data.backupMarkTasks??0,APP_ROUTES.marksRecords)}
          </>}
          {workload.loading?<span role="status">Loading Panel workload summary…</span>:workload.error?<div role="alert">Panel workload summary unavailable. <PortalButton size="sm" onClick={workload.reload}>Retry workload</PortalButton></div>:monitoringItem('Lecturers at or over their configured Panel limit',workload.data?.filter(row=>row.capacityState==='OVER_CAPACITY'||row.capacityState==='FULL').length??0,APP_ROUTES.panelAppointmentWorkload)}
        </div>
      </section>
    </section>
  </div>;
};
