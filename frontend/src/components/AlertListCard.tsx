/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  ShieldAlert,
} from 'lucide-react';

import type { EvaluationPeriodOption, RubricVersion } from '../types';
import { buildMarksAttentionItems } from '../utils/marksProductionManagement';

interface AlertListCardProps {
  periods: EvaluationPeriodOption[];
  rubrics: RubricVersion[];
  onViewRecords: (filter: 'All Records' | 'Overdue') => void;
  onManageRubrics: () => void;
}

export const AlertListCard: React.FC<AlertListCardProps> = ({
  periods,
  rubrics,
  onViewRecords,
  onManageRubrics,
}) => {
  const alertItems = useMemo(
    () => buildMarksAttentionItems(periods, rubrics),
    [periods, rubrics],
  );

  return (
    <div id="attention-needed-card" className="bg-white rounded-lg border border-slate-200/80 p-6 text-left shadow-3xs">
      <h3 className="text-lg font-extrabold text-brand-navy tracking-tight mb-6">
        Records Needing Attention
      </h3>

      <div className="space-y-4">
        {alertItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === 'rubric') {
                onManageRubrics();
              } else {
                onViewRecords(item.id === 'overdue' ? 'Overdue' : 'All Records');
              }
            }}
            className="group flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-4 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-3.5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                item.count === 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : item.id === 'overdue'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-amber-50 text-amber-700'
              }`}>
                {item.count === 0
                  ? <CheckCircle2 className="h-4 w-4" />
                  : item.id === 'rubric'
                    ? <ShieldAlert className="h-4 w-4" />
                    : <Clock className="h-4 w-4" />}
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">
                  {item.title}
                </span>
                <span className={`mt-1 text-[10px] font-extrabold uppercase ${
                  item.count > 0 ? 'text-slate-600' : 'text-emerald-700'
                }`}>
                  {item.count > 0 ? item.subtext : 'No action required'}
                </span>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
          </button>
        ))}
      </div>
    </div>
  );
};
