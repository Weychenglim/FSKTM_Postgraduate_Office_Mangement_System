import React from 'react';
import type {CapacityRole,CapacityState,LecturerCapacityEntry} from '../types';
import {capacityStateLabel,capacityUtilization} from '../utils/lecturerCapacity';
import {ProgressBar,StatusBadge,type BadgeTone} from './PortalPrimitives';
export {OfficeCapacityWorkspace as LecturerCapacityManagement} from './OfficeCapacityWorkspace';

const stateTone=(state:CapacityState):BadgeTone=>state==='AVAILABLE'?'success':state==='FULL'||state==='TEMPORARILY_UNAVAILABLE'?'warning':state==='OVER_CAPACITY'||state==='NOT_CONFIGURED'?'danger':'neutral';

/** Version values and Published operational resolution are separate read contracts. */
export function CapacityRoleSummary({entry, role}: {entry: LecturerCapacityEntry; role: CapacityRole}) {
  const resolution = role === 'SUPERVISOR' ? entry.supervisor : entry.panel;
  const selectedLimit = role === 'SUPERVISOR' ? entry.supervisorLimit : entry.panelLimit;
  if (!resolution) return <span className="card-description">{role === 'SUPERVISOR' ? 'Not a Supervisor' : 'Not a Panel Lecturer'}</span>;
  const occupied = resolution.activeLoad + resolution.reservedLoad;
  return <div className="space-y-2">
    <p className="card-description">Selected version limit: <strong className="card-value">{selectedLimit ?? 'Not configured'}</strong></p>
    <p className="card-description">Global load: <strong className="card-value">{resolution.activeLoad} active + {resolution.reservedLoad} reserved</strong></p>
    <p className="card-description">Published policy limit: <strong className="card-value">{resolution.limit ?? 'Not configured'}</strong></p>
    <div><span className="card-caption mr-2">Operational state</span><StatusBadge tone={stateTone(resolution.state)}>{capacityStateLabel(resolution.state)}</StatusBadge></div>
    {resolution.limit !== null && <ProgressBar value={capacityUtilization(occupied, resolution.limit)} />}
  </div>;
}
