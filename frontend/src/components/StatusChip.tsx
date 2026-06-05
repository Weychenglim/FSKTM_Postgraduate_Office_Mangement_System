/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StatusBadge, getStatusBadgeTone } from './PortalPrimitives';

type StatusType = 'Active' | 'Closed' | 'Pending';

interface StatusChipProps {
  status: StatusType | string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const normalized = status.toLowerCase();
  const tone = getStatusBadgeTone(status);

  return <StatusBadge tone={tone} dot pulse={normalized === 'active'}>{status}</StatusBadge>;
};
