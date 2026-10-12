/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface TimelineBarProps {
  label: string;
  gridStart: number; // 1-indexed column start (1 = Oct, 2 = Nov, 3 = Dec, etc, or fractional if using subset)
  gridSpan: number;  // How many submodules/fractions it spans
  status: 'Completed' | 'Active' | 'Upcoming' | 'Deadline';
  className?: string;
  onClick?: () => void;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  label,
  gridStart,
  gridSpan,
  status,
  className = '',
  onClick,
}) => {
  // Map status colors corresponding to the timeline legend:
  // Completed (grey/slate), Active (blue/indigo), Upcoming (light purple/grayish slate), Deadline (amber/red)
  const getStatusClasses = () => {
    switch (status) {
      case 'Completed':
        return 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300/40';
      case 'Active':
        return 'bg-[#0f2957] text-white hover:bg-slate-800 border-transparent';
      case 'Upcoming':
        return 'bg-slate-100 text-slate-600 hover:bg-slate-150 border-slate-200';
      case 'Deadline':
        return 'bg-[#ffedd5] text-[#c2410c] hover:bg-orange-100 border-[#fed7aa]';
      default:
        return 'bg-slate-100 text-slate-600 hover:bg-slate-150 border-slate-200';
    }
  };

  const statusStyles = getStatusClasses();

  // Grid style computation based on standard 12-column grid or similar layout representation:
  // Since we divide the three months into equal columns (e.g., 4 columns per month: total 12 sub-columns)
  const gridStyle = {
    gridColumnStart: gridStart,
    gridColumnEnd: gridStart + gridSpan,
  };

  return (
    <div
      onClick={onClick}
      style={gridStyle}
      className={`py-2 px-3.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase text-center truncate shadow-sm transition-all border select-none duration-250 cursor-pointer ${statusStyles} ${className}`}
    >
      {label}
    </div>
  );
};
