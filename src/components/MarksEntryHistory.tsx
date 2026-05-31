/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  FileDown, 
  Search, 
  CheckSquare, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { EvaluationTask, EvaluationStatus } from './LecturerMarksEntry';

// Extended status to include 'CLOSED'
export type HistoryStatus = EvaluationStatus | 'CLOSED';

export interface HistoryTask {
  studentId: string;
  studentName: string;
  initials: string;
  researchTitle: string;
  semester: string;
  totalMark: string | number; // e.g. "84 / 100", "79 / 100", "Draft", or "-"
  status: HistoryStatus;
  submittedDate: string;
  // All components breakdown for the detail view
  problemDefinitionScore?: number;
  problemDefinitionFeedback?: string;
  literatureReviewScore?: number;
  literatureReviewFeedback?: string;
  methodologyScore?: number;
  methodologyFeedback?: string;
  technicalUnderstandingScore?: number;
  technicalUnderstandingFeedback?: string;
  presentationScore?: number;
  presentationFeedback?: string;
  comments?: string;
}

interface MarksEntryHistoryProps {
  onBack: () => void;
  onSelectRecord: (task: EvaluationTask) => void;
  tasksState: EvaluationTask[];
}

export const MarksEntryHistory: React.FC<MarksEntryHistoryProps> = ({
  onBack,
  onSelectRecord,
  tasksState
}) => {
  // 1. We initialize local history mock data containing 18 items exactly.
  // We incorporate the current parent tasks state for rows that exist there to make them fully integrated!
  const [historyList, setHistoryList] = useState<HistoryTask[]>(() => {
    const parentMap = new Map<string, EvaluationTask>(tasksState.map(t => [t.studentId, t]));
    
    // Core 18 items list as requested
    const defaultHistory: HistoryTask[] = [
      {
        studentId: 'MEA2400712',
        studentName: 'Nur Aina Rahman',
        initials: 'NR',
        researchTitle: 'Blockchain-Based Academic Record Verification System',
        semester: 'Sem 1 2025/2026',
        totalMark: '84 / 100',
        status: 'SUBMITTED',
        submittedDate: '12 Dec 2025',
        problemDefinitionScore: 18,
        problemDefinitionFeedback: 'Outstanding analysis of record-lookup vulnerabilities.',
        literatureReviewScore: 19,
        literatureReviewFeedback: 'Thorough coverage of academic smart contracts.',
        methodologyScore: 23,
        methodologyFeedback: 'Excellent experimental design.',
        technicalUnderstandingScore: 17,
        technicalUnderstandingFeedback: 'Strong grasping of security patterns.',
        presentationScore: 12,
        presentationFeedback: 'Engaging oral slide representation.',
        comments: 'Excellent demonstration.'
      },
      {
        studentId: 'MEA2401023',
        studentName: 'Farah Nabila',
        initials: 'FN',
        researchTitle: 'Mobile Learning Adoption in Higher Education: A Case Study of FSKTM',
        semester: 'Sem 1 2025/2026',
        totalMark: '79 / 100',
        status: 'SUBMITTED',
        submittedDate: '13 Dec 2025',
        problemDefinitionScore: 15,
        problemDefinitionFeedback: 'Defined general adoption problems clearly.',
        literatureReviewScore: 15,
        literatureReviewFeedback: 'Adequate TAM reference coverage.',
        methodologyScore: 20,
        methodologyFeedback: 'Solid user survey based validation design.',
        technicalUnderstandingScore: 16,
        technicalUnderstandingFeedback: 'Demonstrated clear flow of app features.',
        presentationScore: 11,
        presentationFeedback: 'Satisfying slides flow and answers.',
        comments: 'Solid work based on user survey validation.'
      },
      {
        studentId: 'MEA2302199',
        studentName: 'Jason Lee',
        initials: 'JL',
        researchTitle: 'Quantum Computing Algorithms in Cryptographic Key Distribution',
        semester: 'Sem 1 2025/2026',
        totalMark: 'Draft',
        status: 'DRAFT SAVED',
        submittedDate: '-',
        problemDefinitionScore: 14,
        problemDefinitionFeedback: 'Clear definition of quantum threat metrics.',
        literatureReviewScore: 16,
        literatureReviewFeedback: 'Comprehensive coverage of commercial systems.',
        methodologyScore: 18,
        methodologyFeedback: 'Well-structured simulation benchmarks.',
        technicalUnderstandingScore: 15,
        technicalUnderstandingFeedback: 'Good understanding of baseline cryptography.',
        presentationScore: 11,
        presentationFeedback: 'Needs minor rehearsal on the transition.',
        comments: 'Methodology is well defined. Presentation is adequate.'
      },
      {
        studentId: 'MEA2301184',
        studentName: 'Sarah Natasha',
        initials: 'SN',
        researchTitle: 'Blockchain-Based Verification Framework for Academic Credentials',
        semester: 'Sem 1 2025/2026',
        totalMark: '-',
        status: 'NOT STARTED',
        submittedDate: '-',
        problemDefinitionScore: 0,
        literatureReviewScore: 0,
        methodologyScore: 0,
        technicalUnderstandingScore: 0,
        presentationScore: 0
      },
      {
        studentId: 'MEA2400881',
        studentName: 'Kumar Raj',
        initials: 'KR',
        researchTitle: 'Cloud-Based Research Document Management with Distributed Encryption',
        semester: 'Sem 1 2025/2026',
        totalMark: '-',
        status: 'CLOSED',
        submittedDate: '-',
        problemDefinitionScore: 0,
        literatureReviewScore: 0,
        methodologyScore: 0,
        technicalUnderstandingScore: 0,
        presentationScore: 0
      },
      // Rest of 18 records to fulfill exact pagination simulation
      {
        studentId: 'MEA2401124',
        studentName: 'Amirul Azhar',
        initials: 'AA',
        researchTitle: 'Deep Learning on Edge Devices for Dynamic Object Detection',
        semester: 'Sem 1 2025/2026',
        totalMark: '92 / 100',
        status: 'SUBMITTED',
        submittedDate: '08 Dec 2025'
      },
      {
        studentId: 'MEA2401582',
        studentName: 'Lim Wei Jie',
        initials: 'LW',
        researchTitle: 'Decentralized Federated Learning Framework for Smart Health Records',
        semester: 'Sem 1 2025/2026',
        totalMark: '88 / 100',
        status: 'SUBMITTED',
        submittedDate: '07 Dec 2025'
      },
      {
        studentId: 'MEA2400341',
        studentName: 'Siti Fatimah',
        initials: 'SF',
        researchTitle: 'Privacy Preserving Smart Grid Energy Systems on Hybrid Clouds',
        semester: 'Sem 1 2025/2026',
        totalMark: '71 / 100',
        status: 'SUBMITTED',
        submittedDate: '06 Dec 2025'
      },
      {
        studentId: 'MEA2301904',
        studentName: 'Chen Ming',
        initials: 'CM',
        researchTitle: 'Natural Language Summarizer with Low-Resource Malay Language Models',
        semester: 'Sem 1 2025/2026',
        totalMark: '65 / 100',
        status: 'SUBMITTED',
        submittedDate: '04 Dec 2025'
      },
      {
        studentId: 'MEA2301112',
        studentName: 'Devika Nair',
        initials: 'DN',
        researchTitle: 'Real-time Edge Video Processing Using Lightweight Neural Models',
        semester: 'Sem 2 2024/2025',
        totalMark: '80 / 100',
        status: 'SUBMITTED',
        submittedDate: '12 May 2025'
      },
      {
        studentId: 'MEA2302241',
        studentName: 'Chloe Adams',
        initials: 'CA',
        researchTitle: 'Secure Document Delivery Protocols for Cloud-native Enterprises',
        semester: 'Sem 2 2024/2025',
        totalMark: '76 / 100',
        status: 'SUBMITTED',
        submittedDate: '10 May 2025'
      },
      {
        studentId: 'MEA2301599',
        studentName: 'Hafiz Rosli',
        initials: 'HR',
        researchTitle: 'Advanced Sentiment Classification for Malaysian E-Commerce Reviews',
        semester: 'Sem 2 2024/2025',
        totalMark: '82 / 100',
        status: 'SUBMITTED',
        submittedDate: '09 May 2025'
      },
      {
        studentId: 'MEA2204910',
        studentName: 'Daniel Tan',
        initials: 'DT',
        researchTitle: 'Multi-tenant Database Scaling Architectures on Microservices',
        semester: 'Sem 2 2024/2025',
        totalMark: '87 / 100',
        status: 'SUBMITTED',
        submittedDate: '08 May 2025'
      },
      {
        studentId: 'MEA2204123',
        studentName: 'Ahmad Shahrur',
        initials: 'AS',
        researchTitle: 'Hybrid Homomorphic Encryption in Distributed Financial Ledger',
        semester: 'Sem 2 2024/2025',
        totalMark: '-',
        status: 'CLOSED',
        submittedDate: '-'
      },
      {
        studentId: 'MEA2203114',
        studentName: 'Syarifah Noor',
        initials: 'SN',
        researchTitle: 'Deep Vision Defect Detection Systems for Automated Manufacturing',
        semester: 'Sem 1 2024/2025',
        totalMark: '90 / 100',
        status: 'SUBMITTED',
        submittedDate: '14 Dec 2024'
      },
      {
        studentId: 'MEA2201988',
        studentName: 'Tan Kok Seng',
        initials: 'TK',
        researchTitle: 'Real-time Network Intrusion Detection with Graph Fourier Models',
        semester: 'Sem 1 2024/2025',
        totalMark: '85 / 100',
        status: 'SUBMITTED',
        submittedDate: '12 Dec 2024'
      },
      {
        studentId: 'MEA2150912',
        studentName: 'Rachel Green',
        initials: 'RG',
        researchTitle: 'Interactive Academic Collaboration Hub with Access Control Lists',
        semester: 'Sem 1 2024/2025',
        totalMark: '78 / 100',
        status: 'SUBMITTED',
        submittedDate: '11 Dec 2024'
      },
      {
        studentId: 'MEA2150881',
        studentName: 'Wong Siew Mei',
        initials: 'WS',
        researchTitle: 'Machine Translation Systems for Technical Architectural Manuals',
        semester: 'Sem 1 2024/2025',
        totalMark: '83 / 100',
        status: 'SUBMITTED',
        submittedDate: '10 Dec 2024'
      }
    ];

    // If parent has newer values (e.g. they modified a draft or submitted), merge them dynamically
    return defaultHistory.map(item => {
      const parentTask = parentMap.get(item.studentId);
      if (parentTask) {
        // Compute total score if parent is submitted
        let computedTotal: string | number = '-';
        if (parentTask.status === 'SUBMITTED') {
          const sum = 
            (parentTask.problemDefinitionScore || 0) +
            (parentTask.literatureReviewScore || 0) +
            (parentTask.methodologyScore || 0) +
            (parentTask.technicalUnderstandingScore || 0) +
            (parentTask.presentationScore || 0);
          computedTotal = `${sum} / 100`;
        } else if (parentTask.status === 'DRAFT SAVED') {
          computedTotal = 'Draft';
        }
        
        return {
          ...item,
          status: parentTask.status as HistoryStatus,
          totalMark: computedTotal,
          submittedDate: parentTask.submittedDate || (parentTask.status === 'SUBMITTED' ? 'Today' : '-'),
          problemDefinitionScore: parentTask.problemDefinitionScore,
          problemDefinitionFeedback: parentTask.problemDefinitionFeedback,
          literatureReviewScore: parentTask.literatureReviewScore,
          literatureReviewFeedback: parentTask.literatureReviewFeedback,
          methodologyScore: parentTask.methodologyScore,
          methodologyFeedback: parentTask.methodologyFeedback,
          technicalUnderstandingScore: parentTask.technicalUnderstandingScore,
          technicalUnderstandingFeedback: parentTask.technicalUnderstandingFeedback,
          presentationScore: parentTask.presentationScore,
          presentationFeedback: parentTask.presentationFeedback,
          comments: parentTask.comments
        };
      }
      return item;
    });
  });

  // 2. Filters State
  const [semesterFilter, setSemesterFilter] = useState('Sem 1 2025/2026');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [dateRange, setDateRange] = useState('');

  // Applied values
  const [appliedSemester, setAppliedSemester] = useState('Sem 1 2025/2026');
  const [appliedStatus, setAppliedStatus] = useState('All Statuses');
  const [appliedDate, setAppliedDate] = useState('');

  // Active Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApplyFilters = () => {
    setAppliedSemester(semesterFilter);
    setAppliedStatus(statusFilter);
    setAppliedDate(dateRange);
    setCurrentPage(1); // Reset to page 1
    triggerToast("History filters applied successfully!");
  };

  const handleExportPDF = () => {
    alert("Exporting Marks Entry History report as consolidated PDF...");
    triggerToast("Consolidated PDF downloads initialized.");
  };

  // Filter computation
  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      // Semester filter
      const matchesSem = appliedSemester === 'All Semesters' ? true : item.semester === appliedSemester;
      
      // Status filter
      let matchesStatus = true;
      if (appliedStatus !== 'All Statuses') {
        matchesStatus = item.status === appliedStatus.toUpperCase();
      }

      return matchesSem && matchesStatus;
    });
  }, [historyList, appliedSemester, appliedStatus]);

  // Pagination calculation
  const totalEntries = filteredHistory.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHistory, currentPage]);

  // Dynamic stat counts for summary cards (based on ALL data of selected semester)
  const stats = useMemo(() => {
    const semesterData = historyList.filter(item => appliedSemester === 'All Semesters' ? true : item.semester === appliedSemester);
    return {
      total: semesterData.length,
      submitted: semesterData.filter(item => item.status === 'SUBMITTED').length,
      draft: semesterData.filter(item => item.status === 'DRAFT SAVED').length,
      notStarted: semesterData.filter(item => item.status === 'NOT STARTED' || item.status === 'CLOSED').length,
    };
  }, [historyList, appliedSemester]);

  // Click View Action
  const handleViewAction = (item: HistoryTask) => {
    // Convert HistoryTask back to EvaluationTask structure easily
    const mappedEvalTask: EvaluationTask = {
      studentId: item.studentId,
      studentName: item.studentName,
      initials: item.initials,
      researchTitle: item.researchTitle,
      semester: item.semester,
      deadline: '10 Dec 2025',
      status: item.status === 'CLOSED' ? 'NOT STARTED' : (item.status as EvaluationStatus),
      problemDefinitionScore: item.problemDefinitionScore || 0,
      problemDefinitionFeedback: item.problemDefinitionFeedback || '',
      literatureReviewScore: item.literatureReviewScore || 0,
      literatureReviewFeedback: item.literatureReviewFeedback || '',
      methodologyScore: item.methodologyScore || 0,
      methodologyFeedback: item.methodologyFeedback || '',
      technicalUnderstandingScore: item.technicalUnderstandingScore || 0,
      technicalUnderstandingFeedback: item.technicalUnderstandingFeedback || '',
      presentationScore: item.presentationScore || 0,
      presentationFeedback: item.presentationFeedback || '',
      comments: item.comments || '',
      submittedDate: item.submittedDate === '-' ? undefined : item.submittedDate
    };
    onSelectRecord(mappedEvalTask);
  };

  // Status badge styling mapper
  const renderHistoryStatusChip = (status: HistoryStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <StatusBadge tone="success" className="text-[9px] px-2.5 py-0.5">Submitted</StatusBadge>;
      case 'DRAFT SAVED':
        return <StatusBadge tone="warning" className="text-[9px] px-2.5 py-0.5">Draft Saved</StatusBadge>;
      case 'NOT STARTED':
        return <StatusBadge tone="neutral" className="text-[9px] px-2.5 py-0.5">Not Started</StatusBadge>;
      case 'CLOSED':
        return <StatusBadge tone="neutral" className="text-[9px] px-2.5 py-0.5">Closed</StatusBadge>;
      default:
        return null;
    }
  };

  return (
    <div id="marks-entry-history-page" className="space-y-6 text-left relative font-sans">
      
      <PortalToast message={toastMessage} />

      {/* 1. Header Navigation Row */}
      <div className="flex flex-col gap-1">
        <button
          id="back-to-marks-entry-btn"
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-2 text-sky-600 hover:text-sky-800 font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform stroke-[2.5]" />
          <span>Back to Marks Entry</span>
        </button>
      </div>

      {/* 2. Main Page Header Aligning with Reference block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        <div>
          <h1 className="page-title">
            Marks Entry History
          </h1>
          <p className="page-subtitle">
            View mark entry tasks and submissions assigned to you across semesters.
          </p>
        </div>

        {/* Top-right aligned export PDF action */}
        <button
          onClick={handleExportPDF}
          className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-3xs"
        >
          <FileDown className="w-4 h-4 text-rose-500 shrink-0 stroke-[2.3]" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* 3. 4 Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: TOTAL TASKS */}
        <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left flex justify-between items-start select-none group hover:shadow-xs transition-all">
          <div className="space-y-4">
            <div className="w-11 h-11 bg-slate-50/55 border border-slate-100 rounded-xl flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-slate-500" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                TOTAL TASKS
              </span>
              <span className="text-[11px] text-slate-500 font-semibold block leading-tight">
                Assigned history tasks
              </span>
            </div>
          </div>
          <span className="text-4.5xl font-extrabold text-brand-navy pr-1 font-mono tracking-tight leading-none">
            {stats.total}
          </span>
        </div>

        {/* Card 2: SUBMITTED */}
        <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left flex justify-between items-start select-none group hover:shadow-xs transition-all">
          <div className="space-y-4">
            <div className="w-11 h-11 bg-[#e6fbf2] border border-[#bef5db] rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                SUBMITTED
              </span>
              <span className="text-[11px] text-slate-500 font-semibold block leading-tight">
                Marks finalized & sent
              </span>
            </div>
          </div>
          <span className="text-4.5xl font-extrabold text-blue-600 font-mono tracking-tight leading-none">
            {stats.submitted}
          </span>
        </div>

        {/* Card 3: DRAFT SAVED */}
        <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left flex justify-between items-start select-none group hover:shadow-xs transition-all">
          <div className="space-y-4">
            <div className="w-11 h-11 bg-[#eff6ff] border border-[#dbeafe] rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                DRAFT SAVED
              </span>
              <span className="text-[11px] text-slate-500 font-semibold block leading-tight">
                Intermediary draft savings
              </span>
            </div>
          </div>
          <span className="text-4.5xl font-extrabold text-brand-navy pr-1 font-mono tracking-tight leading-none">
            {stats.draft}
          </span>
        </div>

        {/* Card 4: NOT STARTED */}
        <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs text-left flex justify-between items-start select-none group hover:shadow-xs transition-all">
          <div className="space-y-4">
            <div className="w-11 h-11 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                NOT STARTED
              </span>
              <span className="text-[11px] text-slate-500 font-semibold block leading-tight">
                Pending or closed tasks
              </span>
            </div>
          </div>
          <span className="text-4.5xl font-extrabold text-[#e11d48] pr-1 font-mono tracking-tight leading-none">
            {stats.notStarted}
          </span>
        </div>

      </div>

      {/* 4. Filters Section Box */}
      <div className="filter-toolbar grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
        
        {/* Semester select dropdown */}
        <div className="col-span-1 md:col-span-4 space-y-1.5">
          <label className="form-label block">
            Semester
          </label>
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="form-control form-control-sm"
          >
            <option>All Semesters</option>
            <option>Sem 1 2025/2026</option>
            <option>Sem 2 2024/2025</option>
            <option>Sem 1 2024/2025</option>
          </select>
        </div>

        {/* Status dropdown */}
        <div className="col-span-1 md:col-span-3 space-y-1.5">
          <label className="form-label block">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-control form-control-sm"
          >
            <option>All Statuses</option>
            <option>Submitted</option>
            <option>Draft Saved</option>
            <option>Not Started</option>
            <option>Closed</option>
          </select>
        </div>

        {/* Date Range picker simulate text input */}
        <div className="col-span-1 md:col-span-3 space-y-1.5">
          <label className="form-label block">
            Date Range
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-3.5 h-3.5 stroke-[2.3]" />
            </span>
            <input
              type="text"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              placeholder="mm/dd/yyyy"
              className="form-control form-control-sm pl-9.5 pr-4"
            />
          </div>
        </div>

        {/* Apply Filters solid blue-dark clickable button */}
        <div className="col-span-1 md:col-span-2">
          <PortalButton
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={handleApplyFilters}
          >
            Apply Filters
          </PortalButton>
        </div>

      </div>

      {/* 5. Clean, Readable History Records Table Box */}
      <div id="history-records-block" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs overflow-hidden text-left space-y-5">
        
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-brand-navy">
            Marks History Log
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Table shows all assigned evaluation tasks across history, filtered by semester selection.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px] text-xs">
            <thead>
              <tr className="border-b border-slate-150 border-slate-100 font-bold text-slate-400 text-[10px] uppercase tracking-wider select-none">
                <th className="py-2.5 pb-4 w-[110px]">Student ID</th>
                <th className="py-2.5 pb-4 w-[140px]">Student Name</th>
                <th className="py-2.5 pb-4">Research Title</th>
                <th className="py-2.5 pb-4 w-[120px]">Semester</th>
                <th className="py-2.5 pb-4 text-center w-[90px]">Total Mark</th>
                <th className="py-2.5 pb-4 text-center w-[100px]">Status</th>
                <th className="py-2.5 pb-4 w-[110px]">Submitted Date</th>
                <th className="py-2.5 pb-4 text-center w-[80px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 font-sans text-brand-navy/90 whitespace-normal">
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((item) => {
                  return (
                    <tr key={item.studentId} className="hover:bg-slate-50/20 transition-colors">
                      {/* Student ID */}
                      <td className="py-4.5 pr-2 font-mono font-bold text-slate-900">
                        {item.studentId}
                      </td>

                      {/* Student Name */}
                      <td className="py-4.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-[30px] h-[30px] rounded-lg bg-sky-50 border border-sky-100/50 text-sky-600 font-black text-[10px] flex items-center justify-center shrink-0">
                            {item.initials}
                          </div>
                          <span className="font-extrabold text-slate-900 leading-snug">
                            {item.studentName}
                          </span>
                        </div>
                      </td>

                      {/* Research Title */}
                      <td className="py-4.5 pr-4 max-w-[250px]">
                        <p className="font-semibold text-slate-500 leading-relaxed line-clamp-2">
                          {item.researchTitle}
                        </p>
                      </td>

                      {/* Semester */}
                      <td className="py-4.5 pr-2 font-semibold text-slate-500">
                        {item.semester}
                      </td>

                      {/* Total Mark */}
                      <td className="py-4.5 pr-2 text-center">
                        {typeof item.totalMark === 'string' && (item.totalMark === 'Draft' || item.totalMark === '-') ? (
                          <span className={`${item.totalMark === 'Draft' ? 'bg-amber-50 text-amber-700' : 'text-slate-400'} py-0.5 px-2 rounded-md font-extrabold text-[11px]`}>
                            {item.totalMark}
                          </span>
                        ) : (
                          <span className="text-sky-600 font-black font-mono text-xs">
                            {item.totalMark}
                          </span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="py-4.5 pr-2 text-center">
                        {renderHistoryStatusChip(item.status)}
                      </td>

                      {/* Submitted Date */}
                      <td className="py-4.5 pr-2 font-semibold text-slate-500 font-mono">
                        {item.submittedDate}
                      </td>

                      {/* Action trigger */}
                      <td className="py-4.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewAction(item)}
                          className="text-sky-600 hover:text-sky-800 font-extrabold text-xs tracking-wider uppercase transition cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="text-slate-400 font-bold text-xs">
                      No matching history logs found. Try adjusting filter criteria.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Dynamic Pagination Component matches details */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-50 select-none text-xs text-slate-400 font-bold">
          <span>
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalEntries)} to {Math.min(currentPage * itemsPerPage, totalEntries)} of {totalEntries} entries
          </span>
          
          <div className="flex items-center gap-1.5">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black ${
                currentPage === 1 
                  ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed' 
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              &lt;
            </button>
            
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black transition ${
                  currentPage === pg 
                    ? 'border-brand-navy bg-brand-navy text-white' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                {pg}
              </button>
            ))}

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black ${
                currentPage === totalPages 
                  ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed' 
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              &gt;
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
