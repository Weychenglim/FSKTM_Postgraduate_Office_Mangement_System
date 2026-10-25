import React from 'react';
import {PageHeader} from './PortalPrimitives';

/** The page identity stays consistent; each role supplies its own context and actions. */
export function DashboardHeader({context, actions}: {context: React.ReactNode; actions?: React.ReactNode}) {
  return <header className="space-y-4" aria-label="Dashboard overview">
    <PageHeader title="Dashboard" subtitle="Your academic overview, tasks and upcoming dates." actions={actions}/>
    {context}
  </header>;
}
