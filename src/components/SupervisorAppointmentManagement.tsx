/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserX, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  SlidersHorizontal, 
  Download, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Info,
  Mail,
  User,
  Calendar,
  Eye,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SupervisorWorkloadMonitoring } from './SupervisorWorkloadMonitoring';

export interface SupervisorRecord {
  studentId: string;
  studentName: string;
  programme: string;
  supervisor: string;
  status: 'Approved' | 'Pending' | 'No Supervisor' | 'Workload Alert' | 'Rejected';
  updatedDate: string;
  email?: string;
  semester?: string;
  researchTopic?: string;
  researchArea?: string;
  abstract?: string;
  appointmentId?: string;
  workloadLimit?: string;
  approvedDate?: string;
  releasedDate?: string;
  panelMemberName?: string;
  panelAssignedDate?: string;
}

interface SupervisorAppointmentManagementProps {
  onNavigateToWorkload?: () => void;
}

export const SupervisorAppointmentManagement: React.FC<SupervisorAppointmentManagementProps> = ({ 
  onNavigateToWorkload 
}) => {
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // View State for switching between List and Detail view
  const [viewState, setViewState] = useState<'list' | 'detail' | 'workload'>('list');
  const [selectedRecord, setSelectedRecord] = useState<SupervisorRecord | null>(null);

  // Base list of supervisor appointment records (corrected the corrupted text with extra high-fidelity fields)
  const [records, setRecords] = useState<SupervisorRecord[]>([
    {
      studentId: 'MEA2301184',
      studentName: 'Sarah Natasha',
      programme: 'MSc. Computer Science',
      supervisor: 'Dr. Siti Noor',
      status: 'Approved',
      updatedDate: '14 Oct 2025',
      email: 'sarah.natasha@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Blockchain-Based Verification Framework for Academic Credentials"',
      researchArea: 'Blockchain / Academic Credential Verification',
      abstract: 'This research explores how blockchain can be used to verify academic credentials securely, reduce document fraud, and improve trust in postgraduate academic records. By leveraging decentralized ledgers and smart contracts, the study aims to create a tamper-proof system for real-time validation of degrees and transcripts across international institutional boundaries.',
      appointmentId: 'SV-APT-2025-014',
      workloadLimit: '4/5 Supervisees',
      approvedDate: '13 Oct 2025',
      releasedDate: '14 Oct 2025',
      panelMemberName: 'Assoc. Prof. Dr. Amina Malik',
      panelAssignedDate: '22 Nov 2025'
    },
    {
      studentId: 'MEA2400712',
      studentName: 'Nur Aina Rahman',
      programme: 'MSc. Computer Science',
      supervisor: 'Pending',
      status: 'Pending',
      updatedDate: '12 Oct 2025',
      email: 'nuraina@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Machine Learning Approaches for Dynamic Malware Classification"',
      researchArea: 'Cybersecurity / Applied Machine Learning',
      abstract: 'This study investigates deep neural networks for classify malware signatures in heterogeneous cloud workloads. The dynamic taxonomy will yield higher precision and faster execution over static hashes, defending container instances.',
      appointmentId: 'SV-APT-2025-089',
      workloadLimit: '1/5 Supervisees',
      approvedDate: 'Pending Review',
      releasedDate: 'Pending Release',
      panelMemberName: 'Dr. Sarah Lim',
      panelAssignedDate: '15 Nov 2025'
    },
    {
      studentId: 'MEA2400881',
      studentName: 'Kumar Raj',
      programme: 'MSc. Computer Science',
      supervisor: 'Not Assigned',
      status: 'No Supervisor',
      updatedDate: '10 Oct 2025',
      email: 'kumar.raj@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Privacy-Preserving Federated Learning on Edge Devices"',
      researchArea: 'Distributed Systems & Mobile Security',
      abstract: 'Abstract pending supervisor assignment. The proposed research focuses on decentralized optimization of deep models without exposing local user records to centralized entities.',
      appointmentId: 'SV-APT-2025-102',
      workloadLimit: 'N/A',
      approvedDate: 'N/A',
      releasedDate: 'N/A',
      panelMemberName: 'Not Assigned',
      panelAssignedDate: 'N/A'
    },
    {
      studentId: 'MEA2401023',
      studentName: 'Farah Nabila',
      programme: 'MSc. Data Science',
      supervisor: 'Dr. Aris Ghaffar',
      status: 'Workload Alert',
      updatedDate: '13 Oct 2025',
      email: 'farah.nabila@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Graph Neural Networks for Financial Fraud Identification"',
      researchArea: 'Graph Analytics / Deep Learning',
      abstract: 'This research plans to model transactions as complex multi-layer graphs. Graph Neural Networks will track pattern shifts, identifying anomalies before transaction propagation.',
      appointmentId: 'SV-APT-2025-045',
      workloadLimit: '5/5 Supervisees',
      approvedDate: '11 Oct 2025',
      releasedDate: '13 Oct 2025',
      panelMemberName: 'Dr. Robert Chen',
      panelAssignedDate: '28 Nov 2025'
    },
    {
      studentId: 'MEA2401301',
      studentName: 'Lim Wei',
      programme: 'MSc. Computer Science',
      supervisor: 'Prof. Dr. Ahmad Kamil',
      status: 'Rejected',
      updatedDate: '11 Oct 2025',
      email: 'limwei@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Heuristic Routing Protocols in Software-Defined Aerial Networks"',
      researchArea: 'Network Architecture / Network Virtualization',
      abstract: 'Investigating high-altitude aerial routing algorithms. Rejected due to alignment overlaps with standard department hardware tracks.',
      appointmentId: 'SV-APT-2025-003',
      workloadLimit: '3/5 Supervisees',
      approvedDate: 'Rejected',
      releasedDate: 'Rejected',
      panelMemberName: 'Dr. Jane Doe',
      panelAssignedDate: '10 Nov 2025'
    },
    {
      studentId: 'MEA2401415',
      studentName: 'Azizul Ibrahim',
      programme: 'MSc. Software Engineering',
      supervisor: 'Dr. Sarah Lim',
      status: 'Approved',
      updatedDate: '15 Oct 2025',
      email: 'azizul.i@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Automated Security Patch Verification via Static Code Logic"',
      researchArea: 'Software Security / Code Automation',
      abstract: 'Analyzing continuous delivery pipelines to detect vulnerabilities immediately during branch builds. Automated testing will generate proof-of-correctness theorems for common CVEs.',
      appointmentId: 'SV-APT-2025-031',
      workloadLimit: '3/5 Supervisees',
      approvedDate: '14 Oct 2025',
      releasedDate: '15 Oct 2025',
      panelMemberName: 'Assoc. Prof. Dr. Amina Malik',
      panelAssignedDate: '12 Nov 2025'
    },
    {
      studentId: 'MEA2401590',
      studentName: 'Chloe Ding',
      programme: 'MSc. Computer Science',
      supervisor: 'Dr. Robert Chen',
      status: 'Approved',
      updatedDate: '16 Oct 2025',
      email: 'chloe.ding@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Visual Question Answering Models for Low-Resource Languages"',
      researchArea: 'Computer Vision / NLP',
      abstract: 'Exploring cross-lingual zero-shot visual reasoning frameworks. The project leverages visual attention mechanisms and tiny language model decoders adapted for Southeast Asian speech.',
      appointmentId: 'SV-APT-2025-067',
      workloadLimit: '2/5 Supervisees',
      approvedDate: '15 Oct 2025',
      releasedDate: '16 Oct 2025',
      panelMemberName: 'Dr. Sarah Lim',
      panelAssignedDate: '19 Nov 2025'
    },
    {
      studentId: 'MEA2401612',
      studentName: 'Siddharth Sen',
      programme: 'MSc. Data Science',
      supervisor: 'Dr. Jane Doe',
      status: 'Pending',
      updatedDate: '12 Oct 2025',
      email: 'siddharth@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Clustering Approaches for High-Dimensional Genomic Datasets"',
      researchArea: 'Bioinformatics / Unsupervised Learning',
      abstract: 'Formulating robust proximity metrics to tackle sparsity in genetic sequences. Project targets identification of latent markers for metabolic anomalies.',
      appointmentId: 'SV-APT-2025-059',
      workloadLimit: '4/5 Supervisees',
      approvedDate: 'Pending Review',
      releasedDate: 'Pending Release',
      panelMemberName: 'Dr. Robert Chen',
      panelAssignedDate: '11 Nov 25'
    },
    {
      studentId: 'MEA2401788',
      studentName: 'Farhan Hanif',
      programme: 'MSc. Information Technology',
      supervisor: 'Assoc. Prof. Dr. Amina Malik',
      status: 'No Supervisor',
      updatedDate: '10 Oct 2025',
      email: 'farhan.h@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Cloud Resource Orchestration for IoT Event Processing"',
      researchArea: 'Edge Computing / IT Management',
      abstract: 'Analyzing edge gateway layouts for micro-event delivery. Currently seeking supervisor expert in real-time embedded communication protocols.',
      appointmentId: 'SV-APT-2025-099',
      workloadLimit: 'N/A',
      approvedDate: 'N/A',
      releasedDate: 'N/A',
      panelMemberName: 'Not Assigned',
      panelAssignedDate: 'N/A'
    },
    {
      studentId: 'MEA2401920',
      studentName: 'Zahra Al-Habshi',
      programme: 'MSc. Computer Science',
      supervisor: 'Dr. Siti Noor',
      status: 'Workload Alert',
      updatedDate: '14 Oct 2025',
      email: 'zahra.ah@student.fsktm.edu.my',
      semester: 'Sem 1 2024/2025',
      researchTopic: '"Self-Supervised Contrastive Learning in Remote Sensing"',
      researchArea: 'Computer Vision / Geotechnical Data',
      abstract: 'Analyzing multi-spectral satellite tiles using vision transformer backbones. This study reduces label-dataset dependency, detecting physical layout shifts.',
      appointmentId: 'SV-APT-2025-048',
      workloadLimit: '4/5 Supervisees',
      approvedDate: '12 Oct 2025',
      releasedDate: '14 Oct 2025',
      panelMemberName: 'Dr. Sarah Lim',
      panelAssignedDate: '25 Nov 2025'
    }
  ]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('All Programmes');
  const [semesterFilter, setSemesterFilter] = useState('All Semesters');
  
  // Tab/status filter state
  const [activeTab, setActiveTab] = useState<'All Records' | 'No Supervisor' | 'Pending' | 'Approved' | 'Rejected' | 'Workload Alert'>('All Records');

  // Applied filter state
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedProg, setAppliedProg] = useState('All Programmes');
  const [appliedSem, setAppliedSem] = useState('All Semesters');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleApplyFilters = () => {
    setAppliedSearch(searchQuery);
    setAppliedProg(programmeFilter);
    setAppliedSem(semesterFilter);
    setCurrentPage(1);
    showToast("Filters applied for supervisor records.");
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setProgrammeFilter('All Programmes');
    setSemesterFilter('All Semesters');
    setAppliedSearch('');
    setAppliedProg('All Programmes');
    setAppliedSem('All Semesters');
    setActiveTab('All Records');
    setCurrentPage(1);
    showToast("Filters reset to default.");
  };

  // Process filters
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Search Box: name, id, supervisor
      const term = appliedSearch.toLowerCase();
      const matchSearch = !term || 
        rec.studentName.toLowerCase().includes(term) ||
        rec.studentId.toLowerCase().includes(term) ||
        rec.supervisor.toLowerCase().includes(term) ||
        rec.programme.toLowerCase().includes(term);

      // Programme
      const matchProg = appliedProg === 'All Programmes' || rec.programme === appliedProg;

      // Status tab
      const matchTab = activeTab === 'All Records' || rec.status === activeTab;

      return matchSearch && matchProg && matchTab;
    });
  }, [records, appliedSearch, appliedProg, activeTab]);

  // Paginated records helper
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;

  // Handles export interaction
  const handleExportData = () => {
    showToast("Downloading supervisor_appointments_report.csv");
  };

  if (viewState === 'workload') {
    return (
      <SupervisorWorkloadMonitoring onBack={() => setViewState('list')} />
    );
  }

  if (viewState === 'detail' && selectedRecord) {
    const r = selectedRecord;
    return (
      <div id="sup-detail-viewport" className="space-y-6 animate-fade-in text-left font-sans text-xs">
        {/* Toast Alert Banner */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-6 right-6 z-20 bg-[#0c1424] text-white py-3 px-5 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold font-sans border border-slate-700"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back Link */}
        <div className="flex">
          <button 
            onClick={() => {
              setViewState('list');
              showToast("Returned to Supervisor Appointment Management");
            }} 
            className="group flex items-center gap-2 text-xs font-extrabold text-[#0c1424] hover:text-[#3b82f6] transition-colors uppercase tracking-wider mb-2 cursor-pointer border border-slate-205 rounded-xl px-4 py-2.5 bg-white shadow-3xs"
          >
            <ChevronLeft className="w-4.5 h-4.5 transition-transform group-hover:-translate-x-0.5 text-slate-500" />
            <span>Back to Supervisor Appointment Management</span>
          </button>
        </div>

        {/* Page Header with Session Badge */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
          <div>
            <h1 className="page-title">
              Supervisor Appointment Detail
            </h1>
            <p className="text-slate-505 text-xs md:text-sm font-semibold mt-1 leading-relaxed text-slate-500">
              View student supervision details, appointment status, related records, and supporting documents.
            </p>
          </div>
          <div className="bg-[#0c1424] text-white text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-md shrink-0">
            SESSION 2024/2025
          </div>
        </div>

        {/* Grid Layout of Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
          
          {/* Left Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Student Profile Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-3xs space-y-5 text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#eff6ff] text-[#3b82f6] font-black text-lg rounded-xl flex items-center justify-center uppercase tracking-wider shrink-0 shadow-3xs border border-indigo-100">
                  {r.studentName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0c1424]">{r.studentName}</h3>
                  <div className="mt-1.5 flex items-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[9px] font-black uppercase tracking-wider select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {r.status === 'No Supervisor' ? 'APPROVED' : r.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-4 font-sans">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    Student ID
                  </span>
                  <span className="font-mono text-xs font-black text-slate-800 block mt-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    {r.studentId}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    Programme
                  </span>
                  <span className="text-xs font-bold text-slate-800 block mt-1">
                    {r.programme}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    Semester
                  </span>
                  <span className="text-xs font-bold text-[#0c1424] block mt-1">
                    {r.semester || 'Sem 1 2024/2025'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                    Email
                  </span>
                  <span className="text-xs font-semibold text-[#0c1424] hover:text-blue-600 block mt-1 break-all select-all">
                    {r.email || `${r.studentName.toLowerCase().replace(/\s+/g, '')}@student.fsktm.edu.my`}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment Information Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-3xs space-y-5 text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="w-4 h-4 text-[#0c1424]" />
                <span className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider">
                  Appointment Info
                </span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Appointment ID</span>
                  <span className="font-mono font-black text-[#0c1424]">
                    {r.appointmentId || 'SV-APT-2025-014'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Supervisor</span>
                  <span className="font-black text-[#0c1424]">
                    {r.supervisor === 'Not Assigned' ? 'Dr. Siti Noor' : r.supervisor}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Workload</span>
                  <span className="font-black text-[#0c1424]">
                    {r.status === 'No Supervisor' ? '4/5 Supervisees' : (r.workloadLimit || '4/5 Supervisees')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Approved Date</span>
                  <span className="font-bold text-[#0c1424]">
                    {r.status === 'Pending' || r.status === 'No Supervisor' ? '13 Oct 2025' : (r.approvedDate || '13 Oct 2025')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">Released Date</span>
                  <span className="font-bold text-[#0c1424]">
                    {r.status === 'Pending' || r.status === 'No Supervisor' ? '14 Oct 2025' : (r.releasedDate || '14 Oct 2025')}
                  </span>
                </div>
              </div>
            </div>

            {/* Evaluation Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-3xs text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <BookOpen className="w-4 h-4 text-[#0c1424]" />
                <span className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider">
                  Evaluation Summary
                </span>
              </div>

              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100">
                  <AlertCircle className="w-5 h-5 text-slate-500 opacity-40 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-xs text-center">No evaluation records available</h4>
                <p className="text-[10px] text-slate-400 font-bold max-w-[210px] leading-relaxed text-center">
                  Student has not yet reached the evaluation stage of the appointment process.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans">Status:</span>
                <span className="px-2.5 py-1 bg-slate-150 border border-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider rounded-lg">
                  NOT STARTED
                </span>
              </div>
            </div>

          </div>

          {/* Right Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Research Information Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-3xs space-y-5 text-left">
              <div className="flex items-center gap-2 pb-1">
                <BookOpen className="w-4.5 h-4.5 text-[#0c1424]" />
                <span className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider">
                  Research Information
                </span>
              </div>

              <div className="bg-[#f8fafc] border border-slate-150 rounded-2xl p-5 space-y-2">
                <h4 className="text-sm font-extrabold text-[#0c1424] leading-snug">
                  {r.researchTopic || '"Blockchain-Based Verification Framework for Academic Credentials"'}
                </h4>
                <span className="text-[10.5px] font-black text-slate-500 block tracking-wide">
                  Area: {r.researchArea || 'Blockchain / Academic Credential Verification'}
                </span>
              </div>

              <div className="space-y-2 font-sans">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  ABSTRACT
                </span>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  {r.abstract || 'This research explores how blockchain can be used to verify academic credentials securely, reduce document fraud, and improve trust in postgraduate academic records. By leveraging decentralized ledgers and smart contracts, the study aims to create a tamper-proof system for real-time validation of degrees and transcripts across international institutional boundaries.'}
                </p>
              </div>
            </div>

            {/* Status History Card (Timeline design) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-3xs text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <FileText className="w-4.5 h-4.5 text-[#0c1424]" />
                <span className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider">
                  Status History
                </span>
              </div>

              <div className="relative pl-6 border-l-2 border-slate-150 space-y-6 ml-2.5 py-1">
                {/* Event 1 */}
                <div className="relative">
                  <span className="absolute -left-[32px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-4 ring-blue-50" />
                  <h4 className="font-extrabold text-[#0c1424] text-xs">Confirmation Released</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">14 Oct 2025 • 09:30 AM</p>
                </div>

                {/* Event 2 */}
                <div className="relative">
                  <span className="absolute -left-[32px] top-1 w-3.5 h-3.5 rounded-full bg-[#0c1424] border-2 border-white ring-4 ring-slate-100" />
                  <h4 className="font-extrabold text-[#0c1424] text-xs">Coordinator Approval</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">13 Oct 2025 • 02:45 PM</p>
                </div>

                {/* Event 3 */}
                <div className="relative">
                  <span className="absolute -left-[32px] top-1 w-3.5 h-3.5 rounded-full bg-[#0c1424] border-2 border-white ring-4 ring-slate-100" />
                  <h4 className="font-extrabold text-[#0c1424] text-xs">Supervisor Review</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">12 Oct 2025 • 11:15 AM</p>
                </div>

                {/* Event 4 */}
                <div className="relative">
                  <span className="absolute -left-[32px] top-1 w-3.5 h-3.5 rounded-full bg-[#0c1424] border-2 border-white ring-4 ring-slate-100" />
                  <h4 className="font-extrabold text-[#0c1424] text-xs">Request Submitted</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">10 Oct 2025 • 04:00 PM</p>
                </div>
              </div>
            </div>

            {/* Related Panel Status Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-3xs text-left">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <Users className="w-4.5 h-4.5 text-[#0c1424]" />
                <span className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider">
                  Related Panel Status
                </span>
              </div>

              <div className="bg-[#f8fafc] border border-slate-150 rounded-2xl p-4 flex items-center justify-between mb-4 shadow-3xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0c1424] text-white font-black text-xs rounded-lg flex items-center justify-center shrink-0">
                    {r.panelMemberName ? r.panelMemberName.split(' ').filter(n => !n.includes('.')).map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'AM'}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-850 text-xs">{r.panelMemberName || 'Assoc. Prof. Dr. Amina Malik'}</h5>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">Internal Panel Member</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Assigned</span>
                  <span className="text-xs font-black text-[#0c1424] block mt-1">{r.panelAssignedDate || '22 Nov 2025'}</span>
                </div>
              </div>

              <button 
                onClick={() => showToast(`Opening panel member record page for ${r.panelMemberName || 'Assoc. Prof. Dr. Amina Malik'}`)} 
                className="w-full py-2.5 border border-slate-250 hover:bg-slate-50 text-[#0c1424] font-black uppercase text-[10.5px] rounded-xl tracking-wider transition cursor-pointer text-center font-sans font-bold"
              >
                View Panel Record
              </button>
            </div>

          </div>

        </div>

        {/* Related Files block */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-3xs text-left mt-6">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider block">
                Related Files
              </span>
              <span className="text-[10px] font-bold text-slate-400 block mt-1">
                View and authenticate candidate research papers and credentials slips.
              </span>
            </div>
            <span className="bg-[#f1f5f9] text-slate-650 border border-slate-200 px-3 py-1 font-black uppercase text-[9px] tracking-wider rounded-full">
              3 Files Uploaded
            </span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="data-table min-w-[650px]">
              <thead>
                <tr className="data-thead bg-slate-50 select-none">
                  <th className="data-th px-6">File Name</th>
                  <th className="data-th px-6">Category</th>
                  <th className="data-th px-6">Uploaded Date</th>
                  <th className="data-th px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {/* File 1 */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-800 flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Proposal.pdf</span>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-500">
                    Research Proposal
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-500">
                    10 Oct 2025
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={() => showToast("Opening document: Proposal.pdf")} 
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 font-extrabold text-blue-500 transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>

                {/* File 2 */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-800 flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Supervisor Appointment Letter.pdf</span>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-500">
                    Official Letter
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-500">
                    14 Oct 2025
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={() => showToast("Opening document: Supervisor Appointment Letter.pdf")} 
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 font-extrabold text-blue-500 transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>

                {/* File 3 */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-800 flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Student Profile.pdf</span>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-500">
                    Student Record
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-500">
                    10 Oct 2025
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={() => showToast("Opening document: Student Profile.pdf")} 
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 font-extrabold text-blue-500 transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>

        {/* Notice Alert Banner */}
        <div className="bg-[#eff6ff] border border-blue-150 rounded-2xl p-5 text-left flex items-start gap-4 shadow-3xs mt-6">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider block">
              Confidential Administrative View
            </span>
            <p className="text-slate-650 text-xs font-semibold leading-relaxed text-slate-500">
              This page provides a read-only administrative view of the supervisor appointment record. Use the related management modules to update files, letters, panel records, or evaluation setup.
            </p>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div id="supervisor-mgmt-viewport" className="space-y-8 animate-fade-in text-left font-sans">
      
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-[#0c1424] text-white py-3 px-5 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold font-sans border border-slate-700"
          >
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div id="sup-page-header" className="text-left">
        <h1 className="page-title">
          Supervisor Appointment Management
        </h1>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 leading-relaxed max-w-3xl">
          Monitor supervisor appointment records, workload distribution, and records needing attention.
        </p>
      </div>

      {/* 4 Vitals Summary Cards matching wireframe exactly */}
      <div id="sup-vitals-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Students Without Supervisor */}
        <div className="bg-white border-l-4 border-l-rose-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
              Students Without Supervisor
            </span>
            <span className="text-3xl font-black text-[#0c1424] block pt-1">
              12
            </span>
            <span className="text-[10px] font-medium text-rose-600 block pt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              No approved supervisor record.
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Records */}
        <div className="bg-white border-l-4 border-l-blue-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
              Pending Records
            </span>
            <span className="text-3xl font-black text-[#0c1424] block pt-1">
              8
            </span>
            <span className="text-[10px] font-medium text-blue-600 block pt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Supervisor records still in workflow.
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Approved Supervisors */}
        <div className="bg-white border-l-4 border-l-emerald-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
              Approved Supervisors
            </span>
            <span className="text-3xl font-black text-slate-850 block pt-1">
              126
            </span>
            <span className="text-[10px] font-medium text-emerald-600 block pt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active approved appointments.
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Workload Alerts */}
        <div className="bg-white border-l-4 border-l-amber-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
              Workload Alerts
            </span>
            <span className="text-3xl font-black text-amber-500 block pt-1">
              3
            </span>
            <span className="text-[10px] font-medium text-amber-600 block pt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Lecturers near supervision limit.
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Core Layout Grid (Divided 8 cols with filters & table, 4 cols with Side widgets) */}
      <div id="sup-core-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* Left Side: Filter Panels and Records Database Table */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Search and Filters Block */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-3xs space-y-5 text-xs text-left">
            <div className="border-b border-slate-100 pb-3">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">
                Search & Filter Supervisor Records
              </span>
            </div>

            <div className="space-y-4">
              
              {/* Row 1: Search Box */}
              <div>
                <label htmlFor="search-input" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Search Records
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student name, ID, supervisor, or research title"
                    className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition font-semibold text-xs text-slate-700"
                  />
                </div>
              </div>

              {/* Row 2: Programme and Semester Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label htmlFor="prog-select" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Programme
                  </label>
                  <div className="relative">
                    <select
                      id="prog-select"
                      value={programmeFilter}
                      onChange={(e) => setProgrammeFilter(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 appearance-none font-sans text-xs font-bold text-slate-700 font-bold"
                    >
                      <option>All Programmes</option>
                      <option>MSc. Computer Science</option>
                      <option>MSc. Data Science</option>
                      <option>MSc. Software Engineering</option>
                      <option>MSc. Information Technology</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="sem-select" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Semester
                  </label>
                  <div className="relative">
                    <select
                      id="sem-select"
                      value={semesterFilter}
                      onChange={(e) => setSemesterFilter(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 appearance-none font-sans text-xs font-bold text-slate-700 font-bold"
                    >
                      <option>All Semesters</option>
                      <option>Semester 1, 2024/2025</option>
                      <option>Semester 2, 2024/2025</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                  </div>
                </div>

              </div>

              {/* Row 3: Action Button combined with tab selector for smooth UX */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                
                <div className="flex flex-wrap gap-1.5">
                  {(['All Records', 'No Supervisor', 'Pending', 'Approved', 'Rejected', 'Workload Alert'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1.5 text-[10.5px] font-black transition rounded-lg ${
                          isActive 
                            ? 'bg-[#0c1424] text-white' 
                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 hover:bg-slate-50 border border-slate-200 font-extrabold text-[10.5px] rounded-xl uppercase transition cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-[#0c1424] hover:bg-slate-850 text-white font-black text-[10.5px] rounded-xl uppercase tracking-wider transition cursor-pointer shadow-3xs"
                  >
                    Apply Filters
                  </button>
                </div>

              </div>

            </div>
          </div>

          {/* Supervisor Appointment Records Card Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs text-left">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-[#0c1424] text-xs uppercase tracking-wider block">
                  Supervisor Appointment Records
                </span>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">
                  View and monitor supervisor appointment records across students and lecturers.
                </span>
              </div>

              <button
                onClick={handleExportData}
                className="inline-flex items-center gap-1.5 text-[10.5px] font-black text-slate-500 hover:text-[#0c1424] transition uppercase tracking-wider cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table min-w-[700px] text-xs">
                <thead>
                  <tr className="data-thead bg-slate-50 select-none">
                    <th className="data-th px-6">Student ID</th>
                    <th className="data-th px-6">Student Name</th>
                    <th className="data-th px-6">Programme</th>
                    <th className="data-th px-6">Supervisor</th>
                    <th className="data-th px-6 text-center">Status</th>
                    <th className="data-th px-6">Updated Date</th>
                    <th className="data-th px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((r) => (
                      <tr key={r.studentId} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* Student ID */}
                        <td className="py-4 px-6 font-semibold text-slate-500 font-mono text-[11px]">
                          {r.studentId}
                        </td>

                        {/* Student Name */}
                        <td className="py-4 px-6 font-extrabold text-[#0c1424] text-xs">
                          {r.studentName}
                        </td>

                        {/* Programme */}
                        <td className="py-4 px-6 font-bold text-slate-500">
                          {r.programme}
                        </td>

                        {/* Supervisor */}
                        <td className={`py-4 px-6 font-black ${
                          r.supervisor === 'Not Assigned' ? 'text-red-500 font-extrabold' : 'text-[#0c1424]'
                        }`}>
                          {r.supervisor}
                        </td>

                        {/* Status chip */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center">
                            {r.status === 'Approved' ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 tracking-wide font-black text-[9px] uppercase rounded-full border border-emerald-100">
                                Approved
                              </span>
                            ) : r.status === 'Pending' ? (
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-600 tracking-wide font-black text-[9px] uppercase rounded-full border border-blue-100">
                                Pending
                              </span>
                            ) : r.status === 'No Supervisor' ? (
                              <span className="px-2.5 py-1 bg-red-50 text-red-650 tracking-wide font-black text-[9px] uppercase rounded-full border border-red-100">
                                No Supervisor
                              </span>
                            ) : r.status === 'Workload Alert' ? (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 tracking-wide font-black text-[9px] uppercase rounded-full border border-amber-100">
                                Workload Alert
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 tracking-wide font-black text-[9px] uppercase rounded-full border border-slate-200">
                                Rejected
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Updated Date */}
                        <td className="py-4 px-6 font-bold text-slate-500">
                          {r.updatedDate}
                        </td>

                        {/* Action - View Button */}
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => {
                              setSelectedRecord(r);
                              setViewState('detail');
                              showToast(`Loaded supervisor details for ${r.studentName}`);
                            }}
                            className="px-3 py-1.5 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition shadow-3xs hover:shadow-2xs cursor-pointer"
                          >
                            View
                          </button>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No supervisor records found matching the applied criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination block */}
            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex items-center justify-between font-sans text-xs select-none">
              <span className="text-slate-450 font-semibold">
                Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-45 hover:bg-slate-50 transition cursor-pointer font-bold"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }).map((_, inx) => {
                  const pNum = inx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition cursor-pointer ${
                        currentPage === pNum 
                          ? 'bg-[#0c1424] text-white border border-[#0c1424]' 
                          : 'bg-white border border-slate-205 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-45 hover:bg-slate-50 transition cursor-pointer font-bold"
                >
                  Next
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Right Side: Interactive widgets panel matching layout precisely */}
        <div id="sup-sidebar-widgets" className="lg:col-span-4 space-y-6">
          
          {/* Records Needing Attention */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden text-left">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200/60 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              <span className="font-extrabold text-[#0c1424] text-[10.5px] uppercase tracking-wider">
                Records Needing Attention
              </span>
            </div>

            <div className="divide-y divide-slate-100 font-sans">
              
              <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#0c1424] text-xs">
                    Students without approved supervisor
                  </h4>
                  <span className="text-[10px] font-bold text-rose-600">
                    12 records outstanding
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('No Supervisor');
                    setCurrentPage(1);
                    showToast("Filtering to 'No Supervisor' records.");
                  }}
                  className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer focus:outline-none"
                >
                  Open
                </button>
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#0c1424] text-xs">
                    Supervisor records pending over 7 days
                  </h4>
                  <span className="text-[10px] font-bold text-amber-600">
                    4 records in queue
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('Pending');
                    setCurrentPage(1);
                    showToast("Filtering to 'Pending' records.");
                  }}
                  className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer focus:outline-none"
                >
                  Open
                </button>
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#0c1424] text-xs">
                    Lecturers near workload limit
                  </h4>
                  <span className="text-[10px] font-bold text-amber-600">
                    3 lecturers identified
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('Workload Alert');
                    setCurrentPage(1);
                    showToast("Filtering to 'Workload Alert' records.");
                  }}
                  className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer focus:outline-none"
                >
                  Open
                </button>
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#0c1424] text-xs">
                    Missing confirmation letters
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    2 records requiring file
                  </span>
                </div>
                <button
                  onClick={() => showToast("Loading checklist validation for outstanding digital acceptance slips...")}
                  className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer focus:outline-none"
                >
                  Open
                </button>
              </div>

            </div>
          </div>

          {/* Supervisor Workload Snapshot */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden text-left">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200/60 flex items-center justify-between">
              <span className="font-extrabold text-[#0c1424] text-[10.5px] uppercase tracking-wider block">
                Supervisor Workload Snapshot
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>

            <div className="p-5 space-y-4 font-sans text-xs">
              
              {/* Dr Siti Noor */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-[#0c1424] font-extrabold">Dr. Siti Noor</span>
                  <span className="text-amber-600 uppercase text-[9px] tracking-wide font-black">Near Limit</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                  <span>4 / 5 students assigned</span>
                </div>
                <div className="w-full h-2 bg-slate-105 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '80%' }} />
                </div>
              </div>

              {/* Dr Aris Ghaffar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-[#0c1424] font-extrabold">Dr. Aris Ghaffar</span>
                  <span className="text-red-650 uppercase text-[9px] tracking-wide font-black">Full</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                  <span>5 / 5 students assigned</span>
                </div>
                <div className="w-full h-2 bg-slate-105 rounded-full overflow-hidden">
                  <div className="h-full bg-red-650 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Dr Wey Cheng */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-[#0c1424] font-extrabold">Dr. Wey Cheng</span>
                  <span className="text-emerald-600 uppercase text-[9px] tracking-wide font-black">Available</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                  <span>3 / 5 students assigned</span>
                </div>
                <div className="w-full h-2 bg-slate-105 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>

              {/* View All Workload router button */}
              <button
                onClick={() => {
                  setViewState('workload');
                  showToast("Opened Supervisor Workload Monitoring");
                }}
                className="w-full mt-2 py-2.5 border border-slate-250 hover:bg-slate-50 text-[#0c1424] font-black uppercase text-[10.5px] rounded-xl tracking-wider transition cursor-pointer text-center"
              >
                View All Workload
              </button>

            </div>
          </div>

          {/* Quick Tip Panel */}
          <div className="bg-[#eff6ff] border border-blue-150 rounded-2xl p-5 text-left space-y-3 shadow-3xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-extrabold text-[#0c1424] text-[10.5px] uppercase tracking-wider">
                Quick Tip
              </span>
            </div>
            <p className="text-slate-650 text-xs font-semibold leading-relaxed">
              All supervisor appointments must be ratified by the Postgraduate Committee after initial department approval.
            </p>
            <button
              onClick={() => showToast("Opening FSKTM academic policy outline document (PDF)...")}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-800 hover:underline mt-1 cursor-pointer"
            >
              <span>Read Policy Document</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
