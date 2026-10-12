/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Mail } from 'lucide-react';
import { PageHeader } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { getStudentPanelAppointment } from '../services/appointmentsApi';
import type { StudentPanelAppointmentView } from '../types';
import { formatWaitingText } from '../utils/workflowAgeing';
import { getPanelReadinessCopy } from '../utils/panelReadiness';
import { APP_ROUTES } from '../constants/routes';
import { StudentAppointmentSection, StudentAppointmentMemberCard, StudentAppointmentGuidance } from './StudentAppointmentPrimitives';

interface StudentPanelAppointmentProps { onShowFAQChatbot?: () => void }

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return <div className="space-y-1"><dt className="card-label">{label}</dt><dd className="card-value break-words">{value || 'Not recorded'}</dd></div>;
}

function panelGuidance(appointment: StudentPanelAppointmentView) {
  switch (appointment.readinessState) {
    case 'SUPERVISOR_REQUIRED':
      return { title: 'Start with a supervisor application', content: <><p>Your primary supervisor submits the Panel nomination after their appointment is approved.</p><Link className="card-value inline-block text-blue-600 hover:underline" to={APP_ROUTES.supervisorAppointments}>Open Supervisor appointments</Link></> };
    case 'SUPERVISOR_APPROVAL_PENDING':
      return { title: 'Check your supervisor application', content: <><p>Open the application to see who is reviewing it and any decision notes. If it is returned, address the recorded reason before resubmitting.</p><Link className="card-value inline-block text-blue-600 hover:underline" to={APP_ROUTES.supervisorAppointments}>View Supervisor application</Link></> };
    case 'READY_FOR_PANEL_RECOMMENDATION':
      return { title: 'Arrange your Panel nomination', content: <p>Contact your primary supervisor{appointment.supervisorName ? `, ${appointment.supervisorName},` : ''} to discuss a suitable Panel member. They submit the nomination in this portal.</p> };
    case 'FACULTY_PROCESSING':
      return { title: 'During faculty processing', content: <p>Panel member details are released after confirmation. For questions about the nomination, contact your primary supervisor{appointment.supervisorName ? `, ${appointment.supervisorName}` : ''}.</p> };
    case 'CONFIRMED':
      return { title: 'Requesting a Panel change', content: <p>Discuss the reason with your primary supervisor{appointment.supervisorName ? `, ${appointment.supervisorName}` : ''}. They submit the replacement nomination; your current Panel remains assigned until it is approved.</p> };
  }
}

export function StudentPanelAppointmentOverview({ appointment, onRefresh, refreshing = false, onShowFAQChatbot }: StudentPanelAppointmentProps & {
  appointment: StudentPanelAppointmentView; onRefresh?: () => void; refreshing?: boolean;
}) {
  const confirmed = appointment.status === 'CONFIRMED' && appointment.readinessState === 'CONFIRMED';
  const waiting = formatWaitingText(appointment);
  return <>
    <StudentAppointmentSection title="My panel" description="Your Panel appointment and recorded appointment details." onRefresh={onRefresh} refreshing={refreshing}>
      <div className="grid gap-3 sm:grid-cols-2">
        <StudentAppointmentMemberCard label="Panel member" name={confirmed ? appointment.panelMemberName || 'Panel member not recorded' : 'Panel not appointed'} status={confirmed ? 'Confirmed' : getPanelReadinessCopy(appointment.readinessState).title} tone={confirmed ? 'success' : 'warning'}>
          {confirmed && appointment.panelMemberDepartment ? <p className="card-description">{appointment.panelMemberDepartment}</p> : null}
          {confirmed && appointment.panelMemberEmail ? <a href={`mailto:${appointment.panelMemberEmail}`} className="card-value inline-flex max-w-full items-start gap-2 break-all text-blue-600 hover:underline"><Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />{appointment.panelMemberEmail}</a> : null}
        </StudentAppointmentMemberCard>
        <dl className="space-y-3 rounded-xl border border-slate-200 p-4">
          <InfoItem label="Programme" value={appointment.programme} /><InfoItem label="Semester" value={appointment.semester} />
          {confirmed ? <InfoItem label="Appointment date" value={appointment.appointmentDate} /> : waiting !== 'Not waiting' ? <InfoItem label="Waiting" value={waiting} /> : null}
        </dl>
      </div>
      {appointment.researchTitle ? <div className="space-y-2"><p className="card-label">Current research title</p><p className="card-value break-words">{appointment.researchTitle}</p></div> : null}
    </StudentAppointmentSection>
    <StudentAppointmentGuidance cards={[panelGuidance(appointment)]} onShowFAQChatbot={onShowFAQChatbot} />
  </>;
}

export const StudentPanelAppointment: React.FC<StudentPanelAppointmentProps> = ({ onShowFAQChatbot }) => {
  const [appointment, setAppointment] = useState<StudentPanelAppointmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadAppointment = useCallback(() => {
    setLoading(true); setError(null);
    getStudentPanelAppointment().then(setAppointment)
      .catch(failure => { setAppointment(null); setError(failure instanceof Error ? failure.message : 'Panel appointment could not be loaded.'); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadAppointment(); }, [loadAppointment]);
  return <div id="student-panel-app-workspace" className="space-y-6 text-left font-sans pb-12">
    <PageHeader title="Panel Appointment" subtitle="See your Panel appointment and the next step for your current status." />
    {loading ? <LoadingState message="Loading your panel appointment..." /> : error || !appointment ? <ErrorState message={error || 'Panel appointment record was not available.'} onRetry={loadAppointment} /> : <StudentPanelAppointmentOverview appointment={appointment} onRefresh={loadAppointment} onShowFAQChatbot={onShowFAQChatbot} />}
  </div>;
};
