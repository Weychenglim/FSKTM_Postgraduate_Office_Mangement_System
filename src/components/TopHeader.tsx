/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bell, HelpCircle, LogOut, User, Settings, ShieldAlert, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TopHeaderProps {
  userName: string;
  userRole: string;
  onLogout: () => void;
  onHelpdeskTrigger: () => void;
  onNotificationsTrigger: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  userName,
  userRole,
  onLogout,
  onHelpdeskTrigger,
  onNotificationsTrigger
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header 
      id="portal-topheader" 
      className="h-16 w-full bg-white border-b border-[#e2e8f0] px-8 flex items-center justify-between sticky top-0 z-40 font-sans"
    >
      {/* Title & Greeting Block */}
      <div id="header-greeting-block" className="flex flex-col text-left">
        <h4 id="header-greeting" className="text-slate-900 font-extrabold text-xs md:text-sm tracking-tight select-none">
          Good Morning, {userName}
        </h4>
      </div>

      {/* Top Header Search Input (From Reference Screenshot) */}
      <div className="hidden md:flex items-center relative max-w-sm w-full mx-auto px-4">
        <span className="absolute inset-y-0 left-7 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </span>
        <input 
          type="text" 
          placeholder="Search..." 
          className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-1.5 rounded-full text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all shadow-3xs"
        />
      </div>

      {/* Utilities Column */}
      <div id="header-utilities" className="flex items-center gap-4">
        
        {/* Dynamic Interactive Alerts Button */}
        <div className="relative">
          <button 
            type="button"
            onClick={onNotificationsTrigger}
            className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
          </button>
        </div>

        {/* Global Manual Assistance Help Trigger */}
        <button 
          type="button"
          onClick={onHelpdeskTrigger}
          className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
          title="Administrative Manual Guide"
        >
          <HelpCircle className="w-4.5 h-4.5" />
        </button>

        {/* Divider separator */}
        <div className="w-[1px] h-6 bg-slate-200" />

        {/* User profile dropdown column */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all cursor-pointer group"
          >
            {/* Custom high-contrast profile picture avatar as specified in reference */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#091124] to-[#1e2c54] flex items-center justify-center text-indigo-200 font-extrabold text-[13px] border border-slate-200 group-hover:scale-105 transition-transform duration-200">
              WC
            </div>
            
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-extrabold text-slate-800 tracking-tight leading-none">Wey Cheng</span>
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-1 leading-none">{userRole}</span>
            </div>
          </button>

          {/* User Option Dropdown items */}
          <AnimatePresence>
            {dropdownOpen && (
              <>
                {/* Backdrop dismiss overlay */}
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 text-left"
                >
                  <div className="px-3 py-2 border-b border-slate-150 mb-1.5">
                    <span className="text-xs font-extrabold text-slate-800 block">Wey Cheng Lim</span>
                    <span className="text-[10px] text-slate-400 block font-mono">ID: SEC-49192</span>
                  </div>

                  <button
                    onClick={() => { setDropdownOpen(false); onHelpdeskTrigger(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:text-[#0c1424] hover:bg-slate-50 rounded-xl text-xs font-bold transition-all text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile details</span>
                  </button>

                  <button
                    onClick={() => { setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:text-[#0c1424] hover:bg-slate-50 rounded-xl text-xs font-bold transition-all text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>System Settings</span>
                  </button>

                  <div className="h-[1px] bg-slate-100 my-1.5" />

                  {/* LOGOUT: swaps clean visual views */}
                  <button
                    onClick={() => { setDropdownOpen(false); onLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Logout to Screen</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
