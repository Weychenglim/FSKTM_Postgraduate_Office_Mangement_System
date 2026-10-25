import React from 'react';
import { Gauge, History } from 'lucide-react';
import {OfficeToolHeading} from './OfficeToolPrimitives';
import type { SemesterCapacityPlan } from '../types';
import { PortalButton, PortalCard, StatusBadge } from './PortalPrimitives';

export function CapacityPolicySummary({published, drafts, mutable, disabled, onVersions, onContinue, onPrepare, children}: {
  published: SemesterCapacityPlan | null; drafts: SemesterCapacityPlan[]; mutable: boolean; disabled: boolean;
  onVersions: (draftsOnly?: boolean) => void; onContinue: (plan: SemesterCapacityPlan) => void; onPrepare: () => void; children?: React.ReactNode;
}) {
  return <PortalCard padding="none" className="capacity-policy-card" role="region" aria-label="Semester capacity policy">
    <div className="capacity-policy-heading p-5"><OfficeToolHeading icon={Gauge}>Capacity limits</OfficeToolHeading><PortalButton size="sm" icon={History} onClick={() => onVersions()}>Capacity versions</PortalButton></div>
    <div className="capacity-policy-published">
      <div><p className="card-description">Published limits</p><p className="capacity-policy-value">{published ? `Version ${published.version}` : 'No published limits'}</p></div>
      {published && <StatusBadge tone="success">Published</StatusBadge>}
      {!drafts.length && mutable && <PortalButton size="sm" variant="primary" disabled={disabled} onClick={onPrepare}>{published ? 'Prepare revision' : 'Prepare limits'}</PortalButton>}
    </div>
    {drafts.length > 0 && <div className="capacity-policy-draft">
      <div><p className="card-description">{drafts.length === 1 ? 'Draft available' : 'Drafts available'}</p><p className="font-semibold text-brand-navy">{drafts.length === 1 ? `Version ${drafts[0].version}` : `${drafts.length} drafts`}</p></div>
      <PortalButton size="sm" variant={mutable ? 'primary' : 'secondary'} disabled={disabled} onClick={() => drafts.length === 1 && mutable ? onContinue(drafts[0]) : onVersions(true)}>{!mutable ? 'View drafts' : drafts.length === 1 ? 'Continue editing' : `Review drafts · ${drafts.length}`}</PortalButton>
    </div>}
    {children}
  </PortalCard>;
}
