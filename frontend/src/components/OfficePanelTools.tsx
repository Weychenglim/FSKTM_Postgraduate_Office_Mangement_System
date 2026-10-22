import React from 'react';
import { UsersRound } from 'lucide-react';
import { WorkspaceToolsMenu } from './WorkspaceToolsMenu';

export function OfficePanelTools({ onWorkload }: { onWorkload: () => void }) {
  return <WorkspaceToolsMenu label="Office Panel tools" groups={[
    { label: 'Monitoring', items: [{ title: 'Workload monitoring', description: 'Current Panel workloads and capacity', icon: UsersRound, onSelect: onWorkload }] },
  ]} />;
}
