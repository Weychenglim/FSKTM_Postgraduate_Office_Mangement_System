/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type StatusType = 'Active' | 'Closed' | 'Pending';

interface StatusChipProps {
  status: StatusType | string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const normalized = status.toLowerCase();

  if (normalized === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50/80 text-blue-700 border border-blue-100/60 rounded-full text-[10px] font-extrabold tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span>Active</span>
      </span>
    );
  }

  if (normalized === 'closed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-500 border border-slate-200/60 rounded-full text-[10px] font-extrabold tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>Closed</span>
      </span>
    );
  }

  // fallback/pending style
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-extrabold tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      <span>{status}</span>
    </span>
  );
};
