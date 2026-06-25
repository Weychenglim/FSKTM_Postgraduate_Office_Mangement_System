/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthLayout } from './components/AuthLayout';
import { LoginCard } from './components/LoginCard';
import { ForgotPasswordFlow } from './components/ForgotPasswordFlow';
import { AppLayout } from './components/AppLayout';
import { SummaryCard } from './components/SummaryCard';
import { ChecklistCard, ChecklistItem } from './components/ChecklistCard';
import { MarkSubmissionMonitoring } from './components/MarkSubmissionMonitoring';
import { AlertListCard } from './components/AlertListCard';
import { QuickActionsCard } from './components/QuickActionsCard';
import { MarkEntryPeriodConfig } from './components/MarkEntryPeriodConfig';
import { RubricsManagementView } from './components/RubricsManagementView';
import { EvaluationTaskAssignment } from './components/EvaluationTaskAssignment';
import { MarkEntryRecords } from './components/MarkEntryRecords';
import { MarkEntryRecordDetail } from './components/MarkEntryRecordDetail';
import { PanelAppointmentManagement } from './components/PanelAppointmentManagement';
import { SupervisorAppointmentManagement } from './components/SupervisorAppointmentManagement';
import { LecturerMarksEntry } from './components/LecturerMarksEntry';
import { LecturerPanelAppointments } from './components/LecturerPanelAppointments';
import { LecturerSupervisorAppointments } from './components/LecturerSupervisorAppointments';
import { AdministrationDashboard } from './components/AdministrationDashboard';
import { TimelineManagement } from './components/TimelineManagement';
import { FileRepository } from './components/FileRepository';
import { StudentFileSubmission } from './components/StudentFileSubmission';
import { NotificationsAnnouncements } from './components/NotificationsAnnouncements';
import { AnnouncementManagement } from './components/AnnouncementManagement';
import { AcademicFAQEditor } from './components/AcademicFAQEditor';
import { StudentFAQChatbot } from './components/StudentFAQChatbot';
import { LetterTemplateManagement } from './components/LetterTemplateManagement';
import { StudentLetterGeneration } from './components/StudentLetterGeneration';
import { StudentRegistry } from './components/StudentRegistry';
import { StudentDashboard } from './components/StudentDashboard';
import { LecturerDashboard } from './components/LecturerDashboard';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { CoordinatorSupervisorDeferred } from './components/CoordinatorSupervisorDeferred';
import { StudentSupervisorAppointment } from './components/StudentSupervisorAppointment';
import { StudentPanelAppointment } from './components/StudentPanelAppointment';
import { SettingsView } from './components/SettingsView';
import { PortalToast } from './components/PortalPrimitives';
import { 
  Calendar, 
  Sliders, 
  CheckCircle,
  Database,
  Briefcase,
} from 'lucide-react';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { DashboardSummary, DemoUser, EvaluationPeriodOption, NotificationItem } from './types';
import { SIDEBAR_ITEMS } from './constants/navigation';
import { authApi, getAuthToken, clearAuthToken, getDashboardSummary, getEvaluationPeriods } from './services';
import { NotificationsProvider } from './context/NotificationsContext';
import { MOCK_MARK_RECORDS } from './mocks/marks';
import { defaultLandingPageForUser } from './utils/landingPage';
import { MarkRecordStatusTab } from './utils/markRecords';
import { notificationTargetToNavigation } from './utils/workflowTracking';

// Data mapper to pass true metadata dynamically into MarkEntryRecordDetail
const getRecordDetails = (id: string) => {
  const record = MOCK_MARK_RECORDS.find((r) => r.id === id) || MOCK_MARK_RECORDS[0];
  return {
    recordId: record.id,
    studentId: record.studentId,
    studentName: record.studentName,
    researchTitle: record.researchTitle,
    panelMember: record.panelMember,
    semester: record.semester,
    programme: record.programme,
    totalMark: record.totalMark,
    submittedDate: record.submittedDate,
  };
};

const formatPeriodDate = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function App() {
  // Authentication session tracking
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);

  // True while we restore an existing session from a stored token on first load.
  // Prevents the login page from flashing on refresh before /auth/me/ resolves.
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Unauthenticated view routing state
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'reset'>('login');

  // Captured from a password-reset email link (?uid=...&token=...).
  const [resetParams, setResetParams] = useState<{ uid: string; token: string } | null>(null);

  // On first load, detect a password-reset link and switch to the reset view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    const token = params.get('token');
    if (uid && token) {
      setResetParams({ uid, token });
      setAuthView('reset');
    }
  }, []);

  // On first load, restore the session from the stored JWT so a page refresh
  // (or a new tab) does not bounce the user back to the login screen.
  useEffect(() => {
    let cancelled = false;
    if (!getAuthToken()) {
      setIsRestoringSession(false);
      return;
    }
    authApi
      .getCurrentUser()
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        // Token is missing/expired/invalid — drop it and show login.
        clearAuthToken();
      })
      .finally(() => {
        if (!cancelled) setIsRestoringSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sidebar navigation active state
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>(SIDEBAR_ITEMS.DASHBOARD);

  // Sub-view transition state under Dashboard Overview
  const [dashboardSubView, setDashboardSubView] = useState<'overview' | 'timeline'>('overview');

  // Sub-view transition state under Marks Entry
  const [currentSubView, setCurrentSubView] = useState<'dashboard' | 'config' | 'rubric' | 'assignment' | 'records' | 'detail'>('dashboard');

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [marksRecordStatusTab, setMarksRecordStatusTab] = useState<MarkRecordStatusTab>('All Records');
  const [marksDashboardSummary, setMarksDashboardSummary] = useState<DashboardSummary | null>(null);
  const [evaluationPeriods, setEvaluationPeriods] = useState<EvaluationPeriodOption[]>([]);

  // Trigger states for modals in the main dashboard workspace
  const [activePortalModal, setActivePortalModal] = useState<'period' | 'rubric' | 'generate' | 'help' | null>(null);
  const [appToastMessage, setAppToastMessage] = useState<string | null>(null);
  const [workflowRecordTarget, setWorkflowRecordTarget] = useState<{
    recordType?: string;
    recordId?: string;
  } | null>(null);

  const isLecturerWorkspace = currentUser?.role === 'Lecturer';
  const isCoordinatorWorkspace = currentUser?.role === 'Programme Coordinator';
  const isStudentWorkspace = currentUser?.role === 'Student';

  useEffect(() => {
    if (currentUser?.role !== 'Office Staff/Admin') {
      setMarksDashboardSummary(null);
      setEvaluationPeriods([]);
      return;
    }

    let cancelled = false;
    Promise.all([getDashboardSummary(), getEvaluationPeriods()])
      .then(([dashboardSummary, periods]) => {
        if (cancelled) return;
        setMarksDashboardSummary(dashboardSummary);
        setEvaluationPeriods(periods);
      })
      .catch(() => {
        if (cancelled) return;
        setMarksDashboardSummary(null);
        setEvaluationPeriods([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.role]);

  const openMarkRecords = (statusTab: MarkRecordStatusTab = 'All Records') => {
    setMarksRecordStatusTab(statusTab);
    setActiveSidebarItem(SIDEBAR_ITEMS.MARKS_ENTRY);
    setCurrentSubView('records');
  };

  const activeEvaluationPeriod = evaluationPeriods.find((period) => period.isOpen) || evaluationPeriods[0];
  const activePeriodDates = activeEvaluationPeriod
    ? [formatPeriodDate(activeEvaluationPeriod.opensAt), formatPeriodDate(activeEvaluationPeriod.closesAt)]
        .filter(Boolean)
        .join(' - ')
    : 'No active period configured';
  const taskTotals = activeEvaluationPeriod?.taskTotals;
  const totalMarkTasks = taskTotals?.total ?? (
    (marksDashboardSummary?.submittedMarkEntries ?? 0)
    + (marksDashboardSummary?.incompleteMarkEntries ?? 0)
  );
  const submittedMarkTasks = taskTotals?.submitted ?? marksDashboardSummary?.submittedMarkEntries ?? 0;
  const incompleteMarkTasks = taskTotals?.incomplete ?? marksDashboardSummary?.incompleteMarkEntries ?? 0;

  // Setup checklist data
  const checklistTasks: ChecklistItem[] = [
    { id: '1', taskName: 'Configure mark entry period', status: 'COMPLETED', actionLabel: 'Open' },
    { id: '2', taskName: 'Define rubric components', status: 'COMPLETED', actionLabel: 'View' },
    { id: '3', taskName: 'Generate evaluation tasks', status: 'COMPLETED', actionLabel: 'View' },
    { id: '4', taskName: 'Notify panel members', status: 'COMPLETED', actionLabel: 'View' }
  ];

  // Handler when clicking checklist steps
  const handleChecklistAction = (item: ChecklistItem) => {
    if (item.id === '1') {
      setCurrentSubView('config');
    } else if (item.id === '2') {
      setCurrentSubView('rubric');
    } else if (item.id === '3' || item.id === '4') {
      setCurrentSubView('assignment');
    }
  };

  const handleSuccessfulLogin = (user: DemoUser) => {
    setCurrentUser(user);
    setActiveSidebarItem(defaultLandingPageForUser(user));
    setCurrentSubView('dashboard');
    setDashboardSubView('overview');
  };

  const showAppToast = (message: string) => {
    setAppToastMessage(message);
    window.setTimeout(() => setAppToastMessage(null), 3500);
  };

  const handleLogout = () => {
    void authApi.logout();
    setCurrentUser(null);
  };

  // Leave the reset view and clean the reset params out of the URL bar.
  const handleBackToLogin = () => {
    if (resetParams) {
      window.history.replaceState({}, '', '/');
      setResetParams(null);
    }
    setAuthView('login');
  };

  // While restoring a session from a stored token, hold a neutral loading screen
  // instead of flashing the login page (skip it for the reset-password link flow).
  if (isRestoringSession && authView !== 'reset') {
    return (
      <div
        id="session-restore-loading"
        className="min-h-screen bg-[#f1f5f9] flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-[#0c1424] animate-spin" />
          <p className="text-xs font-bold tracking-wide">Restoring your session…</p>
        </div>
      </div>
    );
  }

  return (
    <div id="application-entry" className="min-h-screen bg-[#f1f5f9]">
      {currentUser ? (
        /* ==================== FRONTEND: PORTAL DASHBOARD WORKSPACE ==================== */
        <NotificationsProvider>
        <PortalToast message={appToastMessage} />
        <AppLayout
          activeItem={activeSidebarItem}
          onNavigate={(target) => {
            setActiveSidebarItem(target);
            setWorkflowRecordTarget(null);
            setCurrentSubView('dashboard');
            setMarksRecordStatusTab('All Records');
            setDashboardSubView('overview');
          }}
          onLogout={handleLogout}
          onNotificationsTrigger={() => {
            setActiveSidebarItem(SIDEBAR_ITEMS.NOTIFICATIONS);
          }}
          userName={currentUser.fullName}
          userRole={currentUser.role}
          activeModal={activePortalModal}
          setActiveModal={setActivePortalModal}
        >
          {activeSidebarItem === SIDEBAR_ITEMS.MARKS_ENTRY ? (
            isLecturerWorkspace ? (
              <LecturerMarksEntry onBackToDashboard={() => setActiveSidebarItem(SIDEBAR_ITEMS.DASHBOARD)} />
            ) : currentSubView === 'config' ? (
              <MarkEntryPeriodConfig onBack={() => setCurrentSubView('dashboard')} />
            ) : currentSubView === 'rubric' ? (
              <RubricsManagementView onBack={() => setCurrentSubView('dashboard')} />
            ) : currentSubView === 'assignment' ? (
              <EvaluationTaskAssignment onBack={() => setCurrentSubView('dashboard')} />
            ) : currentSubView === 'records' ? (
              <MarkEntryRecords 
                onBack={() => setCurrentSubView('dashboard')} 
                initialStatusTab={marksRecordStatusTab}
                onViewRecordDetail={(recordId) => {
                  setSelectedRecordId(recordId);
                  setCurrentSubView('detail');
                }}
              />
            ) : currentSubView === 'detail' ? (
              <MarkEntryRecordDetail
                onBack={() => setCurrentSubView('records')}
                {...(selectedRecordId ? getRecordDetails(selectedRecordId) : {})}
              />
            ) : (
              /* Main Dashboard Marks Entry View workspace */
              <div id="marks-entry-workspace" className="space-y-8 animate-fade-in">
                
                {/* Header Title section */}
                <div id="page-metadata-block" className="text-left">
                  <h1 id="main-view-title" className="page-title">
                    Marks & Evaluation Management
                  </h1>
                  <p id="main-view-subtitle" className="page-subtitle">
                    Configure mark entry setup, generate evaluation tasks, and monitor submission progress.
                  </p>
                </div>

                {/* 4 Summary Cards Grid */}
                <div id="summary-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <SummaryCard
                    title="Mark Entry Period"
                    badgeText={activeEvaluationPeriod?.isOpen ? 'Active' : 'Configured'}
                    badgeType={activeEvaluationPeriod?.isOpen ? 'active' : 'ready'}
                    subtext={activePeriodDates}
                    icon={Calendar}
                    onClick={() => setCurrentSubView('config')}
                  />
                  <SummaryCard
                    title="Rubric Components"
                    badgeText="Ready"
                    badgeType="ready"
                    subtext="5 components, 100 marks"
                    icon={Sliders}
                    onClick={() => setCurrentSubView('rubric')}
                  />
                  <SummaryCard
                    title="Evaluation Tasks"
                    badgeText={`${totalMarkTasks} Tasks`}
                    badgeType="generated"
                    subtext={`${taskTotals?.supervisor ?? marksDashboardSummary?.supervisorMarkTasks ?? 0} supervisor, ${taskTotals?.panel ?? marksDashboardSummary?.panelMarkTasks ?? 0} panel, ${taskTotals?.backup ?? marksDashboardSummary?.backupMarkTasks ?? 0} backup`}
                    icon={CheckCircle}
                    onClick={() => setCurrentSubView('assignment')}
                  />
                  <SummaryCard
                    title="Submitted Marks"
                    badgeText={`${submittedMarkTasks} / ${totalMarkTasks}`}
                    badgeType="ratio"
                    subtext={`${incompleteMarkTasks} submissions pending`}
                    icon={Database}
                    onClick={() => openMarkRecords('Submitted')}
                  />
                </div>

                {/* Core layout grid (Left column: 65%, Right column: 35%) */}
                <div id="core-layout-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left column content: Setup checklists and Progress Monitoring */}
                  <div id="left-column-layout" className="lg:col-span-8 space-y-8">
                    
                    {/* Setup Checklist */}
                    <ChecklistCard 
                      items={checklistTasks} 
                      onItemAction={handleChecklistAction} 
                    />

                    {/* Submission Monitoring */}
                    <MarkSubmissionMonitoring onViewRecords={openMarkRecords} />
                  </div>

                  {/* Right column content: Urgent alerts list, Quick Actions, Database sync */}
                  <div id="right-column-layout" className="lg:col-span-4 space-y-8">
                    
                    {/* Attention Needed items */}
                    <AlertListCard />

                    {/* Quick Actions buttons with Database state indicators */}
                    <QuickActionsCard
                      onConfigurePeriod={() => setCurrentSubView('config')}
                      onManageRubrics={() => setCurrentSubView('rubric')}
                      onGenerateTasks={() => setCurrentSubView('assignment')}
                      onViewRecords={() => openMarkRecords('All Records')}
                    />
                  </div>

                </div>

              </div>
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.PANEL_APPOINTMENTS ? (
            isStudentWorkspace ? (
              <StudentPanelAppointment onShowFAQChatbot={() => setActiveSidebarItem(SIDEBAR_ITEMS.FAQ_CHATBOT)} />
            ) : isLecturerWorkspace || isCoordinatorWorkspace ? (
              <LecturerPanelAppointments
                currentUser={currentUser}
                initialRecommendationId={
                  workflowRecordTarget?.recordType === 'PANEL_RECOMMENDATION'
                    ? workflowRecordTarget.recordId
                    : undefined
                }
              />
            ) : (
              <PanelAppointmentManagement />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS ? (
            isStudentWorkspace ? (
              <StudentSupervisorAppointment
                onShowFAQChatbot={() => setActiveSidebarItem(SIDEBAR_ITEMS.FAQ_CHATBOT)}
                initialApplicationId={
                  workflowRecordTarget?.recordType === 'SUPERVISOR_APPLICATION'
                    ? workflowRecordTarget.recordId
                    : undefined
                }
              />
            ) : isCoordinatorWorkspace ? (
              <CoordinatorSupervisorDeferred
                initialApplicationId={workflowRecordTarget?.recordId}
              />
            ) : isLecturerWorkspace ? (
              <LecturerSupervisorAppointments
                initialApplicationId={workflowRecordTarget?.recordId}
              />
            ) : (
              <SupervisorAppointmentManagement onNavigateToWorkload={() => setActiveSidebarItem(SIDEBAR_ITEMS.PANEL_APPOINTMENTS)} />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.REGISTRY ? (
            <StudentRegistry />
          ) : activeSidebarItem === SIDEBAR_ITEMS.DASHBOARD || activeSidebarItem === 'Office Dashboard' || activeSidebarItem === 'Timeline Management' ? (
            isStudentWorkspace ? (
              <StudentDashboard
                studentName={currentUser.fullName}
                studentId={currentUser.studentId}
                programme={currentUser.department}
                onNavigateToTab={(tab) => setActiveSidebarItem(tab)}
              />
            ) : isCoordinatorWorkspace ? (
              <CoordinatorDashboard
                onNavigateToTab={(tab) => setActiveSidebarItem(tab)}
              />
            ) : isLecturerWorkspace ? (
              <LecturerDashboard
                onNavigateToTab={(tab) => setActiveSidebarItem(tab)}
              />
            ) : dashboardSubView === 'timeline' ? (
              <TimelineManagement onBack={() => setDashboardSubView('overview')} />
            ) : (
              <AdministrationDashboard 
                onNavigateToTab={(tab) => {
                  setActiveSidebarItem(tab);
                  setCurrentSubView('dashboard');
                }}
                onNavigateToMarksRecords={openMarkRecords}
                onShowModal={setActivePortalModal}
                onNavigateToTimeline={() => setDashboardSubView('timeline')}
              />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.FILE_MANAGEMENT ? (
            isStudentWorkspace ? (
              <StudentFileSubmission />
            ) : (
              <FileRepository />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.FAQ_CHATBOT ? (
            isStudentWorkspace ? (
              <StudentFAQChatbot />
            ) : (
              <AcademicFAQEditor />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.LETTER_GENERATION ? (
            isStudentWorkspace ? (
              <StudentLetterGeneration
                studentName={currentUser.fullName}
                studentId={currentUser.studentId}
                programme={currentUser.department}
              />
            ) : (
              <LetterTemplateManagement />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.ANNOUNCEMENTS ? (
            <AnnouncementManagement />
          ) : activeSidebarItem === SIDEBAR_ITEMS.NOTIFICATIONS ? (
            <NotificationsAnnouncements
              onBack={() => setActiveSidebarItem(SIDEBAR_ITEMS.DASHBOARD)}
              onOpenWorkflowRecord={(notification: NotificationItem) => {
                const target = notificationTargetToNavigation(notification);
                setWorkflowRecordTarget({
                  recordType: target.recordType,
                  recordId: target.recordId,
                });
                setActiveSidebarItem(target.sidebarItem);
              }}
            />
          ) : activeSidebarItem === SIDEBAR_ITEMS.SETTINGS ? (
            <SettingsView currentUser={currentUser} onLogout={handleLogout} />
          ) : (
            /* Placeholder message for other sidebar routes */
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center max-w-xl mx-auto my-12 shadow-sm">
              <div className="w-16 h-16 bg-[#eff6ff] text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                {activeSidebarItem} Overview Desk
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                You have routed to the <strong>{activeSidebarItem}</strong> workflow module inside the FSKTM administrative center. To fulfill layout reference checks, please toggle back to the <strong>Marks Entry</strong> tab.
              </p>
              <button
                onClick={() => setActiveSidebarItem(SIDEBAR_ITEMS.MARKS_ENTRY)}
                className="mt-6 px-5 py-2.5 bg-brand-navy text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-850 transition"
              >
                Return to Marks Entry
              </button>
            </div>
          )}
        </AppLayout>
        </NotificationsProvider>
      ) : authView === 'reset' && resetParams ? (
        /* ==================== FRONTEND: STANDALONE RESET PASSWORD SCREEN ==================== */
        <ResetPasswordPage
          uid={resetParams.uid}
          token={resetParams.token}
          onBackToLogin={handleBackToLogin}
        />
      ) : authView === 'forgot' ? (
        /* ==================== FRONTEND: STANDALONE FORGOT PASSWORD SCREEN ==================== */
        <ForgotPasswordFlow onBackToLogin={() => setAuthView('login')} />
      ) : (
        /* ==================== FRONTEND: STANDALONE LOGIN SCREEN ==================== */
        <AuthLayout>
          {/* We replace the default internal form but utilize LoginCard's beautiful interaction callbacks */}
          <div className="w-full flex justify-center items-center">
            {/* When LoginCard completes successful auth, it passes down via context or sets page user. Since LoginCard handles its own local session established state, let's wrap it. To allow LoginCard to let a user login to App, we can provide a button or direct detection. We put LoginCard inside. */}
            <div className="w-full flex justify-center flex-col items-center">

              {/* Real LoginCard */}
              <LoginCard 
                onForgotPasswordClick={() => setAuthView('forgot')}
                onLoginSuccess={handleSuccessfulLogin}
              />

              {/* Visual guidance indicator */}
              <div className="mt-4 text-[11px] text-slate-400 font-medium font-sans">
                Tip: Enter valid credentials or click any character role from the Console to log in.
              </div>
            </div>
          </div>
        </AuthLayout>
      )}
    </div>
  );
}
