/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Users,
  RefreshCw,
  Clock, 
  CheckCircle, 
  ChevronRight, 
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
  Building
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { EmptyState, LoadingState, ErrorState } from './StateViews';
import { SupervisorRequestHistory } from './SupervisorRequestHistory';
import { supervisorResearchPage } from '../utils/supervisorWorkspace';
import { SupervisorWorkspaceNavigation } from './SupervisorWorkspaceNavigation';
import { ActiveSuperviseeDetail } from './ActiveSuperviseeDetail';
import { WorkflowAuditLog } from './WorkflowAuditLog';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';
import { SupervisorRequest, ActiveSuperviseeRow, SupervisorWorkloadSummary } from '../types';
import {
  acceptSupervisorApplication,
  formatSupervisorWaiting,
  getSupervisorApplication,
  getSupervisorRequests,
  getActiveSupervisees,
  getOwnSupervisorWorkload,
  orderSupervisorQueueOldestFirst,
  rejectSupervisorApplication,
} from '../services';
import { capacityStateLabel } from '../utils/lecturerCapacity';
import { formatMalaysiaDate } from '../utils/malaysiaDateTime';
import { SupervisoryTeamManagement } from './SupervisoryTeamManagement';
import { ResearchAmendments } from './ResearchAmendments';
import { AppointmentSection, AppointmentMemberCard, AppointmentSummaryCard } from './AppointmentPrimitives';
import { LecturerAppointmentGuidance } from './LecturerAppointmentGuidance';

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
export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtext, badge, badgeType = 'success', progress }) => (
  <AppointmentSummaryCard title={title} value={value} description={subtext} badge={badge} tone={badgeType} progress={progress} />
);

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
        <h4 className="section-label leading-snug">
          {studentName}
        </h4>
        <p className="card-description mt-0.5">
          {programme}
        </p>
        <p className="card-description mt-1">
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
      <span className="card-label text-slate-400 block leading-none">
        {label}
      </span>
      {children}
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
    <p className="card-description mt-1 select-none text-left">
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
  const canAct =
    request.participantEligible !== false
    && (
      request.status === 'SUBMITTED_TO_SUPERVISOR'
      || request.status === 'Pending Review'
    );

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
            <h3 className="section-label">
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
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl card-description text-slate-600 text-left">
                {request.abstract || 'No research abstract was provided with this application.'}
              </div>
            </InfoCard>

            <InfoCard label="RESEARCH AREA">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl card-description text-slate-600 text-left">
                {request.researchArea || 'Not recorded'}
              </div>
            </InfoCard>

            {/* Supporting Documents Section */}
            <SupervisorDocumentsList
              applicationId={request.id}
              documents={request.documents}
              compact
            />

            <WorkflowAuditLog events={request.workflow} />

            {request.participantEligible === false && (
              <p className="card-description rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                This Student is {request.participantLifecycleStatus?.toLowerCase()}; the request remains visible but is non-actionable until eligible.
              </p>
            )}

            {canAct ? (
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
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 card-description text-slate-600">
                This workflow record is read-only because the request is no longer awaiting your decision.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// ==================== SPECIFIC PORTAL COMPONENT PARTS ====================

interface RequestCardProps {
  request: SupervisorRequest;
  onOpen: () => void;
  onViewDossier: () => void;
}

/**
 * Clean container matching high fidelity request designs exactly.
 */
export const RequestCard: React.FC<RequestCardProps> = ({ request, onOpen, onViewDossier }) => (
  <div id={`request-card-${request.studentId}`}>
    <AppointmentMemberCard label="Applicant" name={request.studentName} status={request.status} tone="warning" actions={<>
      <PortalButton size="sm" onClick={onViewDossier}>View student record</PortalButton>
      <PortalButton size="sm" variant="primary" onClick={onOpen}>Open Request</PortalButton>
    </>}>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="card-label">Student ID</dt><dd className="card-value break-words">{request.studentId}</dd></div>
        <div><dt className="card-label">Programme</dt><dd className="card-value break-words">{request.programme}</dd></div>
        <div><dt className="card-label">Submitted</dt><dd className="card-value">{request.submittedDate}</dd></div>
        <div><dt className="card-label">Waiting</dt><dd className="card-description">{formatSupervisorWaiting(request)}</dd></div>
      </dl>
      <div className="space-y-1 pt-2"><p className="card-label">Proposed research title</p><p className="card-value break-words">{request.proposedTopic}</p></div>
    </AppointmentMemberCard>
  </div>
);

export const EmptyStateCard: React.FC = () => <p className="card-description rounded-xl bg-slate-50 p-4">No pending supervisor requests.</p>;

// ActiveSuperviseeRow now lives in src/types.

interface DataTableProps {
  data: ActiveSuperviseeRow[];
  onOpenRow: (row: ActiveSuperviseeRow) => void;
  onViewDossier: (studentId: string) => void;
}

/**
 * Clean high performance lists for direct active records review.
 */
export const DataTable: React.FC<DataTableProps> = ({
  data,
  onOpenRow,
  onViewDossier
}) => {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visibleRows = data.filter(row => `${row.studentId} ${row.studentName} ${row.researchTitle}`.toLowerCase().includes(query));
  return (
    <AppointmentSection id="supervisees-table-block" title="Active Supervisees" description="Your active primary supervision appointments.">
      {data.length > 1 ? <label className="form-label block max-w-lg">Find a supervisee<input type="search" className="form-control form-control-sm mt-1" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, student ID or research title" /></label> : null}
      {/* Main database layout listing */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0]/80 overflow-hidden shadow-3xs">
        <div className="overflow-x-auto">
          <table className="data-table table-fixed min-w-[850px] text-xs">
            <colgroup>{[16,22,26,12,10,14].map(width => <col key={width} style={{width:`${width}%`}} />)}</colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                <th className="data-th whitespace-nowrap py-4.5 px-3">STUDENT ID</th>
                <th className="data-th whitespace-nowrap py-4.5 px-3">STUDENT NAME</th>
                <th className="data-th whitespace-nowrap py-4.5 px-3">RESEARCH TITLE</th>
                <th className="data-th whitespace-nowrap py-4.5 px-3">APPT. DATE</th>
                <th className="data-th whitespace-nowrap py-4.5 px-3">STATUS</th>
                <th className="data-th whitespace-nowrap py-4.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-brand-navy">
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="card-description py-12 text-center text-slate-400">
                    {query ? 'No matching supervisees.' : 'No active supervisees assigned yet.'}
                  </td>
                </tr>
              )}
              {visibleRows.map((row) => {
                return (
                  <tr key={row.studentId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-3 whitespace-nowrap font-mono font-bold text-slate-505 text-slate-500">
                      {row.studentId}
                    </td>
                    <td className="data-td py-4 px-3">
                      <span className="card-value whitespace-nowrap text-brand-navy">{row.studentName}</span>
                    </td>
                    <td className="data-td py-4 px-3 text-slate-500 whitespace-normal break-words" title={row.researchTitle}>
                      {row.researchTitle}
                    </td>
                    <td className="data-td-strong whitespace-nowrap py-4 px-3 text-slate-450 text-slate-400 font-sans">
                      {row.appointmentDate}
                    </td>
                    <td className="data-td py-4 px-3">
                      <StatusBadge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</StatusBadge>
                    </td>
                    <td className="data-td py-4 px-3 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewDossier(row.studentId)}
                          className="text-[9px] font-black uppercase text-blue-700 hover:underline"
                        >
                          View student record
                        </button>
                        <button
                          onClick={() => onOpenRow(row)}
                        className="px-3.5 py-2 bg-brand-navy hover:bg-slate-800 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
                        >
                          View supervision
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppointmentSection>
  );
};

// ==================== MAIN SCREEN WORKFLOW CONTAINER ====================

interface LecturerSupervisorAppointmentsProps {
  onBack?: () => void;
  initialApplicationId?: string;
  routeView?: 'list' | 'supervisees' | 'research' | 'history' | 'superviseeDetail';
  routeSuperviseeStudentId?: string;
  onNavigateToList?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToSupervisee?: (studentId: string) => void;
  onNavigateToDossier?: (studentId: string) => void;
  onNavigateToPanelRecommendation?: (studentId: string) => void;
  onNavigateToSupervisees?: () => void;
  researchView?: 'list' | 'detail' | 'profile' | 'new';
  researchRequestId?: string;
  onNavigateToResearchRequest?: (id: string) => void;
  onNavigateToResearchList?: () => void;
  onNavigateToResearchProfile?: () => void;
}

export const LecturerSupervisorAppointments: React.FC<LecturerSupervisorAppointmentsProps> = ({
  onBack,
  initialApplicationId,
  routeView = 'list',
  routeSuperviseeStudentId,
  onNavigateToList,
  onNavigateToHistory,
  onNavigateToSupervisee,
  onNavigateToDossier,
  onNavigateToPanelRecommendation,
  onNavigateToSupervisees,
  researchView = 'list', researchRequestId,
  onNavigateToResearchRequest, onNavigateToResearchList, onNavigateToResearchProfile,
}) => {
  const [summaryLoad, setSummaryLoad] = useState({ current: 0, max: 0 });
  const [capacity, setCapacity] = useState<SupervisorWorkloadSummary | null>(null);

  // Pending requests, active supervisees, and workload come from Django.
  const [requestsList, setRequestsList] = useState<SupervisorRequest[]>([]);
  const [supervisees, setSupervisees] = useState<ActiveSuperviseeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [researchRefresh, setResearchRefresh] = useState(0);
  const [teamRefresh, setTeamRefresh] = useState(0);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([
      getSupervisorRequests(),
      getActiveSupervisees(),
      getOwnSupervisorWorkload(),
    ])
      .then(([requests, active, workload]) => {
        setRequestsList(orderSupervisorQueueOldestFirst(requests));
        setSupervisees(active);
        setSummaryLoad({
          current: workload.currentStudents,
          max: workload.workloadLimit,
        });
        setCapacity(workload);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load supervisor appointments.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Request detail remains local; page-level history/supervisee screens are route controlled.
  const [detailView, setDetailView] = useState<'requestDetail' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [detailRejectReason, setDetailRejectReason] = useState('');
  const requestLoadVersion = useRef(0);
  const requestScope = `${routeView}:${initialApplicationId ?? ''}:${routeSuperviseeStudentId ?? ''}:${researchView}:${researchRequestId ?? ''}`;
  const requestScopeRef = useRef(requestScope);
  requestScopeRef.current = requestScope;

  useEffect(() => {
    requestLoadVersion.current += 1;
    setIsDrawerOpen(false);
    setSelectedRequest(null);
    setDetailRejectReason('');
    return () => { requestLoadVersion.current += 1; };
  }, [requestScope]);

  useEffect(() => {
    if (!initialApplicationId) { setIsDrawerOpen(false); setSelectedRequest(null); return; }
    let current = true;
    const request = requestsList.find(
      (item) => String(item.applicationId) === String(initialApplicationId),
    );
    getSupervisorApplication(initialApplicationId)
      .then((detail) => {
        if (!current) return;
        setSelectedRequest({
          ...request,
          ...detail,
          proposedTopic: detail.researchTitle,
          researchArea: detail.researchArea,
          abstract: detail.researchAbstract,
          submittedDate: formatMalaysiaDate(detail.submittedAt),
        });
        setDetailRejectReason('');
        setIsDrawerOpen(true);
      })
      .catch(() => {
        if (!current) return;
        if (!request) return;
        setSelectedRequest(request);
        setDetailRejectReason('');
        setIsDrawerOpen(true);
      });
    return () => { current = false; };
  }, [initialApplicationId, requestsList, requestScope]);

  const [toastText, setToastText] = useState<string | null>(null);

  const showToast = (txt: string) => {
    setToastText(txt);
    setTimeout(() => setToastText(null), 3000);
  };

  const handleOpenRequest = async (req: any) => {
    const version = ++requestLoadVersion.current;
    const scope = requestScopeRef.current;
    const isCurrent = () => version === requestLoadVersion.current && scope === requestScopeRef.current;
    setDetailRejectReason('');
    if (req.applicationId === undefined) {
      setSelectedRequest(req);
      setIsDrawerOpen(true);
      return;
    }
    try {
      const detail = await getSupervisorApplication(req.applicationId);
      if (!isCurrent()) return;
      setSelectedRequest({ ...req, ...detail });
      setIsDrawerOpen(true);
    } catch (reason) {
      if (!isCurrent()) return;
      showToast(reason instanceof Error ? reason.message : 'Failed to load request history.');
    }
  };

  const selectedSupervisee = useMemo(() => {
    if (!routeSuperviseeStudentId) return null;
    return supervisees.find(
      (item) => String(item.studentId) === String(routeSuperviseeStudentId),
    ) ?? null;
  }, [supervisees, routeSuperviseeStudentId]);

  const navigateToList = onNavigateToList ?? (() => undefined);

  const handleOpenSupervisee = (supe: ActiveSuperviseeRow) => {
    onNavigateToSupervisee?.(supe.studentId);
  };

  const handleApproveRequest = async (id: string) => {
    // Add request student to active list
    const studentReq = requestsList.find(r => r.studentId === id);
    if (studentReq) {
      try {
        if (studentReq.applicationId !== undefined) {
          await acceptSupervisorApplication(studentReq.applicationId);
        }
      } catch (reason) {
        showToast(reason instanceof Error ? reason.message : 'Failed to accept supervisor request.');
        return;
      }
      await loadData();
      setDetailRejectReason('');
      showToast(`${studentReq.studentName}'s request was forwarded to the Programme Coordinator.`);
      setIsDrawerOpen(false);
      navigateToList();
    }
  };

  const handleRejectRequest = async (id: string, reason: string) => {
    const studentReq = requestsList.find(r => r.studentId === id);
    if (studentReq) {
      try {
        if (studentReq.applicationId !== undefined) {
          await rejectSupervisorApplication(studentReq.applicationId, reason);
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to reject supervisor request.');
        return;
      }
      setRequestsList(prev => prev.filter(r => r.studentId !== id));
      setDetailRejectReason('');
      showToast(`Appointment declined for student ${studentReq.studentName}. Action logged successfully.`);
      setIsDrawerOpen(false);
      navigateToList();
    }
  };

  const researchPage = routeView === 'research' && researchView !== 'list' ? supervisorResearchPage(researchView) : null;
  const backLabel = researchPage ? 'Back to research changes' : routeView === 'history' ? 'Back to Requests' : routeView === 'superviseeDetail' ? 'Back to My supervisees' : undefined;
  const onPageBack = researchPage ? onNavigateToResearchList : routeView === 'history' ? navigateToList : routeView === 'superviseeDetail' ? onNavigateToSupervisees : undefined;

  return (
    <div id="lecturer-portal-workspace" className="space-y-6 text-left font-sans pb-12">
      
      <PortalToast message={toastText} />
      <PageHeader title={researchPage?.title ?? (routeView === 'history' ? 'Supervisor Request History' : routeView === 'superviseeDetail' ? 'Supervision details' : 'Supervisor Appointments')}
        subtitle={researchPage?.subtitle ?? (routeView === 'history' ? 'View your previous supervisor requests and recorded outcomes.' : routeView === 'research' ? 'Review research changes for students you supervise.' : routeView === 'supervisees' ? 'Find a student and open their supervision details.' : routeView === 'superviseeDetail' ? 'Current supervisory team, research profile and recorded appointment history.' : 'Review incoming Supervisor and co-supervisor requests.')}
        backLabel={backLabel} onBack={onPageBack}
        actions={routeView === 'list' || routeView === 'supervisees' ? <PortalButton size="sm" icon={RefreshCw} disabled={loading} onClick={() => { void loadData(); setResearchRefresh(value => value + 1); setTeamRefresh(value => value + 1); }}>Refresh appointments</PortalButton> : undefined} />
      <SupervisorWorkspaceNavigation role="Lecturer" />

      {/* RENDER ACTIVE SCREEN BASED ON DETAILED ROUTE STATE */}
      {routeView === 'list' && (
        <div id="overview-listing-screen" className="space-y-6">
          
          {loading ? (
            <LoadingState message="Loading supervisor appointments…" />
          ) : error ? (
            <ErrorState message={error} onRetry={loadData} />
          ) : (
          <>

          {/* TWO SUMMARY CARDS GRID */}
          <div id="summary-cards-grid" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SummaryCard
              title="Supervisory Load"
              subtext={`${capacity?.semesterCode ?? 'No active semester'} · ${capacity?.capacityPlanVersion ? `Plan v${capacity.capacityPlanVersion}` : 'Plan not configured'}`}
              value=""
              badge={capacity?.capacityState ? capacityStateLabel(capacity.capacityState) : 'Not configured'}
              badgeType={capacity?.selectable ? 'success' : 'warning'}
              progress={summaryLoad}
            />
            <SummaryCard
              title="Pending Requests"
              value={`${requestsList.length} New`}
              subtext="Awaiting your review."
              badge={requestsList.length > 0 ? "Needs Review" : "Up-To-Date"}
              badgeType={requestsList.length > 0 ? 'warning' : 'success'}
            />
          </div>

          {/* PENDING SUPERVISOR REQUESTS CONTAINER SECTION */}
          <AppointmentSection id="pending-requests-section" title="Pending Supervisor Requests" actions={<PortalButton size="sm" onClick={onNavigateToHistory}>View Request History</PortalButton>}>
            {requestsList.length ? <div className="grid gap-3 lg:grid-cols-2">{requestsList.map(req => <RequestCard key={req.applicationId ?? req.studentId} request={req} onOpen={() => handleOpenRequest(req)} onViewDossier={() => onNavigateToDossier?.(req.studentId)} />)}</div> : <EmptyStateCard />}
          </AppointmentSection>

          </>
          )}
          <SupervisoryTeamManagement key="requests" role="Lecturer" view="requests" showResearchChanges={false} refreshVersion={teamRefresh} onChanged={() => { void loadData(); setResearchRefresh(value => value + 1); }} />
          <LecturerAppointmentGuidance module="supervisor" section="requests" />

        </div>
      )}

      {routeView === 'supervisees' && <SupervisoryTeamManagement key="roster" role="Lecturer" view="roster" showResearchChanges={false} refreshVersion={teamRefresh} onNavigateToStudent={onNavigateToSupervisee} />}
      {routeView === 'research' && <ResearchAmendments role="Lecturer" hideHeader={!!researchPage} routeView={researchView} routeRequestId={researchRequestId}
        onNavigateToRequest={onNavigateToResearchRequest} onNavigateToList={onNavigateToResearchList} onNavigateToProfile={onNavigateToResearchProfile}
        refreshVersion={researchRefresh} onChanged={() => { void loadData(); setTeamRefresh(value => value + 1); }} />}
      {routeView === 'research' && researchView === 'list' && <LecturerAppointmentGuidance module="supervisor" section="research" />}

      {/* DETAIL SCREEN 1: PENDING SUPERVISOR REQUEST DETAIL */}
      {detailView === 'requestDetail' && selectedRequest && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="space-y-6 text-left"
        >
          <PortalButton
            onClick={() => setDetailView(null)}
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
                  <h2 className="section-heading leading-snug">
                    {selectedRequest.studentName}
                  </h2>
                  <span className="inline-block mt-1.5">
                    <StatusChip status={selectedRequest.status} />
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-4 font-sans text-xs">
                <div>
                  <span className="card-label text-slate-400 block">
                    STUDENT ID NUMBER
                  </span>
                  <span className="font-mono text-xs font-black text-brand-navy block mt-1 bg-[#f8fafc] px-3 py-2 border border-slate-150 rounded-xl">
                    {selectedRequest.studentId}
                  </span>
                </div>

                <div>
                  <span className="card-label text-slate-400 block">
                    ACADEMIC COURSEWAY
                  </span>
                  <span className="card-value text-slate-800 block mt-1 leading-relaxed">
                    {selectedRequest.programme}
                  </span>
                </div>

                <div>
                  <span className="card-label text-slate-400 block">
                    SUBMISSION DATE
                  </span>
                  <span className="card-value text-slate-800 block mt-1">
                    {selectedRequest.submittedDate} ({selectedRequest.receivedTime})
                  </span>
                </div>

                <div>
                  <span className="card-label text-slate-400 block">
                    REMAINING SEATS
                  </span>
                  <span className="card-value text-[#00a15c] block mt-1">
                    {capacity?.availableSlots ?? Math.max(summaryLoad.max - summaryLoad.current, 0)}
                    {' '}/ {summaryLoad.max} Slots Available
                  </span>
                  <span className="card-caption mt-1 block text-slate-500">
                    {capacity?.semesterCode ?? 'No active semester'} · {capacity?.capacityPlanVersion ? `Plan v${capacity.capacityPlanVersion}` : 'Plan not configured'}
                    {capacity?.unavailableUntil ? ` · Unavailable until ${capacity.unavailableUntil}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Right panel proposal text content */}
            <div className="lg:col-span-8 space-y-6">
              <div>
                <span className="card-label text-indigo-600 block leading-none mb-3">
                  Proposed Research Topic
                </span>
                <h3 className="section-heading  leading-snug">
                  {selectedRequest.proposedTopic}
                </h3>
              </div>

              <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-6 text-left space-y-3 font-sans">
                <span className="card-label text-slate-400 block">
                  CANDIDATE SYNOPSIS ABSTRACT
                </span>
                <p className="card-description">
                  {selectedRequest.abstract}
                </p>
              </div>

              {/* Action operations controls */}
              {selectedRequest.participantEligible === false ? (
                <p className="card-description rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  This Student is {selectedRequest.participantLifecycleStatus?.toLowerCase()}; the request remains visible but is non-actionable until eligible.
                </p>
              ) : (
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <FormTextarea
                  label="REASON FOR REJECTION"
                  placeholder="Enter reason before declining this supervisor appointment request."
                  value={detailRejectReason}
                  onChange={(event) => setDetailRejectReason(event.target.value)}
                />
                <NoticeText>
                  A reason is required before declining this supervisor appointment request.
                </NoticeText>
                <div className="flex flex-col sm:flex-row justify-end items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!detailRejectReason.trim()) {
                        showToast('A rejection reason is required.');
                        return;
                      }
                      handleRejectRequest(selectedRequest.studentId, detailRejectReason.trim());
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
              )}

            </div>

          </div>

        </motion.div>
      )}

      {/* DETAIL SCREEN 2: ACTIVE SUPERVISEE DETAIL */}
      {routeView === 'superviseeDetail' && loading && (
        <LoadingState message="Loading supervisee detail…" />
      )}

      {routeView === 'superviseeDetail' && !loading && error && (
        <ErrorState message={error} onRetry={loadData} />
      )}

      {routeView === 'superviseeDetail' && selectedSupervisee && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="space-y-6 text-left"
        >
          <ActiveSuperviseeDetail 
            onBack={onNavigateToSupervisees ?? navigateToList}
            hideHeader
            onViewStudentRecord={() => onNavigateToDossier?.(selectedSupervisee.studentId)}
            onRecommendPanel={onNavigateToPanelRecommendation}
            supervisee={selectedSupervisee}
          />
        </motion.div>
      )}

      {routeView === 'superviseeDetail' && <SupervisoryTeamManagement key={routeSuperviseeStudentId} role="Lecturer" view="detail" routeStudentId={routeSuperviseeStudentId} showResearchChanges={false}
        onChanged={() => { void loadData(); setTeamRefresh(value => value + 1); }} />}

      {/* DETAIL SCREEN 3: SUPERVISOR REQUEST HISTORY */}
      {routeView === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <SupervisorRequestHistory onBack={navigateToList} hideHeader />
          <SupervisoryTeamManagement role="Lecturer" view="history" showResearchChanges={false} />
        </motion.div>
      )}

      {/* RIGHT DRAWER: Supervisor Request Review Drawer */}
      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => { requestLoadVersion.current += 1; setIsDrawerOpen(false); }}
        request={selectedRequest}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
      />

    </div>
  );
};
