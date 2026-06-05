/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface UpdateItem {
  id: string;
  author: string;
  timestamp: string;
  description: string;
  badgeText: string;
  badgeType: 'update' | 'create';
}

interface RecentUpdatesCardProps {
  onViewHistory?: () => void;
}

export const RecentUpdatesCard: React.FC<RecentUpdatesCardProps> = ({ onViewHistory }) => {
  const updates: UpdateItem[] = [
    {
      id: 'up1',
      author: 'Admin Office Staff',
      timestamp: '20 Nov 2025',
      description: 'Adjusted Methodology max marks',
      badgeText: 'UPDATED COMPONENT',
      badgeType: 'update'
    },
    {
      id: 'up2',
      author: 'System Admin',
      timestamp: '18 Nov 2025',
      description: 'Initialized EE Evaluation Rubric',
      badgeText: 'NEW TEMPLATE',
      badgeType: 'create'
    }
  ];

  return (
    <div id="recent-updates-panel" className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden text-left shadow-3xs">
      <div className="p-5 pb-3">
        <span className="font-extrabold text-[13px] text-brand-navy tracking-tight">
          Recent Updates
        </span>
      </div>

      <div className="divide-y divide-slate-100/90 font-sans">
        {updates.map((item) => (
          <div key={item.id} className="p-5 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">
                {item.author}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {item.timestamp}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {item.description}
            </p>

            <span className={`inline-block self-start px-2 py-1 rounded text-[8px] font-extrabold tracking-wide uppercase ${
              item.badgeType === 'update' 
                ? 'bg-blue-50 text-blue-600' 
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              {item.badgeText}
            </span>
          </div>
        ))}
      </div>

      {onViewHistory && (
        <div className="p-4 border-t border-slate-100 text-center bg-slate-50/50">
          <button
            onClick={onViewHistory}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider cursor-pointer select-none"
          >
            View History
          </button>
        </div>
      )}
    </div>
  );
};
