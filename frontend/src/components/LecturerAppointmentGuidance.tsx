import React from 'react';
import { AppointmentGuidance } from './AppointmentPrimitives';

export function LecturerAppointmentGuidance({ module, section, panelContext }: { module: 'supervisor' | 'panel'; section?: 'requests' | 'research'; panelContext?: 'reviews' | 'supervisees' | 'appointments' }) {
  if(module==='panel'&&panelContext==='reviews')return <AppointmentGuidance cards={[{title:'Reviewing a Panel nomination',content:<p>Accepting a nomination forwards it to the Programme Coordinator for final approval. History includes requests you have reviewed and cancelled requests, including accepted nominations still awaiting approval.</p>}]}/>;
  if(module==='panel'&&panelContext==='appointments')return <AppointmentGuidance cards={[{title:'Current and past appointments',content:<p>Current appointments are your active Panel assignments. Past appointments have ended; their recorded dates and outcomes explain completion, replacement or withdrawal. An accepted nomination becomes an appointment only after final approval.</p>}]}/>;
  const cards = module === 'supervisor' ? [
    { title: 'Taking over supervision', content: <p>Accepting a replacement request forwards it to the Programme Coordinator. The current supervisor remains assigned until final approval; existing supporting supervisors and Panel appointments are retained.</p> },
    { title: 'Reviewing research changes', content: <p>The primary supervisor makes the final approve or reject decision on title and abstract changes. Approval updates the recorded research profile immediately; supporting supervisors have read-only access.</p> },
  ] : [
    { title: 'Panel candidate eligibility', content: <p>A student’s primary and supporting supervisors cannot also be their Panel member. Candidate availability and workload are checked again at final approval.</p> },
    { title: 'Replacing a Panel member', content: <p>Only the current primary supervisor can submit a replacement nomination. Provide a replacement reason; the existing Panel remains assigned until the new member accepts and the Programme Coordinator approves.</p> },
  ];
  const relevant = module === 'supervisor' && section ? cards.filter(card => card.title === (section === 'research' ? 'Reviewing research changes' : 'Taking over supervision')) : cards;
  return <AppointmentGuidance cards={relevant} />;
}
