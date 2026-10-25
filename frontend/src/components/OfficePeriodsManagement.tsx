import {AlertMessage} from './AlertMessage';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate} from 'react-router';
import {getAcademicSemesters} from '../services/academicSemestersApi';
import {getActiveTimeline} from '../services/timelineApi';
import type {AcademicSemester} from '../types/academicSemester';
import type {SemesterTimelineEntry} from '../types/timeline';
import {canManagePeriodSemester} from '../utils/operationalPeriodAccess';
import {formatSemesterLifecycle} from '../utils/academicSemesters';
import {formatMalaysiaDate} from '../utils/malaysiaDateTime';
import {loadPeriodCalendar,resolvePeriodSemester} from './officePeriodHelpers';
import {PageHeader,PortalButton,PortalCard,StatusBadge} from './PortalPrimitives';
import {PortalSelect} from './PortalSelect';
import {OperationalPeriodManagement} from './OperationalPeriodManagement';
import {RecordPageProvider} from './RecordPage';

export function OfficePeriodsManagement({onBack,onManageSemesters}:{onBack:()=>void;onManageSemesters:()=>void}) {
  const location=useLocation();
  const navigate=useNavigate();
  const [semesters,setSemesters]=useState<AcademicSemester[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [interacting,setInteracting]=useState(false);
  const [calendar,setCalendar]=useState<{semesterId:number;available:boolean;entries:SemesterTimelineEntry[]}|null>(null);
  const [calendarLoading,setCalendarLoading]=useState(false);
  const [calendarError,setCalendarError]=useState('');
  const semesterGeneration=useRef(0);
  const calendarGeneration=useRef(0);
  const selected=resolvePeriodSemester(semesters,location.search);
  const selectedRef=useRef(selected); selectedRef.current=selected;
  const loadSemesters=useCallback(async()=>{
    const version=++semesterGeneration.current;setLoading(true);setError('');
    try {const rows=await getAcademicSemesters();if(version===semesterGeneration.current)setSemesters(rows.filter(row=>canManagePeriodSemester(row.lifecycleStatus)));}
    catch(failure){if(version===semesterGeneration.current)setError(failure instanceof Error?failure.message:'Academic semesters could not be loaded.');}
    finally{if(version===semesterGeneration.current)setLoading(false);}
  },[]);
  useEffect(()=>{void loadSemesters();return()=>{semesterGeneration.current++;};},[loadSemesters]);
  useEffect(()=>{
    if(loading||error||!selected||new URLSearchParams(location.search).has('semester'))return;
    const params=new URLSearchParams(location.search);params.set('semester',String(selected.id));
    navigate(`${location.pathname}?${params}${location.hash}`,{replace:true});
  },[loading,error,selected?.id,location.search,location.pathname,location.hash,navigate]);
  const loadCalendar=useCallback(async()=>{
    const semester=selectedRef.current;
    const version=++calendarGeneration.current;
    setCalendar(null);setCalendarError('');
    if(!semester){setCalendarLoading(false);return;}
    setCalendarLoading(true);
    try {const result=await loadPeriodCalendar(semester,getActiveTimeline);if(version===calendarGeneration.current)setCalendar({semesterId:semester.id,...result});}
    catch(failure){if(version===calendarGeneration.current)setCalendarError(failure instanceof Error?failure.message:'Calendar events could not be loaded.');throw failure;}
    finally{if(version===calendarGeneration.current)setCalendarLoading(false);}
  },[]);
  useEffect(()=>{void loadCalendar().catch(()=>{});return()=>{calendarGeneration.current++;};},[selected?.id,selected?.lifecycleStatus,loadCalendar]);
  const selectSemester=(id:string)=>{
    if(interacting)return;
    calendarGeneration.current++;setCalendar(null);setCalendarError('');
    const params=new URLSearchParams(location.search);params.set('semester',id);
    navigate(`${location.pathname}?${params}`);
  };
  return <RecordPageProvider><div className="space-y-6 pb-12">
    <PageHeader title="Periods & deadlines" subtitle="Manage when applications, recommendations and marks can be submitted. All times are Malaysia time (UTC+08:00)." onBack={onBack} backLabel="Back to Dashboard" backDisabled={interacting}/>
    {loading?<p role="status">Loading academic semesters…</p>:error?<AlertMessage type="error" title="Couldn’t load academic semesters" message={error} actions={<PortalButton onClick={()=>void loadSemesters()}>Retry semesters</PortalButton>}/>:<>
      <section aria-label="Academic semester selection" className="space-y-2"><label htmlFor="period-academic-semester" className="form-label block">Academic semester</label><div className="flex items-center gap-3"><div className="min-w-0 flex-1 max-w-sm"><PortalSelect id="period-academic-semester" className="form-control form-control-md" value={selected?String(selected.id):''} disabled={interacting||!semesters.length} onChange={event=>selectSemester(event.target.value)}><option value="" disabled>Select a semester</option>{semesters.map(semester=><option key={semester.id} value={semester.id}>{semester.label}</option>)}</PortalSelect></div>{selected?<StatusBadge tone={selected.lifecycleStatus==='ACTIVE'?'success':'neutral'}>{formatSemesterLifecycle(selected.lifecycleStatus)}</StatusBadge>:null}</div>
      {selected?<p className="card-description">{formatMalaysiaDate(selected.startsOn)} – {formatMalaysiaDate(selected.endsOn)}</p>:null}
      {interacting?<p role="status" className="card-description">Finish or cancel the current action before changing semester.</p>:null}
      {!selected?<AlertMessage type="warning" title="Choose an academic semester" message={semesters.length?'The requested semester is unavailable. Choose a semester to continue.':'No Draft, Active or Closed semesters are available.'}/>:null}</section>
      {selected?<>
        {calendarLoading?<p role="status" className="card-description">Loading calendar events for linking…</p>:calendarError?<AlertMessage type="warning" title="Timeline events unavailable" message={<>{calendarError} Period controls remain available; reload calendar events before linking.</>} actions={<PortalButton disabled={interacting} onClick={()=>void loadCalendar().catch(()=>{})}>Retry calendar events</PortalButton>}/>:null}
        <OperationalPeriodManagement key={selected.id} semesterId={selected.id} semesterLabel={selected.label} semesterLifecycle={selected.lifecycleStatus} entries={calendar?.semesterId===selected.id?calendar.entries:[]} calendarStatus={calendarLoading?'loading':calendarError?'error':calendar?.available?'ready':'missing'} onTimelineRefresh={loadCalendar} onInteractionChange={setInteracting} periodAnchor={location.hash}/>
      </>:null}
    </>}
  </div></RecordPageProvider>;
}
