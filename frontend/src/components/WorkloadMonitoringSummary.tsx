import React from 'react';
import { UsersRound, UserCheck, Gauge, ContactRound } from 'lucide-react';
import type { PanelWorkloadRecord, SupervisorWorkloadRecord } from '../types';
import { AppointmentSummaryCard } from './AppointmentPrimitives';

type WorkloadSummaryProps =
  | { kind: 'supervisor'; records: SupervisorWorkloadRecord[] }
  | { kind: 'panel'; records: PanelWorkloadRecord[] };

/** Summarize the complete filtered collection, before pagination. */
export function WorkloadMonitoringSummary(props: WorkloadSummaryProps) {
  let available = 0;
  let full = 0;
  let overCapacity = 0;
  let missingCapacity = 0;
  for (const record of props.records) {
    const configured = record.capacityState !== 'NOT_CONFIGURED' && Boolean(record.semesterCode) && record.capacityPlanVersion != null;
    if (!configured) missingCapacity++;
    else if (record.capacityState === 'AVAILABLE') available++;
    else if (record.capacityState === 'FULL') full++;
    else if (record.capacityState === 'OVER_CAPACITY') overCapacity++;
  }

  const occupied = props.records.reduce((total, record) => total + record.currentStudents, 0);
  const reserved = props.kind === 'supervisor' ? props.records.reduce((total, record) => total + (record.reservedLoad ?? 0), 0) : 0;
  const workloadDescription = props.kind === 'panel'
    ? `${props.records.reduce((total, record) => total + record.confirmedAppointments, 0)} active appointments; ${props.records.reduce((total, record) => total + record.pendingNominations, 0)} pending reservations.`
    : `Primary and supporting appointments; ${reserved} reserved ${reserved === 1 ? 'place' : 'places'} awaiting Coordinator approval. Submission alone does not reserve a place.`;

  return <section aria-label={`${props.kind === 'panel' ? 'Panel' : 'Supervisor'} workload summary`} className="space-y-3">
    <p className="card-description">Summary follows the current filters across all result pages.</p>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AppointmentSummaryCard icon={UsersRound} title="Lecturers in view" value={props.records.length}
        description={`${missingCapacity} without published capacity.`} />
      <AppointmentSummaryCard icon={ContactRound} title={props.kind === 'panel' ? 'Occupied panel seats' : 'Active appointments'} value={occupied}
        description={workloadDescription} />
      <AppointmentSummaryCard icon={UserCheck} title="Available lecturers" value={available}
        description="Available to accept new appointments." />
      <AppointmentSummaryCard icon={Gauge} title="At or over capacity" value={full + overCapacity}
        description={`${full} full; ${overCapacity} over capacity.`} />
    </div>
  </section>;
}
