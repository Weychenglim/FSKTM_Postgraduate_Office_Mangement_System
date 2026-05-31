/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  ChevronDown, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  User,
  X,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RecommendationDetailsDrawer } from './RecommendationDetailsDrawer';

// ==================== DATA DEFINITIONS & INTERFACES ====================

export interface SubmittedRecommendation {
  id: string;
  studentName: string;
  studentId: string;
  researchTitle: string;
  recommendedPanel: string;
  date: string;
  status: 'Approved' | 'Pending Approval' | 'Rejected';
  semester: string;
  programme?: string;
  abstract?: string;
  justification?: string;
}

interface SubmittedRecommendationsPageProps {
  onBack: () => void;
  recommendations?: SubmittedRecommendation[];
  onViewRecommendation?: (recId: string) => void;
}

// 12 records corresponding precisely to the statistics (Total: 12, Approved: 9, Pending: 2, Rejected: 1)
const DEFAULT_RECOMMENDATIONS: SubmittedRecommendation[] = [
  {
    id: 'REC-2025-021',
    studentName: 'Nur Aina Rahman',
    studentId: '17204561',
    researchTitle: 'Blockchain-Based Verification Framework for Academic Credentials',
    recommendedPanel: 'Assoc. Prof. Dr. Amina Malik',
    date: '10 Oct 2025',
    status: 'Approved',
    semester: 'Sem 1 2025/2026',
    programme: 'MSc. Computer Science',
    abstract: 'This research outlines the implementation of a decentralized identity (DID) platform for public service registration. Utilizing custom smart contracts alongside cryptographic zero-knowledge proof components, it provides security against identification tampering.',
    justification: 'The lecturer possesses 6+ years of expertise in Big Data and decentralized ledgers, with multiple published journals in international indexing circles.'
  },
  {
    id: 'REC-2025-018',
    studentName: 'Jason Lee',
    studentId: '17208832',
    researchTitle: 'Quantum Computing Algorithms in Cryptography & Cybersecurity',
    recommendedPanel: 'Dr. Robert Chen',
    date: '01 Sep 2025',
    status: 'Approved',
    semester: 'Sem 1 2025/2026',
    programme: 'MSc. Computer Science',
    abstract: 'Examines threat vectors on modern elliptic curve cryptography from Shor’s and Grover’s algorithms, and implements post-quantum replacement protocols securely in Java-based simulation environments.',
    justification: 'Dr. Robert Chen focuses on practical post-quantum security schemes and is highly suitable for validating cryptographic proof aspects of this topic.'
  },
  {
    id: 'REC-2025-014',
    studentName: 'Farhan Tariq',
    studentId: '17200021',
    researchTitle: 'Federated Learning Models for Privacy-Preserving Applications',
    recommendedPanel: 'Dr. Sarah Lim',
    date: '14 May 2025',
    status: 'Pending Approval',
    semester: 'Sem 2 2024/2025',
    programme: 'MSc. Computer Science',
    abstract: 'Investigates decentralized server training mechanics across dynamic device groups while preserving private structural feature layers using additive secret sharing policies.',
    justification: 'Dr. Sarah Lim has a rich background in adversarial learning models and federated systems evaluation pipelines.'
  },
  {
    id: 'REC-2024-032',
    studentName: 'Tan Jia Min',
    studentId: '17199923',
    researchTitle: 'Privacy-Aware Student Data Analytics & Systems',
    recommendedPanel: 'Assoc. Prof. Dr. Amina Malik',
    date: '20 Nov 2024',
    status: 'Approved',
    semester: 'Sem 2 2024/2025',
    programme: 'MSc. Computer Science',
    abstract: 'Evaluates predictive courses recommendation algorithms in higher learning without harvesting individual tracking datasets.',
    justification: 'She has spearheaded several institutional privacy audits and research contracts regarding Student Information System governance.'
  },
  {
    id: 'REC-2024-019',
    studentName: 'Kumar Raj',
    studentId: '17188842',
    researchTitle: 'Cloud-Based Research Document Management Workflow Platform',
    recommendedPanel: 'Dr. Robert Chen',
    date: '03 Aug 2024',
    status: 'Rejected',
    semester: 'Sem 1 2024/2025',
    programme: 'MSc. Software Engineering',
    abstract: 'A software framework implementing dynamic document version control pipelines securely over decentralized server node storage files.',
    justification: 'The candidate theme falls into conventional database patterns which do not fully align with the active research cluster focuses.'
  },
  // Extra 7 entries to complete the count of 12 for pagination and filtering tests
  {
    id: 'REC-2024-011',
    studentName: 'Ahmad Luqman',
    studentId: '17201119',
    researchTitle: 'Optimizing Generative Adversarial Networks for Low-Resource Languages',
    recommendedPanel: 'Assoc. Prof. Dr. Amina Malik',
    date: '29 May 2026',
    status: 'Pending Approval',
    semester: 'Sem 1 2025/2026',
    programme: 'MSc. Computer Science',
    abstract: 'This research explores novel architectural improvements for GANs to improve synthetic data quality in languages with limited linguistic resources.',
    justification: 'As one of the leading regional experts in generative deep neural architectures, Assoc. Prof. Malik is uniquely qualified.'
  },
  {
    id: 'REC-2024-008',
    studentName: 'Siti Sarah',
    studentId: '17208852',
    researchTitle: 'Reinforcement Learning in Drone Pathfinding Routines',
    recommendedPanel: 'Dr. Siti Noor',
    date: '10 Apr 2024',
    status: 'Approved',
    semester: 'Sem 2 2023/2024',
    programme: 'MSc. Computer Science',
    abstract: 'Applies neural feedback reward policies to determine shortest collision-free routes under wind fluctuation constraints.',
    justification: 'Dr. Siti Noor is active in cellular automation paradigms and mobile robotics steering validation.'
  },
  {
    id: 'REC-2024-005',
    studentName: 'Chong Wei',
    studentId: '17193202',
    researchTitle: 'LLM Prompt Engineering for Automated API Code Generation',
    recommendedPanel: 'Dr. Robert Chen',
    date: '18 Jan 2024',
    status: 'Approved',
    semester: 'Sem 2 2023/2024',
    programme: 'MSc. Software Engineering',
    abstract: 'Provides structured prompt matrices to synthesize verified gRPC route files from YAML endpoints specification.',
    justification: 'He has worked closely on software pattern generators and has direct experience evaluating automated code systems.'
  },
  {
    id: 'REC-2023-045',
    studentName: 'Devi Nair',
    studentId: '17193321',
    researchTitle: 'Containerized Broker Infrastructure for Smart Home Gateway Devices',
    recommendedPanel: 'Dr. Siti Noor',
    date: '22 Nov 2023',
    status: 'Approved',
    semester: 'Sem 1 2023/2024',
    programme: 'MSc. Computer Science',
    abstract: 'Deploys lightweight message parsing agents onto limited computing environments to balance active event triggers.',
    justification: 'Suitable candidate based on local network virtualization research projects launched.'
  },
  {
    id: 'REC-2023-033',
    studentName: 'Lim Chin Hock',
    studentId: '17201931',
    researchTitle: 'Neural Threat Detection Plugin over Software Defined Networks',
    recommendedPanel: 'Assoc. Prof. Dr. Amina Malik',
    date: '15 Sep 2023',
    status: 'Approved',
    semester: 'Sem 1 2023/2024',
    programme: 'MSc. Computer Science',
    abstract: 'Monitors open flow protocol exchanges using light convolutional filters to log DDoS triggers before they affect router states.',
    justification: 'Outstanding record in system protection frameworks and distributed databases.'
  },
  {
    id: 'REC-2023-021',
    studentName: 'Fatima Zahra',
    studentId: '17150567',
    researchTitle: 'Automating UI Test Script Refactoring with Abstract Syntax Trees',
    recommendedPanel: 'Dr. Robert Chen',
    date: '12 Jun 2023',
    status: 'Approved',
    semester: 'Sem 2 2022/2023',
    programme: 'MSc. Software Engineering',
    abstract: 'Decodes outdated test files and automatically maps them to updated elements trees via grammar translation frameworks.',
    justification: 'Expertise in validation tooling and automated parsing models fits this topic.'
  },
  {
    id: 'REC-2023-009',
    studentName: 'Samuel Tan',
    studentId: '17140924',
    researchTitle: 'Ensemble Learning applied to Real-Time Sentiment Index Tracking',
    recommendedPanel: 'Assoc. Prof. Dr. Amina Malik',
    date: '02 May 2022',
    status: 'Approved',
    semester: 'Sem 1 2022/2023',
    programme: 'MSc. Computer Science',
    abstract: 'Extracts real-time trading sentiment from financial publications using transformer embeddings and weights outputs proportionately.',
    justification: 'Matches her active focus on big-data analytics and advanced natural processing architectures.'
  }
];

export const SubmittedRecommendationsPage: React.FC<SubmittedRecommendationsPageProps> = ({
  onBack,
  recommendations = DEFAULT_RECOMMENDATIONS,
  onViewRecommendation
}) => {
  // --- Local Search & Filtering State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedSemester, setSelectedSemester] = useState('All Semesters');

  // Applied Filter States
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('All Statuses');
  const [appliedSemester, setAppliedSemester] = useState('All Semesters');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Selected Detail Modal State
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // --- Calculations for Statistic Banner ---
  const statsTotal = recommendations.length;
  const statsApprovedCount = recommendations.filter(r => r.status === 'Approved').length;
  const statsPendingCount = recommendations.filter(r => r.status === 'Pending Approval').length;
  const statsRejectedCount = recommendations.filter(r => r.status === 'Rejected').length;

  // List of unique semesters for dynamic filtration options
  const semesterFilters = useMemo(() => {
    const sems = new Set(recommendations.map(r => r.semester));
    return ['All Semesters', ...Array.from(sems)];
  }, [recommendations]);

  // --- Filtering Logic ---
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      const q = appliedSearchQuery.toLowerCase().trim();
      const matchesSearch = q === '' ||
        rec.studentName.toLowerCase().includes(q) ||
        rec.studentId.toLowerCase().includes(q) ||
        rec.id.toLowerCase().includes(q) ||
        rec.researchTitle.toLowerCase().includes(q);

      const matchesStatus = appliedStatus === 'All Statuses' || rec.status === appliedStatus;
      const matchesSemester = appliedSemester === 'All Semesters' || rec.semester === appliedSemester;

      return matchesSearch && matchesStatus && matchesSemester;
    });
  }, [recommendations, appliedSearchQuery, appliedStatus, appliedSemester]);

  // --- Paginated Chunk ---
  const paginatedRecs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecommendations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecommendations, currentPage]);

  const totalPages = Math.ceil(filteredRecommendations.length / itemsPerPage) || 1;

  // Handles applying filters
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearchQuery(searchQuery);
    setAppliedStatus(selectedStatus);
    setAppliedSemester(selectedSemester);
    setCurrentPage(1); // Back to first page
  };

  // Handles resetting filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('All Statuses');
    setSelectedSemester('All Semesters');
    setAppliedSearchQuery('');
    setAppliedStatus('All Statuses');
    setAppliedSemester('All Semesters');
    setCurrentPage(1);
  };

  // View Details selector
  const activeDetailRecord = useMemo(() => {
    return recommendations.find(r => r.id === selectedDetailId) || null;
  }, [recommendations, selectedDetailId]);

  return (
    <div id="submitted-recommendations-page-main" className="space-y-8 animate-fade-in text-left">
      
      {/* 1. Back Link */}
      <button
        id="submitted-recs-back-btn"
        onClick={onBack}
        className="group inline-flex items-center gap-2 text-slate-500 hover:text-brand-navy font-black text-xs uppercase tracking-widest transition cursor-pointer select-none"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform stroke-[2.5]" />
        <span>Back to Panel Appointments</span>
      </button>

      {/* 2. Page Header */}
      <div id="submitted-recs-header-content" className="select-none text-left">
        <h1 id="submitted-recs-title" className="page-title leading-tight">
          Submitted Recommendations
        </h1>
        <p id="submitted-recs-subtitle" className="page-subtitle leading-relaxed max-w-3xl">
          View panel member recommendations you have submitted for your supervisees.
        </p>
      </div>

      {/* 3. Summary Statistic Cards Section (4 cards matches UI mockup) */}
      <div id="submitted-recs-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 select-none font-sans">
        
        {/* Card 1: Total Submitted */}
        <div id="stat-card-total" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs flex items-center justify-between hover:border-slate-300 transition duration-300">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">
              Total Submitted
            </span>
            <span className="text-2xl font-black text-brand-navy">
              {statsTotal}
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-50 border border-blue-100/70 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Approved */}
        <div id="stat-card-approved" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs flex items-center justify-between hover:border-slate-300 transition duration-300">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">
              Approved
            </span>
            <span className="text-2xl font-black text-brand-navy">
              {statsApprovedCount}
            </span>
          </div>
          <div className="w-11 h-11 bg-[#e6fbf2] border border-[#bef5db] text-[#00a15c] rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-[#00a15c]" />
          </div>
        </div>

        {/* Card 3: Pending Approval */}
        <div id="stat-card-pending" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs flex items-center justify-between hover:border-slate-300 transition duration-300">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">
              Pending Approval
            </span>
            <span className="text-2xl font-black text-brand-navy">
              {statsPendingCount}
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-50/60 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-4.5 h-4.5 text-blue-600" />
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div id="stat-card-rejected" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs flex items-center justify-between hover:border-slate-300 transition duration-300">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">
              Rejected
            </span>
            <span className="text-2xl font-black text-rose-600">
              {statsRejectedCount}
            </span>
          </div>
          <div className="w-11 h-11 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
        </div>

      </div>

      {/* 4. Filter and Search Tool section card */}
      <div id="submitted-recs-filter-panel" className="bg-white border border-[#e2e8f0]/85 rounded-2xl p-5 shadow-3xs">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          {/* Input field: Search Students */}
          <div className="md:col-span-4 space-y-1.5 text-left font-sans">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Search Students
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="filter-search-students"
                type="text"
                className="w-full bg-[#f8fafc]/80 hover:bg-[#f1f5f9]/40 focus:bg-white border border-slate-200/90 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 font-bold placeholder:text-slate-400 focus:outline-none transition-all duration-200"
                placeholder="Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Dropdown field: Status */}
          <div className="md:col-span-3 space-y-1.5 text-left font-sans col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Status
            </label>
            <div className="relative">
              <select
                id="filter-select-status"
                className="w-full bg-[#f8fafc]/80 hover:bg-[#f1f5f9]/40 focus:bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-705 text-slate-700 font-bold focus:outline-none appearance-none cursor-pointer"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Dropdown field: Semester */}
          <div className="md:col-span-3 space-y-1.5 text-left font-sans col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Semester
            </label>
            <div className="relative">
              <select
                id="filter-select-semester"
                className="w-full bg-[#f8fafc]/80 hover:bg-[#f1f5f9]/40 focus:bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-750 text-slate-700 font-bold focus:outline-none appearance-none cursor-pointer"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
              >
                {semesterFilters.map((semOption) => (
                  <option key={semOption} value={semOption}>
                    {semOption}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Action buttons: Submit Filters & Reset */}
          <div className="md:col-span-2 flex gap-2 w-full">
            <button
              id="submit-filters-btn"
              type="submit"
              className="flex-grow py-2.5 bg-brand-navy hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] select-none"
            >
              <span>Apply Filters</span>
            </button>
            <button
              id="reset-filters-btn"
              type="button"
              onClick={handleResetFilters}
              className="w-10 h-10 border border-slate-205 border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 transition cursor-pointer shrink-0"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
            </button>
          </div>

        </form>
      </div>

      {/* 5. Recommendations Table & Footer */}
      <div id="submitted-recs-table-card" className="space-y-4">
        <div className="bg-white rounded-2xl border border-[#e2e8f0]/80 overflow-hidden shadow-3xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[850px] border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
                  <th className="py-4 px-6 md:w-[130px]">ID</th>
                  <th className="py-4 px-6 md:w-[220px]">STUDENT</th>
                  <th className="py-4 px-6">RESEARCH TITLE</th>
                  <th className="py-4 px-6 md:w-[200px]">RECOMMENDED PANEL</th>
                  <th className="py-4 px-6 md:w-[110px]">DATE</th>
                  <th className="py-4 px-6 md:w-[130px]">STATUS</th>
                  <th className="py-4 px-6 text-center md:w-[90px]">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-brand-navy">
                {paginatedRecs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                      No recommendations matched your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRecs.map((row) => {
                    const studentInitials = row.studentName
                      .split(' ')
                      .slice(0, 2)
                      .map(tok => tok[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <tr 
                        key={row.id} 
                        className="hover:bg-slate-50/40 transition-colors"
                      >
                        {/* ID */}
                        <td className="py-5 px-6 font-mono font-black text-slate-500">
                          {row.id}
                        </td>

                        {/* STUDENT name and id */}
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8.5 h-8.5 bg-blue-50/90 text-blue-600 font-extrabold text-[10px] rounded-full flex items-center justify-center shrink-0 border border-blue-100/40 select-none">
                              {studentInitials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-brand-navy block truncate">
                                {row.studentName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 font-bold block mt-0.5">
                                ID: {row.studentId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* RESEARCH TITLE */}
                        <td className="py-5 px-6 font-semibold text-slate-500 max-w-[280px] truncate leading-relaxed" title={row.researchTitle}>
                          {row.researchTitle}
                        </td>

                        {/* RECOMMENDED PANEL */}
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{row.recommendedPanel}</span>
                          </div>
                        </td>

                        {/* SUBMISSION DATE */}
                        <td className="py-5 px-6 font-extrabold text-slate-400">
                          {row.date}
                        </td>

                        {/* STATUS BADGES MAPPED */}
                        <td className="py-5 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border select-none ${
                            row.status === 'Approved'
                              ? 'bg-[#e6fbf2] text-[#00a15c] border-[#bef5db]'
                              : row.status === 'Pending Approval'
                              ? 'bg-[#eff6ff] text-blue-650 border-blue-100 text-blue-600'
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {row.status}
                          </span>
                        </td>

                        {/* ACTION View trigger */}
                        <td className="py-5 px-6 text-center select-none">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDetailId(row.id);
                              if (onViewRecommendation) {
                                onViewRecommendation(row.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-205 border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-lg text-slate-800 transition cursor-pointer font-bold text-xs shadow-3xs"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar container */}
          <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs select-none">
            <span className="text-slate-450 text-slate-400 font-bold font-sans">
              Showing {filteredRecommendations.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(filteredRecommendations.length, currentPage * itemsPerPage)} of {filteredRecommendations.length} entries
            </span>
            
            <div className="flex items-center gap-1.5">
              {/* Previous page arrow toggle */}
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors cursor-pointer border border-slate-200/70"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* Dynamic Pages */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                    currentPage === pNum
                      ? 'bg-brand-navy text-white'
                      : 'hover:bg-slate-100 text-slate-600 border border-transparent'
                  }`}
                >
                  {pNum}
                </button>
              ))}

              {/* Next page toggle */}
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors cursor-pointer border border-slate-200/70"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Helper policy advisory box info (Fulfills visual identity block integration matches design system) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none font-sans mt-4">
        <div className="bg-[#f8fafc]/55 border border-slate-150 p-5 rounded-2xl flex gap-3 text-left">
          <div className="w-8.5 h-8.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-slate-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-black text-brand-navy uppercase tracking-wider">
              Recommendation Milestones
            </h4>
            <p className="text-slate-450 text-slate-500 text-xs font-medium leading-relaxed">
              Approved recommendations are locked for scheduling verification. Pending statuses imply coordinator validation stage reviews are actively moving.
            </p>
          </div>
        </div>

        <div className="bg-[#f8fafc]/55 border border-slate-150 p-5 rounded-2xl flex gap-3 text-left">
          <div className="w-8.5 h-8.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-black text-brand-navy uppercase tracking-wider">
              Workload Restrictions
            </h4>
            <p className="text-slate-450 text-slate-500 text-xs font-medium leading-relaxed">
              Assignments keep each selected lecturer bound to the university quota parameters (max 5 concurrent panel seats per academic calendar).
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Detail Drawer Block */}
      <RecommendationDetailsDrawer
        isOpen={!!selectedDetailId}
        onClose={() => setSelectedDetailId(null)}
        recommendation={activeDetailRecord}
      />

    </div>
  );
};
