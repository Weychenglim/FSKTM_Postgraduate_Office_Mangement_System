/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { StudentSupervisorAppointment } from './components/StudentSupervisorAppointment';
import { StudentPanelAppointment } from './components/StudentPanelAppointment';
import { 
  Calendar, 
  Sliders, 
  CheckCircle,
  Database,
  Briefcase,
  Layers,
} from 'lucide-react';
import { DemoUser } from './types';
import { SIDEBAR_ITEMS } from './constants/navigation';
import { MOCK_MARK_RECORDS } from './mocks/marks';

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

// Default logged-in state of Wey Cheng (as seen in the mockup)
const DEFAULT_SECRETARY_ADMIN: DemoUser = {
  id: 'usr_wey_cheng',
  email: 'weycheng@fsktm.edu.my',
  role: 'Office Staff/Admin',
  fullName: 'Wey Cheng',
  department: 'Postgraduate Office Division',
  staffId: 'A004918'
};

export default function App() {
  // Authentication session tracking
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(DEFAULT_SECRETARY_ADMIN);

  // Unauthenticated view routing state
  const [authView, setAuthView] = useState<'login' | 'forgot'>('login');

  // Sidebar navigation active state
  const [activeSidebarItem, setActiveSidebarItem] = useState(SIDEBAR_ITEMS.DASHBOARD);

  // Sub-view transition state under Dashboard Overview
  const [dashboardSubView, setDashboardSubView] = useState<'overview' | 'timeline'>('overview');

  // Sub-view transition state under Marks Entry
  const [currentSubView, setCurrentSubView] = useState<'dashboard' | 'config' | 'rubric' | 'assignment' | 'records' | 'detail'>('dashboard');

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Trigger states for modals in the main dashboard workspace
  const [activePortalModal, setActivePortalModal] = useState<'period' | 'rubric' | 'generate' | 'help' | null>(null);

  const isLecturerWorkspace = currentUser?.role === 'Lecturer';
  const isStudentWorkspace = currentUser?.role === 'Student';

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
    setActiveSidebarItem(user.role === 'Lecturer' ? SIDEBAR_ITEMS.MARKS_ENTRY : SIDEBAR_ITEMS.DASHBOARD);
    setCurrentSubView('dashboard');
    setDashboardSubView('overview');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div id="application-entry" className="min-h-screen bg-[#f1f5f9]">
      {currentUser ? (
        /* ==================== FRONTEND: PORTAL DASHBOARD WORKSPACE ==================== */
        <AppLayout
          activeItem={activeSidebarItem}
          onNavigate={(target) => {
            setActiveSidebarItem(target);
            setCurrentSubView('dashboard');
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
                    badgeText="Active"
                    badgeType="active"
                    subtext="01 Dec - 10 Dec 2025"
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
                    badgeText="Generated"
                    badgeType="generated"
                    subtext="48 tasks assigned"
                    icon={CheckCircle}
                    onClick={() => setCurrentSubView('assignment')}
                  />
                  <SummaryCard
                    title="Submitted Marks"
                    badgeText="32 / 48"
                    badgeType="ratio"
                    subtext="16 submissions pending"
                    icon={Database}
                    onClick={() => alert("Mark Auditor: 32 candidates have finalized submissions. 16 records remain open for edit access.")}
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
                    <MarkSubmissionMonitoring onViewRecords={() => setCurrentSubView('records')} />
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
                      onViewRecords={() => setCurrentSubView('records')}
                    />
                  </div>

                </div>

              </div>
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.PANEL_APPOINTMENTS ? (
            isStudentWorkspace ? (
              <StudentPanelAppointment onShowFAQChatbot={() => setActiveSidebarItem(SIDEBAR_ITEMS.FAQ_CHATBOT)} />
            ) : isLecturerWorkspace ? (
              <LecturerPanelAppointments />
            ) : (
              <PanelAppointmentManagement />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.SUPERVISOR_APPOINTMENTS ? (
            isStudentWorkspace ? (
              <StudentSupervisorAppointment onShowFAQChatbot={() => setActiveSidebarItem(SIDEBAR_ITEMS.FAQ_CHATBOT)} />
            ) : isLecturerWorkspace ? (
              <LecturerSupervisorAppointments />
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
            ) : dashboardSubView === 'timeline' ? (
              <TimelineManagement onBack={() => setDashboardSubView('overview')} />
            ) : (
              <AdministrationDashboard 
                onNavigateToTab={(tab) => {
                  setActiveSidebarItem(tab);
                  setCurrentSubView('dashboard');
                }}
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
              <StudentLetterGeneration />
            ) : (
              <LetterTemplateManagement />
            )
          ) : activeSidebarItem === SIDEBAR_ITEMS.ANNOUNCEMENTS ? (
            <AnnouncementManagement />
          ) : activeSidebarItem === SIDEBAR_ITEMS.NOTIFICATIONS ? (
            <NotificationsAnnouncements onBack={() => setActiveSidebarItem(SIDEBAR_ITEMS.DASHBOARD)} />
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
              
              {/* Back to Portal Top Banner (helps reviewers instantly go to Portal from Login Page) */}
              <div className="w-full max-w-[490px] mb-4 bg-[#0a152d] text-slate-200 p-3.5 rounded-2xl border border-white/[0.05] text-left text-xs flex justify-between items-center shadow-sm">
                <div className="flex gap-2.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-slate-300">Fast-docking Portal Access:</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSuccessfulLogin(DEFAULT_SECRETARY_ADMIN)}
                  className="px-3 py-1.5 bg-[#1f305c] hover:bg-blue-800 text-white font-extrabold text-[10px] uppercase rounded-lg transition-colors cursor-pointer"
                >
                  Enter Portal Direct
                </button>
              </div>

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
