import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {SupervisorWorkloadDetails} from '../src/components/SupervisorWorkloadMonitoring';
import {PanelWorkloadDetails} from '../src/components/PanelWorkloadMonitoring';
import type {SupervisorWorkloadRecord,PanelWorkloadRecord} from '../src/types';
const root=createRoot(document.getElementById('root')!);
const supervisor:SupervisorWorkloadRecord={lecturerId:'L1',lecturerName:'Dr Aina Rahman',department:'Computing and Information Systems',email:'aina@example.test',capacityState:'FULL',semesterCode:'2026-2027-S1',capacityPlanVersion:4,currentStudents:2,workloadLimit:2,availableSlots:0,availability:'Full Load',supervisees:[{id:'PG001',name:'Amir Hakim',programme:'Master of Data Science',topic:'Explainable early-warning models for academic support',status:'ACTIVE',supervisionRole:'PRIMARY',appointmentDate:'09 Oct 2026'},{id:'PG002',name:'Nur Sofia',programme:'Master of Artificial Intelligence',topic:'Evaluating accessible research recommendation interfaces',status:'ACTIVE',supervisionRole:'CO_SUPERVISOR',appointmentDate:'12 Oct 2026'}]};
const panel:PanelWorkloadRecord={id:'L1',name:'Dr Aina Rahman',department:'Computing and Information Systems',initials:'AR',capacityState:'AVAILABLE',semesterCode:'2026-2027-S1',capacityPlanVersion:4,currentStudents:2,workloadLimit:5,availableSlots:3,availability:'Available',confirmedAppointments:1,pendingNominations:1,workloadItems:[{studentId:'PG001',studentName:'Amir Hakim',researchTitle:'Explainable early-warning models for academic support',type:'Confirmed Appointment',date:'09 Oct 2026'},{studentId:'PG003',studentName:'Mei Ling',researchTitle:'Accessible research recommendation interfaces',type:'Pending Nomination',date:'12 Oct 2026'}]};
window.fetch=async()=>{throw Error('Presentation checks must not call live APIs');};
const results:{name:string;error?:string}[]=[];
const check=(value:unknown,message:string)=>{if(!value)throw Error(message);};
const text=()=>document.getElementById('root')!.textContent||'';
function mount(element:React.ReactNode){flushSync(()=>root.render(element));}
function geometry(){
 const cards=[...document.querySelectorAll<HTMLElement>('[data-workload-detail] > [role="region"]')];
 check(cards.length===3,'Expected three distinct reading surfaces');
 cards.forEach((card,i)=>{
  if(i)check(card.getBoundingClientRect().top-cards[i-1].getBoundingClientRect().bottom>=27,'Cards are cramped');
  const heading=card.querySelector('h2')!;
  const content=heading.closest('[role="region"]')!.lastElementChild!;
  check(content.getBoundingClientRect().top-heading.getBoundingClientRect().bottom>=23,'Heading and content are cramped');
 });
 check(document.documentElement.scrollWidth<=innerWidth+1,'Horizontal overflow');
 for(const dd of document.querySelectorAll('dd'))check(parseFloat(getComputedStyle(dd).fontSize)>=14,'Values are too small');
}
function scenario(name:string,run:()=>void){try{run();results.push({name});}catch(error){results.push({name,error:error instanceof Error?error.message:String(error)});}}
scenario('Supervisor separates identity, capacity and students while preserving role counts',()=>{
 mount(<SupervisorWorkloadDetails record={supervisor}/>);geometry();
 check(text().includes('Primary appointments')&&text().includes('Supporting appointments')&&text().includes('Capacity utilization: 100%'),'Supervisor capacity facts missing');
 check(document.querySelectorAll('tbody tr').length===2,'Supervisees missing');
});
scenario('Panel reservations remain distinct and capacity is not double counted',()=>{
 mount(<PanelWorkloadDetails record={panel}/>);geometry();
 check(text().includes('Pending reservations')&&text().includes('Active + reserved')&&text().includes('Capacity utilization: 40%'),'Panel capacity facts missing');
 check(text().includes('Pending reservation')&&text().includes('Active appointment'),'Workload types missing');
});
scenario('Missing configuration retains real load without fabricating availability or percentage',()=>{
 mount(<SupervisorWorkloadDetails record={{...supervisor,capacityState:'NOT_CONFIGURED',semesterCode:undefined,capacityPlanVersion:undefined}}/>);geometry();
 check(text().includes('Not configured')&&!text().includes('Capacity utilization:'),'Missing policy treated as configured');
});
scenario('Zero published capacity is configured and retains actual usage',()=>{
 mount(<PanelWorkloadDetails record={{...panel,workloadLimit:0,capacityState:'FULL',availableSlots:0}}/>);geometry();
 check(text().includes('Panel capacity: 0')&&!text().includes('Not configured'),'Zero policy confused with missing policy');
});
scenario('Empty workload has a dedicated honest records surface',()=>{
 mount(<PanelWorkloadDetails record={{...panel,currentStudents:0,confirmedAppointments:0,pendingNominations:0,availableSlots:5,workloadItems:[]}}/>);geometry();
 check(text().includes('No active appointments or pending nominations')&&!document.querySelector('table'),'Empty state is misleading');
});
scenario('Long metadata and research remain readable without horizontal overflow',()=>{
 mount(<SupervisorWorkloadDetails record={{...supervisor,lecturerName:'Research'.repeat(30),department:'Computing'.repeat(35),supervisees:supervisor.supervisees.map(row=>({...row,topic:'Research'.repeat(70)}))}}/>);geometry();
});
mount(innerWidth<600?<PanelWorkloadDetails record={panel}/>:<SupervisorWorkloadDetails record={supervisor}/>);
parent.postMessage({type:'workload-detail-results',width:innerWidth,results},location.origin);
