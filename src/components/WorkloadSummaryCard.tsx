/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface WorkloadSummaryCardProps {
  currentStudents: number;
  workloadLimit: number;
  semester?: string;
}

export const WorkloadSummaryCard: React.FC<WorkloadSummaryCardProps> = ({
  currentStudents,
  workloadLimit,
  semester = 'Sem 1 2024/2025',
}) => {
  const slotsAvailable = Math.max(0, workloadLimit - currentStudents);
  const utilizationPercent = Math.min(100, Math.round((currentStudents / workloadLimit) * 100)) || 0;

  return (
    <div id="workload-summary-card-container" className="bg-white border border-[#e2e8f0] rounded-xl p-5 text-left font-sans space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
        <span className="text-[10px] font-extrabold text-[#475569] uppercase tracking-wider">
          Workload Summary
        </span>
        <span className="text-[10px] font-bold text-[#64748b]">
          {semester}
        </span>
      </div>

      {/* 3-Column Metrics Gauge Grid */}
      <div className="grid grid-cols-3 divide-x divide-[#f1f5f9] text-center py-1">
        {/* Supervisees */}
        <div className="flex flex-col items-center justify-center space-y-1">
          <span className="text-2xl font-extrabold text-brand-navy">
            {currentStudents}
          </span>
          <span className="text-[9px] font-extrabold text-[#64748b] tracking-wider uppercase">
            Supervisees
          </span>
        </div>

        {/* Workload Limit */}
        <div className="flex flex-col items-center justify-center space-y-1">
          <span className="text-2xl font-extrabold text-brand-navy">
            {workloadLimit}
          </span>
          <span className="text-[9px] font-extrabold text-[#64748b] tracking-wider uppercase">
            Workload Limit
          </span>
        </div>

        {/* Slots Available */}
        <div className="flex flex-col items-center justify-center space-y-1">
          <span className="text-2xl font-extrabold text-[#2563eb]">
            {slotsAvailable}
          </span>
          <span className="text-[9px] font-extrabold text-[#64748b] tracking-wider uppercase">
            Slots Available
          </span>
        </div>
      </div>

      {/* Progress Bar Gauge */}
      <div className="space-y-2 pt-2 border-t border-[#f1f5f9]">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[#475569]">Capacity Utilization</span>
          <span className="font-extrabold text-brand-navy">{utilizationPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563eb] rounded-full transition-all duration-500"
            style={{ width: `${utilizationPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
