/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Info,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StatusChip } from './LecturerSupervisorAppointments';
import { PortalButton } from './PortalPrimitives';

// ==================== COMPONENT SPECIFICATION ====================

interface HistoryRow {
  requestId: string;
  studentName: string;
  studentId: string;
  programme: string;
  researchTitle: string;
  submittedDate: string;
  decision: 'Approved' | 'Rejected';
  semester: string;
  abstract: string;
  decisionReason?: string;
}

interface SupervisorRequestHistoryProps {
  onBack: () => void;
}

export const SupervisorRequestHistory: React.FC<SupervisorRequestHistoryProps> = ({ onBack }) => {
  // Mock data of 18 items mirroring the screenshot and requested records
  const allHistoryRecords: HistoryRow[] = [
    {
      requestId: 'SV-REQ-2025-021',
      studentName: 'Nur Aina Rahman',
      studentId: 'S2145678',
      programme: 'MSc. Computer Science',
      researchTitle: 'Blockchain-Based Decentralized Identity Management in Public Services',
      submittedDate: '10 Oct 2025',
      decision: 'Approved',
      semester: 'Sem 1 2025/2026',
      abstract: 'This research outlines the implementation of a decentralized identity (DID) platform for public service registration. Utilizing custom smart contracts alongside cryptographic zero-knowledge proof components, it provides security against identification tampering.'
    },
    {
      requestId: 'SV-REQ-2025-018',
      studentName: 'Jason Lee',
      studentId: 'S2109876',
      programme: 'MSc. Computer Science',
      researchTitle: 'Quantum Computing Algorithms in Cryptographic Key Distribution Protocols',
      submittedDate: '01 Sep 2025',
      decision: 'Approved',
      semester: 'Sem 1 2025/2026',
      abstract: 'Explores security models and performance of post-quantum cryptographic algorithms in software. Tested across simulated clusters in Universiti Malaya’s computing infrastructure.'
    },
    {
      requestId: 'SV-REQ-2025-011',
      studentName: 'Farah Nabila',
      studentId: 'S2088321',
      programme: 'MSc. Software Engineering',
      researchTitle: 'Mobile Learning Adoption in Higher Education: A Systematic Framework',
      submittedDate: '15 Aug 2025',
      decision: 'Rejected',
      semester: 'Sem 3 2024/2025',
      decisionReason: 'The proposed research is highly qualitative and falls outside my primary supervision focus of systems and practical architectures.',
      abstract: 'A qualitative survey analyzing student usage and behavioral intention when interacting with micro-learning content delivered via enterprise software systems.'
    },
    {
      requestId: 'SV-REQ-2024-032',
      studentName: 'Tan Ua Min',
      studentId: 'S2123546',
      programme: 'MSc. Computer Science',
      researchTitle: 'Privacy-Aware Student Data Mining and Predictive Institutional Analytics',
      submittedDate: '20 Nov 2024',
      decision: 'Approved',
      semester: 'Sem 2 2024/2025',
      abstract: 'Develops privacy-preserving machine learning algorithms to audit course attendance and grades trends, using federated learning frameworks.'
    },
    {
      requestId: 'SV-REQ-2024-019',
      studentName: 'Kumar Raj',
      studentId: 'S2104593',
      programme: 'MSc. Software Engineering',
      researchTitle: 'Cloud-Based Research Collaboration Environment over Microservices',
      submittedDate: '03 Aug 2024',
      decision: 'Approved',
      semester: 'Sem 1 2024/2025',
      abstract: 'A robust cloud-native architecture enabling real-time containerized code compilation and collaboration tools.'
    },
    {
      requestId: 'SV-REQ-2024-008',
      studentName: 'Ahmad Luqman',
      studentId: 'S2032481',
      programme: 'MSc. Computer Science',
      researchTitle: 'Optimizing Generative Adversarial Networks for Synthetic Clinical Images',
      submittedDate: '12 May 2024',
      decision: 'Approved',
      semester: 'Sem 1 2024/2025',
      abstract: 'Optimizes training stability for GANs in medicine. Synthesizes dense chest X-ray models with low noise ratios.'
    },
    {
      requestId: 'SV-REQ-2024-005',
      studentName: 'Siti Sarah',
      studentId: 'S2055611',
      programme: 'MSc. Computer Science',
      researchTitle: 'Deep Reinforcement Learning in Robotic Process Automation Pipelines',
      submittedDate: '30 Apr 2024',
      decision: 'Approved',
      semester: 'Sem 1 2024/2025',
      abstract: 'Evaluates adaptive software bots operating over dynamic browser UI trees, modeling execution logs via neural networks.'
    },
    {
      requestId: 'SV-REQ-2024-001',
      studentName: 'Chong Wei',
      studentId: 'S2119024',
      programme: 'MSc. Software Engineering',
      researchTitle: 'Refinement of Software Vulnerability Discovery via Heuristic LLM Prompts',
      submittedDate: '10 Jan 2024',
      decision: 'Approved',
      semester: 'Sem 1 2024/2025',
      abstract: 'Investigates prompt template techniques in LLM interfaces to locate syntax and logic buffer overflow vulnerabilities.'
    },
    {
      requestId: 'SV-REQ-2023-045',
      studentName: 'Devi Nair',
      studentId: 'S1993425',
      programme: 'MSc. Computer Science',
      researchTitle: 'Edge Computing Architectures for Real-Time IoT Traffic Management',
      submittedDate: '15 Nov 2023',
      decision: 'Approved',
      semester: 'Sem 2 2023/2024',
      abstract: 'Builds lightweight broker instances implementing container-isolated scheduling for traffic network cameras.'
    },
    {
      requestId: 'SV-REQ-2023-033',
      studentName: 'Lim Chin Hock',
      studentId: 'S2023412',
      programme: 'MSc. Computer Science',
      researchTitle: 'An Adaptive Threat Detection Mechanism using SVMs in Software-Defined Networks',
      submittedDate: '18 Sep 2023',
      decision: 'Approved',
      semester: 'Sem 1 2023/2024',
      abstract: 'Presents a network control plane plugin that detects distributed denial of service triggers utilizing support vector machine classifiers.'
    },
    {
      requestId: 'SV-REQ-2023-020',
      studentName: 'Fatima Zahra',
      studentId: 'S1987541',
      programme: 'MSc. Software Engineering',
      researchTitle: 'Automating Acceptance Testing For Single Page Web Applications',
      submittedDate: '14 Jun 2023',
      decision: 'Rejected',
      semester: 'Sem 3 2022/2023',
      decisionReason: 'Lack of clear technical novelty or theoretical software architecture contribution.',
      abstract: 'Develops a Selenium-wrapper framework designed specifically to read JSON schema assertions and map tests to dynamic UI nodes.'
    },
    {
      requestId: 'SV-REQ-2023-011',
      studentName: 'Ganesh Pillay',
      studentId: 'S2103456',
      programme: 'MSc. Computer Science',
      researchTitle: 'Energy Efficient Resource Scheduling Algorithms for High Performance Clouds',
      submittedDate: '15 Mar 2023',
      decision: 'Approved',
      semester: 'Sem 2 2022/2023',
      abstract: 'An optimization thesis detailing server sleep-on-idle parameters, saving server rack overhead during low telemetry peaks.'
    },
    {
      requestId: 'SV-REQ-2023-002',
      studentName: 'Wong Ka Wai',
      studentId: 'S1923055',
      programme: 'MSc. Computer Science',
      researchTitle: 'A Deep Learning System for Automated Lung Nodule Tracking in CT Images',
      submittedDate: '02 Feb 2023',
      decision: 'Approved',
      semester: 'Sem 1 2022/2023',
      abstract: 'Applies convolutional autoencoders followed by localized region growing algorithms to tag nodules over interval datasets.'
    },
    {
      requestId: 'SV-REQ-2022-040',
      studentName: 'Norhalim bin Hussin',
      studentId: 'S1893452',
      programme: 'MSc. Computer Science',
      researchTitle: 'Distributed Ledger Framework for Secure Patient Health Record Exchange',
      submittedDate: '25 Nov 2022',
      decision: 'Approved',
      semester: 'Sem 2 2022/2023',
      abstract: 'Leverages Hyperledger Fabric nodes to validate consensus signatures when medical clinics request raw diagnostic profiles.'
    },
    {
      requestId: 'SV-REQ-2022-022',
      studentName: 'Lee Meow Kee',
      studentId: 'S1904124',
      programme: 'MSc. Software Engineering',
      researchTitle: 'A Comparative Empirical Study on Hybrid Agile and DevOps Adoption',
      submittedDate: '11 Aug 2022',
      decision: 'Rejected',
      semester: 'Sem 1 2022/2023',
      decisionReason: 'The systematic literature review is not deep enough and overlaps with several existing software industry studies.',
      abstract: 'An analytical survey checking release frequency and sprint velocity among fifteen local startup environments.'
    },
    {
      requestId: 'SV-REQ-2022-012',
      studentName: 'Samuel Tan',
      studentId: 'S2019445',
      programme: 'MSc. Computer Science',
      researchTitle: 'An Ensemble Model for Predicting Stock Volatility from Social Posts',
      submittedDate: '08 May 2022',
      decision: 'Approved',
      semester: 'Sem 1 2022/2023',
      abstract: 'Extracts transformer embeddings from community posts to build real-time pricing indices alongside historical volatility metrics.'
    },
    {
      requestId: 'SV-REQ-2021-030',
      studentName: 'Tariq Al-Fayed',
      studentId: 'S1805561',
      programme: 'MSc. Computer Science',
      researchTitle: 'Intelligent Intrusion Detection in Cellular Base Station Routers',
      submittedDate: '12 Nov 2021',
      decision: 'Approved',
      semester: 'Sem 2 2021/2022',
      abstract: 'Applies autoencoder networks to analyze cellular routing protocol irregularities, flagging packets with sub-optimal payload structures.'
    },
    {
      requestId: 'SV-REQ-2021-015',
      studentName: 'Nurul Huda',
      studentId: 'S1745239',
      programme: 'MSc. Software Engineering',
      researchTitle: 'Re-engineering Legacy Enterprise Monoliths to Event-Driven Microservices',
      submittedDate: '14 Mar 2021',
      decision: 'Approved',
      semester: 'Sem 2 2020/2021',
      abstract: 'Formulates microservices refactoring patterns by extracting bounded context classes directly from legacy database foreign keys.'
    }
  ];

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  // Applied Filters State
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedDecision, setAppliedDecision] = useState('All');
  const [appliedSemester, setAppliedSemester] = useState('All');
  const [appliedDate, setAppliedDate] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Selected Row Details Popup Modal Custom State
  const [selectedRecord, setSelectedRecord] = useState<HistoryRow | null>(null);

  // Computed summary metrics
  const totalReviewedCount = allHistoryRecords.length;
  const approvedCount = allHistoryRecords.filter(r => r.decision === 'Approved').length;
  const rejectedCount = allHistoryRecords.filter(r => r.decision === 'Rejected').length;

  // Semesters for filter dropdown list
  const semesterOptions = useMemo(() => {
    const list = new Set(allHistoryRecords.map(r => r.semester));
    return ['All', ...Array.from(list)];
  }, []);

  // Filter implementation
  const filteredRecords = useMemo(() => {
    return allHistoryRecords.filter(rec => {
      // Search matches Request ID, studentName, studentId, or researchTitle
      const query = appliedSearch.toLowerCase();
      const matchesSearch = query === '' || 
        rec.requestId.toLowerCase().includes(query) ||
        rec.studentName.toLowerCase().includes(query) ||
        rec.studentId.toLowerCase().includes(query) ||
        rec.researchTitle.toLowerCase().includes(query);

      // Decision matches
      const matchesDecision = appliedDecision === 'All' || rec.decision === appliedDecision;

      // Semester matches
      const matchesSemester = appliedSemester === 'All' || rec.semester === appliedSemester;

      // Date matches (simple representation checker since dates are string e.g. "10 Oct 2025")
      let matchesDate = true;
      if (appliedDate) {
        // Just checking if year or month is typed/matched, generic check for mockup flexibility
        const yearPart = appliedDate.split('-')[0];
        matchesDate = rec.submittedDate.includes(yearPart);
      }

      return matchesSearch && matchesDecision && matchesSemester && matchesDate;
    });
  }, [appliedSearch, appliedDecision, appliedSemester, appliedDate]);

  // Paginated partition
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;

  const handleApplyFilters = () => {
    setAppliedSearch(searchQuery);
    setAppliedDecision(decisionFilter);
    setAppliedSemester(semesterFilter);
    setAppliedDate(dateFilter);
    setCurrentPage(1); // Reset page to first on filter
  };

  return (
    <div id="supervisor-request-history-page" className="space-y-8 animate-fade-in text-left">
      
      {/* Back to Supervisor Appointments */}
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-2 text-slate-500 hover:text-brand-navy font-extrabold text-xs uppercase tracking-widest transition cursor-pointer select-none"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Supervisor Appointments</span>
      </button>

      {/* Main Title Block */}
      <div id="history-page-title-block" className="text-left select-none">
        <h1 className="page-title">
          Supervisor Request History
        </h1>
        <p className="page-subtitle max-w-4xl leading-relaxed">
          View supervisor appointment requests you have approved or rejected.
        </p>
      </div>

      {/* THREE SUMMARY CARDS GRID */}
      <div id="history-summary-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none font-sans">
        {/* TOTAL REVIEWED CARD */}
        <div className="bg-[#f1f5f9]/60 border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50/70 border border-indigo-100 text-brand-navy rounded-xl flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5 text-indigo-900" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">
              TOTAL REVIEWED
            </span>
            <span className="text-2xl font-black text-brand-navy">
              {totalReviewedCount}
            </span>
          </div>
        </div>

        {/* APPROVED CARD */}
        <div className="bg-[#f1f5f9]/60 border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="w-12 h-12 bg-[#e6fbf2] border border-[#bef5db] text-[#00a15c] rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-[#00a15c]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">
              APPROVED
            </span>
            <span className="text-2xl font-black text-brand-navy">
              {approvedCount}
            </span>
          </div>
        </div>

        {/* REJECTED CARD */}
        <div className="bg-[#f1f5f9]/60 border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">
              REJECTED
            </span>
            <span className="text-2xl font-black text-brand-navy">
              {rejectedCount}
            </span>
          </div>
        </div>
      </div>

      {/* FILTER SECTION CARD */}
      <div id="history-filter-card" className="filter-toolbar">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          
          {/* Search box input */}
          <div className="md:col-span-4 space-y-1.5 text-left font-sans">
            <label className="form-label block">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450 text-slate-400" />
              <input
                type="text"
                className="form-control form-control-sm pl-10 pr-4"
                placeholder="Search by student name, ID, or research title"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Decision search options */}
          <div className="md:col-span-2.5 space-y-1.5 text-left font-sans col-span-2">
            <label className="form-label block">
              Decision
            </label>
            <div className="relative">
              <select
                className="form-control form-control-sm appearance-none cursor-pointer"
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value)}
              >
                <option value="All">All Decisions</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Semester dropdown option list */}
          <div className="md:col-span-2.5 space-y-1.5 text-left font-sans col-span-2">
            <label className="form-label block">
              Semester
            </label>
            <div className="relative">
              <select
                className="form-control form-control-sm appearance-none cursor-pointer"
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
              >
                <option value="All">All Semesters</option>
                {semesterOptions.filter(s => s !== 'All').map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Picker Range Box */}
          <div className="md:col-span-1.5 space-y-1.5 text-left font-sans col-span-2">
            <label className="form-label block">
              Date Range
            </label>
            <div className="relative">
              <input
                type="date"
                className="form-control form-control-sm cursor-pointer"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="md:col-span-1.5 w-full col-span-2">
            <PortalButton
              variant="primary"
              size="md"
              fullWidth
              icon={ChevronRight}
              onClick={handleApplyFilters}
            >
              Apply Filters
            </PortalButton>
          </div>

        </div>
      </div>

      {/* FILTERED DATA TABLE BOX */}
      <div id="history-table-container" className="space-y-4">
        <div className="bg-white rounded-2xl border border-[#e2e8f0]/80 overflow-hidden shadow-3xs">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[850px] text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                  <th className="py-4.5 px-6">REQUEST ID</th>
                  <th className="py-4.5 px-6">STUDENT</th>
                  <th className="py-4.5 px-6">RESEARCH TITLE</th>
                  <th className="py-4.5 px-6 pt-5">SUBMITTED DATE</th>
                  <th className="py-4.5 px-6">DECISION</th>
                  <th className="py-4.5 px-6">SEMESTER</th>
                  <th className="py-4.5 px-6 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-brand-navy">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 font-bold text-slate-400 uppercase tracking-wider">
                      No request history matches the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((row) => {
                    const initials = row.studentName
                      .split(' ')
                      .slice(0, 2)
                      .map(w => w[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={row.requestId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-black text-slate-500">
                          {row.requestId}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 text-slate-500 font-extrabold text-[10px] rounded-lg flex items-center justify-center shrink-0 border border-slate-200/50 select-none">
                              {initials}
                            </div>
                            <div>
                              <span className="font-extrabold text-brand-navy tracking-tight block">
                                {row.studentName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                {row.studentId}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-500 max-w-[260px] truncate" title={row.researchTitle}>
                          {row.researchTitle}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-400">
                          {row.submittedDate}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border select-none ${
                            row.decision === 'Approved'
                              ? 'bg-[#e6fbf2] text-[#00a15c] border-[#bef5db]'
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${row.decision === 'Approved' ? 'bg-[#00a15c]' : 'bg-rose-500'}`} />
                            {row.decision}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-500">
                          {row.semester}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setSelectedRecord(row)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-brand-navy hover:text-slate-800 border border-slate-200 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION PANEL CONTROLS MATCHING EXACTLY */}
          <div className="bg-slate-50/55 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs select-none">
            <span className="text-slate-400 font-bold">
              Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(filteredRecords.length, currentPage * itemsPerPage)} of {filteredRecords.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              {/* Prev icon */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors cursor-pointer border border-slate-200/70"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers mapped */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-sans transition-all cursor-pointer ${
                    currentPage === pg 
                      ? 'bg-brand-navy text-white' 
                      : 'hover:bg-slate-100 text-slate-650'
                  }`}
                >
                  {pg}
                </button>
              ))}

              {/* Next icon */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors cursor-pointer border border-slate-200/70"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TWO SYSTEM ASSISTANCE CARDS BELOW TABLE LISTINGS */}
      <div id="system-rules-helper-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none font-sans">
        
        {/* SUPERVISION POLICY COGNITIVE BOX */}
        <div className="bg-[#f8fafc]/50 border border-slate-150 p-6 rounded-2xl flex gap-4 text-left">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Info className="w-4.5 h-4.5 text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
              Supervision Policy
            </h4>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Remember that each lecturer is generally allocated a maximum of 10 active postgraduate students at any given time. Requests are reviewed based on thematic alignment with your research clusters.
            </p>
          </div>
        </div>

        {/* HELP ASSISTANCE COGNITIVE BOX */}
        <div className="bg-[#f8fafc]/50 border border-slate-150 p-6 rounded-2xl flex gap-4 text-left">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4.5 h-4.5 text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
              Need Assistance?
            </h4>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              If you need to change a previous decision or have technical issues viewing student research proposals, please contact the Postgraduate Office at <a href="mailto:support@fsktm.um.edu.my" className="text-[#2563eb] font-bold hover:underline">support@fsktm.um.edu.my</a>.
            </p>
          </div>
        </div>

      </div>

      {/* INTERACTIVE DETAIL VIEW POPUP MODAL (Satisfies "Lecturer can view request details from the Action column") */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedRecord(null)}
            />

            {/* Modal Body Card layout */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl p-7 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-sm border border-slate-100 z-10 text-left font-sans"
            >
              {/* Top dismissal btn */}
              <button
                onClick={() => setSelectedRecord(null)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-5">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    HISTORIC DISPOSITION CARD
                  </span>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="font-mono text-xs font-black text-brand-navy">
                      {selectedRecord.requestId}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border select-none ${
                      selectedRecord.decision === 'Approved'
                        ? 'bg-[#e6fbf2] text-[#00a15c] border-[#bef5db]'
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {selectedRecord.decision}
                    </span>
                  </div>
                </div>

                {/* Candidate Overview */}
                <div className="border-t border-b border-slate-100 py-3.5 flex gap-3.5 items-center">
                  <div className="w-10 h-10 bg-slate-100 text-slate-500 font-extrabold text-xs rounded-xl flex items-center justify-center">
                    {selectedRecord.studentName.split(' ')[0][0]}{selectedRecord.studentName.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-brand-navy">
                      {selectedRecord.studentName}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-bold">
                      {selectedRecord.studentId} <span className="mx-1 text-slate-205">•</span> {selectedRecord.programme}
                    </p>
                  </div>
                </div>

                {/* Semester details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                      DECISION SEMESTER
                    </span>
                    <span className="text-xs font-black text-slate-700 block mt-0.5">
                      {selectedRecord.semester}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                      SUBMITTED ON
                    </span>
                    <span className="text-xs font-black text-slate-700 block mt-0.5">
                      {selectedRecord.submittedDate}
                    </span>
                  </div>
                </div>

                {/* Dissertation proposal */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                    PROPOSED RESERCH TOPIC
                  </span>
                  <h5 className="text-[12.5px] font-extrabold text-brand-navy leading-snug">
                    {selectedRecord.researchTitle}
                  </h5>
                </div>

                {/* Synopsis abstract */}
                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <span className="text-[9px] font-black text-slate-400 block tracking-wider">
                    SYNOPSIS SUMMARY
                  </span>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                    {selectedRecord.abstract}
                  </p>
                </div>

                {/* Decline reason block if rejected */}
                {selectedRecord.decision === 'Rejected' && selectedRecord.decisionReason && (
                  <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1">
                    <span className="text-[9px] font-black text-rose-500 block tracking-wider">
                      DECLINE REASON LOGGED
                    </span>
                    <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                      {selectedRecord.decisionReason}
                    </p>
                  </div>
                )}

                <div className="pt-2 text-right">
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="px-5 py-2.5 bg-brand-navy hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition"
                  >
                    Close Review
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
