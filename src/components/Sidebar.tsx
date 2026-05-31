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
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

const mapActiveItem = (item: string): string => {
  const map: Record<string, string> = {
    'Office Dashboard': 'Dashboard Overview',
    'Administration Dashboard': 'Dashboard Overview',
    'Timeline Management': 'Dashboard Overview',
    'Upload Timeline Drawer': 'Dashboard Overview',
    'Add Timeline Entry Drawer': 'Dashboard Overview',
    'Edit Timeline Entry Drawer': 'Dashboard Overview',
    'Registry Management': 'Registry Management',
    'Student Registry': 'Registry Management',
    'Register New Students': 'Registry Management',
    'Bulk Student Import': 'Registry Management',
    'Single Student Registration': 'Registry Management',
    'Staff and Lecturer Accounts': 'Registry Management',
    'Office Staff Accounts': 'Registry Management',
    'Lecturer Accounts': 'Registry Management',
    'Programme Coordinator Accounts': 'Registry Management',
    'Create New Account': 'Registry Management',
    'Add New Account': 'Registry Management',
    'Create Office Staff Account': 'Registry Management',
    'Create Lecturer Account': 'Registry Management',
    'Account Detail': 'Registry Management',
    'FAQ Chatbot': 'FAQ Chatbot',
    'Academic FAQ Editor': 'FAQ Chatbot',
    'File Repository': 'File Management',
    'File Repository with File Preview Drawer': 'File Management',
    'Upload New Document': 'File Management',
    'Announcement Management': 'Announcements',
    'Letter Template Management': 'Letter Generation',
    'Template Editor': 'Letter Generation',
    'Letter Generation': 'Letter Generation',
    'Supervisor Appointment Management': 'Supervisor Appointments',
    'Supervisor Appointment Detail': 'Supervisor Appointments',
    'Supervisor Workload Monitoring': 'Supervisor Appointments',
    'Lecturer Supervisor Appointments': 'Supervisor Appointments',
    'Supervisor Request History': 'Supervisor Appointments',
    'Pending Supervisor Request Detail': 'Supervisor Appointments',
    'Active Supervisee Detail': 'Supervisor Appointments',
    'Panel Appointment Management': 'Panel Appointments',
    'Panel Appointment Detail': 'Panel Appointments',
    'Panel Workload Monitoring': 'Panel Appointments',
    'Lecturer Panel Appointments': 'Panel Appointments',
    'Panel Assignment Detail': 'Panel Appointments',
    'Marks & Evaluation Management': 'Marks Entry',
    'Mark Entry Period Configuration': 'Marks Entry',
    'Rubric Components Management': 'Marks Entry',
    'Evaluation Task Assignment': 'Marks Entry',
    'Mark Entry Records': 'Marks Entry',
    'Mark Entry Record Detail': 'Marks Entry',
    'Lecturer Marks Entry': 'Marks Entry',
    'Mark Entry Tasks': 'Marks Entry',
    'Mark Entry Form': 'Marks Entry',
    'Notifications & Announcements': 'None'
  };
  return map[item] || item;
};

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, onNavigate, isOpen, onClose, userRole }) => {
  // On mobile the sidebar is an overlay drawer; dismiss it after navigating.
  const handleNavigate = (item: string) => {
    onNavigate(item);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      onClose();
    }
  };

  const menuItems = [
    { id: 'Dashboard Overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'Registry Management', label: 'Registry Management', icon: GraduationCap },
    { id: 'FAQ Chatbot', label: 'FAQ Chatbot', icon: MessageSquareCode },
    { id: 'File Management', label: 'File Management', icon: FolderMinus },
    { id: 'Supervisor Appointments', label: 'Supervisor Appointments', icon: Users },
    { id: 'Letter Generation', label: 'Letter Generation', icon: MailOpen },
    { id: 'Announcements', label: 'Announcements', icon: Megaphone },
    { id: 'Marks Entry', label: 'Marks Entry', icon: CheckSquare },
    { id: 'Panel Appointments', label: 'Panel Appointments', icon: Award },
    { id: 'Settings', label: 'Settings', icon: SettingsIcon },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (userRole === 'Student') {
      return [
        'Dashboard Overview',
        'FAQ Chatbot',
        'Supervisor Appointments',
        'Panel Appointments',
        'File Management',
        'Letter Generation',
        'Settings'
      ].includes(item.id);
    }

    if (userRole === 'Lecturer') {
      return [
        'Dashboard Overview',
        'FAQ Chatbot',
        'Marks Entry',
        'Panel Appointments',
        'Supervisor Appointments',
        'Settings'
      ].includes(item.id);
    }

    return true;
  });

  const mappedActiveItem = mapActiveItem(activeItem);

  return (
    <div
      id="portal-sidebar"
      className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-72 shrink-0 bg-[#f8fafc] border-r border-[#e2e8f0] flex flex-col justify-between font-sans overflow-hidden transition-[width,transform] duration-300 ease-in-out ${
        isOpen ? 'translate-x-0 lg:w-72' : '-translate-x-full lg:w-0 lg:border-r-0'
      }`}
    >
      {/* Top Brand Block */}
      <div id="sidebar-brand-block" className="p-6 flex flex-col">
        <div id="sidebar-logo-row" className="flex items-center gap-3">
          <div 
            id="sidebar-logo-container" 
            className="w-10 h-10 bg-brand-navy rounded-xl flex items-center justify-center shadow-sm shadow-indigo-950/20"
          >
            <GraduationCap className="w-5.5 h-5.5 text-indigo-300" />
          </div>
          <div id="sidebar-logo-text" className="flex flex-col text-left">
            <span className="text-brand-navy font-extrabold text-sm tracking-widest font-sans">FSKTM</span>
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
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = mappedActiveItem === item.id;
          const displayLabel = item.id === 'File Management' && userRole === 'Student'
            ? 'File Submission'
            : item.label;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                isActive 
                  ? 'bg-brand-navy text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              <Icon 
                className={`w-4.5 h-4.5 transition-colors ${
                  isActive ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-600'
                }`} 
              />
              <span className="tracking-wide">{displayLabel}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
