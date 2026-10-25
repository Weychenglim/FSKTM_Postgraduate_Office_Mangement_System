import type {CapacityWorkspaceLecturer} from '../services/capacityWorkspaceApi';
import type {CapacityBulkMode, CapacityBulkPatch} from '../types/lecturerCapacity';
import {committedCapacityLoad} from './capacityWorkspace';

export const canBulkConfigure = (row: CapacityWorkspaceLecturer) => row.canConfigure !== false && row.userEnabled !== false && row.participantLifecycle === 'ACTIVE' && !!(row.supervisor || row.panel);
export interface CapacityBulkChange { row: CapacityWorkspaceLecturer; values: string[]; warnings: string[] }

/** Preview only explicit role changes; publication minimums warn, never silently raise values. */
export function buildCapacityBulkPreview(rows: CapacityWorkspaceLecturer[], values: {supervisor: string; panel: string}, mode: CapacityBulkMode) {
  const errors: string[] = [], entries: CapacityBulkPatch[] = [], changes: CapacityBulkChange[] = [];
  if (!values.supervisor.trim() && !values.panel.trim()) errors.push('Enter at least one limit.');
  for (const [role, value] of [['Supervisor', values.supervisor], ['Panel', values.panel]]) {
    if (value.trim() && (!Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 2147483647)) errors.push(`${role} limit must be a whole number from 0 to 2147483647.`);
  }
  if (rows.length > 1000) errors.push('Select no more than 1000 lecturers per batch.');
  if (errors.length) return {entries, changes, errors};
  for (const row of rows.filter(canBulkConfigure)) {
    const patch: CapacityBulkPatch = {lecturerId: row.lecturerId};
    const descriptions: string[] = [], warnings: string[] = [];
    let supervisor = row.supervisorLimit, panel = row.panelLimit;
    for (const role of ['SUPERVISOR', 'PANEL'] as const) {
      const held = role === 'SUPERVISOR' ? row.supervisor : row.panel;
      const field = role === 'SUPERVISOR' ? 'supervisorLimit' : 'panelLimit';
      const input = role === 'SUPERVISOR' ? values.supervisor : values.panel;
      const label = role === 'SUPERVISOR' ? 'Supervisor' : 'Panel';
      const old = row[field];
      if (!held || !input.trim() || (mode === 'MISSING_ONLY' && old !== null) || old === Number(input)) continue;
      patch[field] = Number(input);
      if (role === 'SUPERVISOR') supervisor = Number(input); else panel = Number(input);
      descriptions.push(`${label}: ${old ?? 'Not set'} → ${Number(input)}`);
      const minimum = committedCapacityLoad(row, role);
      if (minimum !== null && Number(input) < minimum) warnings.push(`${label} minimum to publish: ${minimum}.`);
    }
    if (!descriptions.length) continue;
    if (!row.supervisor && supervisor !== null) errors.push(`${row.staffNo}: Use Edit limits to clear the saved Supervisor limit for the role no longer held.`);
    if (!row.panel && panel !== null) errors.push(`${row.staffNo}: Use Edit limits to clear the saved Panel limit for the role no longer held.`);
    if (row.supervisor && supervisor === null) errors.push(`${row.staffNo}: Supervisor limit is required.`);
    if (row.panel && panel === null) errors.push(`${row.staffNo}: Panel limit is required.`);
    entries.push(patch); changes.push({row, values: descriptions, warnings});
  }
  return {entries, changes, errors};
}
