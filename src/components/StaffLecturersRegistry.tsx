/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  ChevronDown, 
  Download, 
  UserPlus, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Briefcase,
  Users,
  Check,
  Building,
  Mail,
  SlidersHorizontal,
  Key,
  Lock,
  GraduationCap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalButton, PortalToast } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { StaffRecord } from '../types';
import { getStaff } from '../services';

// ==================== STYLES & TYPES ====================
// StaffRecord now lives in src/types.

const DEPARTMENTS = [
  'Academic Affairs',
  'IT Support',
  'Administration',
  'Software Engineering',
  'Computer Science',
  'Information Systems'
];

interface StaffSummaryCardProps {
  title: string;
  value: number;
  subtext?: string;
  icon: React.ComponentType<any>;
  colorClass: string;
}

const StaffSummaryCard: React.FC<StaffSummaryCardProps> = ({ title, value, icon: Icon, colorClass }) => {
  return (
    <div id={`summary-${title.toLowerCase().replace(/\s+/g, '-')}`} className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 flex items-center justify-between relative overflow-hidden shadow-xs hover:shadow-sm transition-all duration-300 group">
      <div className="text-left space-y-1.5 z-15">
        <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 block">
          {title}
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-brand-navy tracking-tight font-sans">
          {value}
        </h2>
      </div>

      <div className={`p-3.5 rounded-2xl border shrink-0 z-15 ${colorClass}`}>
        <Icon className="w-5.5 h-5.5" />
      </div>
    </div>
  );
};

// ==================== REUSABLE COMPONENT PATTERNS ====================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer border ${
        checked 
          ? 'bg-[#00a15c] border-[#008c50]' 
          : 'bg-slate-200 border-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-all shadow-xs ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};

export const RegistryLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="space-y-8 animate-fade-in text-left">
      {children}
    </div>
  );
};

interface AccountTypeSelectorProps {
  selectedType: 'Office Staff' | 'Lecturer';
  onChange: (type: 'Office Staff' | 'Lecturer') => void;
}

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({ selectedType, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 select-none font-sans">
      <button
        type="button"
        onClick={() => onChange('Office Staff')}
        className={`p-6 rounded-2xl border-2 text-left flex items-start gap-4 transition-all duration-200 shadow-3xs cursor-pointer ${
          selectedType === 'Office Staff'
            ? 'bg-brand-navy border-brand-navy text-white'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
        }`}
      >
        <div className={`p-3 rounded-xl ${
          selectedType === 'Office Staff' ? 'bg-white/10 text-indigo-300' : 'bg-slate-50 text-slate-400 border border-slate-200'
        }`}>
          <Briefcase className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm tracking-tight font-sans">Register Office Staff</h3>
          <p className={`text-[10px] font-bold ${
            selectedType === 'Office Staff' ? 'text-indigo-200/90' : 'text-slate-400'
          }`}>
            Administrative & Support Roles
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('Lecturer')}
        className={`p-6 rounded-2xl border-2 text-left flex items-start gap-4 transition-all duration-200 shadow-3xs cursor-pointer ${
          selectedType === 'Lecturer'
            ? 'bg-brand-navy border-brand-navy text-white'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
        }`}
      >
        <div className={`p-3 rounded-xl ${
          selectedType === 'Lecturer' ? 'bg-white/10 text-emerald-300' : 'bg-slate-50 text-slate-400 border border-slate-200'
        }`}>
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="space-y-1 font-sans">
          <h3 className="font-extrabold text-sm tracking-tight">Register Lecturer</h3>
          <p className={`text-[10px] font-bold ${
            selectedType === 'Lecturer' ? 'text-slate-200' : 'text-slate-400'
          }`}>
            Academic & Supervisory Roles
          </p>
        </div>
      </button>
    </div>
  );
};

interface FormCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  iconColorClass?: string;
  children: React.ReactNode;
}

export const FormCard: React.FC<FormCardProps> = ({ title, subtitle, icon: Icon, iconColorClass = "text-brand-navy", children }) => {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-2xs text-left p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3.5 pb-4.5 border-b border-slate-100 font-sans">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
          <Icon className={`w-5 h-5 ${iconColorClass}`} />
        </div>
        <div>
          <h2 className="text-xs font-black text-brand-navy uppercase tracking-wider">
            {title}
          </h2>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-tight font-sans">
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
};

interface FormInputProps {
  label: string;
  type?: string;
  required?: boolean;
  placeholder: string;
  value: string;
  helperText?: string;
  onChange: (val: string) => void;
}

export const FormInput: React.FC<FormInputProps> = ({ label, type = "text", required = false, placeholder, value, helperText, onChange }) => {
  return (
    <div>
      <label className="form-label block">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-control form-control-md"
      />
      {helperText && (
        <span className="text-[9.5px] text-slate-400 font-semibold block mt-1.5 font-sans">
          {helperText}
        </span>
      )}
    </div>
  );
};

interface FormSelectProps {
  label: string;
  required?: boolean;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (val: string) => void;
}

export const FormSelect: React.FC<FormSelectProps> = ({ label, required = false, value, options, placeholder, onChange }) => {
  return (
    <div>
      <label className="form-label block">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="form-control form-control-md appearance-none pr-10 cursor-pointer"
        >
          {placeholder && (
            <option value="" disabled>{placeholder}</option>
          )}
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-450 absolute right-4 top-3.5 pointer-events-none stroke-[2.5]" />
      </div>
    </div>
  );
};

interface RoleAssignmentCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  isChecked?: boolean;
  isLocked?: boolean;
  onToggle?: () => void;
}

export const RoleAssignmentCard: React.FC<RoleAssignmentCardProps> = ({ title, description, icon: Icon, isChecked = false, isLocked = false, onToggle }) => {
  return (
    <div 
      className={`p-5 border-2 rounded-2xl flex items-start gap-4 transition-all relative ${
        isChecked 
          ? 'bg-blue-50/10 border-blue-200/80 shadow-3xs' 
          : 'bg-white border-slate-100 hover:bg-slate-50/50'
      }`}
    >
      <div className={`p-3 rounded-xl border shrink-0 ${
        isChecked 
          ? 'bg-blue-50 border-blue-100 text-blue-600' 
          : 'bg-slate-50 border-slate-200 text-slate-400'
      }`}>
        <Icon className="w-5 h-5 stroke-[2]" />
      </div>
      <div className="space-y-1.5 pr-12 text-left">
        <h4 className="font-extrabold text-[12.5px] text-brand-navy flex items-center gap-2 font-sans">
          <span>{title}</span>
          {isLocked && (
            <span className="font-black text-[8px] uppercase tracking-wider text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-md font-sans">
              Base Role
            </span>
          )}
        </h4>
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed font-sans">
          {description}
        </p>
      </div>
      <div className="absolute right-5 top-5">
        {isLocked ? (
          <div className="w-5.5 h-5.5 rounded-full bg-blue-105 text-[#00a15c] border border-blue-200 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        ) : (
          <ToggleSwitch checked={isChecked} onChange={onToggle || (() => {})} />
        )}
      </div>
    </div>
  );
};

interface NoticeBoxProps {
  message: string;
  icon?: React.ComponentType<any>;
  type?: 'info' | 'warning' | 'success';
}

export const NoticeBox: React.FC<NoticeBoxProps> = ({ message, icon: Icon = Key, type = 'info' }) => {
  const styles = {
    info: 'bg-blue-50/40 border-blue-100 text-slate-600',
    warning: 'bg-amber-50/40 border-amber-100 text-slate-600',
    success: 'bg-emerald-50/40 border-emerald-100 text-slate-600',
  };
  const iconColors = {
    info: 'bg-blue-105 text-blue-600 border-blue-100',
    warning: 'bg-amber-55 text-amber-600 border-amber-100',
    success: 'bg-emerald-55 text-emerald-600 border-emerald-100',
  };
  return (
    <div className={`border rounded-2xl p-4.5 flex gap-4 text-left items-start ${styles[type]}`}>
      <div className={`p-2.5 rounded-xl border shrink-0 ${iconColors[type]}`}>
        <Icon className="w-4.5 h-4.5 stroke-[2]" />
      </div>
      <p className="text-[10px] text-slate-500 font-bold leading-relaxed font-sans mt-0.5">
        {message}
      </p>
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
  iconLeft?: React.ComponentType<any>;
  iconRight?: React.ComponentType<any>;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, type = 'button', variant = 'primary', iconLeft: IconLeft, iconRight: IconRight }) => {
  return (
    <PortalButton
      type={type}
      onClick={onClick}
      variant={variant}
      size="md"
      icon={IconLeft}
    >
      {label}
      {IconRight && <IconRight className="w-3.5 h-3.5 stroke-[3]" />}
    </PortalButton>
  );
};

export const StaffLecturersRegistry: React.FC = () => {
  // Staff/lecturer accounts loaded from lecturersApi (mock-backed today).
  // setStaffList is retained for local account-creation mutations.
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(() => {
    setLoading(true);
    setError(null);
    getStaff()
      .then(setStaffList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load staff accounts.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Tab state (sub-tabs)
  const [activeSubTab, setActiveSubTab] = useState<'Office Staff' | 'Lecturer' | 'Programme Coordinator'>('Office Staff');

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3; // Pictured in mockup: 3 rows showing

  // Inner view state (list of accounts vs. Create New Account screen)
  const [innerView, setInnerView] = useState<'list' | 'create'>('list');

  // Detail Modal view
  const [viewingStaff, setViewingStaff] = useState<StaffRecord | null>(null);

  // New Account Modal open state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // New account form values
  const [newAccountFormData, setNewAccountFormData] = useState({
    name: '',
    id: '',
    email: '',
    phone: '',
    department: 'Academic Affairs',
    role: 'Office Staff',
    status: 'Active',
    sendEmailImmediate: true
  });

  const [isCoordinatorActive, setIsCoordinatorActive] = useState(false);

  // UI Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Metric definitions matching mockup
  const baseTotalCount = 142;
  const baseOfficeCount = 28;
  const baseLecturerCount = 114;
  const baseCoordCount = 12;

  // Let's increment based on added staff past original list size (original has 4 staff, 5 lecturers, 3 coordinators)
  const officeAddedCount = staffList.filter(s => s.role === 'Office Staff').length - 5;
  const lecturerAddedCount = staffList.filter(s => s.role === 'Lecturer').length - 5;
  const coordAddedCount = staffList.filter(s => s.role === 'Programme Coordinator').length - 3;

  const totalAccounts = baseTotalCount + officeAddedCount + lecturerAddedCount + coordAddedCount;
  const officeCount = baseOfficeCount + officeAddedCount;
  const lecturerCount = baseLecturerCount + lecturerAddedCount;
  const coordCount = baseCoordCount + coordAddedCount;

  // Render role text counters inside tab buttons
  const getSubTabCount = (tab: 'Office Staff' | 'Lecturer' | 'Programme Coordinator') => {
    if (tab === 'Office Staff') return officeCount;
    if (tab === 'Lecturer') return lecturerCount;
    return coordCount;
  };

  // Filtration logic
  const filteredStaff = staffList.filter(member => {
    // Exact Role check
    const matchesRole = member.role === activeSubTab;
    
    // Search query matches
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      member.name.toLowerCase().includes(searchLower) ||
      member.id.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower);

    // Dropdown filters
    const matchesDept = selectedDept === 'All' || member.department === selectedDept;
    const matchesStatus = selectedStatus === 'All' || member.status === selectedStatus;

    return matchesRole && matchesSearch && matchesDept && matchesStatus;
  });

  // Paginated display
  const totalEntriesMatching = filteredStaff.length;
  const totalPages = Math.ceil(totalEntriesMatching / itemsPerPage) || 1;
  const displayedStaff = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const startEntryIndex = totalEntriesMatching === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, totalEntriesMatching);

  // Handlers
  const handleExportCSV = () => {
    const headers = 'Account ID,Full Name,Role,Department,Email,Status\n';
    const rows = staffList.map(s => 
      `"${s.id}","${s.name}","${s.role}","${s.department}","${s.email}","${s.status}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FSKTM_Staff_Lecturer_Registry.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);

    triggerToast('Staff and Lecturer accounts database exported successfully as CSV!');
  };

  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountFormData.name || !newAccountFormData.id || !newAccountFormData.email) {
      alert('Please fill out all required fields (Name, Account ID, and Email).');
      return;
    }

    const initials = newAccountFormData.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ST';

    // Mapped Avatar Accent BG
    const bgs = [
      'bg-[#eff6ff] text-[#1d4ed8] border-[#dbeafe]',
      'bg-[#e6fbf2] text-[#00a15c] border-[#bef5db]',
      'bg-[#fff7ed] text-[#ea580c] border-[#ffedd5]',
      'bg-indigo-50 text-indigo-600 border-indigo-105',
      'bg-purple-50 text-purple-600 border-purple-105'
    ];
    const chosenBg = bgs[Math.floor(Math.random() * bgs.length)];

    const resolvedRole = newAccountFormData.role === 'Lecturer'
      ? (isCoordinatorActive ? 'Programme Coordinator' : 'Lecturer')
      : 'Office Staff';

    const newStaff: StaffRecord = {
      id: newAccountFormData.id,
      name: newAccountFormData.name,
      avatarText: initials,
      avatarBg: chosenBg,
      department: newAccountFormData.department,
      email: newAccountFormData.email,
      status: newAccountFormData.status as 'Active' | 'Inactive' | 'Suspended',
      role: resolvedRole as 'Office Staff' | 'Lecturer' | 'Programme Coordinator'
    };

    setStaffList([newStaff, ...staffList]);
    setIsAddAccountOpen(false);
    setInnerView('list');
    
    // Switch to corresponding subTab
    setActiveSubTab(newStaff.role);
    setCurrentPage(1);

    triggerToast(`Added account for "${newStaff.name}" successfully!`);

    // Reset formData
    setNewAccountFormData({
      name: '',
      id: '',
      email: '',
      phone: '',
      department: 'Academic Affairs',
      role: 'Office Staff',
      status: 'Active',
      sendEmailImmediate: true
    });
    setIsCoordinatorActive(false);
  };

  return (
    <div id="staff-lecturer-registry" className="space-y-8 select-none animate-fade-in font-sans text-xs">
      
      <PortalToast message={toastMessage} />

      {innerView === 'create' ? (
        /* ==================== CREATE NEW ACCOUNT VIEW ==================== */
        <RegistryLayout>
          
          {/* Breadcrumb line from screenshot */}
          <div className="font-sans text-left">
            <button
              type="button"
              onClick={() => setInnerView('list')}
              className="back-link group mb-3"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Staff &amp; Lecturer Accounts</span>
            </button>
            <div className="flex items-center gap-1.5 text-slate-400 font-extrabold text-[10px] uppercase tracking-widest mb-1.5 select-none hover:text-slate-600">
              <span>Dashboard</span>
              <ChevronRight className="w-3 h-3 text-slate-450 stroke-[2.5]" />
              <span>Staff and Lecturer Accounts</span>
              <ChevronRight className="w-3 h-3 text-slate-450 stroke-[2.5]" />
              <span className="text-slate-600 font-black">Create New Account</span>
            </div>
            <h1 className="page-title">
              Create New Account
            </h1>
            <p className="text-xs text-slate-550 font-bold mt-1.5 leading-relaxed text-[#556987]">
              Register a new office staff or lecturer account for the system.
            </p>
          </div>

          {/* Account Type Selector twin block cards */}
          <AccountTypeSelector 
            selectedType={newAccountFormData.role as 'Office Staff' | 'Lecturer'}
            onChange={(type) => {
              setNewAccountFormData(prev => ({ 
                ...prev, 
                role: type,
                department: type === 'Lecturer' ? 'Software Engineering' : 'Academic Affairs'
              }));
            }}
          />

          {/* Core Details Entry Card form */}
          <FormCard
            title={newAccountFormData.role === 'Office Staff' ? 'Office Staff Account Details' : 'Lecturer Account Details'}
            subtitle={newAccountFormData.role === 'Office Staff' 
              ? "Enter the staff's personal and departmental information." 
              : "Enter the lecturer's personal and departmental information."}
            icon={newAccountFormData.role === 'Office Staff' ? Briefcase : GraduationCap}
            iconColorClass={newAccountFormData.role === 'Office Staff' ? "text-brand-navy" : "text-emerald-500"}
          >
            <form onSubmit={handleAddAccountSubmit} className="space-y-6">
              
              {/* Personal Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                    Personal Information
                  </span>
                  <div className="flex-1 h-[1px] bg-slate-100" />
                </div>

                {/* Name */}
                <FormInput
                  label="Full Name"
                  required
                  placeholder={newAccountFormData.role === 'Office Staff' ? "e.g. Sarah Ahmad" : "e.g. Dr. Ahmad Zainul"}
                  value={newAccountFormData.name}
                  onChange={(val) => setNewAccountFormData(prev => ({ ...prev, name: val }))}
                />

                {/* ID & Email Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label="Staff ID"
                    required
                    placeholder={newAccountFormData.role === 'Office Staff' ? "e.g. S12345" : "e.g. L12345"}
                    value={newAccountFormData.id}
                    helperText="Must match HR records"
                    onChange={(val) => setNewAccountFormData(prev => ({ ...prev, id: val }))}
                  />

                  <FormInput
                    label={newAccountFormData.role === 'Office Staff' ? "Official Email" : "Institutional Email"}
                    required
                    placeholder={newAccountFormData.role === 'Office Staff' ? "name@um.edu.my" : "username@um.edu.my"}
                    value={newAccountFormData.email}
                    helperText="Login credentials will be sent here"
                    onChange={(val) => setNewAccountFormData(prev => ({ ...prev, email: val }))}
                  />
                </div>

                {/* Phone & Department Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
                  <FormInput
                    label="Phone Number (Optional)"
                    placeholder="+601X-XXXXXXX"
                    value={newAccountFormData.phone}
                    onChange={(val) => setNewAccountFormData(prev => ({ ...prev, phone: val }))}
                  />

                  <FormSelect
                    label="Department"
                    required
                    value={newAccountFormData.department}
                    placeholder="Select assigned department"
                    options={newAccountFormData.role === 'Office Staff' 
                      ? ['Academic Affairs', 'IT Support', 'Administration'] 
                      : ['Software Engineering', 'Computer Science', 'Information Systems']}
                    onChange={(val) => setNewAccountFormData(prev => ({ ...prev, department: val }))}
                  />
                </div>
              </div>

              {/* Role Assignment Section - Only for Lecturer as specified */}
              {newAccountFormData.role === 'Lecturer' && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                      Role Assignment
                    </span>
                    <div className="flex-1 h-[1px] bg-slate-100" />
                  </div>

                  {/* Lecturer role card */}
                  <RoleAssignmentCard
                    title="Lecturer"
                    description="Base role — can view assigned students, receive official appointment letters, and access the academic calendar."
                    icon={GraduationCap}
                    isChecked={true}
                    isLocked={true}
                  />

                  {/* Programme Coordinator role card */}
                  <RoleAssignmentCard
                    title="Programme Coordinator"
                    description="Can review and approve supervisor appointment requests, oversee program metrics, and generate department reports."
                    icon={Shield}
                    isChecked={isCoordinatorActive}
                    onToggle={() => setIsCoordinatorActive(!isCoordinatorActive)}
                  />

                  {/* Active Roles Summary block */}
                  <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block mb-2">
                      Active Roles Summary:
                    </span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-105 text-blue-600 border border-blue-200/50 font-black text-[10px] uppercase tracking-wide rounded-full">
                        <Check className="w-3 h-3 stroke-[3.5]" />
                        <span>Lecturer</span>
                      </span>
                      {isCoordinatorActive && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e6fbf2] text-[#00a15c] border border-[#bef5db] font-black text-[10px] uppercase tracking-wide rounded-full">
                          <Check className="w-3 h-3 stroke-[3.5]" />
                          <span>Programme Coordinator</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info notice inside Role Assignment section */}
                  <NoticeBox 
                    message="Supervisor and Panel roles are system-assigned dynamically through the student appointment workflow. They cannot be assigned manually here."
                    icon={Info}
                    type="info"
                  />
                </div>
              )}

              {/* Account Settings Section */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                    Account Settings
                  </span>
                  <div className="flex-1 h-[1px] bg-slate-100" />
                </div>

                {/* Auto-generated password notice */}
                <div className="p-4.5 border border-slate-200 bg-slate-50/40 rounded-2xl flex gap-4 text-left items-start">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex-shrink-0">
                    <Lock className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-extrabold text-brand-navy tracking-wide font-sans leading-none pb-0.5">
                      Auto-generated Password
                    </h5>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed font-sans">
                      A secure, temporary password will be automatically generated for this account. The user will be required to change it upon their first login.
                    </p>
                  </div>
                </div>

                {/* Send credentials immediate switcher */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl select-none">
                  <div className="text-left space-y-0.5 pr-4 font-sans">
                    <h6 className="text-[11.5px] font-black text-brand-navy leading-snug">
                      Send credentials immediately via email
                    </h6>
                    <p className="text-[10px] text-slate-450 font-bold leading-normal">
                      Onboard user right away by sending their credentials securely.
                    </p>
                  </div>
                  
                  <ToggleSwitch 
                    checked={newAccountFormData.sendEmailImmediate}
                    onChange={() => setNewAccountFormData(prev => ({ ...prev, sendEmailImmediate: !prev.sendEmailImmediate }))}
                  />
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3.5 select-none">
                <ActionButton
                  label="Cancel and Go Back"
                  variant="secondary"
                  iconLeft={ChevronLeft}
                  onClick={() => {
                    setInnerView('list');
                    setNewAccountFormData({
                      name: '',
                      id: '',
                      email: '',
                      phone: '',
                      department: 'Academic Affairs',
                      role: 'Office Staff',
                      status: 'Active',
                      sendEmailImmediate: true
                    });
                    setIsCoordinatorActive(false);
                  }}
                />
                
                <ActionButton
                  label={newAccountFormData.role === 'Office Staff' ? 'Create Office Staff Account' : 'Create Lecturer Account'}
                  type="submit"
                  iconRight={ChevronRight}
                />
              </div>

            </form>
          </FormCard>

        </RegistryLayout>
      ) : (
        /* ==================== NORMAL REGISTRY LISTING DESKTOP VIEW ==================== */
        <>
          {/* HEADER ACTION ROADMAP MOCKUP */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 pb-5 text-left">
            <div>
              {/* Breadcrumb line from screenshot */}
              <div className="flex items-center gap-1.5 text-slate-400 font-extrabold text-[10px] uppercase tracking-widest mb-1.5 font-sans">
                <span>Registry Management</span>
                <ChevronRight className="w-3 h-3 text-slate-455 stroke-[2.5]" />
                <span className="text-slate-600">Staff and Lecturer Accounts</span>
              </div>
              <h1 className="page-title">
                Staff and Lecturer Accounts
              </h1>
            </div>

            {/* Add New Account Action Top Right */}
            <button
              type="button"
              onClick={() => {
                setNewAccountFormData({
                  name: '',
                  id: '',
                  email: '',
                  phone: '',
                  department: 'Academic Affairs',
                  role: 'Office Staff',
                  status: 'Active',
                  sendEmailImmediate: true
                });
                setInnerView('create');
              }}
              className="px-5 py-2.5 bg-brand-navy hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-indigo-300 animate-bounce" />
              <span>Add New Account</span>
            </button>
          </div>

          {/* SUMMARY STATS GRID */}
          <div id="staff-summary-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StaffSummaryCard 
              title="Total Accounts" 
              value={totalAccounts} 
              icon={Users}
              colorClass="bg-blue-50/50 text-blue-600 border-blue-100"
            />
            <StaffSummaryCard 
              title="Office Staff" 
              value={officeCount} 
              icon={Building}
              colorClass="bg-indigo-50/50 text-indigo-600 border-indigo-100"
            />
            <StaffSummaryCard 
              title="Lecturers" 
              value={lecturerCount} 
              icon={Briefcase}
              colorClass="bg-emerald-50/50 text-[#00a15c] border-[#bef5db]"
            />
            <StaffSummaryCard 
              title="Prog. Coordinators" 
              value={coordCount} 
              icon={Shield}
              colorClass="bg-amber-50/60 text-[#ea580c] border-[#ffedd5]"
            />
          </div>

          {/* DATATABLE & CONTROLS LIST CARD */}
          <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-xs text-left">
        
        {/* SUB-TABS SELECTOR FRAME (High fidelity tab list style under Staff & Lecturers section) */}
        <div className="border-b border-slate-100 px-5 pt-4 flex gap-6 select-none bg-slate-50/30">
          {[
            { key: 'Office Staff', label: 'Office Staff' },
            { key: 'Lecturer', label: 'Lecturers' },
            { key: 'Programme Coordinator', label: 'Prog. Coordinators' }
          ].map((subtab) => {
            const isTabActive = activeSubTab === subtab.key;
            return (
              <button
                key={subtab.key}
                type="button"
                onClick={() => {
                  setActiveSubTab(subtab.key as any);
                  setCurrentPage(1);
                  setSearchQuery('');
                  setSelectedDept('All');
                  setSelectedStatus('All');
                }}
                className={`pb-3 transition-all relative cursor-pointer font-black tracking-wide text-xs uppercase flex items-center gap-2 ${
                  isTabActive 
                    ? 'text-brand-navy' 
                    : 'text-slate-400 hover:text-slate-655'
                }`}
              >
                <span>{subtab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-all ${
                  isTabActive 
                    ? 'bg-brand-navy text-white' 
                    : 'bg-slate-150 text-slate-500'
                }`}>
                  {getSubTabCount(subtab.key as any)}
                </span>
                
                {isTabActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.75 bg-brand-navy rounded-full animate-fade-in" />
                )}
              </button>
            );
          })}
        </div>

        {/* INPUTS ROW AND ACTION LINE */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 select-none">
          
          {/* SEARCH BOX FOR ACCOUNTS */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-195 text-xs font-bold text-slate-700 pl-10 pr-4 py-2.5 rounded-xl placeholder:text-slate-450 outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-3xs"
            />
          </div>

          {/* DYNAMIC DROP RANGE SELECTORS */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* DEPARTMENT FILTER */}
            <div className="relative">
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-white border border-slate-195 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-10 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 outline-none transition shadow-3xs"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none stroke-[2.5]" />
            </div>

            {/* STATUS FILTER */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-white border border-slate-195 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-10 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 outline-none transition shadow-3xs"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none stroke-[2.5]" />
            </div>

            {/* EXPORT DATA BUTTON */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-3xs transition-all cursor-pointer flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>

          </div>

        </div>

        {/* DATABLE ELEMENT */}
        <div className="overflow-x-auto">
          <table className="data-table min-w-[700px]">
            <thead>
              <tr className="data-thead bg-slate-50/40 select-none">
                <th className="data-th w-12 text-center">
                  <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" readOnly disabled />
                </th>
                <th className="data-th">Name & ID</th>
                <th className="data-th">Department</th>
                <th className="data-th">Email</th>
                <th className="data-th">Status</th>
                <th className="data-th w-24 text-right pr-10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <LoadingState message="Loading staff accounts…" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <ErrorState message={error} onRetry={loadStaff} />
                  </td>
                </tr>
              ) : displayedStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic bg-white font-semibold">
                    No registry ledger matches found matching requirements.
                  </td>
                </tr>
              ) : (
                displayedStaff.map((staff) => {
                  
                  // Status chip selector styles mapping
                  let statusChipStyle = 'bg-slate-50 text-slate-500 border-slate-200';
                  if (staff.status === 'Active') {
                    statusChipStyle = 'bg-[#e6fbf2] text-[#00a15c] border-[#bef5db]';
                  } else if (staff.status === 'Inactive') {
                    statusChipStyle = 'bg-slate-150/60 text-slate-600 border-slate-205';
                  } else if (staff.status === 'Suspended') {
                    statusChipStyle = 'bg-rose-50 text-rose-600 border-rose-100';
                  }

                  return (
                    <tr
                      key={staff.id}
                      className="data-row group font-bold text-xs"
                    >
                      {/* Checkbox */}
                      <td className="data-td w-12 text-center">
                        <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                      </td>

                      {/* Name and ID */}
                      <td className="data-td">
                        <div className="flex items-center gap-3">
                          {/* Avatar Initials */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black tracking-wide border select-none ${staff.avatarBg}`}>
                            {staff.avatarText}
                          </div>
                          <div className="text-left flex flex-col justify-center">
                            <span className="text-brand-navy font-black text-xs block group-hover:text-blue-900 transition-colors">
                              {staff.name}
                            </span>
                            <span className="text-slate-400 font-mono text-[9px] font-black mt-0.5 tracking-wide uppercase">
                              {staff.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="data-td max-w-[150px] truncate">
                        {staff.department}
                      </td>

                      {/* Email address */}
                      <td className="data-td select-all hover:text-blue-600 transition-colors">
                        {staff.email}
                      </td>

                      {/* Status chip */}
                      <td className="data-td">
                        <span className={`inline-flex items-center px-3.5 py-1 text-[10.5px] font-black rounded-full border tracking-wide select-none ${statusChipStyle}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            staff.status === 'Active' 
                              ? 'bg-[#00a15c]' 
                              : staff.status === 'Inactive' 
                                ? 'bg-slate-500' 
                                : 'bg-rose-600'
                          }`} />
                          {staff.status}
                        </span>
                      </td>

                      {/* Actions Buttons Column */}
                      <td className="data-td text-right pr-10">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setViewingStaff(staff)}
                            title="View Account Details"
                            className="p-2 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM RANGE & PAGINATION */}
        <div className="p-4 px-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 select-none font-bold text-slate-500 text-[11px]">
          <div>
            Showing <span className="text-brand-navy">{startEntryIndex}</span> to <span className="text-brand-navy">{endEntryIndex}</span> of <span className="text-brand-navy">{totalEntriesMatching}</span> entries
          </div>

          <div className="flex items-center gap-1">
            {/* Pagination Prev */}
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-2 border border-slate-200 bg-white text-slate-650 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Pagination buttons list */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
              const worksCurrent = currentPage === pNum;
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-8.5 h-8.5 text-[11px] font-black rounded-lg transition flex items-center justify-center cursor-pointer ${
                    worksCurrent
                      ? 'border border-blue-600 bg-blue-50 text-blue-600 font-extrabold'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            {/* Pagination Next */}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-2 border border-slate-200 bg-white text-slate-650 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
      </>
      )}

      {/* ==================== ADD NEW ACCOUNT MODAL OVERLAY ==================== */}
      {createPortal(
        <AnimatePresence>
        {isAddAccountOpen && (
          <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left animate-fade-in">
            {/* Backdrop Dismiss */}
            <div className="absolute inset-0" onClick={() => setIsAddAccountOpen(false)} />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-sm relative z-10 border border-slate-100 flex flex-col font-sans"
            >
              {/* Header */}
              <div className="bg-[#121c2e] p-5 text-white flex items-center justify-between select-none">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold">
                    <UserPlus className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-150">
                      Add New Account
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Registry staff & lecturer onboarding
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleAddAccountSubmit} className="flex-1 flex flex-col">
                <div className="p-6 md:p-8 space-y-4 max-h-[480px] overflow-y-auto">
                  
                  {/* Account Type/Role Selector */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                      Account Role Role *
                    </label>
                    <div className="grid grid-cols-3 gap-2.5 font-bold text-[10.5px]">
                      {[
                        { key: 'Office Staff', label: 'Office' },
                        { key: 'Lecturer', label: 'Lecturer' },
                        { key: 'Programme Coordinator', label: 'Coordinator' }
                      ].map(r => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => setNewAccountFormData(prev => ({ ...prev, role: r.key }))}
                          className={`py-2 px-3 rounded-lg border text-center font-bold tracking-wide transition cursor-pointer ${
                            newAccountFormData.role === r.key
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-black'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ID & Full Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                        Registry Account ID *
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. STF-2023-014"
                        value={newAccountFormData.id}
                        onChange={(e) => setNewAccountFormData(prev => ({ ...prev, id: e.target.value }))}
                        className="w-full text-xs font-bold text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl uppercase tracking-wide placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                        Full Name *
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Dr. Sarah Lim"
                        value={newAccountFormData.name}
                        onChange={(e) => setNewAccountFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full text-xs font-bold text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  {/* Email & Department fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                        Administrative Email *
                      </label>
                      <input 
                        type="email"
                        required
                        placeholder="e.g. sarah.l@fsktm.edu.my"
                        value={newAccountFormData.email}
                        onChange={(e) => setNewAccountFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full text-xs font-bold text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                        Assigned Department *
                      </label>
                      <div className="relative">
                        <select
                          value={newAccountFormData.department}
                          onChange={(e) => setNewAccountFormData(prev => ({ ...prev, department: e.target.value }))}
                          className="w-full appearance-none text-xs font-bold text-slate-800 border border-slate-200 pl-3.5 pr-10 py-2.5 rounded-xl cursor-pointer bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-450 absolute right-3 top-3.5 pointer-events-none stroke-[2]" />
                      </div>
                    </div>
                  </div>

                  {/* Account Status selector */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                      Initial Status
                    </label>
                    <div className="flex gap-4">
                      {['Active', 'Inactive', 'Suspended'].map((st) => (
                        <label key={st} className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                          <input 
                            type="radio" 
                            name="initial_status_radio"
                            value={st}
                            checked={newAccountFormData.status === st}
                            onChange={() => setNewAccountFormData(prev => ({ ...prev, status: st }))}
                            className="rounded-full border-slate-350 text-brand-navy focus:ring-brand-navy"
                          />
                          <span>{st}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/60 flex items-center justify-end gap-2 text-xs select-none">
                  <button
                    type="button"
                    onClick={() => setIsAddAccountOpen(false)}
                    className="px-4 py-2 bg-slate-200/60 hover:bg-slate-200 text-slate-650 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-navy text-white rounded-xl shadow-xs hover:bg-slate-800 text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    Save & Create Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* ==================== VIEW ACCOUNT DETAILS MODAL OVERLAY ==================== */}
      {createPortal(
        <AnimatePresence>
        {viewingStaff && (
          <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left animate-fade-in">
            {/* Backdrop Dismiss */}
            <div className="absolute inset-0" onClick={() => setViewingStaff(null)} />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-sm relative z-10 border border-slate-100 flex flex-col font-sans"
            >
              {/* Header */}
              <div className="bg-[#121c2e] p-5 text-white flex items-center justify-between select-none font-sans">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold">
                    <Building className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-150">
                      Account Detail Profile
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      FSKTM administration ledger details
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setViewingStaff(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Profile Body */}
              <div className="p-6 md:p-8 space-y-5">
                
                {/* Profile Top with Initials */}
                <div className="flex items-center gap-4 py-3.5 border-b border-slate-100">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-black tracking-widest border select-none ${viewingStaff.avatarBg}`}>
                    {viewingStaff.avatarText}
                  </div>
                  <div className="text-left flex flex-col justify-center">
                    <h3 className="text-sm font-black text-slate-800 leading-snug">{viewingStaff.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-wider uppercase font-black">{viewingStaff.id}</p>
                    <span className="text-[9.5px] uppercase font-black tracking-widest text-indigo-650 mt-1">{viewingStaff.role}</span>
                  </div>
                </div>

                {/* Info Attributes List */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xs font-bold text-slate-700">
                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-450 block mb-1">
                      Assigned Division
                    </span>
                    <span className="text-slate-850 font-black block pt-0.5">FSKTM Dean's Secretariat</span>
                  </div>
                  
                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-450 block mb-1">
                      Account Status
                    </span>
                    <span className={`inline-flex items-center px-3.5 py-1 text-[10.5px] font-black rounded-full border tracking-wide select-none ${
                      viewingStaff.status === 'Active' 
                        ? 'bg-[#e6fbf2] text-[#00a15c] border-[#bef5db]' 
                        : viewingStaff.status === 'Inactive' 
                          ? 'bg-slate-150/60 text-slate-650 border-slate-205'
                          : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {viewingStaff.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-450 block mb-1">
                      Department / Wing
                    </span>
                    <span className="text-slate-850 font-extrabold flex items-center gap-1.5 pt-0.5 max-w-[150px] truncate" title={viewingStaff.department}>
                      <Building className="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />
                      <span>{viewingStaff.department}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-450 block mb-1">
                      Primary Contact Email
                    </span>
                    <span className="text-blue-600 font-bold hover:underline select-all flex items-center gap-1.5 pt-0.5 truncate max-w-[160px]" title={viewingStaff.email}>
                      <Mail className="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />
                      <span>{viewingStaff.email}</span>
                    </span>
                  </div>
                </div>

                {/* Audit log checklist info */}
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-450">
                    Onboarding Verification Markers
                  </h4>
                  <div className="space-y-1.5 text-[10.5px]">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#00a15c] flex items-center justify-center text-[9px] font-bold">✓</div>
                      <span className="text-slate-600 font-bold">UM LDAP credentials sync passed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#00a15c] flex items-center justify-center text-[9px] font-bold">✓</div>
                      <span className="text-slate-600 font-bold">FSKTM Counter counter-signed verification</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Close footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/60 flex items-center justify-end text-xs select-none">
                <button
                  type="button"
                  onClick={() => setViewingStaff(null)}
                  className="px-4 py-2 bg-slate-205 hover:bg-slate-300 text-slate-700 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer"
                >
                  Close Profile
                </button>
              </div>

            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
