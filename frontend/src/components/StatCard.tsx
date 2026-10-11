/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type StatTone = 'blue' | 'green' | 'amber' | 'rose' | 'slate' | 'purple';

const TONE_CLASS: Record<StatTone, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
  slate: 'bg-slate-50 text-slate-500 border-slate-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  caption?: string;
  icon?: LucideIcon;
  tone?: StatTone;
}

/** One headline number with its label, used for the summary rows on Registry, Announcements and Letters. */
export const StatCard: React.FC<StatCardProps> = ({ label, value, caption, icon: Icon, tone = 'slate' }) => (
  <div className="relative bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs text-left select-none">
    {Icon && (
      <div className={`absolute top-5 right-5 w-10 h-10 rounded-xl border flex items-center justify-center ${TONE_CLASS[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
    )}
    <p className={`text-[10px] font-extrabold uppercase tracking-wider text-slate-400 ${Icon ? 'pr-12' : ''}`}>{label}</p>
    <p className="mt-2 text-2xl font-extrabold text-brand-navy tracking-tight leading-none">{value}</p>
    {caption && <p className="mt-2 text-[11px] font-semibold text-slate-400">{caption}</p>}
  </div>
);
