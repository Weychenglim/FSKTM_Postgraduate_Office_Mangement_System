import type { StudentPanelAppointmentView } from '../types';

type PanelReadinessState = StudentPanelAppointmentView['readinessState'];

interface PanelReadinessCopy {
  title: string;
  detail: string;
}

const COPY: Record<PanelReadinessState, PanelReadinessCopy> = {
  SUPERVISOR_REQUIRED: {
    title: 'Supervisor appointment required',
    detail: 'Complete the Supervisor Appointment workflow before Panel processing can begin.',
  },
  SUPERVISOR_APPROVAL_PENDING: {
    title: 'Supervisor approval is in progress',
    detail: 'Your Supervisor Appointment application must receive final approval before Panel processing can begin.',
  },
  READY_FOR_PANEL_RECOMMENDATION: {
    title: 'Ready for Panel recommendation',
    detail: 'Your approved supervisor may now recommend a Panel member for faculty review.',
  },
  FACULTY_PROCESSING: {
    title: 'Panel appointment is being processed',
    detail: 'The faculty is processing your Panel appointment. Internal reviewer details remain private until confirmation.',
  },
  CONFIRMED: {
    title: 'Panel appointment confirmed',
    detail: 'Your appointed Panel member and confirmation details are available below.',
  },
};

export const getPanelReadinessCopy = (
  state: PanelReadinessState,
): PanelReadinessCopy => COPY[state];
