/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Download, 
  UserPlus, 
  Search, 
  SlidersHorizontal, 
  Eye, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  UserSquare, 
  UserCheck, 
  GraduationCap, 
  ShieldAlert, 
  ChevronDown,
  Mail,
  Calendar,
  Layers,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  AlertTriangle,
  AlertCircle,
  Edit,
  Trash2,
  CheckCircle,
  MoreVertical,
  Info,
  RefreshCw,
  HelpCircle,
  FileDown
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalButton, PortalToast, StatusBadge, StatusDot } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { StaffLecturersRegistry, RegistryModuleTabs } from './StaffLecturersRegistry';
import {
  ImportPreviewRow,
  RegistryImportBatch,
  StudentAcademicStatus,
  StudentAccountStatus,
  StudentRecord,
} from '../types';
import {
  ApiError,
  commitStudentImport,
  createStudent,
  getParticipant,
  getRecentImports,
  getStudents,
  previewStudentImport,
  sendAccessLink,
  updateStudent,
} from '../services';
import { describeBlockers, studentStatusOptions } from '../utils/registryStatus';
import { PROGRAMME_OPTIONS, normaliseProgramme } from '../constants/programmes';
import { CSV_HEADERS, CSV_TEMPLATE, reviewedFileName, rowsToCsv } from '../utils/csvImport';

const IMPORT_COLUMN_RULES: Record<typeof CSV_HEADERS[number], string> = {
  student_id: 'Matric number, unique',
  full_name: "Student's full name",
  programme: 'An approved programme',
  email: 'Valid email, unique',
  phone: 'Optional',
};

// ==================== COMPONENT PATTERNS TYPES ====================

// Reusable Summary Card component
interface SummaryCardProps {
  title: string;
  value: string | number;
  subtext: string;
  colorClass: string;
  icon: React.ComponentType<any>;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtext, colorClass, icon: Icon }) => {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 flex items-start justify-between relative overflow-hidden transition-all duration-300 hover:shadow-sm group">
      <div className="space-y-1.5 text-left select-none">
        <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 block">
          {title}
        </span>
        <h2 className="text-2xl font-black text-brand-navy tracking-tight font-sans">
          {value}
        </h2>
        <span className="text-[10px] font-bold text-slate-500 block">
          {subtext}
        </span>
      </div>

      <div className={`p-2 rounded-xl border shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

// Reusable Status Chip for Academic Status
interface StatusChipProps {
  status: StudentAcademicStatus;
}

const ACADEMIC_TONE = {
  Active: 'success',
  Graduated: 'info',
  Withdrawn: 'danger',
  Deferred: 'warning',
} as const;

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const tone = ACADEMIC_TONE[status] ?? 'neutral';
  return <StatusBadge tone={tone} dot pulse={status === 'Active'}>{status}</StatusBadge>;
};

// Reusable Programme Chip
interface ProgrammeChipProps {
  label: string;
}

export const ProgrammeChip: React.FC<ProgrammeChipProps> = ({ label }) => {
  let displayColor = 'bg-slate-50 text-slate-600 border-slate-200/80';
  if (label.includes('CS') || label.includes('Science')) {
    displayColor = 'bg-blue-50/50 text-blue-700 border-blue-150';
  } else if (label.includes('SE') || label.includes('Software')) {
    displayColor = 'bg-indigo-50/50 text-indigo-700 border-indigo-150';
  } else if (label.includes('IS') || label.includes('Systems')) {
    displayColor = 'bg-purple-50/50 text-purple-700 border-purple-150';
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 text-[10.5px] font-black rounded border cursor-default select-none ${displayColor}`}>
      {label}
    </span>
  );
};

// Reusable Account Status Indicator
interface AccountStatusIndicatorProps {
  status: StudentAccountStatus;
}

export const AccountStatusIndicator: React.FC<AccountStatusIndicatorProps> = ({ status }) => {
  const dotTone = {
    Verified: 'success',
    Suspended: 'danger',
  } as const;

  return (
    <div className="flex items-center gap-2 select-none">
      <StatusDot tone={dotTone[status]} pulse className="w-2 h-2" />
      <span className="text-slate-700 font-extrabold text-[11.5px]">
        {status}
      </span>
    </div>
  );
};

// Reusable Action Button
interface ActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  title: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon: Icon, title }) => {
  return (
    <PortalButton
      onClick={onClick}
      icon={Icon}
      size="icon"
      variant="ghost"
      title={title}
      aria-label={title}
    />
  );
};

interface StudentRegistryProps {
  onOpenParticipantLifecycle?: () => void;
}

export const StudentRegistry: React.FC<StudentRegistryProps> = ({ onOpenParticipantLifecycle }) => {
  // Master Student Registry State — loaded from studentsApi (mock-backed today).
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // True while a write is in flight, so buttons cannot be double-submitted.
  const [saving, setSaving] = useState(false);

  const loadStudents = useCallback(() => {
    setLoading(true);
    setError(null);
    getStudents()
      .then(setStudents)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load students.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Current Screen and View Controls Mode
  // Note: defaulted to 'register' and 'single' as requested so the exact single student entry screen is rendered immediately!
  const [currentView, setCurrentView] = useState<'list' | 'register'>('list');
  const [registerActiveTab, setRegisterActiveTab] = useState<'bulk' | 'single'>('single');
  const [registryModuleTab, setRegistryModuleTab] = useState<'students' | 'staff_lecturers'>('students');

  // Lists Filters States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramme, setSelectedProgramme] = useState<string>('All');
  const [selectedSemester, setSelectedSemester] = useState<string>('All');
  const [selectedAcademicStatus, setSelectedAcademicStatus] = useState<string>('All');
  
  // Modals Dialog States
  const [viewingStudent, setViewingStudent] = useState<StudentRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3; 

  // Multi Selector state
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});

  // Single Student Registration Manual fields with updated layout fields from mockup
  const [manualFormData, setManualFormData] = useState({
    name: '',
    id: '',
    email: '',
    phone: '',
    programme: 'Select registered programme',
    intakeBatch: '',
    semester: 'Semester 1',
    researchTitle: '',
    supervisor: '',
    sendCredentialsImmediately: true
  });

  // Bulk CSV Import Session States
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [rowsEdited, setRowsEdited] = useState(false);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [showRequiredColumns, setShowRequiredColumns] = useState(false);

  // Dynamic CSV preview records
  // Populated only by the server's check of an uploaded file — never pre-seeded,
  // so nothing can be committed that did not come from the office's own file.
  const [csvPreviewRecords, setCsvPreviewRecords] = useState<ImportPreviewRow[]>([]);
  const [csvFatalError, setCsvFatalError] = useState<string | null>(null);

  const [recentImports, setRecentImports] = useState<RegistryImportBatch[]>([]);
  const [recentImportsError, setRecentImportsError] = useState<string | null>(null);
  const [showAllImports, setShowAllImports] = useState(false);

  // Record being edited inside CSV preview list, identified by its file line
  const [editingCsvLine, setEditingCsvLine] = useState<number | null>(null);
  const [editRowFields, setEditRowFields] = useState({
    name: '',
    programme: '',
    email: '',
    id: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Actions trigger helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const [statusTarget, setStatusTarget] = useState<StudentAcademicStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusBlockers, setStatusBlockers] = useState<string[]>([]);

  useEffect(() => {
    setStatusTarget('');
    setStatusReason('');
    setStatusError(null);
    setStatusBlockers([]);
  }, [viewingStudent?.id]);

  const handleStatusChange = async () => {
    if (!viewingStudent || !statusTarget || !statusReason.trim()) return;
    const student = viewingStudent;
    setStatusSaving(true);
    setStatusError(null);
    setStatusBlockers([]);
    try {
      const updated = await updateStudent(student.id, {
        academicStatus: statusTarget,
        statusReason: statusReason.trim(),
      });
      setViewingStudent(updated);
      setStatusTarget('');
      setStatusReason('');
      loadStudents();
      triggerToast(`${student.name} is now ${updated.academicStatus}.`);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Could not change the academic status.');
      if (err instanceof ApiError && err.status === 409) {
        try {
          const record = await getParticipant('STUDENT', student.id);
          setStatusBlockers(describeBlockers({ ...record.blockers }));
        } catch {
          setStatusBlockers([]);
        }
      }
    } finally {
      setStatusSaving(false);
    }
  };

  const [sendingAccessLink, setSendingAccessLink] = useState(false);

  const handleSendAccessLink = async () => {
    if (!viewingStudent) return;
    const student = viewingStudent;
    setSendingAccessLink(true);
    try {
      const result = await sendAccessLink(student.id);
      const link = result.kind === 'activation' ? 'Activation link' : 'Password reset link';
      triggerToast(
        result.sent
          ? `${link} emailed to ${student.email}.`
          : `${link} could not be sent. Check the mail settings and try again.`,
      );
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Could not send the access link.');
    } finally {
      setSendingAccessLink(false);
    }
  };

  // Checkbox multi utility handlers
  const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    const newMapping: Record<string, boolean> = {};
    if (isChecked) {
      filteredStudents.forEach(item => {
        newMapping[item.id] = true;
      });
    }
    setSelectedRowIds(newMapping);
  };

  const handleToggleRow = (id: string) => {
    setSelectedRowIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // CSV Exporter Action Handler
  const handleExportCSV = () => {
    const headers = 'Student ID,Full Name,Programme,Academic Status,Account Status,Semester,Email,Phone,Supervisor\n';
    const rows = students.map(s => 
      `"${s.id}","${s.name}","${s.programme}","${s.academicStatus}","${s.accountStatus}","${s.semester}","${s.email}","${s.phone}","${s.supervisor}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FSKTM_Student_Registry_Export.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);

    triggerToast('Student registry database successfully exported as CSV!');
  };

  // Bulk Action: Batch Verify
  const handleBatchVerify = async () => {
    const selectedIds = Object.keys(selectedRowIds).filter(key => selectedRowIds[key]);
    if (selectedIds.length === 0) return;

    setSaving(true);
    const results = await Promise.allSettled(
      selectedIds.map(id => updateStudent(id, { accountStatus: 'Verified' })),
    );
    setSaving(false);

    const saved = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - saved;

    // Reload rather than patching local state, so the table always shows what
    // the database actually holds.
    loadStudents();
    setSelectedRowIds({});

    if (failed === 0) {
      triggerToast(`Successfully verified credentials for ${saved} selected student records!`);
    } else {
      triggerToast(`Verified ${saved} of ${results.length}. ${failed} could not be saved.`);
    }
  };

  // Single Manual Registration Submit handler with robust validation and normalization
  const handleRegisterManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFormData.name || !manualFormData.id || !manualFormData.email) {
      triggerToast('Please fill in all required fields (Name, Student ID, and Email).');
      return;
    }

    // Previously an untouched dropdown silently fell through to a hardcoded
    // default, registering the student on a programme nobody chose.
    const programme = normaliseProgramme(manualFormData.programme);
    if (!programme) {
      triggerToast('Please select the student’s programme.');
      return;
    }

    setSaving(true);
    try {
      await createStudent({
        id: manualFormData.id,
        name: manualFormData.name,
        email: manualFormData.email,
        programme,
        phone: manualFormData.phone,
        semester: manualFormData.semester,
        intakeDate: manualFormData.intakeBatch,
        academicStatus: 'Active',
      });
    } catch (err) {
      setSaving(false);
      // Duplicate matric / duplicate email arrive here with the backend's wording.
      triggerToast(err instanceof Error ? err.message : 'Could not register the student.');
      return;
    }
    setSaving(false);

    loadStudents();
    setCurrentView('list');
    triggerToast(`Registered new student "${manualFormData.name}" successfully!`);

    // Reset manualFormData
    setManualFormData({
      name: '',
      id: '',
      email: '',
      phone: '',
      programme: 'Select registered programme',
      intakeBatch: '',
      semester: 'Semester 1',
      researchTitle: '',
      supervisor: '',
      sendCredentialsImmediately: true
    });
  };

  // CSV Drag and Drop helper actions
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      void previewImportFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      void previewImportFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const loadRecentImports = useCallback((limit: number) => {
    setRecentImportsError(null);
    getRecentImports(limit)
      .then(setRecentImports)
      .catch((err) => setRecentImportsError(err instanceof Error ? err.message : 'Could not load recent imports.'));
  }, []);

  useEffect(() => {
    if (currentView === 'register' && registerActiveTab === 'bulk') {
      loadRecentImports(showAllImports ? 50 : 5);
    }
  }, [currentView, registerActiveTab, showAllImports, loadRecentImports]);

  const clearImport = () => {
    setUploadedFile(null);
    setSourceFile(null);
    setRowsEdited(false);
    setCsvPreviewRecords([]);
    setCsvFatalError(null);
    setEditingCsvLine(null);
  };

  // The server checks the file (CSV or XLSX) and returns each row's status;
  // nothing is created until the reviewer commits.
  const previewImportFile = async (file: File) => {
    setIsProcessingCsv(true);
    setCsvFatalError(null);
    setEditingCsvLine(null);
    try {
      const { rows } = await previewStudentImport(file);
      setCsvPreviewRecords(rows);
      setUploadedFile({ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB` });
      setSourceFile(file);
      setRowsEdited(false);
      const ready = rows.filter(r => r.status === 'Ready').length;
      triggerToast(`Checked ${rows.length} rows — ${ready} ready, ${rows.length - ready} need attention.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'That file could not be read.';
      clearImport();
      setCsvFatalError(message);
      triggerToast(message);
    } finally {
      setIsProcessingCsv(false);
    }
  };

  // Multi edit save handler inside CSV validation table
  const handleStartEditingRow = (item: ImportPreviewRow) => {
    setEditingCsvLine(item.line);
    setEditRowFields({
      name: item.name,
      programme: item.programme,
      email: item.email,
      id: item.id
    });
  };

  const handleSaveEditedRow = async () => {
    if (!editRowFields.name.trim() || !editRowFields.id.trim()) {
      triggerToast('Name and ID are required.');
      return;
    }

    const edited = csvPreviewRecords.map(rec => (
      rec.line !== editingCsvLine
        ? rec
        : {
            ...rec,
            id: editRowFields.id.trim(),
            name: editRowFields.name.trim(),
            programme: editRowFields.programme.trim(),
            email: editRowFields.email.trim(),
          }
    ));

    // The server re-checks the whole edited set, so an edit can never mark a
    // still-invalid row as Ready.
    setIsProcessingCsv(true);
    try {
      const reviewed = new File([rowsToCsv(edited)], reviewedFileName(uploadedFile?.name), { type: 'text/csv' });
      const { rows } = await previewStudentImport(reviewed);
      setCsvPreviewRecords(rows);
      setRowsEdited(true);
      setEditingCsvLine(null);
      triggerToast('Row updated and checked again.');
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Could not check the edited rows.');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  // Creates every Ready row; duplicates are skipped and other problem rows are
  // left out. The server records the run for Recent Imports.
  const handleCommitVerifiedCsv = async () => {
    if (csvPreviewRecords.length === 0) return;
    const file = rowsEdited || !sourceFile
      ? new File([rowsToCsv(csvPreviewRecords)], reviewedFileName(uploadedFile?.name), { type: 'text/csv' })
      : sourceFile;

    setSaving(true);
    setCsvFatalError(null);
    try {
      const { batch, rows } = await commitStudentImport(file);
      loadStudents();
      loadRecentImports(showAllImports ? 50 : 5);

      const emailNote = batch.invitationsFailed > 0
        ? ` ${batch.invitationsFailed} activation email(s) could not be sent — use Send Activation Link on those students.`
        : '';
      const leftOver = rows.filter(r => r.result !== 'created');
      if (leftOver.length === 0) {
        clearImport();
        setCurrentView('list');
        triggerToast(`Created ${batch.created} student accounts.${emailNote}`);
        return;
      }

      // Keep the reviewer here with only the rows that were not created, so
      // they can be corrected and imported again.
      setCsvPreviewRecords(leftOver);
      setRowsEdited(true);
      setCsvFatalError(
        [
          `Created ${batch.created}, skipped ${batch.skipped}, not imported ${batch.failed}.${emailNote}`,
          ...leftOver.map(r => `line ${r.line} (${r.id || 'no id'}): ${r.issue}`),
        ].join('\n'),
      );
      triggerToast(`Created ${batch.created}. ${leftOver.length} row(s) were not imported — see the list below.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The import could not be completed.';
      setCsvFatalError(message);
      triggerToast(message);
    } finally {
      setSaving(false);
    }
  };

  const downloadImportProblems = (batch: RegistryImportBatch) => {
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      'line,student_id,result,issue',
      ...batch.problems.map(p => [p.line, p.id, p.result, p.issue].map(quote).join(',')),
    ].join('\n');
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', reviewedFileName(batch.fileName).replace('-reviewed.csv', '-problems.csv'));
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // CSV template generator downloder
  const downloadCsvTemplate = () => {
    // Generated from the parser's own header list, so the template the office
    // downloads is always the format the importer accepts.
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'FSKTM_Student_Registry_Template.csv');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    triggerToast('Downloaded official student import template.');
  };

  // Filtration logic for main Student Listing
  const filteredStudents = students.filter(student => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = student.name.toLowerCase().includes(searchLower) ||
                          student.id.toLowerCase().includes(searchLower) ||
                          student.email.toLowerCase().includes(searchLower);

    const matchesProgramme = selectedProgramme === 'All' || student.programme === selectedProgramme;
    const matchesSemester = selectedSemester === 'All' || student.semester.includes(selectedSemester);
    const matchesAcademic = selectedAcademicStatus === 'All' || student.academicStatus === selectedAcademicStatus;

    return matchesSearch && matchesProgramme && matchesSemester && matchesAcademic;
  });

  // Calculate dynamic outputs for the overall metrics
  const totalStudentsOverall = 1248 + (students.length - 6);
  const activeStudentsMetric = 982 + (students.length - 6);
  const inactiveStudentsMetric = 145;
  const pendingStudentsMetric = 39 + students.filter(s => s.academicStatus === 'Deferred').length;
  const newThisSemesterMetric = 79 + (students.length - 6);

  // Paginated students records 
  const displayedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;

  // Render variables for Bulk Indicators
  const readyCsvCount = csvPreviewRecords.filter(r => r.status === 'Ready').length;
  const warningCsvCount = csvPreviewRecords.filter(r => r.status === 'Missing Email').length;
  const duplicateCsvCount = csvPreviewRecords.filter(
    r => r.status === 'Duplicate In File' || r.status === 'Already Registered',
  ).length;

  return (
    <div id="student-registry-workspace" className="font-sans text-brand-navy text-xs pb-16 animate-fade-in relative">
      
      <PortalToast message={toastMessage} />

      {registryModuleTab === 'students' ? (
        <>
          {/* ========================================================== */}
          {/* SCREEN A: PRIMARY REGISTRY STUDENT DIRECTORY LIST VIEW */}
          {/* ========================================================== */}
          {currentView === 'list' && (
        <div id="student-registry-directory-list">
          
          <PageHeader
            title="Student Registry"
            subtitle="University Postgraduate Secretariat"
            actions={
              <div className="flex items-center gap-3 select-none">
                <PortalButton onClick={handleExportCSV} variant="secondary" size="md" icon={Download}>
                  Export CSV
                </PortalButton>
                <PortalButton
                  onClick={() => {
                    setCurrentView('register');
                    setRegisterActiveTab('bulk');
                  }}
                  variant="primary"
                  size="md"
                  icon={UserPlus}
                >
                  Register New Students
                </PortalButton>
              </div>
            }
          />

          {/* Module switcher below the heading */}
          <div className="border-b border-slate-200 pb-4 mt-5 mb-8">
            <RegistryModuleTabs active={registryModuleTab} onChange={setRegistryModuleTab} />
          </div>

          {/* ==================== SUMMARY CARDS STATEMENTS GRID ==================== */}
          <div id="student-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <SummaryCard 
              title="Total Students" 
              value={totalStudentsOverall.toLocaleString()} 
              subtext="Registered Enrolled Candidates" 
              colorClass="bg-blue-50/50 text-blue-600 border-blue-100" 
              icon={GraduationCap} 
            />
            <SummaryCard 
              title="Active Students" 
              value={activeStudentsMetric.toLocaleString()} 
              subtext="Current Active Semesters" 
              colorClass="bg-emerald-50/50 text-[#00a15c] border-[#bef5db]" 
              icon={UserCheck} 
            />
            <SummaryCard 
              title="Inactive" 
              value={inactiveStudentsMetric.toLocaleString()} 
              subtext="Graduated / On Leave" 
              colorClass="bg-slate-50 text-slate-500 border-slate-200" 
              icon={UserSquare} 
            />
            <SummaryCard 
              title="Pending Verification" 
              value={pendingStudentsMetric.toLocaleString()} 
              subtext="Requires Credentials Review" 
              colorClass="bg-amber-50/60 text-[#ea580c] border-[#ffedd5]" 
              icon={ShieldAlert} 
            />
            <SummaryCard 
              title="New This Semester" 
              value={newThisSemesterMetric.toLocaleString()} 
              subtext="Intake Semester 1 2025" 
              colorClass="bg-purple-50/50 text-purple-600 border-purple-100" 
              icon={Sparkles} 
            />
          </div>

          {/* ==================== CENTRAL DATATABLE AND FILTERS ==================== */}
          <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-xs">
            
            {/* Filtering Box Controls */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 select-none">
              
              {/* Real-time Search Box */}
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Search by name, student ID, or contact email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); 
                  }}
                  className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 pl-10 pr-4 py-2.5 rounded-xl placeholder:text-slate-450 outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-3xs"
                />
              </div>

              {/* Dynamic Droplist selectors */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Selector: Programme */}
                <div className="relative">
                  <select
                    value={selectedProgramme}
                    onChange={(e) => {
                      setSelectedProgramme(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-10 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 outline-none transition shadow-3xs"
                  >
                    <option value="All">Programme: All</option>
                    <option value="PhD (CS)">PhD (Computer Science)</option>
                    <option value="Master (SE)">Master (Software Eng.)</option>
                    <option value="PhD (IS)">PhD (Info Systems)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none stroke-[2.5]" />
                </div>

                {/* Selector: Semester */}
                <div className="relative">
                  <select
                    value={selectedSemester}
                    onChange={(e) => {
                      setSelectedSemester(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-10 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 outline-none transition shadow-3xs"
                  >
                    <option value="All">Semester: All</option>
                    <option value="25/2026">Sem 1 2025/2026</option>
                    <option value="24/2025">Sem 2 2024/2025</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none stroke-[2.5]" />
                </div>

                {/* Selector: Status */}
                <div className="relative">
                  <select
                    value={selectedAcademicStatus}
                    onChange={(e) => {
                      setSelectedAcademicStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-10 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 outline-none transition shadow-3xs"
                  >
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Graduated">Graduated</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none stroke-[2.5]" />
                </div>

                {/* Clear Reset button */}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedProgramme('All');
                    setSelectedSemester('All');
                    setSelectedAcademicStatus('All');
                    setCurrentPage(1);
                    setSelectedRowIds({});
                    triggerToast('All filtering properties reset successfully.');
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide rounded-xl hover:bg-slate-50 transition shadow-3xs flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>

            {/* Bulk Action verification Bar */}
            {Object.values(selectedRowIds).some(v => v) && (
              <div className="bg-indigo-50/70 border-b border-indigo-100 p-3.5 flex items-center justify-between text-left select-none animate-fade-in px-6">
                <div className="flex items-center gap-2.5 text-slate-900">
                  <StatusDot tone="info" pulse className="w-2 h-2" />
                  <span className="font-extrabold text-xs">
                    {Object.values(selectedRowIds).filter(v => v).length} student records selected
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBatchVerify}
                    disabled={saving}
                    className="px-4 py-2 bg-brand-navy hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving…' : 'Bulk Authorize Verify'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRowIds({})}
                    className="px-3 py-2 hover:bg-slate-200/50 text-slate-600 rounded-xl text-[10px] font-extrabold uppercase tracking-wide cursor-pointer"
                  >
                    Discard Choice
                  </button>
                </div>
              </div>
            )}

            {/* DATATABLE LIST VIEW */}
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="data-thead bg-slate-50 select-none">
                    <th className="data-th w-12 text-center">
                      <input
                        type="checkbox"
                        onChange={handleToggleAll}
                        checked={filteredStudents.length > 0 && filteredStudents.every(it => selectedRowIds[it.id])}
                        className="rounded text-slate-900 focus:ring-slate-900 cursor-pointer w-4 h-4 accent-slate-900 border-slate-300"
                      />
                    </th>
                    <th className="data-th">
                      Student Candidate
                    </th>
                    <th className="data-th">
                      Programme
                    </th>
                    <th className="data-th text-center">
                      Academic Status
                    </th>
                    <th className="data-th">
                      Account Status
                    </th>
                    <th className="data-th text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <LoadingState message="Loading students…" />
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <ErrorState message={error} onRetry={loadStudents} />
                      </td>
                    </tr>
                  ) : displayedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-extrabold select-none">
                        No registry rows matching the current query. Try redefining your search filters.
                      </td>
                    </tr>
                  ) : (
                    displayedStudents.map((student) => {
                      const isChecked = !!selectedRowIds[student.id];
                      return (
                        <tr
                          key={student.id}
                          className={`data-row ${isChecked ? 'bg-brand-navy/[0.01]' : ''}`}
                        >
                          {/* Selector column */}
                          <td className="data-td w-12 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRow(student.id)}
                              className="rounded text-slate-950 focus:ring-slate-955 cursor-pointer w-4 h-4 accent-slate-900 border-slate-300"
                            />
                          </td>

                          {/* Student identity details */}
                          <td className="data-td">
                            <div className="flex items-center gap-3 text-left">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none border border-black/5 shadow-3xs ${student.avatarBg}`}>
                                {student.avatarText}
                              </div>
                              <div>
                                <h4 className="text-[12.5px] font-black text-brand-navy leading-snug">
                                  {student.name}
                                </h4>
                                <p className="text-[10px] text-slate-550 font-semibold tracking-wide font-mono mt-0.5">
                                  {student.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Programme column */}
                          <td className="data-td">
                            <ProgrammeChip label={student.programme} />
                          </td>

                          {/* Academic status column */}
                          <td className="data-td text-center">
                            <StatusChip status={student.academicStatus} />
                          </td>

                          {/* Account status column */}
                          <td className="data-td">
                            <AccountStatusIndicator status={student.accountStatus} />
                          </td>

                          {/* Action column */}
                          <td className="data-td text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingStudent(student)}
                                className="px-3.5 py-1.5 bg-[#f8fafc] border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-650 font-extrabold text-[10px] uppercase rounded-lg shadow-3xs transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-450" />
                                <span>Inspect</span>
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

            {/* LOWER PORTAL PAGINATION FOOTER */}
            <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
              
              <div className="text-[11px] text-slate-500 font-bold text-left">
                Showing <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong className="text-slate-800">
                  {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
                </strong>{' '}
                of <strong className="text-slate-800">{filteredStudents.length}</strong> entries{' '}
                <span className="text-slate-400 font-semibold">
                  (Total {totalStudentsOverall.toLocaleString()} overall)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                
                {/* Pagination previous trigger */}
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="p-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Number labels mapping */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                  const matchesCurrent = currentPage === pNum;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-8.5 h-8.5 text-[11px] font-black rounded-lg transition flex items-center justify-center cursor-pointer ${
                        matchesCurrent
                          ? 'border border-blue-600 bg-blue-50 text-blue-600 font-extrabold'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {/* Pagination next trigger */}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

              </div>

            </div>

          </div>

        </div>
      )}


      {/* ========================================================== */}
      {/* SCREEN B: REGISTER NEW STUDENTS (CSV IMPORT & MANUAL FORM) */}
      {/* ========================================================== */}
      {currentView === 'register' && (
        <div id="student-registry-register-view" className="text-left select-none animate-fade-in">
          
          <PageHeader
            title="Register New Students"
            subtitle="Secretariat Onboarding Utility"
            backLabel="Back to Student Registry"
            onBack={() => setCurrentView('list')}
            className="mb-6"
          />

          {/* TAB SEGMENT SELECTION - HIGH FIDELITY MOCKUP STYLE */}
          <div className="border-b border-slate-200 pb-4 mb-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRegisterActiveTab('bulk')}
              className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                registerActiveTab === 'bulk' 
                  ? 'bg-[#121c2e] text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Bulk Import via CSV
            </button>
            <button
              type="button"
              onClick={() => setRegisterActiveTab('single')}
              className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                registerActiveTab === 'single' 
                  ? 'bg-[#121c2e] text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Single Student Entry
            </button>
          </div>

          {/* CONTENT COLUMNS GRID VIEW */}
          <div className={registerActiveTab === 'bulk' ? "grid grid-cols-1 lg:grid-cols-5 gap-6 items-start animate-fade-in" : "max-w-4xl mx-auto w-full animate-fade-in"}>
            
            {/* LEFT ACTIONS AREA FRAME */}
            <div className={registerActiveTab === 'bulk' ? "lg:col-span-3 space-y-6" : "w-full space-y-6"}>

              {/* TAB 1: BULK IMPORT ACTIVE VIEW */}
              {registerActiveTab === 'bulk' && (
                <div className="space-y-6">
                  
                  {/* CSV FILE UPLOAD CARD */}
                  <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-3xs">
                    <div className="flex items-center justify-between gap-3 mb-4 select-none">
                      <div>
                        <h3 className="text-sm font-black text-brand-navy">File Upload</h3>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          Drag and drop your student registry CSV or XLSX file below.
                        </p>
                      </div>
                      
                      {/* Live excel icon placeholder */}
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>

                    {/* INTERACTIVE DRAG-DROP REGENCY DASHED */}
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={triggerFileSelect}
                      className={`border-2 border-dashed rounded-2xl p-8 py-9 transition-all text-center cursor-pointer flex flex-col items-center justify-center relative group ${
                        dragActive 
                          ? 'border-indigo-500 bg-indigo-50/30' 
                          : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <input 
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        onChange={(e) => {
                          handleFileChange(e);
                          e.target.value = '';
                        }}
                      />

                      {/* Display files status or drag guidelines */}
                      {isProcessingCsv ? (
                        <div className="space-y-2 py-4">
                          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                          <span className="text-[11px] font-black tracking-wide text-indigo-650 block">Checking the file…</span>
                        </div>
                      ) : uploadedFile ? (
                        <div className="space-y-3 py-2">
                          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 relative shadow-sm">
                            <CheckCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[12px] font-black text-slate-800 block select-all">{uploadedFile.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{uploadedFile.size} • {csvPreviewRecords.length} rows</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearImport();
                              triggerToast('Current file cleared.');
                            }}
                            className="px-3 py-1.5 bg-[#f8fafc] border border-slate-205 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wide transition-colors"
                          >
                            Upload Different File
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 py-2 select-none">
                          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-450 group-hover:scale-105 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition duration-200 flex items-center justify-center mx-auto border border-slate-150">
                            <UploadCloud className="w-5.5 h-5.5" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-800 block group-hover:text-indigo-600 transition">Click to upload or drag and drop</span>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">CSV or XLSX, up to 2 MB and 1,000 students</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* DOWNLOAD ROW & COLUMN DETAILS */}
                    <div className="border-t border-slate-100 mt-5 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                      
                      {/* Collapse required column specifications */}
                      <div className="text-left">
                        <button
                          type="button"
                          onClick={() => setShowRequiredColumns(!showRequiredColumns)}
                          className="text-slate-500 hover:text-slate-800 text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition uppercase tracking-wide"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showRequiredColumns ? 'rotate-180' : ''}`} />
                          <span>Required Columns</span>
                        </button>

                        <AnimatePresence>
                          {showRequiredColumns && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2.5 bg-[#f8fafc] border border-slate-150 rounded-xl p-3 text-[10.5px] text-slate-600 space-y-1 max-w-sm"
                            >
                              <div className="font-bold flex justify-between uppercase text-[9px] text-slate-400 pb-1 border-b border-slate-200/50">
                                <span>Column</span>
                                <span>Rule</span>
                              </div>
                              {CSV_HEADERS.map((header) => (
                                <div key={header} className="flex justify-between font-semibold">
                                  <code className="font-mono text-indigo-600 text-[9.5px]">{header}</code>
                                  <span>{IMPORT_COLUMN_RULES[header]}</span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Download Template button */}
                      <button
                        type="button"
                        onClick={downloadCsvTemplate}
                        className="px-4 py-2 bg-[#f8fafc] border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-[10.5px] uppercase tracking-wide rounded-xl shadow-3xs transition flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-center"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>Download CSV Template</span>
                      </button>
                    </div>

                  </div>

                  {/* IMPORT PREVIEW & VALIDATION SYSTEM LIST CONTAINER */}
                  <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-3xs">
                    
                    {/* Upper title and verification counters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 select-none">
                      <div>
                        <h3 className="text-sm font-black text-brand-navy">Import Preview & Validation</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Verification outcome mapping for staged candidate accounts row matrices.
                        </p>
                      </div>

                      {/* VALIDATION OUTPUT PILLS */}
                      <div className="flex items-center gap-1.5">
                        
                        {/* Ready indicator */}
                        <div className="px-2.5 py-1 bg-emerald-50 text-[#00a15c] border border-[#bef5db] font-black text-[10px] uppercase rounded-full tracking-wide flex items-center gap-1 select-none">
                          <CheckCircle className="w-3 h-3" />
                          <span>{readyCsvCount} Ready</span>
                        </div>

                        {/* Warning Indicator */}
                        <div className={`px-2.5 py-1 font-black text-[10px] uppercase rounded-full tracking-wide flex items-center gap-1 select-none border transition ${
                          warningCsvCount > 0 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' 
                            : 'bg-slate-50 text-slate-400 border-slate-150'
                        }`}>
                          <AlertTriangle className="w-3 h-3" />
                          <span>{warningCsvCount} Warning</span>
                        </div>

                        {/* Duplicate indicator */}
                        <div className={`px-2.5 py-1 font-black text-[10px] uppercase rounded-full tracking-wide flex items-center gap-1 select-none border transition ${
                          duplicateCsvCount > 0 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-slate-50 text-slate-400 border-slate-150'
                        }`}>
                          <AlertCircle className="w-3 h-3" />
                          <span>{duplicateCsvCount} Duplicate</span>
                        </div>

                      </div>

                      {/* Parse failures and per-row commit failures */}
                      {csvFatalError && (
                        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left">
                          <p className="text-[11px] font-black uppercase tracking-wide text-rose-700 mb-1">
                            Import problems
                          </p>
                          <pre className="whitespace-pre-wrap break-words text-[11px] font-semibold text-rose-800">
                            {csvFatalError}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* PREVIEW DATATABLE MAP */}
                    <div className="border border-slate-150 rounded-xl overflow-hidden mt-2">
                      <table className="data-table">
                        <thead>
                          <tr className="data-thead bg-slate-50 select-none">
                            <th className="data-th">Student ID</th>
                            <th className="data-th">Candidate Name</th>
                            <th className="data-th">Programme Mapped</th>
                            <th className="data-th text-center">Validation Status</th>
                            <th className="data-th text-center">Edit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-xs">
                          {csvPreviewRecords.map((item) => {
                            const isBeingEdited = editingCsvLine === item.line;

                            if (isBeingEdited) {
                              return (
                                <tr key={item.line} className="bg-amber-50/60 font-medium">
                                  <td className="data-td">
                                    <input 
                                      type="text" 
                                      value={editRowFields.id}
                                      onChange={(e) => setEditRowFields({ ...editRowFields, id: e.target.value })}
                                      className="w-20 bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] font-mono font-bold outline-none text-slate-800"
                                    />
                                  </td>
                                  <td className="data-td">
                                    <input 
                                      type="text" 
                                      value={editRowFields.name}
                                      onChange={(e) => setEditRowFields({ ...editRowFields, name: e.target.value })}
                                      className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] font-bold outline-none text-slate-800"
                                    />
                                  </td>
                                  <td className="data-td">
                                    <input 
                                      type="text" 
                                      value={editRowFields.programme}
                                      onChange={(e) => setEditRowFields({ ...editRowFields, programme: e.target.value })}
                                      className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-[11px] font-bold outline-none text-slate-800"
                                    />
                                  </td>
                                  <td className="data-td text-center">
                                    <input 
                                      type="text" 
                                      placeholder="Email field (Empty = Warning)"
                                      value={editRowFields.email}
                                      onChange={(e) => setEditRowFields({ ...editRowFields, email: e.target.value })}
                                      className="w-32 bg-white border border-slate-300 rounded px-1.5 py-1 text-[10.5px] outline-none text-slate-800"
                                    />
                                  </td>
                                  <td className="data-td text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={handleSaveEditedRow}
                                        disabled={isProcessingCsv}
                                        className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] uppercase font-bold cursor-pointer disabled:opacity-50"
                                        title="Confirm Changes"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingCsvLine(null)}
                                        className="p-1 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded text-[10px] uppercase font-bold cursor-pointer"
                                        title="Discard Changes"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={item.line} className="hover:bg-slate-50/50 transition">
                                <td className="data-td font-bold font-mono text-slate-600">{item.id}</td>
                                <td className="data-td font-extrabold text-slate-850">{item.name}</td>
                                <td className="data-td font-bold text-slate-500">{item.programme}</td>
                                
                                {/* Status Outcome render badge */}
                                <td className="data-td text-center">
                                  {item.status === 'Ready' && (
                                    <span className="inline-flex items-center gap-1 text-[#00a15c] bg-[#e6fbf2] border border-[#bef5db] text-[9.5px] font-black rounded-full px-2.5 py-0.5 tracking-wide uppercase select-none">
                                      <Check className="w-3 h-3 stroke-[2.5]" />
                                      <span>Ready</span>
                                    </span>
                                  )}
                                  {item.status === 'Missing Email' && (
                                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 text-[9.5px] font-black rounded-full px-2.5 py-0.5 tracking-wide uppercase select-none">
                                      <AlertTriangle className="w-3 h-3 animate-bounce" />
                                      <span>Missing Email</span>
                                    </span>
                                  )}
                                  {item.status !== 'Ready' && item.status !== 'Missing Email' && (
                                    <span
                                      title={item.issue}
                                      className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-250 text-[9.5px] font-black rounded-full px-2.5 py-0.5 tracking-wide uppercase select-none"
                                    >
                                      <AlertCircle className="w-3 h-3" />
                                      <span>{item.status}</span>
                                    </span>
                                  )}
                                </td>

                                {/* Actions pencil trigger */}
                                <td className="data-td text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditingRow(item)}
                                    className="p-1 px-1.5 hover:bg-slate-100 rounded border border-transparent hover:border-slate-205 text-slate-450 hover:text-slate-900 transition-all cursor-pointer"
                                    title="Edit Row"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* BOTTON FORM ACTION CONTROLS */}
                    <div className="flex items-center justify-between mt-6 select-none">
                      
                      {/* Cancel on left */}
                      <button
                        type="button"
                        onClick={() => setCurrentView('list')}
                        className="text-slate-500 hover:text-slate-800 font-extrabold uppercase text-[10.5px] tracking-wider transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>

                      {/* Primary actions on right */}
                      <div className="flex items-center gap-3">
                        
                        {/* Rows with problems are corrected individually via the
                            Edit action on each row. Auto-filling an email or a
                            matric number would attach a real account to the
                            wrong person. */}

                        {csvPreviewRecords.length > readyCsvCount && (
                          <span className="text-[10px] font-semibold text-slate-500 max-w-[220px] text-right">
                            Rows that are not Ready are left out and listed after the import.
                          </span>
                        )}

                        {/* Commit validated records to database */}
                        <button
                          type="button"
                          onClick={handleCommitVerifiedCsv}
                          disabled={saving || isProcessingCsv || readyCsvCount === 0}
                          className="px-5 py-3 bg-brand-navy hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserCheck className="w-4 h-4 text-indigo-300" />
                          <span>
                            {saving ? 'Creating accounts…' : `Create ${readyCsvCount} Ready Account${readyCsvCount === 1 ? '' : 's'}`}
                          </span>
                        </button>

                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* TAB 2: MANUAL SINGLE CANDIDATE ENTRY FORM MATCHING MOCKUP */}
              {registerActiveTab === 'single' && (
                <div id="single-candidate-register-container" className="bg-white border border-[#e2e8f0] rounded-2xl p-6 md:p-8 shadow-3xs">
                  
                  {/* Form card header with UserPlus Icon */}
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700">
                      <UserPlus className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-base font-extrabold text-brand-navy tracking-tight animate-fade-in">
                      New Student Registration
                    </h2>
                  </div>

                  {/* Manual submission entry fields */}
                  <form onSubmit={handleRegisterManualSubmit} className="space-y-8">
                    
                    {/* PERSONAL INFORMATION SECTION */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-slate-500 pb-2 border-b border-slate-150">
                        <UserSquare className="w-4.5 h-4.5 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-650">
                          Personal Information
                        </span>
                      </div>

                      {/* Full Name */}
                      <div className="flex flex-col text-left">
                        <label htmlFor="full-name" className="text-xs font-extrabold text-slate-705 mb-2">
                          Full Name
                        </label>
                        <input
                          id="full-name"
                          type="text"
                          required
                          placeholder="Enter student's legal full name"
                          value={manualFormData.name}
                          onChange={(e) => setManualFormData({ ...manualFormData, name: e.target.value })}
                          className="w-full bg-[#f8fafc] text-slate-900 placeholder-slate-450 text-xs rounded-xl border border-slate-205 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy px-4 py-3.5 outline-none transition font-semibold"
                        />
                      </div>

                      {/* Student ID (Matric No.) & Official Email on a row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Student ID */}
                        <div className="flex flex-col text-left">
                          <label htmlFor="student-id" className="text-xs font-extrabold text-slate-705 mb-2">
                            Student ID (Matric No.)
                          </label>
                          <input
                            id="student-id"
                            type="text"
                            required
                            placeholder="e.g. WAA21001"
                            value={manualFormData.id}
                            onChange={(e) => setManualFormData({ ...manualFormData, id: e.target.value })}
                            className="w-full bg-[#f8fafc] text-slate-900 placeholder-slate-450 text-xs rounded-xl border border-slate-205 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy px-4 py-3.5 outline-none transition font-mono font-bold"
                          />
                        </div>

                        {/* Official Email */}
                        <div className="flex flex-col text-left">
                          <label htmlFor="official-email" className="text-xs font-extrabold text-slate-705 mb-2">
                            Official Email
                          </label>
                          <input
                            id="official-email"
                            type="email"
                            required
                            placeholder="student@siswa.um.edu.my"
                            value={manualFormData.email}
                            onChange={(e) => setManualFormData({ ...manualFormData, email: e.target.value })}
                            className="w-full bg-[#f8fafc] text-slate-900 placeholder-slate-450 text-xs rounded-xl border border-slate-205 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy px-4 py-3.5 outline-none transition font-semibold"
                          />
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div className="flex flex-col text-left">
                        <label htmlFor="phone-number" className="text-xs font-extrabold text-slate-705 mb-2">
                          Phone Number
                        </label>
                        <input
                          id="phone-number"
                          type="tel"
                          placeholder="+60 1X-XXXXXXX"
                          value={manualFormData.phone}
                          onChange={(e) => setManualFormData({ ...manualFormData, phone: e.target.value })}
                          className="w-full bg-[#f8fafc] text-slate-900 placeholder-slate-450 text-xs rounded-xl border border-slate-205 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy px-4 py-3.5 outline-none transition font-semibold"
                        />
                      </div>
                    </div>

                    {/* ACADEMIC INFORMATION SECTION */}
                    <div className="space-y-6 pt-4">
                      <div className="flex items-center gap-2 text-slate-500 pb-2 border-b border-slate-150">
                        <GraduationCap className="w-5 h-5 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-605">
                          Academic Information
                        </span>
                      </div>

                      {/* Programme Select */}
                      <div className="flex flex-col text-left">
                        <label htmlFor="programme-selection" className="text-xs font-extrabold text-slate-705 mb-2">
                          Programme
                        </label>
                        <div className="relative">
                          <select
                            id="programme-selection"
                            value={manualFormData.programme}
                            onChange={(e) => setManualFormData({ ...manualFormData, programme: e.target.value })}
                            className="w-full bg-[#f8fafc] text-slate-800 text-xs rounded-xl border border-slate-205 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy pl-4 pr-10 py-3.5 outline-none transition font-semibold cursor-pointer appearance-none"
                          >
                            <option value="Select registered programme" disabled>Select registered programme</option>
                            {PROGRAMME_OPTIONS.map((programme) => (
                              <option key={programme} value={programme}>{programme}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-405">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Intake Batch & Current Semester */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Intake Batch */}
                        <div className="flex flex-col text-left">
                          <label htmlFor="intake-batch" className="text-xs font-extrabold text-slate-705 mb-2">
                            Intake Batch
                          </label>
                          <input
                            id="intake-batch"
                            type="text"
                            placeholder="e.g. 2023/2024"
                            value={manualFormData.intakeBatch}
                            onChange={(e) => setManualFormData({ ...manualFormData, intakeBatch: e.target.value })}
                            className="w-full bg-[#f8fafc] text-slate-900 placeholder-slate-450 text-xs rounded-xl border border-slate-205 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy px-4 py-3.5 outline-none transition font-semibold"
                          />
                        </div>

                        {/* Current Semester */}
                        <div className="flex flex-col text-left">
                          <label htmlFor="current-semester" className="text-xs font-extrabold text-slate-705 mb-2">
                            Current Semester
                          </label>
                          <div className="relative">
                            <select
                              id="current-semester"
                              value={manualFormData.semester}
                              onChange={(e) => setManualFormData({ ...manualFormData, semester: e.target.value })}
                              className="w-full bg-[#f8fafc] text-slate-800 text-xs rounded-xl border border-slate-205 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy pl-4 pr-10 py-3.5 outline-none transition font-semibold cursor-pointer appearance-none"
                            >
                              <option value="Semester 1">Semester 1</option>
                              <option value="Semester 2">Semester 2</option>
                              <option value="Semester 3">Semester 3</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-405">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Research Title (Optional) */}
                      <div className="flex flex-col text-left">
                        <label htmlFor="research-title" className="text-xs font-extrabold text-slate-750 mb-2">
                          Research Title (Optional)
                        </label>
                        <input
                          id="research-title"
                          type="text"
                          placeholder="Tentative research title..."
                          value={manualFormData.researchTitle}
                          onChange={(e) => setManualFormData({ ...manualFormData, researchTitle: e.target.value })}
                          className="w-full bg-[#f8fafc] text-slate-900 placeholder-slate-455 text-xs rounded-xl border border-slate-205 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy px-4 py-3.5 outline-none transition font-semibold"
                        />
                      </div>

                      {/* Assigned Supervisor (Optional) */}
                      <div className="flex flex-col text-left">
                        <label htmlFor="assigned-supervisor" className="text-xs font-extrabold text-slate-750 mb-2">
                          Assigned Supervisor (Optional)
                        </label>
                        <input
                          id="assigned-supervisor"
                          type="text"
                          placeholder="Search and assign supervisor"
                          value={manualFormData.supervisor}
                          onChange={(e) => setManualFormData({ ...manualFormData, supervisor: e.target.value })}
                          className="w-full bg-[#f8fafc] text-brand-navy placeholder-slate-455 text-xs rounded-xl border border-slate-205 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy px-4 py-3.5 outline-none transition font-semibold"
                        />
                      </div>
                    </div>

                    {/* ACCOUNT SETTINGS SECTION */}
                    <div className="space-y-6 pt-4">
                      <div className="flex items-center gap-2 text-slate-500 pb-2 border-b border-slate-150">
                        <Mail className="w-4.5 h-4.5 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-605">
                          Account Settings
                        </span>
                      </div>

                      {/* Info Box */}
                      <div id="notice-box-credentials" className="bg-[#f0f5ff] border border-[#d0e0ff] text-[#1e3a8a] rounded-2xl p-4 flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed text-left">
                          No password is created. The student receives an activation link and
                          chooses their own password, so no credential is ever sent by email.
                        </p>
                      </div>

                      {/* Send credentials toggle switch */}
                      <div className="border border-slate-200 rounded-2xl p-5 flex items-center justify-between bg-white shadow-3xs">
                        <div className="text-left space-y-1 pr-4">
                          <h4 className="text-xs font-extrabold text-slate-900">
                            Send activation link immediately
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium leading-normal">
                            Email the student a link to set their password. Leave off to register
                            the account now and invite them later.
                          </p>
                        </div>

                        {/* Slide Switch */}
                        <button
                          id="send-credentials-toggle"
                          type="button"
                          onClick={() => setManualFormData({
                            ...manualFormData,
                            sendCredentialsImmediately: !manualFormData.sendCredentialsImmediately
                          })}
                          className={`w-11 h-6 shrink-0 rounded-full transition-colors relative duration-200 ease-in-out focus:outline-none ${
                            manualFormData.sendCredentialsImmediately ? 'bg-blue-600' : 'bg-slate-350'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 shadow-sm ${
                              manualFormData.sendCredentialsImmediately ? 'translate-x-[22px]' : 'translate-x-[2px]'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* BOTTOM ACTIONS BAR */}
                    <div className="border-t border-slate-200 pt-6 flex items-center justify-end gap-3.5 select-none animate-fade-in">
                      {/* Cancel Setup btn */}
                      <button
                        type="button"
                        onClick={() => setCurrentView('list')}
                        className="px-5 py-3 text-slate-550 hover:text-brand-navy font-extrabold uppercase text-xs tracking-wider transition-colors cursor-pointer rounded-xl hover:bg-slate-50 font-sans"
                      >
                        Cancel
                      </button>

                      {/* Register Submit btn */}
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3.5 bg-brand-navy hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm hover:shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-2 font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <UserPlus className="w-4.5 h-4.5 text-indigo-300" />
                        <span>
                          {saving ? 'Registering…' : 'Register Student and Create Account'}
                        </span>
                      </button>
                    </div>

                  </form>

                </div>
              )}

            </div>

            {/* RIGHT CONTEXTUAL INFO CARDS (40% WIDTH, ONLY FOR BULK TAB) */}
            {registerActiveTab === 'bulk' && (
              <div className="lg:col-span-2 space-y-6">
              
              {/* CARD 1: IMPORT GUIDELINES LIST */}
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-3xs text-left">
                <div className="flex items-center gap-2 mb-4 select-none pb-3 border-b border-slate-100">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                    <Info className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider">
                    Import Guidelines
                  </h3>
                </div>

                <div className="space-y-4 text-xs">
                  {[
                    <>Keep the header row <strong className="text-slate-800 font-bold">{CSV_HEADERS.join(', ')}</strong>. The template has the exact layout.</>,
                    <>Programme must be one of the <strong className="text-slate-800 font-bold">approved programmes</strong>; letter case does not matter.</>,
                    <>Matric numbers and emails must be <strong className="text-slate-800 font-bold">unique</strong> in the file and not already registered. Duplicates are skipped and listed.</>,
                    <>Every new student receives an <strong className="text-slate-800 font-bold">activation email</strong> to choose their own password.</>,
                    <>CSV or XLSX, up to <strong className="text-slate-800 font-bold">2 MB and 1,000 students</strong> per import.</>,
                  ].map((guideline, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 select-none font-sans">✓</div>
                      <p className="text-slate-650 font-medium leading-relaxed">{guideline}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 2: CURRENT SEMESTER OVERVIEW CLOCK */}
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-3xs text-left">
                <div className="flex items-center gap-2 mb-4 select-none pb-2 border-b border-slate-100 justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-100">
                      <Layers className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider">
                      Registry Snapshot
                    </h3>
                  </div>
                </div>

                {/* Sub bento items */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  
                  {/* Item 1: Total count */}
                  <div className="bg-blue-50/50 border border-blue-100/75 rounded-2xl p-4 text-left select-none relative overflow-hidden group">
                    <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wide">Total Registered</span>
                    <h3 className="text-2xl font-black text-blue-700 tracking-tight font-sans mt-1">{students.length.toLocaleString()}</h3>
                    <div className="absolute right-3 bottom-2 animate-pulse text-blue-500/10">
                      <GraduationCap className="w-8 h-8" />
                    </div>
                  </div>

                  {/* Item 2: Pending count */}
                  <div className="bg-amber-50/50 border border-amber-150/75 rounded-2xl p-4 text-left select-none relative overflow-hidden group">
                    <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wide">Awaiting Activation</span>
                    <h3 className="text-2xl font-black text-amber-700 tracking-tight font-sans mt-1">
                      {students.filter(s => s.activated === false).length.toLocaleString()}
                    </h3>
                    <div className="absolute right-3 bottom-2 text-amber-600/15">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                  </div>

                </div>
              </div>

              {/* CARD 3: RECENT IMPORTS METADATA HISTORIES */}
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-3xs text-left">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 select-none">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="text-xs font-black text-brand-navy uppercase tracking-wider">
                      Recent Imports
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllImports(!showAllImports)}
                    className="text-blue-600 hover:text-blue-800 text-[10.5px] font-black uppercase tracking-wider"
                  >
                    {showAllImports ? 'Show Recent' : 'View All'}
                  </button>
                </div>

                <div className="space-y-3">
                  {recentImportsError && (
                    <p className="text-[10.5px] font-semibold text-rose-600">{recentImportsError}</p>
                  )}
                  {!recentImportsError && recentImports.length === 0 && (
                    <p className="text-[10.5px] font-semibold text-slate-400">No imports yet.</p>
                  )}
                  {recentImports.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-3 bg-[#f8fafc] border border-slate-200/50 rounded-xl flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-extrabold text-brand-navy text-[11px] block truncate select-all" title={batch.fileName}>
                            {batch.fileName}
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5">
                            {new Date(batch.createdAt).toLocaleDateString()} • {batch.created} created, {batch.skipped} skipped, {batch.failed} not imported
                          </span>
                          {batch.uploadedBy && (
                            <span className="text-[9.5px] text-slate-400 font-semibold block">by {batch.uploadedBy}</span>
                          )}
                        </div>
                      </div>

                      {batch.problems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadImportProblems(batch)}
                          className="p-1 px-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-brand-navy transition cursor-pointer shrink-0"
                          title="Download the rows that need attention"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
            )}

          </div>

        </div>
      )}
        </>
      ) : (
        <StaffLecturersRegistry
          registryTab={registryModuleTab}
          onRegistryTabChange={setRegistryModuleTab}
        />
      )}

      {/* ========================================================== */}
      {/* MODAL DETAILED OVERLAY: VIEW PROFILE DETAILS (EYE TRIGGER) */}
      {/* ========================================================== */}
      {createPortal(
        <AnimatePresence>
        {viewingStudent && (
          <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-left animate-fade-in">
            <div className="absolute inset-0" onClick={() => setViewingStudent(null)} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-sm relative z-10 border border-slate-100 flex flex-col font-sans"
            >
              {/* Header block */}
              <div className="bg-[#121c2e] p-6 text-white flex items-center justify-between select-none">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">
                      Student Document Record
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Reference verification ID logs
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setViewingStudent(null)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Core student details body */}
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Header Profile element with initials */}
                <div className="flex items-center gap-4 py-3 border-b border-slate-100">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-extrabold shadow-3xs select-none ${viewingStudent.avatarBg}`}>
                    {viewingStudent.avatarText}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-slate-800 leading-snug">{viewingStudent.name}</h3>
                    <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">{viewingStudent.id}</p>
                  </div>
                </div>

                {/* Information Attributes Grid */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs font-sans font-bold">
                  
                  {/* Programe Mapped */}
                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-400 block mb-1">
                      Programme Mapped
                    </span>
                    <ProgrammeChip label={viewingStudent.programme} />
                  </div>

                  {/* Academic Status checks */}
                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-450 block mb-1">
                      Academic Status
                    </span>
                    <StatusChip status={viewingStudent.academicStatus} />
                  </div>

                  {/* Semester details */}
                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-450 block mb-1">
                      Admission Intake
                    </span>
                    <span className="text-slate-800 font-bold flex items-center gap-1.5 pt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{viewingStudent.semester}</span>
                    </span>
                  </div>

                  {/* Academic supervisorassigned */}
                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-450 block mb-1">
                      Academic Supervisor
                    </span>
                    <span className="text-slate-850 font-black block pt-0.5">{viewingStudent.supervisor}</span>
                  </div>

                  {/* Contact Email */}
                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-455 block mb-1">
                      Administrative Email
                    </span>
                    <span className="text-blue-600 font-bold hover:underline select-all flex items-center gap-1.5 break-all pt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{viewingStudent.email}</span>
                    </span>
                  </div>

                  {/* Mobile phone Contact */}
                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-455 block mb-1">
                      Direct Mobile Contact
                    </span>
                    <span className="text-slate-700 font-mono font-bold select-all block pt-0.5">{viewingStudent.phone}</span>
                  </div>

                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-450 block">
                    Change Academic Status
                  </h4>
                  {studentStatusOptions(viewingStudent.academicStatus).length === 0 ? (
                    <p className="text-[10.5px] text-slate-500 font-bold">
                      {viewingStudent.academicStatus} is a final status. No further changes are available.
                    </p>
                  ) : (
                    <>
                      <select
                        value={statusTarget}
                        onChange={(e) => setStatusTarget(e.target.value as StudentAcademicStatus | '')}
                        disabled={statusSaving}
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-400"
                      >
                        <option value="">Select new status</option>
                        {studentStatusOptions(viewingStudent.academicStatus).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <textarea
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        disabled={statusSaving}
                        rows={2}
                        maxLength={1000}
                        placeholder="Reason for the change (required)"
                        className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-blue-400"
                      />
                      {statusError && (
                        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-[10.5px] text-rose-700 font-bold space-y-1.5">
                          <p>{statusError}</p>
                          {statusBlockers.length > 0 && (
                            <ul className="list-disc pl-4 font-semibold">
                              {statusBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                            </ul>
                          )}
                          {statusBlockers.length > 0 && onOpenParticipantLifecycle && (
                            <button
                              type="button"
                              onClick={onOpenParticipantLifecycle}
                              className="underline font-black text-rose-800 cursor-pointer"
                            >
                              Resolve in Participant Lifecycle
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleStatusChange}
                          disabled={statusSaving || !statusTarget || !statusReason.trim()}
                          className="px-4 py-2 bg-slate-900 shadow-3xs text-white uppercase text-[10px] font-black tracking-wide rounded-xl hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {statusSaving ? 'Saving…' : 'Apply Status Change'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Verification checklists timelines */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-450 block">
                    Secured Verification Milestones
                  </h4>

                  <div className="space-y-2 text-[10.5px]">
                    <div className="flex items-center gap-2">
                      <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-[#00a15c] flex items-center justify-center text-[10px] font-bold">✓</div>
                      <span className="text-slate-700 font-bold">Postgraduate Portal Account Created - {viewingStudent.intakeDate}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        viewingStudent.accountStatus === 'Verified' 
                          ? 'bg-emerald-100 text-[#00a15c]' 
                          : 'bg-amber-100 text-[#ea580c]'
                      }`}>
                        {viewingStudent.accountStatus === 'Verified' ? '✓' : '!'}
                      </div>
                      <span className={`font-bold ${viewingStudent.accountStatus === 'Verified' ? 'text-slate-700' : 'text-amber-700 font-extrabold'}`}>
                        {viewingStudent.accountStatus === 'Verified' 
                          ? 'Credentials Review Verified by Wey Cheng' 
                          : 'Pending Document Authentications'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        viewingStudent.academicStatus === 'Graduated' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {viewingStudent.academicStatus === 'Graduated' ? '✓' : '•'}
                      </div>
                      <span className="text-slate-500">Graduation Thesis Submission Logged</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* footer buttons modal */}
              <div className="bg-slate-50/80 px-6 py-4.5 border-t border-slate-200/60 flex items-center justify-between text-xs select-none">
                <span className="text-[10px] text-slate-450 font-bold">
                  Credentials status: <strong className="text-slate-700 font-extrabold uppercase">{viewingStudent.accountStatus}</strong>
                </span>

                <div className="flex gap-2">

                  {viewingStudent.accountStatus === 'Verified' && (
                    <button
                      type="button"
                      disabled={sendingAccessLink}
                      onClick={handleSendAccessLink}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 uppercase text-[10px] font-black tracking-wide rounded-xl hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingAccessLink
                        ? 'Sending…'
                        : viewingStudent.activated === false
                          ? 'Send Activation Link'
                          : 'Send Reset Link'}
                    </button>
                  )}

                  {/* Reinstate a suspended account */}
                  {viewingStudent.accountStatus === 'Suspended' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        const student = viewingStudent;
                        setSaving(true);
                        try {
                          await updateStudent(student.id, { accountStatus: 'Verified' });
                        } catch (err) {
                          setSaving(false);
                          triggerToast(
                            err instanceof Error ? err.message : 'Could not update this account.',
                          );
                          return;
                        }
                        setSaving(false);
                        loadStudents();
                        setViewingStudent(null);
                        triggerToast(`Student credentials for ${student.name} verified successfully.`);
                      }}
                      className="px-4 py-2 bg-slate-900 shadow-3xs text-white uppercase text-[10px] font-black tracking-wide rounded-xl hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Authorize Verify'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewingStudent(null)}
                    className="px-4 py-2 bg-slate-200/60 hover:bg-slate-200 text-slate-650 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer"
                  >
                    Close Profile
                  </button>

                </div>
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
