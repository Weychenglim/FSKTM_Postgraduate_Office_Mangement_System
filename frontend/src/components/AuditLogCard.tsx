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
      <span className="section-label block mb-3.5">
        System Audit Log
      </span>

      <div className="space-y-2.5">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3 bg-white border border-slate-200 rounded-xl text-left shadow-3xs transition-all"
          >
            <div className="flex gap-2 items-baseline text-xs">
              <span className="card-label shrink-0">
                {log.timestamp}:
              </span>
              <span className="card-description">
                {log.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
