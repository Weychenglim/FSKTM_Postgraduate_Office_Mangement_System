/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CalendarRange, Sliders, ListRestart, FileSearch, Database, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { PortalButton, PortalCard } from './PortalPrimitives';

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
      <PortalCard id="quick-actions-card bg" padding="lg">
        <h3 className="text-lg font-extrabold text-brand-navy tracking-tight mb-6">
          Quick Actions
        </h3>

        <div className="space-y-3.5">
          <PortalButton
            variant="primary"
            size="lg"
            fullWidth
            icon={CalendarRange}
            iconPosition="right"
            onClick={onConfigurePeriod}
            className="justify-between"
          >
            Configure Mark Entry Period
          </PortalButton>

          <PortalButton
            variant="soft"
            size="lg"
            fullWidth
            icon={Sliders}
            iconPosition="right"
            onClick={onManageRubrics}
            className="justify-between"
          >
            Manage Rubric Components
          </PortalButton>

          <PortalButton
            variant="soft"
            size="lg"
            fullWidth
            icon={ListRestart}
            iconPosition="right"
            onClick={onGenerateTasks}
            className="justify-between"
          >
            Generate Evaluation Tasks
          </PortalButton>

          <PortalButton
            variant="secondary"
            size="lg"
            fullWidth
            icon={FileSearch}
            iconPosition="right"
            onClick={onViewRecords}
            className="justify-between"
          >
            View Mark Records
          </PortalButton>
        </div>
      </PortalCard>

      {/* SYSTEM STATUS CARD (Dark Cosmic theme as shown on mockup) */}
      <div 
        id="sys-status-badge" 
        className="bg-[#080f21] rounded-2xl p-6 border border-white/[0.04] text-left relative overflow-hidden shadow-sm"
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
        
      </div>

    </div>
  );
};
