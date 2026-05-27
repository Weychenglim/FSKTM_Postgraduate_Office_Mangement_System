/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';

export const ValidationCard: React.FC = () => {
  const requirements = [
    { id: '1', text: 'Total weight must be exactly 100%', type: 'check' },
    { id: '2', text: 'Required components must have > 0 max marks', type: 'check' },
    { id: '3', text: 'All component names must be unique', type: 'check' },
    { id: '4', text: 'Changes affect new tasks only', type: 'info' }
  ];

  return (
    <div id="rubrics-validation-panel" className="bg-[#f0f4fa]/60 rounded-3xl border border-[#d3dfef]/70 p-6 text-left">
      <div className="flex items-center gap-2 mb-5">
        <svg
          className="w-4.5 h-4.5 text-[#0c1424]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m11.25-3l3 3m0 0l-3 3m3-3H12"
          />
        </svg>
        <span className="font-extrabold text-[15px] text-[#0c1424] tracking-tight">
          Rubric Validation
        </span>
      </div>

      <ul className="space-y-4">
        {requirements.map((item) => (
          <li key={item.id} className="flex gap-2.5 items-start">
            {item.type === 'check' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            )}
            <span className="text-[11px] leading-relaxed text-slate-700 font-semibold font-sans">
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
