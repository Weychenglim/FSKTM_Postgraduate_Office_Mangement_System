/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AuditLog {
  id: string;
  timestamp: string;
  message: string;
}

interface AuditLogCardProps {
  id?: string;
  logs?: AuditLog[];
}

export const AuditLogCard: React.FC<AuditLogCardProps> = ({
  id = 'audit-log-card',
  logs = [
    {
      id: 'log1',
      timestamp: '20 Nov 2025',
      message: 'Period updated by Amina Ali'
    },
    {
      id: 'log2',
      timestamp: '15 Nov 2025',
      message: 'Proposal period closed automatically'
    }
  ]
}) => {
  return (
    <div id={id} className="text-left mt-6">
      <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-[0.15em] block mb-3.5">
        System Audit Log
      </span>

      <div className="space-y-2.5">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-[0_2px_8px_rgba(241,245,249,0.3)] transition-all"
          >
            <div className="flex gap-2 items-baseline text-xs">
              <span className="text-[10px] font-extrabold text-brand-navy tracking-tight shrink-0 font-sans">
                {log.timestamp}:
              </span>
              <span className="text-[11px] text-slate-600 font-medium leading-relaxed">
                {log.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
