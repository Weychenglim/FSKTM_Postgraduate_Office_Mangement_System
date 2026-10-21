/** Isolated design preview. Production components, routes and academic data are not changed. */
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import {UsersRound,ChevronRight,CalendarDays,Gauge,FileChartColumn,CheckCircle2,AlertCircle} from 'lucide-react';
import {AppLayout} from '../src/components/AppLayout';
import {NotificationsProvider} from '../src/context/NotificationsContext';
import {PageHeader,PortalButton,PortalCard,StatusBadge} from '../src/components/PortalPrimitives';
import {TimelineCalendar} from '../src/components/TimelineCalendar';
import {SIDEBAR_ITEMS} from '../src/constants/navigation';
import type {SemesterTimelineEntry,TimelineLevel} from '../src/types/timeline';
import '../src/components/officeDashboard.css';
import './officeDashboardHomePreview.css';

window.fetch=async(input,options)=>{
  const url=new URL(String(input),location.origin);
  if((!options?.method||options.method==='GET')&&url.pathname==='/api/notifications/')return Response.json([]);
  throw new Error('This design preview does not call academic APIs.');
};

const examples=[['normal','Normal'],['long','Long labels'],['empty','No attention'],['loading','Loading'],['attention-error','Attention unavailable'],['calendar-error','Calendar unavailable']] as const;
type Example=typeof examples[number][0];
const toolGroups=[
  {name:'Semester and dates',icon:CalendarDays,items:[['Academic semesters','Prepare, activate and close semesters.'],['Academic calendar','Manage research dates and events.'],['Periods and extensions','Set submission windows and extra time.']]},
  {name:'Capacity and workload',icon:Gauge,items:[['Lecturer capacity','Set Supervisor and Panel limits.'],['Supervisor workload','Review active supervision commitments.'],['Panel workload','Review Panel assignments and limits.']]},
  {name:'Reports and checks',icon:FileChartColumn,items:[['Workflow reports','Review progress and student dossiers.'],['Reconciliation','Investigate inconsistent records.']]},
];
function events(phase:TimelineLevel,long:boolean):SemesterTimelineEntry[]{
  const titles=phase==='P1'?['Research proposal preparation','Literature review and prototype design','Research progress discussion']:['Final project report preparation','Project presentation and demonstration','Final submission'];
  const dates=phase==='P1'?[['2026-09-21','2026-10-02'],['2026-10-05','2026-10-16'],['2026-10-19','2026-10-30']]:[['2026-10-19','2026-11-06'],['2026-11-09','2026-11-20'],['2026-11-23','2026-11-27']];
  return titles.map((title,index)=>({id:index+1,level:phase,step:index+1,title:long?`${title} for postgraduate research students`:title,detail:'Discuss progress and prepare the required research work with your supervisor.',action:'Students and supervisors',deadlineStart:dates[index][0],deadlineEnd:dates[index][1],weekLabel:`Stage ${index+1}`,targetRoles:['STUDENT','LECTURER'],status:index===0?'Ended':index===1?'Active':'Upcoming',displayOrder:index+1}));
}

function Preview(){
  const initial=new URLSearchParams(location.search).get('example');
  const [example,setExample]=useState<Example>(examples.some(([value])=>value===initial)?initial as Example:'normal');
  const [phase,setPhase]=useState<TimelineLevel>('P1'),[destination,setDestination]=useState(''),[notice,setNotice]=useState('');
  const [attentionRetried,setAttentionRetried]=useState(false),[calendarRetried,setCalendarRetried]=useState(false);
  const [activeModal,setActiveModal]=useState<'help'|null>(null);
  const initialFocus=useRef(true);
  const long=example==='long',loading=example==='loading';
  const attentionError=example==='attention-error'&&!attentionRetried,calendarError=example==='calendar-error'&&!calendarRetried;
  const open=(title:string)=>{setDestination(title);setNotice('');};
  useEffect(()=>{if(initialFocus.current){initialFocus.current=false;return;}document.querySelector<HTMLHeadingElement>('#portal-inner-content h1')?.focus();},[destination]);
  function changeExample(value:Example){setExample(value);setAttentionRetried(false);setCalendarRetried(false);setDestination('');setNotice('');}
  const attention=<PortalCard padding="none" className="home-attention" role="region" aria-label="Needs attention">
    <header><h2>Needs attention</h2><p>Grouped from the current preview.</p></header>
    {loading?<div className="home-state" role="status"><span className="home-skeleton"/><span className="home-skeleton"/>Loading attention…</div>:attentionError?<div className="home-state" role="alert"><AlertCircle size={18}/><strong>Attention is unavailable</strong><p>You can still use the calendar and Office tools.</p><PortalButton size="sm" onClick={()=>setAttentionRetried(true)}>Retry attention</PortalButton></div>:example==='empty'?<div className="home-state" role="status"><CheckCircle2 size={22} className="text-emerald-600"/><strong>No outstanding items in this preview</strong><p>Office tools remain available below.</p></div>:<>
      <div className="home-attention-section"><h3>For Office review</h3>
        <button className="home-attention-link" onClick={()=>open('Lecturer capacity')}><div><span>{long?'Review published Lecturer capacity settings for the current academic semester':'Review capacity settings'}</span><small>6 Supervisor · 6 Panel role entries</small></div><ChevronRight size={15}/></button>
        <button className="home-attention-link" onClick={()=>open('Reconciliation')}><div><span>Check inconsistent records</span><small className="home-warning"><i/>1 blocking issue in preview</small></div><ChevronRight size={15}/></button>
      </div>
      <div className="home-attention-section home-waiting"><h3>Waiting on others</h3><button className="home-attention-link" onClick={()=>open('Panel appointment requests')}><div><span>{long?'Panel appointment awaiting the responsible Programme Coordinator':'Panel appointment request'}</span><small>1 awaiting Programme Coordinator</small></div><ChevronRight size={15}/></button></div>
      <p className="home-preview-note">Open a workspace for its complete list.</p>
    </>}
  </PortalCard>;
  const calendar=<PortalCard padding="none" className="home-calendar" role="region" aria-label="Semester Timeline">
    <header className="home-calendar-heading"><div><h2>Semester timeline</h2><p>Session 2026/2027</p></div><PortalButton size="sm" onClick={()=>open('Academic calendar')}>View full calendar</PortalButton></header>
    <div className="home-phase" role="group" aria-label="Research project phase">{(['P1','P2'] as const).map(value=><button key={value} aria-pressed={phase===value} onClick={()=>setPhase(value)}>Research Project {value==='P1'?'1':'2'}</button>)}</div>
    {loading?<div className="home-state home-calendar-loading" role="status"><span className="home-skeleton"/><span className="home-skeleton"/><span className="home-skeleton"/>Loading semester timeline…</div>:calendarError?<div className="home-state home-calendar-loading" role="alert"><AlertCircle size={20}/><strong>Calendar is unavailable</strong><p>Attention and Office tools are still available.</p><PortalButton size="sm" onClick={()=>setCalendarRetried(true)}>Retry calendar</PortalButton></div>:<div className="home-calendar-content"><TimelineCalendar groups={[{level:phase,entries:events(phase,long)}]} activeLevel={phase} showPhaseTabs={false}/><p className="home-calendar-note">Showing 3 of 3 events. Dates describe the schedule.</p></div>}
  </PortalCard>;
  return <>
    <div className="home-preview-controls"><div><strong>Dashboard design preview</strong><span>Fictional data · production unchanged</span></div><label>Example <select aria-label="Preview example" value={example} onChange={event=>changeExample(event.target.value as Example)}>{examples.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
    <AppLayout activeItem={SIDEBAR_ITEMS.DASHBOARD} onNavigate={item=>item===SIDEBAR_ITEMS.DASHBOARD?setDestination(''):open(item)} userName="Demo Office Administrator" userRole="Office Staff/Admin" onLogout={()=>setNotice('Sign-out is outside this design preview.')} onNotificationsTrigger={()=>{}} activeModal={activeModal} setActiveModal={setActiveModal}>
      <div data-office-dashboard className="office-home-preview">
        {destination?<div className="home-destination"><PageHeader title={destination} onBack={()=>setDestination('')} backLabel="Back to Dashboard"/><PortalCard><h2>Destination preview</h2><p>This link opens the existing {destination.toLowerCase()} workspace in the application. Its workflows are unchanged by this proposed home layout.</p><PortalButton onClick={()=>setDestination('')}>Return to Dashboard</PortalButton></PortalCard></div>:<>
          <div className="home-page-heading"><div><h1 className="page-title" tabIndex={-1}>Dashboard</h1><div className="home-semester"><span>{long?'Semester I 2026/2027 · Faculty of Computer Science and Information Technology':'Semester I 2026/2027'}</span><StatusBadge tone="success" dot>Active</StatusBadge></div></div><PortalButton data-office-preserve variant="secondary" icon={UsersRound} onClick={()=>setNotice('Manage Participants remains in its current location and is unchanged. This preview does not open or edit protected workflows.')}>Manage Participants</PortalButton></div>
          {notice&&<p className="home-notice" role="status">{notice}</p>}
          <div className="home-layout-container"><div className="home-overview-grid">{attention}{calendar}</div></div>
          <section className="home-tools" aria-labelledby="home-tools-title"><div className="home-tools-heading"><h2 id="home-tools-title">Office tools</h2><p>Open the workspace for the task you need.</p></div><div className="home-tool-groups">{toolGroups.map(group=><section key={group.name} className="home-tool-group"><h3><group.icon size={17}/>{group.name}</h3><ul>{group.items.map(([title,description])=><li key={title}><button onClick={()=>open(title)} className="home-tool-link"><div><span>{title}</span><small>{description}</small></div><ChevronRight size={15}/></button></li>)}</ul></section>)}</div></section>
        </>}
      </div>
    </AppLayout>
  </>;
}

createRoot(document.getElementById('root')!).render(<MemoryRouter><NotificationsProvider><Preview/></NotificationsProvider></MemoryRouter>);

// Developer checks run only in the isolated preview when explicitly requested.
if(new URLSearchParams(location.search).has('test'))void (async()=>{
  const results:{name:string;error?:string}[]=[];
  const check=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
  const wait=()=>new Promise(resolve=>setTimeout(resolve,35));
  const until=async(predicate:()=>unknown)=>{for(let count=0;count<200;count++){if(predicate())return;await wait();}throw new Error('Preview did not reach expected state');};
  const button=(prefix:string)=>Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(element=>element.textContent.trim().startsWith(prefix));
  const selectExample=async(value:Example)=>{const select=document.querySelector<HTMLSelectElement>('[aria-label="Preview example"]');const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;setter.call(select,value);select.dispatchEvent(new Event('change',{bubbles:true}));await wait();};
  const click=async(prefix:string)=>{const element=button(prefix);check(element,`Missing button ${prefix}`);element.click();await wait();};
  const noOverflow=()=>check(document.documentElement.scrollWidth<=innerWidth+1,`Page overflow: ${document.documentElement.scrollWidth}/${innerWidth}`);
  const scenario=async(name:string,run:()=>Promise<void>)=>{try{await run();results.push({name});}catch(error){results.push({name,error:String(error)});}};
  await until(()=>document.querySelector('.home-tool-link'));
  await scenario('actual portal shell, no nested navigation, protected shortcut retained',async()=>{
    check(document.getElementById('portal-sidebar'),'Actual sidebar missing');check(!document.querySelector('.office-dashboard-navigation'),'Rejected navigation present');check(document.querySelectorAll('[data-office-preserve]').length===1,'Protected shortcut missing');noOverflow();
  });
  await scenario('timeline is left of attention only when actual content width permits',async()=>{
    const container=document.querySelector('.home-layout-container').getBoundingClientRect(),calendar=document.querySelector('.home-calendar').getBoundingClientRect(),attention=document.querySelector('.home-attention').getBoundingClientRect();
    if(container.width>=1040){check(calendar.left<attention.left&&Math.abs(calendar.top-attention.top)<2,'Wide composition incorrect');check(attention.width>=300,'Attention too narrow');}
    else check(attention.bottom<calendar.top,'Stacked attention must precede calendar');
    const panel=document.querySelector<HTMLElement>('.home-attention');check(panel.scrollHeight<=panel.clientHeight+1,'Attention has internal scrolling');noOverflow();
  });
  await scenario('both research phases and existing event details remain interactive',async()=>{
    await click('Research Project 2');check(button('Research Project 2').getAttribute('aria-pressed')==='true','Phase did not switch');await click('Final project report preparation');check(document.querySelector('[role="dialog"],dialog'),'Event details absent');const close=document.querySelector<HTMLButtonElement>('[aria-label="Close timeline details"]');check(close,'Close absent');close.click();await wait();await click('Research Project 1');
  });
  await scenario('all eight tool destinations open and return to home',async()=>{
    for(const group of toolGroups)for(const [title] of group.items){const target=Array.from(document.querySelectorAll<HTMLButtonElement>('.home-tool-link')).find(element=>element.textContent.startsWith(title));target.click();await wait();check(document.querySelector('#portal-inner-content h1')?.textContent===title,`Wrong destination ${title}`);await click('Back to Dashboard');check(document.querySelectorAll('.home-tool-link').length===8,'Tools lost on return');}
  });
  await scenario('long names wrap without whole-page overflow',async()=>{await selectExample('long');noOverflow();const links=Array.from(document.querySelectorAll<HTMLElement>('.home-attention-link'));check(links.every(element=>element.scrollWidth<=element.clientWidth+1),'Attention label clipped');});
  await scenario('empty and loading states keep the tools available',async()=>{await selectExample('empty');check(document.body.textContent.includes('No outstanding items in this preview'),'Empty state missing');check(document.querySelector('.home-calendar-content'),'Calendar lost');await selectExample('loading');check(document.body.textContent.includes('Loading attention')&&document.body.textContent.includes('Loading semester timeline'),'Loading missing');check(document.querySelectorAll('.home-tool-link').length===8,'Tools hidden by loading');noOverflow();});
  await scenario('attention failure retries independently of the calendar',async()=>{await selectExample('attention-error');check(document.querySelector('.home-calendar-content'),'Calendar disabled by attention failure');await click('Retry attention');check(button('Review capacity settings'),'Attention did not recover');});
  await scenario('calendar failure retries independently of attention',async()=>{await selectExample('calendar-error');check(button('Review capacity settings'),'Attention disabled by calendar failure');await click('Retry calendar');check(document.querySelector('.home-calendar-content'),'Calendar did not recover');});
  await scenario('protected shortcut remains a safe preview and no academic requests occur',async()=>{await selectExample('normal');await click('Manage Participants');check(document.body.textContent.includes('unchanged. This preview does not open or edit protected workflows.'),'Protected preview notice absent');noOverflow();});
  await selectExample('normal');if(document.activeElement instanceof HTMLElement)document.activeElement.blur();document.querySelector<HTMLElement>('.home-preview-controls')?.scrollIntoView();
  parent.postMessage({type:'home-preview-results',width:innerWidth,results},location.origin);
})();
