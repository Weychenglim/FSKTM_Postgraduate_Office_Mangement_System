/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  GraduationCap, 
  LayoutDashboard, 
  MessageSquareCode, 
  FolderMinus, 
  Users, 
  MailOpen, 
  Megaphone, 
  CheckSquare, 
  Award, 
  Settings as SettingsIcon 
} from 'lucide-react';

interface SidebarProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, onNavigate }) => {
  const menuItems = [
    { id: 'Dashboard Overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'FAQ Chatbot', label: 'FAQ Chatbot', icon: MessageSquareCode },
    { id: 'File Management', label: 'File Management', icon: FolderMinus },
    { id: 'Supervisor Appointments', label: 'Supervisor Appointments', icon: Users },
    { id: 'Letter Generation', label: 'Letter Generation', icon: MailOpen },
    { id: 'Announcements', label: 'Announcements', icon: Megaphone },
    { id: 'Marks Entry', label: 'Marks Entry', icon: CheckSquare },
    { id: 'Panel Appointments', label: 'Panel Appointments', icon: Award },
    { id: 'Settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div 
      id="portal-sidebar" 
      className="w-72 bg-[#f8fafc] border-r border-[#e2e8f0] flex flex-col justify-between shrink-0 h-screen sticky top-0 font-sans"
    >
      {/* Top Brand Block */}
      <div id="sidebar-brand-block" className="p-6 flex flex-col">
        <div id="sidebar-logo-row" className="flex items-center gap-3">
          <div 
            id="sidebar-logo-container" 
            className="w-10 h-10 bg-[#0c1424] rounded-xl flex items-center justify-center shadow-md shadow-indigo-950/20"
          >
            <GraduationCap className="w-5.5 h-5.5 text-indigo-300" />
          </div>
          <div id="sidebar-logo-text" className="flex flex-col text-left">
            <span className="text-[#0c1424] font-extrabold text-sm tracking-widest font-sans">FSKTM</span>
            <span className="text-slate-500 text-[9px] font-bold tracking-[0.15em] uppercase leading-none mt-0.5">
              Postgraduate
            </span>
            <span className="text-slate-400 text-[8px] font-semibold tracking-wider uppercase leading-none mt-0.5">
              Administrative Portal
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List items */}
      <div id="sidebar-nav-list" className="flex-1 px-4 py-2 overflow-y-auto space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                isActive 
                  ? 'bg-[#0c1424] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              <Icon 
                className={`w-4.5 h-4.5 transition-colors ${
                  isActive ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-600'
                }`} 
              />
              <span className="tracking-wide">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />
              )}
            </button>
          );
        })}
      </div>

      {/* Small Admin Indicator footer */}
      <div id="sidebar-footer-indicator" className="p-4 mx-4 mb-4 bg-slate-100 rounded-2xl border border-slate-200/50 text-left">
        <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">Office Division</span>
        <span className="text-[11px] font-bold text-slate-700 block mt-0.5">Academic Secretariat</span>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-semibold text-emerald-700">Counter Online</span>
        </div>
      </div>
    </div>
  );
};
