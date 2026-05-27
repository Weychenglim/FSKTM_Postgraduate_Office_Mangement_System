/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  X,
  User,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MarkEntryRecordsProps {
  onBack: () => void;
  onViewRecordDetail?: (recordId: string) => void;
}

interface MarkRecord {
  id: string; // Record ID e.g. MRK-2025-021
  studentId: string;
  studentName: string;
  studentInitials: string;
  researchTitle: string;
  panelMember: string;
  semester: string;
  programme: string;
  totalMark: number | null | 'Draft'; // numeric, 'Draft' if draft, or null
  status: 'Submitted' | 'Draft' | 'Not Started' | 'Overdue' | 'Closed';
  submittedDate: string; // "12 Dec 2025" or "-"
  rubricScores?: Record<string, number>;
}

export const MarkEntryRecords: React.FC<MarkEntryRecordsProps> = ({ onBack, onViewRecordDetail }) => {
  // Mock dataset matching screenshot's exact records + rich dataset for search/filter and pagination demos
  const [records, setRecords] = useState<MarkRecord[]>([
    {
      id: 'MRK-2025-021',
      studentId: 'MEA2400712',
      studentName: 'Nur Aina Rahman',
      studentInitials: 'NR',
      researchTitle: 'Blockchain-Based Academic Record Verification System',
      panelMember: 'Dr. Sarah Lim',
      semester: 'Sem 1 2025/2026',
      programme: 'Master of Software Engineering',
      totalMark: 84,
      status: 'Submitted',
      submittedDate: '12 Dec 2025',
      rubricScores: { 'Proposal': 18, 'Literature Review': 17, 'Methodology': 21, 'System Build': 16, 'Viva': 12 }
    },
    {
      id: 'MRK-2025-018',
      studentId: 'MEA2401023',
      studentName: 'Farah Nabila',
      studentInitials: 'FN',
      researchTitle: 'Mobile Learning Adoption in Higher Education: A Malaysian Case Study',
      panelMember: 'Dr. Robert Chen',
      semester: 'Sem 1 2025/2026',
      programme: 'Master of Information Technology',
      totalMark: 79,
      status: 'Submitted',
      submittedDate: '13 Dec 2025',
      rubricScores: { 'Proposal': 16, 'Literature Review': 16, 'Methodology': 20, 'System Build': 15, 'Viva': 12 }
    },
    {
      id: 'MRK-2025-014',
      studentId: 'MEA2302199',
      studentName: 'Jason Lee',
      studentInitials: 'JL',
      researchTitle: 'Quantum Computing Algorithms in Cryptography & Cybersecurity',
      panelMember: 'Assoc. Prof. Dr. Amina Malik',
      semester: 'Sem 1 2025/2026',
      programme: 'Master of Computer Science',
      totalMark: 'Draft',
      status: 'Draft',
      submittedDate: '-',
      rubricScores: { 'Proposal': 14, 'Literature Review': 15, 'Methodology': 18 }
    },
    {
      id: 'MRK-2025-011',
      studentId: 'MEA2301184',
      studentName: 'Sarah Natasha',
      studentInitials: 'SN',
      researchTitle: 'Blockchain-Based Verification Framework for Academic Credentials',
      panelMember: 'Dr. Sarah Lim',
      semester: 'Sem 1 2025/2026',
      programme: 'Master of Computer Science',
      totalMark: null,
      status: 'Not Started',
      submittedDate: '-'
    },
    {
      id: 'MRK-2025-009',
      studentId: 'MEA2400881',
      studentName: 'Kumar Raj',
      studentInitials: 'KR',
      researchTitle: 'Cloud-Based Research Document Management for Multi-University Collaboration',
      panelMember: 'Dr. Robert Chen',
      semester: 'Sem 1 2025/2026',
      programme: 'Master of Computer Science',
      totalMark: null,
      status: 'Overdue',
      submittedDate: '-'
    },
    // Extra demonstration records to paginate up to 10 and show query strength
    {
      id: 'MRK-2025-008',
      studentId: 'MEA2400211',
      studentName: 'Abdul Rahman Malik',
      studentInitials: 'AM',
      researchTitle: 'Internet of Things (IoT) Based Flood Defense Alert Mechanisms',
      panelMember: 'Dr. Sarah Lim',
      semester: 'Sem 1 2025/2026',
      programme: 'Master of Information Technology',
      totalMark: 91,
      status: 'Submitted',
      submittedDate: '10 Dec 2025',
      rubricScores: { 'Proposal': 19, 'Literature Review': 19, 'Methodology': 23, 'System Build': 18, 'Viva': 12 }
    },
    {
      id: 'MRK-2025-007',
      studentId: 'MEA2304910',
      studentName: 'Clara Wong',
      studentInitials: 'CW',
      researchTitle: 'Predictive Medical Diagnostics Using Deep Convoluted Neural Networks',
      panelMember: 'Assoc. Prof. Dr. Amina Malik',
      semester: 'Sem 1 2025/2026',
      programme: 'Master of Software Engineering',
      totalMark: 'Draft',
      status: 'Draft',
      submittedDate: '-'
    },
    {
      id: 'MRK-2025-006',
      studentId: 'MEA2401123',
      studentName: 'Zainab Qureshi',
      studentInitials: 'ZQ',
      researchTitle: 'Interactive Arabic Sign Language Translation Engine with Haptic Feedback',
      panelMember: 'Dr. Robert Chen',
      semester: 'Sem 2 2024/2025',
      programme: 'Master of Information Technology',
      totalMark: 88,
      status: 'Closed',
      submittedDate: '15 Jun 2025'
    }
  ]);

  // Form Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('All Programmes');
  const [semesterFilter, setSemesterFilter] = useState('Sem 1 2025/2026');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [panelFilter, setPanelFilter] = useState('All Members');

  // Interactive pill filter selection mapping directly to Status Pill Buttons
  const [activeTab, setActiveTab] = useState<'All Records' | 'Submitted' | 'Draft Saved' | 'Not Started' | 'Overdue' | 'Closed'>('All Records');

  // Modal inspection target
  const [selectedInspectRecord, setSelectedInspectRecord] = useState<MarkRecord | null>(null);

  // Active query parameters (applied on clicking 'Apply Filters')
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    programme: 'All Programmes',
    semester: 'Sem 1 2025/2026',
    status: 'All Statuses',
    panelMember: 'All Members',
  });

  // Current page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Notification system
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Run Apply filter logic
  const handleApplyFilters = () => {
    setAppliedFilters({
      search: searchQuery,
      programme: programmeFilter,
      semester: semesterFilter,
      status: statusFilter,
      panelMember: panelFilter
    });
    setCurrentPage(1);
    triggerToast("Record filters applied successfully.");
  };

  // Calculated Stats
  const totalRecordCount = 48; // Preserving values from layout screenshot
  const submittedCount = 32;
  const draftSavedCount = 6;
  const notStartedCount = 8;

  // Derived filtered dataset matching active constraints
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // 1. Text Search matching student name, student ID, panel member, or research title
      const searchText = appliedFilters.search.toLowerCase();
      if (searchText) {
        const matchesStudentName = rec.studentName.toLowerCase().includes(searchText);
        const matchesStudentID = rec.studentId.toLowerCase().includes(searchText);
        const matchesPanel = rec.panelMember.toLowerCase().includes(searchText);
        const matchesTitle = rec.researchTitle.toLowerCase().includes(searchText);
        if (!matchesStudentName && !matchesStudentID && !matchesPanel && !matchesTitle) {
          return false;
        }
      }

      // 2. Programme filter
      if (appliedFilters.programme !== 'All Programmes' && rec.programme !== appliedFilters.programme) {
        return false;
      }

      // 3. Semester filter
      if (appliedFilters.semester !== 'All Semesters' && rec.semester !== appliedFilters.semester) {
        return false;
      }

      // 4. Panel Member filter
      if (appliedFilters.panelMember !== 'All Members' && rec.panelMember !== appliedFilters.panelMember) {
        return false;
      }

      // 5. Status filter (either from select dropdown or status tabs pills)
      // Check active header tabs first
      if (activeTab !== 'All Records') {
        if (activeTab === 'Submitted' && rec.status !== 'Submitted') return false;
        if (activeTab === 'Draft Saved' && rec.status !== 'Draft') return false;
        if (activeTab === 'Not Started' && rec.status !== 'Not Started') return false;
        if (activeTab === 'Overdue' && rec.status !== 'Overdue') return false;
        if (activeTab === 'Closed' && rec.status !== 'Closed') return false;
      } else {
        // Fallback to Status select box filter
        if (appliedFilters.status !== 'All Statuses') {
          if (appliedFilters.status === 'Submitted' && rec.status !== 'Submitted') return false;
          if (appliedFilters.status === 'Draft' && rec.status !== 'Draft') return false;
          if (appliedFilters.status === 'Not Started' && rec.status !== 'Not Started') return false;
          if (appliedFilters.status === 'Overdue' && rec.status !== 'Overdue') return false;
          if (appliedFilters.status === 'Closed' && rec.status !== 'Closed') return false;
        }
      }

      return true;
    });
  }, [records, appliedFilters, activeTab]);

  // Pagination indexing calculations
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleExport = () => {
    triggerToast("Preparing export of postgraduate mark registry logs (PDF/CSV format)...");
  };

  return (
    <div id="mark-entry-records-dashboard" className="space-y-8 animate-fade-in text-left relative">
      
      {/* Dynamic Slide Toast Alerts */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-[#0c1424] text-white py-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold font-sans border border-slate-700"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb back link & Title header */}
      <div id="records-header-block" className="flex flex-col text-left">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider mb-3 cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marks & Evaluation Management</span>
        </button>

        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0c1424] tracking-tight font-sans">
          Mark Entry Records
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1.5 font-medium leading-relaxed font-sans">
          Search and monitor mark entry records by student, panel member, semester, and status.
        </p>
      </div>

      {/* 4 Summary Cards Row with exact look (number text + solid bottom line) */}
      <div id="records-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Records */}
        <div className="bg-white rounded-2xl border border-slate-205 pt-5 pb-6 px-6 relative shadow-xs overflow-hidden flex flex-col justify-between h-[120px]">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Total Records
          </span>
          <span className="text-[#0c1424] font-black text-3xl font-sans tracking-tight block">
            {totalRecordCount}
          </span>
          {/* Bottom solid indicator bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-600" />
        </div>

        {/* Submitted */}
        <div className="bg-white rounded-2xl border border-slate-205 pt-5 pb-6 px-6 relative shadow-xs overflow-hidden flex flex-col justify-between h-[120px]">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Submitted
          </span>
          <span className="text-emerald-500 font-black text-3xl font-sans tracking-tight block">
            {submittedCount}
          </span>
          {/* Bottom solid green line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-500" />
        </div>

        {/* Draft Saved */}
        <div className="bg-white rounded-2xl border border-slate-205 pt-5 pb-6 px-6 relative shadow-xs overflow-hidden flex flex-col justify-between h-[120px]">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Draft Saved
          </span>
          <span className="text-blue-500 font-black text-3xl font-sans tracking-tight block">
            {draftSavedCount}
          </span>
          {/* Bottom solid cyan line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-400" />
        </div>

        {/* Not Started */}
        <div className="bg-white rounded-2xl border border-slate-205 pt-5 pb-6 px-6 relative shadow-xs overflow-hidden flex flex-col justify-between h-[120px]">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Not Started
          </span>
          <span className="text-slate-500 font-black text-3xl font-sans tracking-tight block">
            {notStartedCount}
          </span>
          {/* Bottom solid gray line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-350" />
        </div>

      </div>

      {/* Advanced search and filters container box */}
      <div id="records-filters-card" className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 text-left shadow-[0_4px_20px_rgba(241,245,249,0.3)] space-y-5">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          {/* Search field */}
          <div className="md:col-span-6 flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, ID, panel member, or research title"
                className="w-full text-xs font-medium text-slate-700 bg-slate-50/50 border border-slate-200 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Programme dropdown selector */}
          <div className="md:col-span-3 flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
              Programme
            </label>
            <select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 p-3 rounded-lg focus:outline-none cursor-pointer bg-white"
            >
              <option value="All Programmes">All Programmes</option>
              <option value="Master of Software Engineering">Master of Software Engineering</option>
              <option value="Master of Computer Science">Master of Computer Science</option>
              <option value="Master of Information Technology">Master of Information Technology</option>
            </select>
          </div>

          {/* Semester dropdown selector */}
          <div className="md:col-span-3 flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
              Semester
            </label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 p-3 rounded-lg focus:outline-none cursor-pointer bg-white"
            >
              <option value="Sem 1 2025/2026">Sem 1 2025/2026</option>
              <option value="Sem 2 2024/2025">Sem 2 2024/2025</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end pt-2">
          {/* Status Select dropdown */}
          <div className="md:col-span-4 flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 p-3 rounded-lg focus:outline-none cursor-pointer bg-white"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Draft">Draft Saved</option>
              <option value="Not Started">Not Started</option>
              <option value="Overdue">Overdue</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Panel Member select */}
          <div className="md:col-span-4 flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
              Panel Member
            </label>
            <select
              value={panelFilter}
              onChange={(e) => setPanelFilter(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 p-3 rounded-lg focus:outline-none cursor-pointer bg-white"
            >
              <option value="All Members">All Members</option>
              <option value="Dr. Sarah Lim">Dr. Sarah Lim</option>
              <option value="Dr. Robert Chen">Dr. Robert Chen</option>
              <option value="Assoc. Prof. Dr. Amina Malik">Assoc. Prof. Dr. Amina Malik</option>
            </select>
          </div>

          {/* Core Apply Filters Action Trigger */}
          <div className="md:col-span-4">
            <button
              onClick={handleApplyFilters}
              className="w-full py-3 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase rounded-lg transition-all shadow-sm cursor-pointer select-none"
            >
              Apply Filters
            </button>
          </div>
        </div>

      </div>

      {/* Pill tabs list according to status filter tabs */}
      <div id="records-status-pills-row" className="flex flex-wrap items-center gap-2">
        {([
          { key: 'All Records', label: 'All Records' },
          { key: 'Submitted', label: 'Submitted' },
          { key: 'Draft Saved', label: 'Draft Saved' },
          { key: 'Not Started', label: 'Not Started' },
          { key: 'Overdue', label: 'Overdue' },
          { key: 'Closed', label: 'Closed' }
        ] as const).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-650'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Records Data Table Container */}
      <div id="mark-records-table-container" className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(241,245,249,0.5)] overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider bg-slate-50/30">
                <th className="py-4.5 px-5">Record ID</th>
                <th className="py-4.5 px-5">Student</th>
                <th className="py-4.5 px-5">Research Title</th>
                <th className="py-4.5 px-5">Panel Member</th>
                <th className="py-4.5 px-5">Semester</th>
                <th className="py-4.5 px-5 text-center">Total Mark</th>
                <th className="py-4.5 px-5 text-center">Status</th>
                <th className="py-4.5 px-5 text-center">Submitted Date</th>
                <th className="py-4.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-55/40 transition-colors">
                    
                    {/* Record ID styled code link */}
                    <td className="py-4 px-5 text-xs font-bold text-blue-600 font-mono">
                      <button 
                        onClick={() => onViewRecordDetail ? onViewRecordDetail(rec.id) : setSelectedInspectRecord(rec)}
                        className="hover:underline text-left cursor-pointer focus:outline-none"
                      >
                        {rec.id}
                      </button>
                    </td>

                    {/* Student details with initial circle badge */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100/70 border border-blue-200/50 flex items-center justify-center text-blue-700 text-[10px] font-extrabold shrink-0">
                          {rec.studentInitials}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-extrabold text-blue-900 leading-tight">
                            {rec.studentName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                            {rec.studentId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Thesis title */}
                    <td className="py-4 px-5 text-xs text-slate-500 font-medium max-w-[200px] truncate" title={rec.researchTitle}>
                      {rec.researchTitle}
                    </td>

                    {/* Panel member examiner */}
                    <td className="py-4 px-5 text-xs text-[#0c1424] font-bold">
                      {rec.panelMember}
                    </td>

                    {/* Academic semester */}
                    <td className="py-4 px-5 text-xs text-slate-500 font-medium">
                      {rec.semester}
                    </td>

                    {/* Total Mark weighting */}
                    <td className="py-4 px-5 text-center font-sans">
                      {rec.totalMark === 'Draft' ? (
                        <span className="text-xs font-extrabold text-slate-500 italic block">
                          Draft
                        </span>
                      ) : rec.totalMark !== null ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-black text-[#0c1424]">
                            {rec.totalMark}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            / 100
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs block font-bold">-</span>
                      )}
                    </td>

                    {/* Styled Status badge */}
                    <td className="py-4 px-5 text-center">
                      {rec.status === 'Submitted' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 text-[9px] font-extrabold tracking-wider text-emerald-600 uppercase border border-emerald-100">
                          Submitted
                        </span>
                      ) : rec.status === 'Draft' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-[9px] font-extrabold tracking-wider text-blue-500 uppercase border border-blue-100">
                          Draft Saved
                        </span>
                      ) : rec.status === 'Not Started' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-50 text-[9px] font-extrabold tracking-wider text-slate-500 uppercase border border-slate-200">
                          Not Started
                        </span>
                      ) : rec.status === 'Overdue' ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-rose-50 text-[9px] font-extrabold tracking-wider text-rose-600 uppercase border border-rose-100">
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-[9px] font-extrabold tracking-wider text-gray-600 uppercase border border-gray-200">
                          Closed
                        </span>
                      )}
                    </td>

                    {/* Submitted Date */}
                    <td className="py-4 px-5 text-xs text-slate-500 font-medium text-center">
                      {rec.submittedDate}
                    </td>

                    {/* Row inspection trigger button */}
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => onViewRecordDetail ? onViewRecordDetail(rec.id) : setSelectedInspectRecord(rec)}
                        className="py-1.5 px-3 bg-white hover:bg-slate-50 text-[#0c1424] border border-slate-205 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition duration-150 cursor-pointer shadow-2xs"
                      >
                        View
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs font-bold text-slate-400 font-sans">
                    No matching postgrad evaluation registry records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar block row */}
        <div id="records-pagination-footer" className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium font-sans text-left">
            Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {totalRecordCount} records.
          </span>

          <div className="flex items-center gap-1.5 font-sans">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-black text-white'
                    : 'border border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Global export records command underlay */}
      <div id="global-bulk-export-bar" className="flex justify-end">
        <button
          onClick={handleExport}
          className="px-5 py-3 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition cursor-pointer shadow-md flex items-center gap-2.5 select-none"
        >
          <Download className="w-4 h-4 text-indigo-300" />
          <span>Export Records (PDF/CSV)</span>
        </button>
      </div>

      {/* Modern Administrative Footer layout section */}
      <footer id="records-pannel-footer" className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-medium font-sans">
        <span>&copy; 2024 FSKTM Postgraduate Office. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <button onClick={() => triggerToast("Viewing Privacy Policy details.")} className="hover:text-slate-600">Privacy Policy</button>
          <button onClick={() => triggerToast("Viewing Terms of Service.")} className="hover:text-slate-600">Terms of Service</button>
          <button onClick={() => triggerToast("Opening Secretariat Help desk ticket portal.")} className="hover:text-slate-600">Contact Support</button>
        </div>
      </footer>

      {/* Interactive Modal to drill into evaluation details (View records details rule) */}
      <AnimatePresence>
        {selectedInspectRecord && (
          <div className="fixed inset-0 bg-[#0c1424]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0" onClick={() => setSelectedInspectRecord(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 text-left relative z-10 font-sans"
            >
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4.5 mb-5">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-extrabold text-[#0c1424] text-sm tracking-tight">
                    Evaluation Record Detail — {selectedInspectRecord.id}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedInspectRecord(null)}
                  className="w-10 h-10 hover:bg-slate-50 border border-slate-205 rounded-xl flex items-center justify-center transition-colors text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div id="detail-modal-body" className="space-y-5">
                {/* Visual student profile banner */}
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-black">
                    {selectedInspectRecord.studentInitials}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">{selectedInspectRecord.studentName}</h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium font-mono mt-0.5">
                      <span>ID: {selectedInspectRecord.studentId}</span>
                      <span>&bull;</span>
                      <span>{selectedInspectRecord.programme}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">
                      Assigned Panel
                    </span>
                    <span className="font-extrabold text-[#0c1424]">
                      {selectedInspectRecord.panelMember}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1">
                      Grading Session
                    </span>
                    <span className="font-bold text-slate-700">
                      {selectedInspectRecord.semester}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-extrabold uppercase tracking-wide block mb-1 text-xs">
                    Research Topic Title
                  </span>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed italic border-l-3 border-indigo-400 pl-3">
                    {selectedInspectRecord.researchTitle}
                  </p>
                </div>

                {/* Score Breakdown display if submitted or draft */}
                {selectedInspectRecord.status !== 'Not Started' && selectedInspectRecord.status !== 'Overdue' ? (
                  <div className="space-y-3.5 border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                      Rubric Components Grade Weight breakdown
                    </span>
                    
                    <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                      {selectedInspectRecord.rubricScores ? (
                        Object.entries(selectedInspectRecord.rubricScores).map(([comp, score]) => (
                          <div key={comp} className="flex items-center justify-between text-xs font-sans">
                            <span className="text-slate-600 font-medium font-sans">{comp}</span>
                            <span className="font-extrabold text-slate-800">{score} Marks</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center p-3 text-slate-400 font-bold text-xs">
                          Generic marks calculated. Total score applied.
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-blue-50/50 p-3.5 rounded-xl border border-blue-105/40 text-xs">
                      <span className="font-bold text-blue-900">Aggregate Earned Score:</span>
                      <span className="font-black text-blue-800 text-sm">
                        {selectedInspectRecord.totalMark !== 'Draft' ? `${selectedInspectRecord.totalMark} / 100` : 'Draft Pending'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 leading-relaxed">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>No evaluation score records exist. The panel examiner has not logged grading sheets for this student candidate yet.</span>
                  </div>
                )}
              </div>

              {/* Action buttons drawer sticky line-footer */}
              <div className="pt-6 border-t border-slate-100 flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    handleExport();
                    setSelectedInspectRecord(null);
                  }}
                  disabled={selectedInspectRecord.status === 'Not Started' || selectedInspectRecord.status === 'Overdue'}
                  className="flex-1 py-3 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 text-center select-none cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Download sheet
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInspectRecord(null)}
                  className="flex-1 py-3 bg-[#0c1424] hover:bg-slate-850 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 text-center select-none cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
