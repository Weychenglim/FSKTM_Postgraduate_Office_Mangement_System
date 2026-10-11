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
import { PageHeader, PortalButton, PortalConfirmModal, PortalToast, SegmentedControl, StatusBadge, StatusDot } from './PortalPrimitives';
import { StatCard } from './StatCard';
import { describeProgramme } from '../utils/programmeLabel';
import { LoadingState, ErrorState } from './StateViews';
import { StaffLecturersRegistry, RegistryModuleTabs } from './StaffLecturersRegistry';
import {
  ImportPreviewRow,
  RegistryImportBatch,
  StudentAcademicStatus,
  StudentAccountStatus,
  StudentRecord,
} from '../types';
import type { StudentRecordUpdate } from '../services';
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
import {
  describeBlockers,
  distinctValues,
  studentStatusOptions,
  summariseRegistry,
} from '../utils/registryStatus';

const NO_SUPERVISOR = '__none__';
const ACADEMIC_STATUSES: StudentAcademicStatus[] = ['Active', 'Deferred', 'Graduated', 'Withdrawn'];
import { PROGRAMME_OPTIONS, normaliseProgramme } from '../constants/programmes';
import { CSV_HEADERS, CSV_TEMPLATE, reviewedFileName, rowsToCsv } from '../utils/csvImport';
import { downloadCsv } from '../utils/csvExport';
import { pageWindow } from '../utils/pageWindow';

const IMPORT_COLUMN_RULES: Record<typeof CSV_HEADERS[number], string> = {
  student_id: 'Matric number, unique',
  full_name: "Student's full name",
  programme: 'An approved programme',
  email: 'Valid email, unique',
  phone: 'Optional',
};

// ==================== COMPONENT PATTERNS TYPES ====================

const REGISTER_TABS = ['bulk', 'single'] as const;
type RegisterTab = (typeof REGISTER_TABS)[number];

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

// Each programme keeps its own colour wherever it appears.
const PROGRAMME_TONES: Array<[RegExp, string]> = [
  [/data science/i, 'bg-amber-50 text-amber-600 border-amber-100'],
  [/cyber/i, 'bg-emerald-50 text-emerald-600 border-emerald-100'],
  [/artificial intelligence/i, 'bg-violet-50 text-violet-600 border-violet-100'],
  [/computer science/i, 'bg-blue-50 text-blue-600 border-blue-100'],
  [/software/i, 'bg-indigo-50 text-indigo-600 border-indigo-100'],
  [/information systems?/i, 'bg-purple-50 text-purple-600 border-purple-100'],
];

export const ProgrammeChip: React.FC<ProgrammeChipProps> = ({ label }) => {
  const { field, detail } = describeProgramme(label);
  const tone = PROGRAMME_TONES.find(([pattern]) => pattern.test(label))?.[1] ?? 'bg-slate-50 text-slate-500 border-slate-200';

  return (
    <div className="flex items-center gap-2.5 text-left select-none" title={label}>
      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${tone}`}>
        <GraduationCap className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-extrabold text-brand-navy leading-snug">{field}</p>
        {detail && <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{detail}</p>}
      </div>
    </div>
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
  readOnly?: boolean;
  onOpenParticipantLifecycle?: () => void;
}

export const StudentRegistry: React.FC<StudentRegistryProps> = ({
  readOnly = false,
  onOpenParticipantLifecycle,
}) => {
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
      .catch((e) => {
        // Drop the previous list so the summary cards and Export never present
        // stale numbers as current.
        setStudents([]);
        setError(e instanceof Error ? e.message : 'Failed to load students.');
      })
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
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('All');
  
  // Modals Dialog States
  const [viewingStudent, setViewingStudent] = useState<StudentRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Single Student Registration Manual fields with updated layout fields from mockup
  const [manualFormData, setManualFormData] = useState({
    name: '',
    id: '',
    email: '',
    phone: '',
    programme: 'Select registered programme',
    intakeBatch: '',
    semester: '',
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
    id: '',
    phone: ''
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

  const [detailsDraft, setDetailsDraft] = useState({ phone: '', programme: '', intakeDate: '', semester: '' });
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  // Sign-in changes are confirmed first; this holds the pending one.
  const [accessChange, setAccessChange] = useState<StudentAccountStatus | null>(null);

  useEffect(() => {
    setStatusTarget('');
    setStatusReason('');
    setStatusError(null);
    setStatusBlockers([]);
    setDetailsError(null);
    setDetailsDraft({
      phone: viewingStudent?.phone ?? '',
      programme: viewingStudent?.programme ?? '',
      intakeDate: viewingStudent?.intakeDate ?? '',
      semester: viewingStudent?.semester ?? '',
    });
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

  // Only fields that actually changed are sent, so an untouched value (for
  // example a semester shown from the intake) is never written back.
  const handleSaveDetails = async () => {
    if (!viewingStudent) return;
    const student = viewingStudent;
    const changes: StudentRecordUpdate = {};
    if (detailsDraft.phone.trim() !== student.phone) changes.phone = detailsDraft.phone.trim();
    if (detailsDraft.programme !== student.programme) changes.programme = detailsDraft.programme;
    if (detailsDraft.intakeDate.trim() !== student.intakeDate) changes.intakeDate = detailsDraft.intakeDate.trim();
    if (detailsDraft.semester.trim() !== student.semester) changes.semester = detailsDraft.semester.trim();
    if (Object.keys(changes).length === 0) {
      setDetailsError('Nothing has changed yet.');
      return;
    }
    setDetailsSaving(true);
    setDetailsError(null);
    try {
      const updated = await updateStudent(student.id, changes);
      setViewingStudent(updated);
      loadStudents();
      triggerToast(`Saved ${student.name}'s details.`);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Could not save the details.');
    } finally {
      setDetailsSaving(false);
    }
  };

  const handleAccessChange = async () => {
    if (!viewingStudent || !accessChange) return;
    const student = viewingStudent;
    const target = accessChange;
    setSaving(true);
    try {
      const updated = await updateStudent(student.id, { accountStatus: target });
      setViewingStudent(updated);
      loadStudents();
      triggerToast(
        target === 'Suspended'
          ? `${student.name} can no longer sign in, and their open sessions were ended.`
          : `${student.name} can sign in again.`,
      );
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Could not update this account.');
    } finally {
      setSaving(false);
      setAccessChange(null);
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

  // Exports exactly what the filters show. Cells go through downloadCsv, which
  // quotes them and neutralises spreadsheet formulas typed into free-text
  // fields such as a student's phone number.
  const handleExportCSV = () => {
    downloadCsv('FSKTM_Student_Registry_Export.csv', filteredStudents, [
      { header: 'Student ID', value: (s) => s.id },
      { header: 'Full Name', value: (s) => s.name },
      { header: 'Programme', value: (s) => s.programme },
      { header: 'Academic Status', value: (s) => s.academicStatus },
      { header: 'Account Status', value: (s) => s.accountStatus },
      { header: 'Current Semester', value: (s) => s.semester },
      { header: 'Intake', value: (s) => s.intakeDate },
      { header: 'Email', value: (s) => s.email },
      { header: 'Phone', value: (s) => s.phone },
      { header: 'Supervisor', value: (s) => s.supervisor },
      { header: 'Supervisor Staff No', value: (s) => s.supervisorStaffNo },
      { header: 'Activated', value: (s) => (s.activated === false ? 'No' : 'Yes') },
      { header: 'Last Sign-in', value: (s) => s.lastLogin ?? '' },
    ]);
    triggerToast(`Exported ${filteredStudents.length} student record${filteredStudents.length === 1 ? '' : 's'}.`);
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
    let invitationSent: boolean | undefined;
    try {
      const created = await createStudent({
        id: manualFormData.id,
        name: manualFormData.name,
        email: manualFormData.email,
        programme,
        phone: manualFormData.phone,
        semester: manualFormData.semester.trim(),
        intakeDate: manualFormData.intakeBatch,
        academicStatus: 'Active',
        sendInvite: manualFormData.sendCredentialsImmediately,
      });
      invitationSent = created.invitationSent;
    } catch (err) {
      setSaving(false);
      // Duplicate matric / duplicate email arrive here with the backend's wording.
      triggerToast(err instanceof Error ? err.message : 'Could not register the student.');
      return;
    }
    setSaving(false);

    loadStudents();
    setCurrentView('list');
    if (!manualFormData.sendCredentialsImmediately) {
      triggerToast(`Registered "${manualFormData.name}". No activation email was sent; send it from their profile when ready.`);
    } else if (invitationSent === false) {
      triggerToast(`Registered "${manualFormData.name}", but the activation email could not be sent. Use Send Activation Link in their profile.`);
    } else {
      triggerToast(`Registered "${manualFormData.name}" and emailed their activation link.`);
    }

    // Reset manualFormData
    setManualFormData({
      name: '',
      id: '',
      email: '',
      phone: '',
      programme: 'Select registered programme',
      intakeBatch: '',
      semester: '',
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
      id: item.id,
      phone: item.phone
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
            phone: editRowFields.phone.trim(),
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
    downloadCsv(
      reviewedFileName(batch.fileName).replace('-reviewed.csv', '-problems.csv'),
      batch.problems,
      [
        { header: 'line', value: (p) => p.line },
        { header: 'student_id', value: (p) => p.id },
        { header: 'result', value: (p) => p.result },
        { header: 'issue', value: (p) => p.issue },
      ],
    );
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
    const matchesSemester = selectedSemester === 'All' || student.semester === selectedSemester;
    const matchesAcademic = selectedAcademicStatus === 'All' || student.academicStatus === selectedAcademicStatus;
    const matchesSupervisor = selectedSupervisor === 'All'
      || (selectedSupervisor === NO_SUPERVISOR ? !student.supervisor : student.supervisor === selectedSupervisor);

    return matchesSearch && matchesProgramme && matchesSemester && matchesAcademic && matchesSupervisor;
  });

  const summary = summariseRegistry(students);
  const semesterOptions = distinctValues(students.map(s => s.semester));
  const supervisorOptions = distinctValues(students.map(s => s.supervisor));
  const columnCount = 6;

  // Paginated students records
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);

  // After a reload or a status change the list can shrink below the page the
  // office was on; move back to the last real page instead of an empty one.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const displayedStudents = filteredStudents.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  // Render variables for Bulk Indicators
  const readyCsvCount = csvPreviewRecords.filter(r => r.status === 'Ready').length;
  const duplicateCsvCount = csvPreviewRecords.filter(
    r => r.status === 'Duplicate In File' || r.status === 'Already Registered',
  ).length;
  const toFixCsvCount = csvPreviewRecords.length - readyCsvCount - duplicateCsvCount;

  return (
    <div id="student-registry-workspace" className="font-sans text-brand-navy text-xs pb-16 animate-fade-in relative">
      
      <PortalToast message={toastMessage} />

      {registryModuleTab === 'students' ? (
        <>
          {/* ========================================================== */}
          {/* SCREEN A: PRIMARY REGISTRY STUDENT DIRECTORY LIST VIEW */}
          {/* ========================================================== */}
          {currentView === 'list' && (
        <div id="student-registry-directory-list" className="space-y-8">
          <PageHeader
            title="Student Registry"
            subtitle={readOnly ? 'Read-only view of the students in your scope.' : 'Manage student records, registrations and sign-in access.'}
            actions={
              <div className="flex items-center gap-3 select-none">
                <PortalButton onClick={handleExportCSV} variant="secondary" size="md" icon={Download}>
                  Export CSV
                </PortalButton>
                {!readOnly && (
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
                )}
              </div>
            }
          />

          {!readOnly && <RegistryModuleTabs active={registryModuleTab} onChange={setRegistryModuleTab} />}

          {/* ==================== SUMMARY CARDS STATEMENTS GRID ==================== */}
          <div id="student-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Students" value={summary.total.toLocaleString()} caption={readOnly ? 'In your scope' : 'In the registry'} icon={GraduationCap} tone="blue" />
            <StatCard label="Active" value={summary.active.toLocaleString()} caption="Currently studying" icon={UserCheck} tone="green" />
            <StatCard label="Deferred" value={summary.deferred.toLocaleString()} caption="On approved deferment" icon={Calendar} tone="amber" />
            <StatCard label="Graduated / Withdrawn" value={summary.exited.toLocaleString()} caption="No longer studying" icon={UserSquare} tone="slate" />
            <StatCard label="Awaiting Activation" value={summary.awaitingActivation.toLocaleString()} caption="Password not set yet" icon={ShieldAlert} tone="purple" />
          </div>

          {/* ==================== CENTRAL DATATABLE AND FILTERS ==================== */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-3xs">
            
            {/* Filtering Box Controls */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-3 select-none">

              {/* Real-time Search Box */}
              <div className="relative w-full">
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
                <div className="relative max-w-full">
                  <select
                    value={selectedProgramme}
                    onChange={(e) => {
                      setSelectedProgramme(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-10 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 outline-none transition shadow-3xs max-w-full truncate"
                  >
                    <option value="All">Programme: All</option>
                    {PROGRAMME_OPTIONS.map((programme) => (
                      <option key={programme} value={programme}>{programme}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none stroke-[2.5]" />
                </div>

                {/* Selector: Semester */}
                <div className="relative max-w-full">
                  <select
                    value={selectedSemester}
                    onChange={(e) => {
                      setSelectedSemester(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-10 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 outline-none transition shadow-3xs max-w-full truncate"
                  >
                    <option value="All">Semester: All</option>
                    {semesterOptions.map((semester) => (
                      <option key={semester} value={semester}>{semester}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none stroke-[2.5]" />
                </div>

                {/* Selector: Status */}
                <div className="relative max-w-full">
                  <select
                    value={selectedAcademicStatus}
                    onChange={(e) => {
                      setSelectedAcademicStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-10 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 outline-none transition shadow-3xs max-w-full truncate"
                  >
                    <option value="All">Status: All</option>
                    {ACADEMIC_STATUSES.map((academicStatus) => (
                      <option key={academicStatus} value={academicStatus}>{academicStatus}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none stroke-[2.5]" />
                </div>

                {/* Selector: Supervisor */}
                <div className="relative max-w-full">
                  <select
                    value={selectedSupervisor}
                    onChange={(e) => {
                      setSelectedSupervisor(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wide pl-4 pr-10 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 outline-none transition shadow-3xs max-w-full truncate"
                  >
                    <option value="All">Supervisor: All</option>
                    <option value={NO_SUPERVISOR}>No supervisor yet</option>
                    {supervisorOptions.map((supervisor) => (
                      <option key={supervisor} value={supervisor}>{supervisor}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none stroke-[2.5]" />
                </div>

                <PortalButton
                  variant="secondary"
                  size="md"
                  icon={SlidersHorizontal}
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedProgramme('All');
                    setSelectedSemester('All');
                    setSelectedAcademicStatus('All');
                    setSelectedSupervisor('All');
                    setCurrentPage(1);
                    triggerToast('All filters reset.');
                  }}
                >
                  Reset Filters
                </PortalButton>
              </div>
            </div>

            {/* DATATABLE LIST VIEW */}
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="data-thead bg-slate-50 select-none">
                    <th className="data-th">
                      Student Candidate
                    </th>
                    <th className="data-th">
                      Programme
                    </th>
                    <th className="data-th">
                      Supervisor
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
                      <td colSpan={columnCount} className="p-0">
                        <LoadingState message="Loading students…" />
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={columnCount} className="p-0">
                        <ErrorState message={error} onRetry={loadStudents} />
                      </td>
                    </tr>
                  ) : displayedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={columnCount} className="py-12 text-center text-slate-400 font-extrabold select-none">
                        No matching students found. Adjust the search or filters and try again.
                      </td>
                    </tr>
                  ) : (
                    displayedStudents.map((student) => {
                      return (
                        <tr key={student.id} className="data-row">
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

                          <td className="data-td">
                            {student.supervisor ? (
                              <div className="text-left">
                                <span className="text-[11.5px] font-extrabold text-slate-800 block">{student.supervisor}</span>
                                {student.supervisorStaffNo && (
                                  <span className="text-[10px] font-mono font-semibold text-slate-500">{student.supervisorStaffNo}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400">Not assigned</span>
                            )}
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
                              <PortalButton variant="secondary" size="sm" icon={Eye} onClick={() => setViewingStudent(student)}>
                                Inspect
                              </PortalButton>
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
                Showing <strong className="text-slate-800">{filteredStudents.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong className="text-slate-800">
                  {Math.min(safePage * itemsPerPage, filteredStudents.length)}
                </strong>{' '}
                of <strong className="text-slate-800">{filteredStudents.length}</strong> entries{' '}
                <span className="text-slate-400 font-semibold">
                  (Total {summary.total.toLocaleString()} overall)
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5">

                {/* Pagination previous trigger */}
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(Math.max(safePage - 1, 1))}
                  className="p-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Number labels mapping */}
                {pageWindow(safePage, totalPages).map((pNum, index) => {
                  if (pNum === null) {
                    return (
                      <span key={`gap-${index}`} className="px-1 text-[11px] font-black text-slate-400" aria-hidden="true">
                        …
                      </span>
                    );
                  }
                  const matchesCurrent = safePage === pNum;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      aria-label={`Page ${pNum}`}
                      aria-current={matchesCurrent ? 'page' : undefined}
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
                  aria-label="Next page"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))}
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
      {currentView === 'register' && !readOnly && (
        <div id="student-registry-register-view" className="space-y-8 text-left select-none animate-fade-in">
          <PageHeader
            title="Register New Students"
            subtitle="Import students from a CSV or Excel file, or add one student at a time."
            backLabel="Back to Student Registry"
            onBack={() => setCurrentView('list')}
          />

          <SegmentedControl<RegisterTab>
            options={REGISTER_TABS}
            value={registerActiveTab}
            onChange={setRegisterActiveTab}
            labels={{ bulk: 'Bulk Import via CSV', single: 'Single Student Entry' }}
            className="w-fit"
          />

          {/* CONTENT COLUMNS GRID VIEW */}
          <div className={registerActiveTab === 'bulk' ? "grid grid-cols-1 lg:grid-cols-5 gap-6 items-start animate-fade-in" : "w-full animate-fade-in"}>
            
            {/* LEFT ACTIONS AREA FRAME */}
            <div className={registerActiveTab === 'bulk' ? "lg:col-span-3 space-y-6" : "w-full space-y-6"}>

              {/* TAB 1: BULK IMPORT ACTIVE VIEW */}
              {registerActiveTab === 'bulk' && (
                <div className="space-y-6">
                  
                  {/* CSV FILE UPLOAD CARD */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs">
                    <div className="flex items-center justify-between gap-3 mb-4 select-none">
                      <div>
                        <h3 className="section-label">File Upload</h3>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
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
                      role={uploadedFile ? undefined : 'button'}
                      tabIndex={uploadedFile ? undefined : 0}
                      aria-label={uploadedFile ? undefined : 'Choose a CSV or Excel file to import'}
                      onKeyDown={(e) => {
                        if (!uploadedFile && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          triggerFileSelect();
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-8 py-9 transition-all text-center cursor-pointer flex flex-col items-center justify-center relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
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

                      <PortalButton variant="secondary" size="sm" icon={Download} onClick={downloadCsvTemplate} className="self-start sm:self-center">
                        Download CSV Template
                      </PortalButton>
                    </div>

                  </div>

                  {/* IMPORT PREVIEW & VALIDATION SYSTEM LIST CONTAINER */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs">

                    {/* Upper title and verification counters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 select-none">
                      <div>
                        <h3 className="section-label">Import Preview & Validation</h3>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                          Check each row before the accounts are created.
                        </p>
                      </div>

                      {/* VALIDATION OUTPUT PILLS */}
                      <div className="flex flex-wrap items-center gap-1.5">

                        {/* Ready indicator */}
                        <div className="px-2.5 py-1 bg-emerald-50 text-[#00a15c] border border-[#bef5db] font-black text-[10px] uppercase rounded-full tracking-wide flex items-center gap-1 select-none">
                          <CheckCircle className="w-3 h-3" />
                          <span>{readyCsvCount} Ready</span>
                        </div>

                        {/* Rows that need correcting before they can be imported */}
                        <div className={`px-2.5 py-1 font-black text-[10px] uppercase rounded-full tracking-wide flex items-center gap-1 select-none border transition ${
                          toFixCsvCount > 0
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-400 border-slate-150'
                        }`}>
                          <AlertTriangle className="w-3 h-3" />
                          <span>{toFixCsvCount} To Fix</span>
                        </div>

                        {/* Duplicate indicator */}
                        <div className={`px-2.5 py-1 font-black text-[10px] uppercase rounded-full tracking-wide flex items-center gap-1 select-none border transition ${
                          duplicateCsvCount > 0 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-slate-50 text-slate-400 border-slate-150'
                        }`}>
                          <AlertCircle className="w-3 h-3" />
                          <span>{duplicateCsvCount} Duplicate / Registered</span>
                        </div>

                      </div>
                    </div>

                    {/* Parse failures and per-row commit failures */}
                    {csvFatalError && (
                      <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left">
                        <p className="text-[11px] font-black uppercase tracking-wide text-rose-700 mb-1">
                          Import problems
                        </p>
                        <pre className="whitespace-pre-wrap break-words text-[11px] font-semibold text-rose-800">
                          {csvFatalError}
                        </pre>
                      </div>
                    )}

                    {/* PREVIEW DATATABLE MAP */}
                    <div className="border border-slate-150 rounded-xl overflow-hidden mt-2">
                      <table className="data-table">
                        <thead>
                          <tr className="data-thead bg-slate-50 select-none">
                            <th className="data-th">Student ID</th>
                            <th className="data-th">Candidate Name</th>
                            <th className="data-th">Programme</th>
                            <th className="data-th text-center">Validation Status</th>
                            <th className="data-th">Issue</th>
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
                                      aria-label="Email"
                                      placeholder="Email"
                                      value={editRowFields.email}
                                      onChange={(e) => setEditRowFields({ ...editRowFields, email: e.target.value })}
                                      className="w-32 bg-white border border-slate-300 rounded px-1.5 py-1 text-[10.5px] outline-none text-slate-800"
                                    />
                                  </td>
                                  <td className="data-td">
                                    <input
                                      type="text"
                                      aria-label="Phone"
                                      placeholder="Phone (optional)"
                                      value={editRowFields.phone}
                                      onChange={(e) => setEditRowFields({ ...editRowFields, phone: e.target.value })}
                                      className="w-28 bg-white border border-slate-300 rounded px-1.5 py-1 text-[10.5px] outline-none text-slate-800"
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
                                    <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-250 text-[9.5px] font-black rounded-full px-2.5 py-0.5 tracking-wide uppercase select-none">
                                      <AlertCircle className="w-3 h-3" />
                                      <span>{item.status}</span>
                                    </span>
                                  )}
                                </td>

                                <td className="data-td text-[10.5px] font-semibold text-slate-600 max-w-[16rem]">
                                  {item.status === 'Ready' ? '' : item.issue}
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
                      
                      <PortalButton variant="secondary" size="md" onClick={() => setCurrentView('list')}>
                        Cancel
                      </PortalButton>

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

                        <PortalButton
                          variant="primary"
                          size="md"
                          icon={UserCheck}
                          onClick={handleCommitVerifiedCsv}
                          disabled={saving || isProcessingCsv || readyCsvCount === 0}
                        >
                          {saving ? 'Creating accounts…' : `Create ${readyCsvCount} Ready Account${readyCsvCount === 1 ? '' : 's'}`}
                        </PortalButton>

                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* TAB 2: MANUAL SINGLE CANDIDATE ENTRY FORM MATCHING MOCKUP */}
              {registerActiveTab === 'single' && (
                <div id="single-candidate-register-container" className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-3xs space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5 text-brand-navy" />
                    </div>
                    <div>
                      <h2 className="section-label">New Student Registration</h2>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        Enter the student's personal and academic details.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleRegisterManualSubmit} className="space-y-6">
                    
                    {/* PERSONAL INFORMATION SECTION */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                          Personal Information
                        </span>
                        <div className="flex-1 h-[1px] bg-slate-100" />
                      </div>

                      {/* Full Name */}
                      <div className="flex flex-col text-left">
                        <label htmlFor="full-name" className="form-label block">
                          Full Name
                        </label>
                        <input
                          id="full-name"
                          type="text"
                          required
                          placeholder="Enter student's legal full name"
                          value={manualFormData.name}
                          onChange={(e) => setManualFormData({ ...manualFormData, name: e.target.value })}
                          className="form-control form-control-md"
                        />
                      </div>

                      {/* Student ID (Matric No.) & Official Email on a row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Student ID */}
                        <div className="flex flex-col text-left">
                          <label htmlFor="student-id" className="form-label block">
                            Student ID (Matric No.)
                          </label>
                          <input
                            id="student-id"
                            type="text"
                            required
                            placeholder="e.g. WAA21001"
                            value={manualFormData.id}
                            onChange={(e) => setManualFormData({ ...manualFormData, id: e.target.value })}
                            className="form-control form-control-md"
                          />
                        </div>

                        {/* Official Email */}
                        <div className="flex flex-col text-left">
                          <label htmlFor="official-email" className="form-label block">
                            Official Email
                          </label>
                          <input
                            id="official-email"
                            type="email"
                            required
                            placeholder="student@siswa.um.edu.my"
                            value={manualFormData.email}
                            onChange={(e) => setManualFormData({ ...manualFormData, email: e.target.value })}
                            className="form-control form-control-md"
                          />
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div className="flex flex-col text-left">
                        <label htmlFor="phone-number" className="form-label block">
                          Phone Number
                        </label>
                        <input
                          id="phone-number"
                          type="tel"
                          placeholder="+60 1X-XXXXXXX"
                          value={manualFormData.phone}
                          onChange={(e) => setManualFormData({ ...manualFormData, phone: e.target.value })}
                          className="form-control form-control-md"
                        />
                      </div>
                    </div>

                    {/* ACADEMIC INFORMATION SECTION */}
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                          Academic Information
                        </span>
                        <div className="flex-1 h-[1px] bg-slate-100" />
                      </div>

                      {/* Programme Select */}
                      <div className="flex flex-col text-left">
                        <label htmlFor="programme-selection" className="form-label block">
                          Programme
                        </label>
                        <div className="relative">
                          <select
                            id="programme-selection"
                            value={manualFormData.programme}
                            onChange={(e) => setManualFormData({ ...manualFormData, programme: e.target.value })}
                            className="form-control form-control-md appearance-none pr-10 cursor-pointer"
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
                          <label htmlFor="intake-batch" className="form-label block">
                            Intake Batch
                          </label>
                          <input
                            id="intake-batch"
                            type="text"
                            placeholder="e.g. 2023/2024"
                            value={manualFormData.intakeBatch}
                            onChange={(e) => setManualFormData({ ...manualFormData, intakeBatch: e.target.value })}
                            className="form-control form-control-md"
                          />
                        </div>

                        {/* Current Semester */}
                        <div className="flex flex-col text-left">
                          <label htmlFor="current-semester" className="form-label block">
                            Current Semester
                          </label>
                          <input
                            id="current-semester"
                            type="text"
                            list="registry-semester-options"
                            placeholder="e.g. Semester I, 2026/2027 Session"
                            value={manualFormData.semester}
                            onChange={(e) => setManualFormData({ ...manualFormData, semester: e.target.value })}
                            className="form-control form-control-md"
                          />
                          <datalist id="registry-semester-options">
                            {semesterOptions.map((semester) => (
                              <option key={semester} value={semester} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                        Research title and supervisor are recorded later, through the supervisor
                        application and appointment workflow.
                      </p>
                    </div>

                    {/* ACCOUNT SETTINGS SECTION */}
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                          Account Settings
                        </span>
                        <div className="flex-1 h-[1px] bg-slate-100" />
                      </div>

                      {/* Info Box */}
                      <div id="notice-box-credentials" className="bg-[#f0f5ff] border border-[#d0e0ff] text-[#1e3a8a] rounded-2xl p-4 flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed text-left">
                          No password is created. The student receives an activation link and
                          chooses their own password, so no credential is ever sent by email.
                        </p>
                      </div>

                      {/* Send activation link now or later */}
                      <label
                        htmlFor="send-credentials-toggle"
                        className="border border-slate-200 rounded-2xl p-5 flex items-start gap-4 bg-white shadow-3xs cursor-pointer"
                      >
                        <input
                          id="send-credentials-toggle"
                          type="checkbox"
                          checked={manualFormData.sendCredentialsImmediately}
                          onChange={(e) => setManualFormData({
                            ...manualFormData,
                            sendCredentialsImmediately: e.target.checked
                          })}
                          className="mt-0.5 w-4.5 h-4.5 shrink-0 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-left space-y-1">
                          <span className="block text-xs font-extrabold text-slate-900">
                            Send activation link immediately
                          </span>
                          <span className="block text-[11px] text-slate-500 font-medium leading-normal">
                            Email the student a link to set their password. Untick to register
                            the account now and send the link later from their profile.
                          </span>
                        </span>
                      </label>
                    </div>

                    {/* BOTTOM ACTIONS BAR */}
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 select-none">
                      <PortalButton variant="secondary" size="md" onClick={() => setCurrentView('list')}>
                        Cancel
                      </PortalButton>
                      <PortalButton type="submit" variant="primary" size="md" icon={UserPlus} disabled={saving}>
                        {saving ? 'Registering…' : 'Register Student'}
                      </PortalButton>
                    </div>

                  </form>

                </div>
              )}

            </div>

            {/* RIGHT CONTEXTUAL INFO CARDS (40% WIDTH, ONLY FOR BULK TAB) */}
            {registerActiveTab === 'bulk' && (
              <div className="lg:col-span-2 space-y-6">
              
              {/* CARD 1: IMPORT GUIDELINES LIST */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs text-left">
                <div className="flex items-center gap-3 mb-4 select-none">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <h3 className="section-label">Import Guidelines</h3>
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
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs text-left">
                <div className="flex items-center gap-3 mb-4 select-none">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="section-label">Registry Snapshot</h3>
                </div>

                {/* Sub bento items */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  
                  {/* Item 1: Total count */}
                  <div className="bg-blue-50/50 border border-blue-100/75 rounded-2xl p-4 text-left select-none relative overflow-hidden group">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Total Registered</span>
                    <p className="text-2xl font-extrabold text-blue-700 tracking-tight mt-1.5 leading-none">{students.length.toLocaleString()}</p>
                    <div className="absolute right-3 bottom-2 animate-pulse text-blue-500/10">
                      <GraduationCap className="w-8 h-8" />
                    </div>
                  </div>

                  {/* Item 2: Pending count */}
                  <div className="bg-amber-50/50 border border-amber-150/75 rounded-2xl p-4 text-left select-none relative overflow-hidden group">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Awaiting Activation</span>
                    <p className="text-2xl font-extrabold text-amber-700 tracking-tight mt-1.5 leading-none">
                      {students.filter(s => s.activated === false).length.toLocaleString()}
                    </p>
                    <div className="absolute right-3 bottom-2 text-amber-600/15">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                  </div>

                </div>
              </div>

              {/* CARD 3: RECENT IMPORTS METADATA HISTORIES */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs text-left">
                <div className="flex items-center justify-between gap-3 mb-4 select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="section-label">Recent Imports</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllImports(!showAllImports)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold cursor-pointer"
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
              className="bg-white rounded-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto shadow-sm relative z-10 border border-slate-100 flex flex-col font-sans"
            >
              <div className="drawer-header">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h2 className="font-black text-brand-navy text-[15px] tracking-tight">Student Record</h2>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Registry details, edits and sign-in access.
                    </p>
                  </div>
                </div>
                <PortalButton
                  variant="ghost"
                  size="icon"
                  icon={X}
                  aria-label="Close student profile"
                  onClick={() => setViewingStudent(null)}
                />
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
                      Programme
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
                      Current Semester
                    </span>
                    <span className="text-slate-800 font-bold flex items-center gap-1.5 pt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{viewingStudent.semester || '—'}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-450 block mb-1">
                      Intake
                    </span>
                    <span className="text-slate-800 font-bold block pt-0.5">{viewingStudent.intakeDate || '—'}</span>
                  </div>

                  {/* Academic supervisorassigned */}
                  <div>
                    <span className="text-[9.5px] uppercase font-black tracking-wide text-slate-450 block mb-1">
                      Academic Supervisor
                    </span>
                    <span className="text-slate-850 font-black block pt-0.5">
                      {viewingStudent.supervisor || 'Not assigned'}
                      {viewingStudent.supervisorStaffNo && (
                        <span className="font-mono font-semibold text-slate-500 text-[10px] ml-1.5">{viewingStudent.supervisorStaffNo}</span>
                      )}
                    </span>
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
                    <span className="text-slate-700 font-mono font-bold select-all block pt-0.5">{viewingStudent.phone || '—'}</span>
                  </div>

                </div>

                {!readOnly && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-450 block">
                    Edit Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 form-label">
                      Phone
                      <input
                        type="tel"
                        value={detailsDraft.phone}
                        onChange={(e) => setDetailsDraft({ ...detailsDraft, phone: e.target.value })}
                        disabled={detailsSaving}
                        maxLength={32}
                        placeholder="e.g. 012-3456789"
                        className="form-control form-control-sm normal-case tracking-normal"
                      />
                    </label>
                    <label className="flex flex-col gap-1 form-label">
                      Programme
                      <select
                        value={detailsDraft.programme}
                        onChange={(e) => setDetailsDraft({ ...detailsDraft, programme: e.target.value })}
                        disabled={detailsSaving}
                        className="form-control form-control-sm max-w-full truncate normal-case tracking-normal"
                      >
                        {!(PROGRAMME_OPTIONS as readonly string[]).includes(detailsDraft.programme) && (
                          <option value={detailsDraft.programme}>{detailsDraft.programme || 'Not set'}</option>
                        )}
                        {PROGRAMME_OPTIONS.map((programme) => (
                          <option key={programme} value={programme}>{programme}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 form-label">
                      Intake
                      <input
                        type="text"
                        value={detailsDraft.intakeDate}
                        onChange={(e) => setDetailsDraft({ ...detailsDraft, intakeDate: e.target.value })}
                        disabled={detailsSaving}
                        maxLength={32}
                        placeholder="e.g. 2026/2027 Semester I"
                        className="form-control form-control-sm normal-case tracking-normal"
                      />
                    </label>
                    <label className="flex flex-col gap-1 form-label">
                      Current Semester
                      <input
                        type="text"
                        list="registry-semester-options-edit"
                        value={detailsDraft.semester}
                        onChange={(e) => setDetailsDraft({ ...detailsDraft, semester: e.target.value })}
                        disabled={detailsSaving}
                        maxLength={64}
                        placeholder="e.g. Semester I, 2026/2027 Session"
                        className="form-control form-control-sm normal-case tracking-normal"
                      />
                      <datalist id="registry-semester-options-edit">
                        {semesterOptions.map((semester) => (
                          <option key={semester} value={semester} />
                        ))}
                      </datalist>
                    </label>
                  </div>
                  {detailsError && (
                    <p role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-[10.5px] text-rose-700 font-bold">
                      {detailsError}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      disabled={detailsSaving}
                      className="px-4 py-2 bg-slate-900 shadow-3xs text-white uppercase text-[10px] font-black tracking-wide rounded-xl hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {detailsSaving ? 'Saving…' : 'Save Details'}
                    </button>
                  </div>
                </div>
                )}

                {!readOnly && (
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
                        className="form-control form-control-sm"
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
                        className="form-control form-control-sm resize-none"
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
                )}

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-450 block">
                    Account
                  </h4>

                  <div className="space-y-2 text-[10.5px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        viewingStudent.activated === false ? 'bg-amber-100 text-[#ea580c]' : 'bg-emerald-100 text-[#00a15c]'
                      }`}>
                        {viewingStudent.activated === false ? '!' : '✓'}
                      </div>
                      <span className="text-slate-700 font-bold">
                        {viewingStudent.activated === false
                          ? 'Not activated — the student has not set a password yet'
                          : 'Activated'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        viewingStudent.accountStatus === 'Verified' ? 'bg-emerald-100 text-[#00a15c]' : 'bg-amber-100 text-[#ea580c]'
                      }`}>
                        {viewingStudent.accountStatus === 'Verified' ? '✓' : '!'}
                      </div>
                      <span className="text-slate-700 font-bold">
                        {viewingStudent.accountStatus === 'Verified' ? 'Sign-in allowed' : 'Suspended — sign-in blocked'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-4.5 h-4.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">•</div>
                      <span className="text-slate-500 font-semibold">
                        Last sign-in: {viewingStudent.lastLogin ? new Date(viewingStudent.lastLogin).toLocaleString() : 'Never'}
                      </span>
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

                  {!readOnly && viewingStudent.accountStatus === 'Verified' && (
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

                  {/* Suspend or reinstate sign-in, always confirmed first */}
                  {!readOnly && viewingStudent.accountStatus === 'Verified' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setAccessChange('Suspended')}
                      className="px-4 py-2 bg-white border border-rose-200 text-rose-700 uppercase text-[10px] font-black tracking-wide rounded-xl hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                    >
                      Suspend Sign-in
                    </button>
                  )}
                  {!readOnly && viewingStudent.accountStatus === 'Suspended' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setAccessChange('Verified')}
                      className="px-4 py-2 bg-slate-900 shadow-3xs text-white uppercase text-[10px] font-black tracking-wide rounded-xl hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                    >
                      Reinstate Sign-in
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

              <PortalConfirmModal
                isOpen={accessChange !== null}
                title={accessChange === 'Suspended' ? 'Suspend sign-in?' : 'Reinstate sign-in?'}
                message={
                  accessChange === 'Suspended'
                    ? `${viewingStudent.name} will be signed out everywhere and cannot sign in until reinstated.`
                    : `${viewingStudent.name} will be able to sign in again.`
                }
                confirmLabel={accessChange === 'Suspended' ? 'Suspend' : 'Reinstate'}
                tone={accessChange === 'Suspended' ? 'danger' : 'info'}
                isLoading={saving}
                onConfirm={handleAccessChange}
                onCancel={() => setAccessChange(null)}
              />

            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
