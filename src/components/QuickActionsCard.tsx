/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CalendarRange, Sliders, ListRestart, FileSearch, Database, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface QuickActionsProps {
  onConfigurePeriod: () => void;
  onManageRubrics: () => void;
  onGenerateTasks: () => void;
  onViewRecords: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsProps> = ({
  onConfigurePeriod,
  onManageRubrics,
  onGenerateTasks,
  onViewRecords
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState('2 mins ago');

  const triggerSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncTime('Just now');
    }, 1500);
  };

  return (
    <div className="space-y-6 w-full text-left">
      {/* Quick Actions Panel */}
      <div id="quick-actions-card bg" className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(241,245,249,0.5)]">
        <h3 className="text-lg font-extrabold text-[#0c1424] tracking-tight mb-6">
          Quick Actions
        </h3>

        <div className="space-y-3.5">
          {/* Solid Black primary calendar button */}
          <button
            onClick={onConfigurePeriod}
            className="w-full py-3.5 px-4.5 bg-[#0c1424] text-white hover:bg-slate-800 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-between transition-all duration-200 cursor-pointer shadow-xs select-none"
          >
            <span>Configure Mark Entry Period</span>
            <CalendarRange className="w-4 h-4 text-indigo-300" />
          </button>

          {/* Manage Rubric Components Button */}
          <button
            onClick={onManageRubrics}
            className="w-full py-3.5 px-4.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-between transition-all duration-200 cursor-pointer select-none"
          >
            <span>Manage Rubric Components</span>
            <Sliders className="w-4 h-4 text-blue-600" />
          </button>

          {/* Generate Tasks Button */}
          <button
            onClick={onGenerateTasks}
            className="w-full py-3.5 px-4.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-between transition-all duration-200 cursor-pointer select-none"
          >
            <span>Generate Evaluation Tasks</span>
            <ListRestart className="w-4 h-4 text-blue-600" />
          </button>

          {/* View Records Button */}
          <button
            onClick={onViewRecords}
            className="w-full py-3.5 px-4.5 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0] rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-between transition-all duration-200 cursor-pointer select-none"
          >
            <span>View Mark Records</span>
            <FileSearch className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* SYSTEM STATUS CARD (Dark Cosmic theme as shown on mockup) */}
      <div 
        id="sys-status-badge" 
        className="bg-[#080f21] rounded-3xl p-6 border border-white/[0.04] text-left relative overflow-hidden shadow-lg"
      >
        <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-[0.2em] block mb-4">
          Evaluation System Status
        </span>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-11 h-11 rounded-1.5xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Database className={`w-5.5 h-5.5 text-indigo-300 ${syncing ? 'animate-bounce' : ''}`} />
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center">
              <span className="text-white text-xs font-bold leading-none">
                Database Sync Active
              </span>
              <button 
                onClick={triggerSync}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Force Resync"
                disabled={syncing}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-1.5 block">
              Last updated {syncTime}
            </span>
          </div>
        </div>

        {/* Pulse Bar status */}
        <div className="mt-4 pt-4 border-t border-white/[0.05] relative z-10 flex items-center justify-between">
          <div className="w-full bg-[#1a2c54]/50 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full bg-emerald-500 transition-all duration-500 ${
                syncing ? 'w-1/3 animate-pulse' : 'w-full'
              }`} 
            />
          </div>
        </div>
        
        {/* Dynamic decorative backdrop circles */}
        <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-blue-900/10 rounded-full blur-2xl pointer-events-none" />
      </div>

    </div>
  );
};
