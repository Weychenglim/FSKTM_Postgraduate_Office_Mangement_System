import {createContext,useContext} from 'react';
import {officeSupervisorApi,coordinatorSupervisorApi} from '../services/staffSupervisorWorkspaceApi';
export const StaffSupervisorBrowseContext=createContext<'Programme Coordinator'|'Office Staff/Admin'>('Programme Coordinator');
export function useStaffSupervisorBrowse() {
 const role=useContext(StaffSupervisorBrowseContext);
 return {role,office:role==='Office Staff/Admin',scopeKey:role==='Office Staff/Admin'?'office':'coordinator',api:role==='Office Staff/Admin'?officeSupervisorApi:coordinatorSupervisorApi};
}
