/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StatusBadge } from './PortalPrimitives';

type StatusType = 'Active' | 'Closed' | 'Pending';

interface StatusChipProps {
  status: StatusType | string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const normalized = status.toLowerCase();

  if (['active', 'approved', 'submitted', 'ready', 'completed'].includes(normalized)) {
    return <StatusBadge tone={normalized === 'active' ? 'info' : 'success'} dot pulse={normalized === 'active'}>{status}</StatusBadge>;
  }

  if (['closed', 'archived', 'expired', 'inactive'].includes(normalized)) {
    return <StatusBadge tone="neutral" dot>{status}</StatusBadge>;
  }

  if (['rejected', 'overdue', 'critical', 'urgent'].includes(normalized)) {
    return <StatusBadge tone="danger" dot>{status}</StatusBadge>;
  }

  if (['draft', 'scheduled', 'in progress', 'awaiting release'].includes(normalized)) {
    return <StatusBadge tone="info" dot>{status}</StatusBadge>;
  }

  return <StatusBadge tone="warning" dot>{status}</StatusBadge>;
};
