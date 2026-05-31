/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';

interface RequirementChecklistProps {
  id?: string;
  checks: {
    id: string;
    label: string;
    status: boolean; // true = check is fulfilled, false = unchecked / normal status
  }[];
}

export const RequirementChecklist: React.FC<RequirementChecklistProps> = ({
  id = 'requirement-checklist',
  checks,
}) => {
  return (
    <div id={id} className="bg-[#f0f4fa]/50 rounded-2xl border border-[#d3dfef]/60 p-5 text-left">
      <span className="text-[10px] font-extrabold text-[#111c30] tracking-wider uppercase block mb-4">
        System Requirements
      </span>
      <ul className="space-y-3 font-sans">
        {checks.map((check) => (
          <li key={check.id} className="flex gap-2.5 items-start">
            <CheckCircle2
              className={`w-4 h-4 shrink-0 mt-0.5 transition-all ${
                check.status 
                  ? 'text-blue-600 fill-blue-50/20' 
                  : 'text-slate-400 fill-none'
              }`}
            />
            <span
              className={`text-[11px] leading-relaxed transition-all ${
                check.status 
                  ? 'text-slate-700 font-bold' 
                  : 'text-slate-500 font-medium'
              }`}
            >
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
