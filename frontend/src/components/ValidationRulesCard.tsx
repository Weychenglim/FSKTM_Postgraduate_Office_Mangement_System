/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Rule {
  id: string;
  text: string;
}

interface ValidationRulesCardProps {
  id?: string;
  rules?: Rule[];
}

export const ValidationRulesCard: React.FC<ValidationRulesCardProps> = ({
  id = 'validation-rules-card',
  rules = [
    { id: '1', text: 'Start date must be before end date.' },
    { id: '2', text: 'Deadline must fall within or after the entry period.' },
    { id: '3', text: 'Overlapping active periods for the same semester are not allowed.' },
    { id: '4', text: 'Changes are recorded in audit history for institutional transparency.' }
  ]
}) => {
  return (
    <div
      id={id}
      className="bg-[#f0f4fa]/60 rounded-2xl border border-[#d3dfef]/70 p-6 md:p-7 text-left"
    >
      <div className="flex items-center gap-2 mb-5">
        {/* Decorative layout icons */}
        <svg
          className="w-4.5 h-4.5 text-brand-navy"
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
        <span className="font-extrabold text-[15px] text-brand-navy tracking-tight">
          Validation Rules
        </span>
      </div>

      <ul className="space-y-4">
        {rules.map((rule) => (
          <li key={rule.id} className="flex gap-3 items-start">
            <CheckCircle2 className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
            <span className="text-[11.5px] leading-relaxed text-slate-700 font-medium">
              {rule.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
