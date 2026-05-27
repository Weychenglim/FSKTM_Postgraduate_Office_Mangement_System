/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, HelpCircle, ShieldAlert, UserCheck, ChevronRight } from 'lucide-react';

interface AlertItem {
  id: string;
  title: string;
  subtext: string;
  iconType: 'clock' | 'alert' | 'user';
  count: number;
}

export const AlertListCard: React.FC = () => {
  const alertItems: AlertItem[] = [
    {
      id: 'pending',
      title: 'Pending submissions near deadline',
      subtext: '16 records remaining',
      iconType: 'clock',
      count: 16
    },
    {
      id: 'incomplete',
      title: 'Incomplete rubric weights',
      subtext: '2 student records',
      iconType: 'alert',
      count: 2
    },
    {
      id: 'unassigned',
      title: 'Unassigned panel members',
      subtext: '0 records',
      iconType: 'user',
      count: 0
    }
  ];

  const handleAlertInteraction = (item: AlertItem) => {
    if (item.count === 0) {
      alert(`Status Clear: "${item.title}" is in a pristine state with zero unassigned elements.`);
      return;
    }

    if (item.id === 'pending') {
      alert(`Warning List: 16 students enrolled under FSKTM coursework modules are awaiting lecturer mark inputs. Deadline threshold ends in 3 days.`);
    } else if (item.id === 'incomplete') {
      alert(`Incomplete Settings: Dr. Adrian Tan's MCS6001 class weight metrics add up to 90% instead of 100%. Click the 'Manage Rubric Components' button to update.`);
    }
  };

  return (
    <div id="attention-needed-card" className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 text-left shadow-[0_8px_30px_rgb(241,245,249,0.5)]">
      <h3 className="text-lg font-extrabold text-[#0c1424] tracking-tight mb-6">
        Records Needing Attention
      </h3>

      <div className="space-y-4">
        {alertItems.map((item) => {
          return (
            <button
              key={item.id}
              onClick={() => handleAlertInteraction(item)}
              className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-2xl text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                {/* Icon wrapper depends on type */}
                <div 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    item.id === 'pending'
                      ? 'bg-rose-50 text-rose-500'
                      : item.id === 'incomplete'
                      ? 'bg-blue-50 text-blue-500'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {item.iconType === 'clock' && <Clock className="w-4.5 h-4.5" />}
                  {item.iconType === 'alert' && <ShieldAlert className="w-4.5 h-4.5" />}
                  {item.iconType === 'user' && <UserCheck className="w-4.5 h-4.5" />}
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 tracking-tight leading-snug group-hover:text-slate-900 transition-colors">
                    {item.title}
                  </span>
                  <span 
                    className={`text-[10px] font-extrabold tracking-wide mt-1 uppercase ${
                      item.count > 0 
                        ? item.id === 'pending' 
                          ? 'text-[#dc2626]' 
                          : 'text-[#1d4ed8]' 
                        : 'text-slate-400'
                    }`}
                  >
                    {item.subtext}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
