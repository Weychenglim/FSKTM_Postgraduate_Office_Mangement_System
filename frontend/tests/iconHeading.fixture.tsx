import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {renderToStaticMarkup} from 'react-dom/server';
import {SettingsView} from '../src/components/SettingsView';
import {RegistryImportResult} from '../src/components/RegistryImportResult';
import {RegistryImportProgrammes} from '../src/components/RegistryImportProgrammes';
import {AccountTypeSelector, RoleAssignmentCard} from '../src/components/StaffLecturersRegistry';
import {ChecklistCard} from '../src/components/ChecklistCard';
import {BookOpen, ClipboardList} from 'lucide-react';
import {RequestSummaryCard, ResearchDetailsCard} from '../src/components/AppointmentRequestSections';
import {RequestSection} from '../src/components/RequestDetailPrimitives';
import {AppointmentSection} from '../src/components/AppointmentPrimitives';
import {OfficeToolSection, OfficeToolHeading} from '../src/components/OfficeToolPrimitives';
import {MarksHeading} from '../src/components/MarksPrimitives';
import {FormCard} from '../src/components/FormCard';
import {PortalButton} from '../src/components/PortalPrimitives';
import '../src/components/officeDashboard.css';

const cases = [
  ['Appointment request summary', <RequestSummaryCard studentName="Example student" studentId="EXAMPLE-01" participants={[]} contextAction={<PortalButton size="sm">View student record</PortalButton>}/>],
  ['Research details with subtitle', <ResearchDetailsCard title="Example research" source="submitted"/>],
  ['Request section without icon', <RequestSection title="Recorded information"><p>Example</p></RequestSection>],
  ['Long request title', <RequestSection title="Supporting supervisor appointment request summary and recorded student information" icon={ClipboardList} description="A supporting description which can wrap on smaller screens." actions={<PortalButton>View record</PortalButton>}><p>Example</p></RequestSection>],
  ['Appointment section', <AppointmentSection title="Appointment details" icon={BookOpen}><p>Example</p></AppointmentSection>],
  ['Appointment detail with subtitle', <AppointmentSection title="Research and supervision details" description="The information recorded when this request was submitted." icon={BookOpen} detail><p>Example</p></AppointmentSection>],
  ['Office section', <OfficeToolSection title="Semester configuration" icon={BookOpen}><p>Example</p></OfficeToolSection>],
  ['Office section with subtitle', <OfficeToolSection title="Semester configuration and evaluation deadline management" description="Review the current configuration for this semester." icon={BookOpen}><p>Example</p></OfficeToolSection>],
  ['Office heading', <OfficeToolHeading icon={BookOpen}>Academic semester</OfficeToolHeading>],
  ['Marks heading', <MarksHeading icon={BookOpen}>Evaluation tasks</MarksHeading>],
  ['Marks setup row', <ChecklistCard items={[{id:'period',taskName:'Mark entry periods',status:'PENDING',actionLabel:'Manage'}]} onItemAction={()=>{}}/>],
  ['Registry import result', <RegistryImportResult result={{batch:{id:1,fileName:'example-import.xlsx',uploadedBy:'Example Office',totalRows:0,created:0,skipped:0,failed:0,invitationsFailed:0,problems:[],createdAt:'2026-10-26T00:00:00Z'},rows:[]}} onDownloadReport={()=>{}} onClose={()=>{}}/>],
  ['Registry import programmes', <RegistryImportProgrammes values={[]} total={0} choices={{}} busy={false} onChoose={()=>{}}/>],
  ['Staff registration choice', <AccountTypeSelector selectedType="Lecturer" onChange={()=>{}}/>],
  ['Staff role assignment', <RoleAssignmentCard title="Programme coordinator" description="Manage assigned programmes and review appointment requests." icon={BookOpen}/>],
  ['Form heading', <FormCard title="Application details" icon={<BookOpen size={20}/>}><p>Example</p></FormCard>],
] as const;

flushSync(()=>createRoot(document.getElementById('root')!).render(<main style={{display:'grid',gap:20}}>{cases.map(([name,content])=><div data-alignment-case={name} key={name}>{content}</div>)}</main>));
// Render just the production settings heading without running account API effects.
const settings = new DOMParser().parseFromString(renderToStaticMarkup(<SettingsView currentUser={{id:'example',fullName:'Example lecturer',email:'example@example.test',role:'Lecturer',department:'Example department'}} onLogout={()=>{}} onUserUpdated={()=>{}} onPasswordChanged={()=>{}}/>), 'text/html');
for(const heading of settings.querySelectorAll('h3')) if(heading.textContent==='Account & Contact') {
  const container=document.createElement('div');container.dataset.alignmentCase='Settings section';
  let block=heading.parentElement!;while(!block.querySelector('svg'))block=block.parentElement!;
  container.append(block.cloneNode(true));document.getElementById('root')!.append(container);
}
setTimeout(async()=>{
  await document.fonts.ready;
  const results=[];
  for(const element of document.querySelectorAll<HTMLElement>('[data-alignment-case]')) {
    const name=element.dataset.alignmentCase;
    try {
      const heading=(element.dataset.alignmentCase==='Marks setup row'?element.querySelector<HTMLElement>('h3'):element.querySelector<HTMLElement>('h2,h3,h4'))!;
      const svg=element.dataset.alignmentCase==='Marks setup row'?heading.closest('[data-alignment-case]')!.querySelectorAll('svg')[1]:element.querySelector('svg');
      if(!svg&&name!=='Request section without icon')throw Error('Expected production heading icon');
      if(svg){
        // Badge boxes, rather than SVG paths, define the visible header alignment.
        const badge=svg.parentElement!;
        const iconBox=(badge.getBoundingClientRect().height>=30?badge:svg).getBoundingClientRect();
        const titleBox=heading.getBoundingClientRect();
        const offset=Math.abs((iconBox.top+iconBox.bottom-titleBox.top-titleBox.bottom)/2);
        if(offset>1)throw Error(`Icon/title centres differ by ${offset.toFixed(2)}px`);
        const description=heading.parentElement?.querySelector('p.card-description');
        if(description&&description.getBoundingClientRect().top<titleBox.bottom-1)throw Error('Subtitle overlaps title');
      }
      if(element.scrollWidth>element.clientWidth+1)throw Error('Heading/card overflows horizontally');
      const action=element.querySelector('button');
      if(action&&action.getBoundingClientRect().right>element.getBoundingClientRect().right+1)throw Error('Header action overflows');
      results.push({name});
    }catch(error){results.push({name,error:String(error)});}
  }
  parent.postMessage({type:'icon-heading-results',width:innerWidth,results},location.origin);
}, 100);
