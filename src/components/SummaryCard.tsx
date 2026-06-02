/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { StatusDot, type BadgeTone } from './PortalPrimitives';

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
  const getBadgeTone = (): BadgeTone => {
    switch (badgeType) {
      case 'active':
      case 'ready':
        return 'success';
      case 'generated':
        return 'info';
      case 'ratio':
        return 'warning';
      default:
        return 'neutral';
    }
  };

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
        <StatusDot tone={getBadgeTone()} className="w-2 h-2" />
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
