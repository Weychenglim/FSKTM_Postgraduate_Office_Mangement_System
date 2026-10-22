import React from 'react';
import { FileText, SlidersHorizontal, UsersRound } from 'lucide-react';
import { WorkspaceToolsMenu } from './WorkspaceToolsMenu';

export { workspaceToolsMenuLeft as officeToolsMenuLeft } from './WorkspaceToolsMenu';

export function OfficeSupervisorTools({ onResearchRecords, onWorkload, onRequirements }: {
  onResearchRecords: () => void;
  onWorkload: () => void;
  onRequirements: () => void;
}) {
  return <WorkspaceToolsMenu label="Office supervisor tools" groups={[
    { label: 'Monitoring', items: [
      { title: 'Research records', description: 'Research profiles, corrections and request history', icon: FileText, onSelect: onResearchRecords },
      { title: 'Workload monitoring', description: 'Current supervisory workloads and capacity', icon: UsersRound, onSelect: onWorkload },
    ] },
    { label: 'Configuration', items: [
      { title: 'Document requirements', description: 'Required documents for appointment applications', icon: SlidersHorizontal, onSelect: onRequirements },
    ] },
  ]} />;
}
