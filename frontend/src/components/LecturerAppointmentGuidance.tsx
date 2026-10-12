import React from 'react';
import { AppointmentGuidance } from './AppointmentPrimitives';

export function LecturerAppointmentGuidance({ module, section }: { module: 'supervisor' | 'panel'; section?: 'requests' | 'research' }) {
  const cards = module === 'supervisor' ? [
    { title: 'Taking over supervision', content: <p>Accepting a replacement request forwards it to the Programme Coordinator. The current supervisor remains assigned until final approval; existing supporting supervisors and Panel appointments are retained.</p> },
    { title: 'Endorsing research changes', content: <p>The primary supervisor endorses title and abstract changes before the Programme Coordinator makes the final decision. The recorded research profile changes only after final approval; supporting supervisors have read-only access.</p> },
  ] : [
    { title: 'Panel candidate eligibility', content: <p>A student’s primary and supporting supervisors cannot also be their Panel member. Candidate availability and workload are checked again at final approval.</p> },
    { title: 'Replacing a Panel member', content: <p>Only the current primary supervisor can submit a replacement nomination. Provide a replacement reason; the existing Panel remains assigned until the new member accepts and the Programme Coordinator approves.</p> },
  ];
  const relevant = module === 'supervisor' && section ? cards.filter(card => card.title === (section === 'research' ? 'Endorsing research changes' : 'Taking over supervision')) : cards;
  return <AppointmentGuidance cards={relevant} />;
}
