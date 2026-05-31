/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface SummaryCardProps {
  title: string;
  badgeText: string;
  badgeType: 'active' | 'ready' | 'generated' | 'ratio';
  subtext: string;
  icon?: LucideIcon;
  onClick?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  badgeText,
  badgeType,
  subtext,
  icon: Icon,
  onClick
}) => {
  // Map styles
  const getBadgeStyles = () => {
    switch (badgeType) {
      case 'active':
        return {
          wrapper: 'bg-emerald-50 text-emerald-800 border-emerald-100/60',
          dot: 'bg-emerald-500'
        };
      case 'ready':
        return {
          wrapper: 'bg-emerald-50 text-emerald-800 border-emerald-100/60',
          dot: 'bg-emerald-500'
        };
      case 'generated':
        return {
          wrapper: 'bg-blue-50 text-blue-850 border-blue-100/65',
          dot: 'bg-blue-600'
        };
      case 'ratio':
        return {
          wrapper: 'bg-amber-50 text-amber-850 border-amber-150',
          dot: 'bg-amber-500'
        };
      default:
        return {
          wrapper: 'bg-slate-50 text-slate-700 border-slate-100',
          dot: 'bg-slate-400'
        };
    }
  };

  const badgeStyles = getBadgeStyles();

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/80 p-5 pl-6 text-left shadow-3xs cursor-pointer select-none transition-all duration-300 relative ${
        onClick ? 'hover:shadow-sm hover:border-slate-300' : ''
      }`}
    >
      <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block mb-2.5">
        {title}
      </span>

      <div className="flex items-center gap-2 mb-2">
        {/* Colorful visual status bullet sign */}
        <span className={`w-2 h-2 rounded-full ${badgeStyles.dot}`} />
        <span className="text-brand-navy font-extrabold text-[19px] tracking-tight">
          {badgeText}
        </span>
      </div>

      <span className="text-xs text-slate-400 font-medium leading-none block">
        {subtext}
      </span>

      {Icon && (
        <div className="absolute right-5 bottom-5 text-slate-300">
          <Icon className="w-5 h-5 opacity-40" />
        </div>
      )}
    </motion.div>
  );
};
