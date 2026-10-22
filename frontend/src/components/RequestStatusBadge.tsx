import React from 'react';
import { StatusBadge, type BadgeTone } from './PortalPrimitives';
import { requestStatusLabel } from '../utils/lecturerRequests';
import { appointmentRequestStatusTone } from '../utils/appointmentRequestStatus';

function requestTone(status: string): BadgeTone {
  const value = status.trim().toUpperCase().replaceAll(' ', '_');
  if (['APPROVED', 'ACTIVE', 'CONFIRMED', 'COMPLETED'].includes(value)) return 'success';
  if (value.startsWith('AWAITING')) return 'warning';
  return appointmentRequestStatusTone(value);
}

export function RequestStatusBadge({ status, label, canDecide = false }: { status: string; label?: string; canDecide?: boolean }) {
  return <StatusBadge tone={requestTone(status)}>{label ?? requestStatusLabel(status, canDecide)}</StatusBadge>;
}
