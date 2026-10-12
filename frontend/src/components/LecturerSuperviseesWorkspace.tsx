import React from 'react';
import { useSearchParams } from 'react-router';
import { SupervisoryTeamManagement } from './SupervisoryTeamManagement';
import { workspacePageSize } from './RequestWorkspacePrimitives';
import { recordFilterParams } from '../utils/recordNavigation';

export function LecturerSuperviseesWorkspace(props: React.ComponentProps<typeof SupervisoryTeamManagement>) {
  const [params, setParams] = useSearchParams();
  const update = (key: string, value: string) => setParams(current => recordFilterParams(current, key, value), { replace: true });
  return <SupervisoryTeamManagement {...props} rosterState={{ search: params.get('q') ?? '', page: Math.max(1, Number(params.get('page')) || 1), size: workspacePageSize(params.get('size')),
    onSearch: value => update('q', value), onPage: value => update('page', String(value)), onPageSize: value => update('size', String(value)) }} />;
}
