import React,{createContext} from 'react';
import {APP_ROUTES} from '../constants/routes';

export const CompactReadFeedback=createContext(false);
export function isOwnedFeedbackPath(pathname:string) {
  if(pathname===APP_ROUTES.dashboardParticipantLifecycle||pathname.startsWith(`${APP_ROUTES.dashboardParticipantLifecycle}/`))return false;
  return [APP_ROUTES.dashboard,APP_ROUTES.supervisorAppointments,APP_ROUTES.panelAppointments,APP_ROUTES.marks].some(path=>pathname===path||pathname.startsWith(`${path}/`));
}
/** Keep teammate-owned routes on their existing presentation. */
export function ModuleFeedbackScope({pathname,children}:{pathname:string;children:React.ReactNode}) {
  return <CompactReadFeedback.Provider value={isOwnedFeedbackPath(pathname)}>{children}</CompactReadFeedback.Provider>;
}
