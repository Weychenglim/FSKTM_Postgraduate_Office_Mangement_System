/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  taskName: string;
  status: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS';
  actionLabel: string;
}

interface ChecklistCardProps {
  items: ChecklistItem[];
  onItemAction: (item: ChecklistItem) => void;
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  items,
  onItemAction
}) => {
  return (
    <div id="checklist-card-section" className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 text-left shadow-[0_8px_30px_rgb(241,245,249,0.5)]">
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-lg font-extrabold text-[#0c1424] tracking-tight">
          Evaluation Setup Checklist
        </h3>
        <button 
          title="Setup guide information"
          className="text-slate-400 hover:text-slate-600 transition-colors"
          onClick={() => alert("Setup Checklist Guide: Admin Secretariat must accomplish all four preliminary phases to auto-generate exam lists and activate candidate marking portals.")}
        >
          <HelpCircle className="w-4.5 h-4.5" />
        </button>
      </div>
      <p className="text-slate-500 text-xs font-medium mb-6">
        Complete these setup steps before lecturers begin mark entry.
      </p>

      {/* Checklist Rows list */}
      <div id="checklist-rows" className="space-y-4">
        {items.map((item) => (
          <div 
            key={item.id} 
            className="flex items-center justify-between p-4 bg-slate-50/70 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              {/* Checkmark bullet */}
              <div className="shrink-0">
                <CheckCircle2 className="w-5.5 h-5.5 text-emerald-500 fill-emerald-50/50" />
              </div>
              <span className="text-slate-800 font-bold text-[13px] tracking-tight group-hover:text-slate-950 transition-colors">
                {item.taskName}
              </span>
            </div>

            {/* Status indicators & Actions */}
            <div className="flex items-center gap-4">
              <span className="px-2.5 py-1 text-[10px] font-extrabold tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-100/60 rounded-md">
                {item.status}
              </span>
              
              <button
                type="button"
                onClick={() => onItemAction(item)}
                className="text-xs font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer select-none"
              >
                <span>{item.actionLabel}</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
