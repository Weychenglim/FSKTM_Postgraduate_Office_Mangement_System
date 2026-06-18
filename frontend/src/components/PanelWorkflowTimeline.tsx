/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, X } from 'lucide-react';

export type PanelWorkflowItemStatus = 'completed' | 'active' | 'pending' | 'rejected';

export interface PanelWorkflowItem {
  id: string;
  label: string;
  subtext?: string;
  timestamp?: string | null;
  status: PanelWorkflowItemStatus;
}

export const PanelWorkflowTimeline: React.FC<{ items: PanelWorkflowItem[] }> = ({ items }) => (
  <div className="space-y-4">
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      const toneClass =
        item.status === 'completed'
          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
          : item.status === 'active'
          ? 'bg-brand-navy text-white border-brand-navy ring-4 ring-slate-100'
          : item.status === 'rejected'
          ? 'bg-rose-50 text-rose-600 border-rose-200'
          : 'bg-white text-slate-300 border-slate-200';
      const lineClass =
        item.status === 'completed'
          ? 'bg-emerald-100'
          : item.status === 'rejected'
          ? 'bg-rose-100'
          : 'bg-slate-100';

      return (
        <div key={item.id} className="relative flex gap-4 text-left group">
          <div className="flex flex-col items-center shrink-0">
            <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center border font-sans text-[10px] font-bold ${toneClass}`}>
              {item.status === 'completed' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3.5]" />
              ) : item.status === 'active' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-white block animate-pulse" />
              ) : item.status === 'rejected' ? (
                <X className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 block" />
              )}
            </div>
            {!isLast && <div className={`w-[2px] h-10 -mb-4 mt-1 grow ${lineClass}`} />}
          </div>

          <div className="pt-0.5 space-y-0.5 select-none">
            <h5 className={`text-xs font-extrabold ${item.status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
              {item.label}
            </h5>
            {(item.timestamp || item.subtext) && (
              <p className={`text-[10px] font-bold ${item.status === 'pending' ? 'text-slate-350' : 'text-slate-400'}`}>
                {item.timestamp || item.subtext}
              </p>
            )}
          </div>
        </div>
      );
    })}
  </div>
);
