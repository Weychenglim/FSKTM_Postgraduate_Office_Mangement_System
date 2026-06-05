/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  FileText, 
  SlidersHorizontal,
  Mail, 
  Phone,
  Bookmark,
  ArrowLeft,
  X,
  Bell,
  HelpCircle,
  LogOut,
  Settings as SettingsIcon,
  Search,
  MessageSquareCode,
  FolderMinus,
  MailOpen,
  Megaphone,
  CheckSquare,
  Award,
  LayoutDashboard,
  Filter,
  Check,
  Building,
  Download
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { SupervisorRequestHistory } from './SupervisorRequestHistory';
import { ActiveSuperviseeDetail } from './ActiveSuperviseeDetail';
import { SupervisorRequest, ActiveSuperviseeRow } from '../types';
import { getSupervisorRequests, getActiveSupervisees } from '../services';

// ==================== REUSABLE DEFINITIONS & MOTIFS ====================

interface SummaryCardProps {
  title: string;
  value: string;
  subtext: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'info';
  progress?: {
    current: number;
    max: number;
  };
}

/**
 * Standard counter info block with subtle drop shadow and sleek tracking.
 */
export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtext,
  badge,
  badgeType = 'success',
  progress
}) => {
  return (
    <div id={`summary-${title.toLowerCase().replace(/\s+/g, '-')}`} className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-auto relative overflow-hidden group hover:border-[#cbd5e1] transition-all duration-300">
      <div className="flex justify-between items-start">
        <div className="space-y-1 text-left">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
            {title}
          </span>
          {subtext && !progress && (
            <span className="text-[10px] font-bold text-slate-400 block pt-0.5 uppercase tracking-wider">
              {subtext}
            </span>
          )}
        </div>
        {badge && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border select-none ${
            badgeType === 'success' 
              ? 'bg-[#e6fbf2] text-[#00a15c] border-[#bef5db]'
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            <span className={`w-1 h-1 rounded-full ${badgeType === 'success' ? 'bg-[#00a15c] animate-pulse' : 'bg-amber-500'}`} />
            {badge}
          </span>
        )}
      </div>

      <div className="text-left mt-4">
        <span className="text-3xl font-black text-brand-navy tracking-tight block">
          {progress ? (
            <span className="font-sans">
              {progress.current} <span className="text-slate-300 font-medium">/ {progress.max} Students</span>
            </span>
          ) : value}
        </span>
      </div>

      {progress && (
        <div className="mt-4 space-y-1.5 w-full">
          <div className="w-full bg-[#f1f5f9] rounded-full h-2 overflow-hidden">
            <div 
              className="bg-brand-navy h-full rounded-full transition-all duration-500"
              style={{ width: `${(progress.current / progress.max) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Progress Load: {Math.round((progress.current / progress.max) * 100)}%</span>
            <span>Capacity</span>
          </div>
        </div>
      )}

      {subtext && progress && (
        <span className="text-[10px] font-bold text-slate-400 text-left block pt-1.5 uppercase tracking-wider">
          {subtext}
        </span>
      )}
    </div>
  );
};

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: LucideIcon;
  children: React.ReactNode;
}

/**
 * Standard action button matching visual state tokens.
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  variant = 'primary',
  icon: Icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const variantMap = {
    primary: 'primary',
    secondary: 'secondary',
    outline: 'secondary',
    danger: 'danger'
  } as const;

  return (
    <PortalButton
      variant={variantMap[variant]}
      size="md"
      icon={Icon}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </PortalButton>
  );
};

interface StatusChipProps {
  status: 'Pending' | 'Active' | 'No Supervisor' | 'Approved' | 'Rejected' | string;
}

/**
 * Highlights status records with professional rounded badges.
 */
export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const normalized = status.toLowerCase();
  const tone =
    normalized.includes('approved') ? 'success' :
    normalized.includes('active') ? 'info' :
    normalized.includes('rejected') ? 'danger' :
    normalized.includes('no ') ? 'neutral' :
    'warning';

  return <StatusBadge tone={tone} dot pulse={normalized.includes('pending') || normalized.includes('active')}>{status}</StatusBadge>;
};

// ==================== SPECIFIC DRAWER REUSABLE COMPONENT PATTERNS ====================

interface StudentProfileHeaderProps {
  studentName: string;
  programme: string;
  submittedDate: string;
}

export const StudentProfileHeader: React.FC<StudentProfileHeaderProps> = ({
  studentName,
  programme,
  submittedDate
}) => {
  const initials = studentName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex gap-4 items-center py-4 border-b border-slate-100 select-none">
      <div className="w-14 h-14 bg-slate-100 text-slate-500 font-black text-sm rounded-full flex items-center justify-center tracking-widest shrink-0 border border-slate-205">
        {initials}
      </div>
      <div className="text-left">
        <h4 className="text-sm font-black text-brand-navy leading-snug">
          {studentName}
        </h4>
        <p className="text-[12px] text-slate-500 font-extrabold mt-0.5 leading-none">
          {programme}
        </p>
        <p className="text-[11px] text-slate-400 font-bold mt-1 leading-none">
          Submitted: {submittedDate}
        </p>
      </div>
    </div>
  );
};

interface InfoCardProps {
  label: string;
  className?: string;
  children: React.ReactNode;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  label,
  className = "",
  children
}) => {
  return (
    <div className={`space-y-2 text-left ${className}`}>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
        {label}
      </span>
      {children}
    </div>
  );
};

interface DocumentCardProps {
  fileName: string;
  onDownload?: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  fileName,
  onDownload
}) => {
  return (
    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white hover:border-slate-305 transition-colors select-none">
      <div className="flex items-center gap-2.5">
        <FileText className="w-4.5 h-4.5 text-rose-500 stroke-[2]" />
        <span className="text-xs font-bold text-slate-700">{fileName}</span>
      </div>
      <button 
        onClick={onDownload}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer group"
        title="Download File"
      >
        <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-650 transition-colors" />
      </button>
    </div>
  );
};

interface ProgressTimelineItem {
  id: string;
  label: string;
  subtext?: string;
  status: 'completed' | 'active' | 'pending';
}

interface ProgressTimelineProps {
  items: ProgressTimelineItem[];
}

export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({ items }) => {
  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={item.id} className="relative flex gap-4 text-left group">
            {/* Left Timeline Indicator node */}
            <div className="flex flex-col items-center shrink-0">
              <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center border font-sans text-[10px] font-bold ${
                item.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : item.status === 'active'
                  ? 'bg-brand-navy text-white border-brand-navy ring-4 ring-slate-100'
                  : 'bg-white text-slate-300 border-slate-200'
              }`}>
                {item.status === 'completed' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3.5]" />
                ) : item.status === 'active' ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-white block animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200 block" />
                )}
              </div>
              {!isLast && (
                <div className={`w-[2px] h-10 -mb-4 mt-1 grow ${
                  item.status === 'completed' ? 'bg-emerald-100' : 'bg-slate-100'
                }`} />
              )}
            </div>

            {/* Timeline Content right */}
            <div className="pt-0.5 space-y-0.5 select-none">
              <h5 className={`text-xs font-extrabold ${item.status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
                {item.label}
              </h5>
              {item.subtext && (
                <p className={`text-[10px] font-bold ${item.status === 'pending' ? 'text-slate-350' : 'text-slate-400'}`}>
                  {item.subtext}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  id,
  className = "",
  ...props
}) => {
  return (
    <div className="space-y-1.5 text-left w-full">
      <span className="form-label block">
        {label}
      </span>
      <textarea
        id={id}
        className={`form-control form-control-md ${className}`}
        style={{ minHeight: '100px' }}
        {...props}
      />
    </div>
  );
};

export const NoticeText: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1 select-none text-left">
      {children}
    </p>
  );
};

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject
}) => {
  const [rejectReason, setRejectReason] = useState('');

  if (!isOpen || !request) return null;

  const handleRejectClick = () => {
    if (!rejectReason.trim()) {
      alert("A reason is required before rejecting this supervisor appointment request.");
      return;
    }
    onReject(request.studentId, rejectReason);
    setRejectReason('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Dimmed backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        {/* Sliding Panel container */}
        <div className="w-screen max-w-md bg-white shadow-sm flex flex-col overflow-hidden z-50 border-l border-slate-100">
          
          {/* Header block with close icon */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white select-none shrink-0">
            <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider">
              Supervisor Request Review
            </h3>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100/80 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          </div>

          {/* Drawer content and review controls scroll together. */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Student Profile Header */}
            <StudentProfileHeader 
              studentName={request.studentName}
              programme={`${request.programme} (Research)`}
              submittedDate={request.submittedDate}
            />

            {/* Research Abstract */}
            <InfoCard label="RESEARCH ABSTRACT">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold text-slate-600 leading-relaxed text-left">
                {request.abstract || "This research aims to investigate the efficiency of Federated Learning (FL) architectures in heterogeneous healthcare environments. The study will focus on developing a secure model aggregation protocol that maintains differential privacy without significantly sacrificing predictive accuracy..."}
              </div>
            </InfoCard>

            {/* Proposed Area & Eligibility indicators side-by-side matches perfect layout */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-5 select-none text-left">
              <InfoCard label="PROPOSED AREA">
                <span className="text-xs font-extrabold text-brand-navy">
                  Distributed Systems & Security
                </span>
              </InfoCard>

              <InfoCard label="ELIGIBILITY">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#00a15c]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a15c] animate-pulse" />
                  Verified
                </span>
              </InfoCard>
            </div>

            {/* Supporting Documents Section */}
            <InfoCard label="DOCUMENTS">
              <DocumentCard 
                fileName="Detailed_Proposal.pdf" 
                onDownload={() => alert("Downloading Detailed_Proposal.pdf file archive.")}
              />
            </InfoCard>

            {/* Request Progress Timeline */}
            <InfoCard label="REQUEST PROGRESS">
              <ProgressTimeline 
                items={[
                  {
                    id: 'submitted',
                    label: 'Application Submitted',
                    subtext: '14 May 2024, 09:30 AM',
                    status: 'completed'
                  },
                  {
                    id: 'review',
                    label: 'Supervisor Review',
                    subtext: 'Awaiting your decision',
                    status: 'active'
                  },
                  {
                    id: 'approval',
                    label: 'Programme Coordinator Approval',
                    subtext: 'Pending action',
                    status: 'pending'
                  },
                  {
                    id: 'letter',
                    label: 'Confirmation Letter Generated',
                    status: 'pending'
                  }
                ]}
              />
            </InfoCard>

            <div className="pt-5 border-t border-slate-100 space-y-4">
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onApprove(request.studentId)}
                  className="w-full py-4 bg-brand-navy hover:bg-slate-900 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer text-center"
                >
                  Approve as Supervisor
                </button>

                <button
                  type="button"
                  onClick={handleRejectClick}
                  className="w-full py-3.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer text-center"
                >
                  Reject Request
                </button>
              </div>

              <FormTextarea 
                label="REASON FOR REJECTION" 
                placeholder="Enter reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <NoticeText>
                A reason is required before rejecting this supervisor appointment request.
              </NoticeText>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ==================== SPECIFIC PORTAL COMPONENT PARTS ====================

interface RequestCardProps {
  request: {
    studentId: string;
    studentName: string;
    programme: string;
    proposedTopic: string;
    submittedDate: string;
    receivedTime: string;
    status: string;
  };
  onOpen: () => void;
  onViewHistory: () => void;
}

/**
 * Clean container matching high fidelity request designs exactly.
 */
export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onOpen,
  onViewHistory
}) => {
  const initials = request.studentName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div id={`request-card-${request.studentId}`} className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs hover:border-[#cbd5e1] transition-all duration-300 text-left h-full flex flex-col justify-between">
      <div>
        {/* Author metadata header */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-500 font-black text-sm rounded-xl flex items-center justify-center tracking-widest shrink-0 border border-slate-200/50">
              {initials}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-brand-navy leading-snug">
                {request.studentName}
              </h4>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                {request.programme} <span className="mx-1 text-slate-200">•</span> ID: <span className="font-mono">{request.studentId}</span>
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                Submitted: {request.submittedDate}
              </p>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1.5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">
              RECEIVED: {request.receivedTime}
            </span>
            <StatusChip status={request.status} />
          </div>
        </div>

        {/* Proposed research topic container block */}
        <div className="mt-5 p-4.5 bg-[#f8fafc] border border-slate-100 rounded-2xl">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
            PROPOSED TOPIC
          </span>
          <h5 className="text-[12.5px] font-extrabold text-brand-navy leading-relaxed">
            {request.proposedTopic}
          </h5>
        </div>
      </div>

      <div className="mt-6 pt-1 flex flex-col gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="w-full py-3 text-center border border-brand-navy text-brand-navy font-black uppercase text-[10px] tracking-wider rounded-xl hover:bg-slate-50 transition-all duration-200 cursor-pointer"
        >
          Open Request
        </button>
      </div>
    </div>
  );
};

/**
 * Standard clock/empty state feedback box.
 */
export const EmptyStateCard: React.FC = () => {
  return (
    <div id="no-more-requests" className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-full min-h-[290px] select-none">
      <div className="w-12 h-12 bg-slate-50 text-slate-350 border border-slate-100 rounded-full flex items-center justify-center mb-3">
        <Clock className="w-5 h-5 text-slate-400 opacity-60 stroke-[1.8]" />
      </div>
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        No further requests at this time.
      </h4>
    </div>
  );
};

// ActiveSuperviseeRow now lives in src/types.

interface DataTableProps {
  data: ActiveSuperviseeRow[];
  onOpenRow: (row: ActiveSuperviseeRow) => void;
  onFilterClick: () => void;
}

/**
 * Clean high performance lists for direct active records review.
 */
export const DataTable: React.FC<DataTableProps> = ({
  data,
  onOpenRow,
  onFilterClick
}) => {
  return (
    <div id="supervisees-table-block" className="space-y-4 text-left">
      {/* Header filter actions section */}
      <div className="flex justify-between items-center select-none">
        <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider">
          Active Supervisees
        </h3>
        <button 
          onClick={onFilterClick}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-3xs"
        >
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filter</span>
        </button>
      </div>

      {/* Main database layout listing */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0]/80 overflow-hidden shadow-3xs">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[750px] text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                <th className="py-4.5 px-6">STUDENT ID</th>
                <th className="py-4.5 px-6">STUDENT NAME</th>
                <th className="py-4.5 px-6">RESEARCH TITLE</th>
                <th className="py-4.5 px-6">APPT. DATE</th>
                <th className="py-4.5 px-6">STATUS</th>
                <th className="py-4.5 px-6 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-brand-navy">
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No active supervisees assigned yet.
                  </td>
                </tr>
              )}
              {data.map((row) => {
                const initials = row.studentName
                  .split(' ')
                  .slice(0, 2)
                  .map(w => w[0])
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={row.studentId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-505 text-slate-500">
                      {row.studentId}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 text-slate-505 text-slate-500 font-extrabold text-[10px] rounded-lg flex items-center justify-center shrink-0 border border-slate-200/50">
                          {initials}
                        </div>
                        <span className="font-extrabold text-brand-navy tracking-tight">{row.studentName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-500 max-w-[280px] truncate" title={row.researchTitle}>
                      {row.researchTitle}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-450 text-slate-400 font-sans">
                      {row.appointmentDate}
                    </td>
                    <td className="py-4 px-6">
                      <StatusChip status={row.status} />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => onOpenRow(row)}
                        className="px-4.5 py-2 bg-brand-navy hover:bg-slate-800 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN SCREEN WORKFLOW CONTAINER ====================

interface LecturerSupervisorAppointmentsProps {
  onBack?: () => void;
}

export const LecturerSupervisorAppointments: React.FC<LecturerSupervisorAppointmentsProps> = ({ onBack }) => {
  // Supervisory load counter (workload widget). Stays local UI state: it tracks
  // remaining slots and is nudged as the lecturer approves/rejects requests.
  const [summaryLoad, setSummaryLoad] = useState({ current: 3, max: 5 });

  // Pending requests + active supervisees loaded from appointmentsApi (mock-backed today).
  const [requestsList, setRequestsList] = useState<SupervisorRequest[]>([]);
  const [supervisees, setSupervisees] = useState<ActiveSuperviseeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getSupervisorRequests(), getActiveSupervisees()])
      .then(([requests, active]) => {
        setRequestsList(requests);
        setSupervisees(active);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load supervisor appointments.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Routing screen details status
  const [detailView, setDetailView] = useState<'list' | 'requestDetail' | 'superviseeDetail' | 'history'>('list');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedSupervisee, setSelectedSupervisee] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [toastText, setToastText] = useState<string | null>(null);

  const showToast = (txt: string) => {
    setToastText(txt);
    setTimeout(() => setToastText(null), 3000);
  };

  const handleOpenRequest = (req: any) => {
    setSelectedRequest(req);
    setIsDrawerOpen(true);
  };

  const handleOpenSupervisee = (supe: any) => {
    const fullProfile = {
      ...supe,
      programme: supe.studentId.startsWith('WEA') ? 'MSc. Computer Science' : 'MSc. Software Engineering',
      email: `${supe.studentName.toLowerCase().replace(/\s+/g, '')}@um.edu.my`,
      phone: '+60 3-7967 6300',
      office: 'Block A, Level 3, Room 12',
      coSupervisor: 'Assoc. Prof. Dr. Amina Malik',
      progressReport: 'Satisfactory (Satisfactory achievement across Milestone 2 targets.)',
      recentMilestone: 'Milestone 2 Defense Confirmed (Approved: Apr 2026)',
      abstract: 'This dissertation investigates security paradigms and computational enhancements, testing deployment structures onto simulated container clusters inside Universiti Malaya’s computing infrastructure.'
    };
    setSelectedSupervisee(fullProfile);
    setDetailView('superviseeDetail');
  };

  const handleApproveRequest = (id: string) => {
    // Add request student to active list
    const studentReq = requestsList.find(r => r.studentId === id);
    if (studentReq) {
      const newActive: ActiveSuperviseeRow = {
        studentId: studentReq.studentId,
        studentName: studentReq.studentName,
        researchTitle: studentReq.proposedTopic,
        appointmentDate: '28 May 2026', // Current mocked Date
        status: 'Active'
      };
      setSupervisees(prev => [newActive, ...prev]);
      setSummaryLoad(prev => ({ ...prev, current: Math.min(prev.max, prev.current + 1) }));
      setRequestsList(prev => prev.filter(r => r.studentId !== id));
      showToast(`Appointment approved! ${studentReq.studentName} is now added to your supervisee roster.`);
      setIsDrawerOpen(false);
      setDetailView('list');
    }
  };

  const handleRejectRequest = (id: string, reason: string) => {
    const studentReq = requestsList.find(r => r.studentId === id);
    if (studentReq) {
      setRequestsList(prev => prev.filter(r => r.studentId !== id));
      showToast(`Appointment declined for student ${studentReq.studentName}. Action logged successfully.`);
      setIsDrawerOpen(false);
      setDetailView('list');
    }
  };

  return (
    <div id="lecturer-portal-workspace" className="space-y-8 animate-fade-in text-left">
      
      <PortalToast message={toastText} />

      {/* RENDER ACTIVE SCREEN BASED ON DETAILED ROUTE STATE */}
      {detailView === 'list' && (
        <div id="overview-listing-screen" className="space-y-8">
          
          <PageHeader
            title="Supervisor Appointments"
            subtitle="Manage your active supervisees and review incoming supervisor appointment requests."
            subtitleClassName="leading-relaxed max-w-4xl"
            className="select-none"
          />

          {loading ? (
            <LoadingState message="Loading supervisor appointments…" />
          ) : error ? (
            <ErrorState message={error} onRetry={loadData} />
          ) : (
          <>

          {/* TWO SUMMARY CARDS GRID */}
          <div id="summary-cards-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
            <SummaryCard
              title="Supervisory Load"
              subtext="ACADEMIC YEAR 2024/2025"
              value=""
              badge="Available"
              badgeType="success"
              progress={summaryLoad}
            />
            <SummaryCard
              title="Pending Requests"
              value={`${requestsList.length} New`}
              subtext="Requires review within 7 days."
              badge={requestsList.length > 0 ? "Needs Review" : "Up-To-Date"}
              badgeType={requestsList.length > 0 ? 'warning' : 'success'}
            />
          </div>

          {/* PENDING SUPERVISOR REQUESTS CONTAINER SECTION */}
          <div id="pending-requests-section" className="space-y-4">
            <div className="flex justify-between items-center select-none">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider">
                  Pending Supervisor Requests
                </h3>
                {requestsList.length > 0 && (
                  <span className="bg-blue-600 border border-blue-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg select-none">
                    {requestsList.length} New
                  </span>
                )}
              </div>
              <button 
                type="button"
                onClick={() => setDetailView('history')}
                className="text-xs font-extrabold text-[#2563eb] hover:text-blue-800 tracking-wide transition-colors cursor-pointer"
              >
                View Request History
              </button>
            </div>

            {/* Side-by-side Layout: Left Request list, Right clock info block */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {requestsList.map((req) => (
                <div key={req.studentId}>
                  <RequestCard
                    request={req}
                    onOpen={() => handleOpenRequest(req)}
                    onViewHistory={() => alert("Routing to appointment records.")}
                  />
                </div>
              ))}
              
              {requestsList.length === 0 ? (
                <div className="lg:col-span-2">
                  <EmptyStateCard />
                </div>
              ) : (
                <div>
                  <EmptyStateCard />
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE SUPERVISEES DETAILS LIST TABLE */}
          <DataTable
            data={supervisees}
            onOpenRow={handleOpenSupervisee}
            onFilterClick={() => showToast("Filters initialized. Click on candidate rows to begin edit updates.")}
          />

          </>
          )}

        </div>
      )}

      {/* DETAIL SCREEN 1: PENDING SUPERVISOR REQUEST DETAIL */}
      {detailView === 'requestDetail' && selectedRequest && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="space-y-6 text-left"
        >
          <PortalButton
            onClick={() => setDetailView('list')}
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            className="mb-3 px-0 hover:bg-transparent"
          >
            Back to Appointments List
          </PortalButton>

          {/* Profile overview box layout */}
          <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-3xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
            
            {/* Left panel metrics context */}
            <div className="lg:col-span-4 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-8">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-[#eff6ff] text-blue-600 font-extrabold text-xl rounded-2xl flex items-center justify-center tracking-widest shrink-0 border border-blue-50 animate-pulse">
                  {selectedRequest.studentName.split(' ')[0][0]}{selectedRequest.studentName.split(' ').slice(-1)[0][0]}
                </div>
                <div>
                  <h2 className="text-lg font-black text-brand-navy leading-snug">
                    {selectedRequest.studentName}
                  </h2>
                  <span className="inline-block mt-1.5">
                    <StatusChip status={selectedRequest.status} />
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-4 font-sans text-xs">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    STUDENT ID NUMBER
                  </span>
                  <span className="font-mono text-xs font-black text-brand-navy block mt-1 bg-[#f8fafc] px-3 py-2 border border-slate-150 rounded-xl">
                    {selectedRequest.studentId}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    ACADEMIC COURSEWAY
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 block mt-1 leading-relaxed">
                    {selectedRequest.programme}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    SUBMISSION DATE
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 block mt-1">
                    {selectedRequest.submittedDate} ({selectedRequest.receivedTime})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    REMAINING SEATS
                  </span>
                  <span className="text-xs font-extrabold text-[#00a15c] block mt-1">
                    {summaryLoad.max - summaryLoad.current} / {summaryLoad.max} Slots Available
                  </span>
                </div>
              </div>
            </div>

            {/* Right panel proposal text content */}
            <div className="lg:col-span-8 space-y-6">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block leading-none mb-3">
                  Proposed Research Topic
                </span>
                <h3 className="text-lg md:text-xl font-black text-brand-navy leading-snug">
                  {selectedRequest.proposedTopic}
                </h3>
              </div>

              <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-6 text-left space-y-3 font-sans">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  CANDIDATE SYNOPSIS ABSTRACT
                </span>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  {selectedRequest.abstract}
                </p>
              </div>

              {/* Action operations controls */}
              <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-end items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    const r = prompt("Please provide a concise description explaining the grounds for declining this supervision assignment:");
                    if (r !== null) {
                      handleRejectRequest(selectedRequest.studentId, r || "General area misalignment");
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 border border-rose-250 hover:bg-rose-50 text-rose-600 hover:text-rose-800 font-extrabold text-[10.5px] uppercase tracking-widest rounded-xl transition cursor-pointer select-none text-center"
                >
                  Decline Roster
                </button>

                <button
                  type="button"
                  onClick={() => handleApproveRequest(selectedRequest.studentId)}
                  className="w-full sm:w-auto bg-brand-navy hover:bg-slate-800 text-white px-8 py-3.5 font-extrabold text-[10.5px] uppercase tracking-widest rounded-xl shadow-sm cursor-pointer select-none text-center flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 text-indigo-300 stroke-[3.5]" />
                  <span>Accept Roster Assignment</span>
                </button>
              </div>

            </div>

          </div>

        </motion.div>
      )}

      {/* DETAIL SCREEN 2: ACTIVE SUPERVISEE DETAIL */}
      {detailView === 'superviseeDetail' && selectedSupervisee && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="space-y-6 text-left"
        >
          <ActiveSuperviseeDetail 
            onBack={() => setDetailView('list')}
            studentId={selectedSupervisee.studentId}
            studentName={selectedSupervisee.studentName}
          />
        </motion.div>
      )}

      {/* DETAIL SCREEN 3: SUPERVISOR REQUEST HISTORY */}
      {detailView === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <SupervisorRequestHistory onBack={() => setDetailView('list')} />
        </motion.div>
      )}

      {/* RIGHT DRAWER: Supervisor Request Review Drawer */}
      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        request={selectedRequest}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
      />

    </div>
  );
};
