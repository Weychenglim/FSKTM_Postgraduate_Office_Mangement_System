import React, {useRef} from 'react';
import { useSearchParams } from 'react-router';
import { SupervisoryTeamManagement } from './SupervisoryTeamManagement';
import { AppointmentViewSwitch, workspacePageSize } from './RequestWorkspacePrimitives';
import { LecturerSupervisionHistory } from './LecturerSupervisionHistory';
import { recordFilterParams } from '../utils/recordNavigation';

export function LecturerSuperviseesWorkspace(props: React.ComponentProps<typeof SupervisoryTeamManagement>) {
  const [params, setParams] = useSearchParams();
  const focusRequest = useRef(false);
  const update = (key: string, value: string) => setParams(current => recordFilterParams(current, key, value), { replace: true });
  const past = params.get('appointments') === 'past';
  const actions = <AppointmentViewSwitch focusRequest={focusRequest} view={past ? 'past' : 'current'} currentLabel="Current" pastLabel="Past"
    onChange={value => update('appointments', value === 'past' ? 'past' : '')}/>;
  if (props.role === 'Lecturer' && props.view === 'roster' && past) return <LecturerSupervisionHistory
    key={props.lecturerId} lecturerId={props.lecturerId} actions={actions} refreshVersion={props.refreshVersion}/>;
  return <SupervisoryTeamManagement {...props} headerActions={props.role === 'Lecturer' && props.view === 'roster' ? actions : props.headerActions} rosterState={{ search: params.get('q') ?? '', page: Math.max(1, Number(params.get('page')) || 1), size: workspacePageSize(params.get('size')),
    onSearch: value => update('q', value), onPage: value => update('page', String(value)), onPageSize: value => update('size', String(value)) }} />;
}
