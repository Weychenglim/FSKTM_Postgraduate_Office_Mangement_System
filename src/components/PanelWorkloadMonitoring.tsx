/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Download,
  Eye,
  ChevronDown,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  AlertTriangle,
  User,
  CheckSquare,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface LecturerWorkloadRecord {
  id: string; // LEC-XXX
  name: string;
  department: string;
  currentStudents: number;
  workloadLimit: number;
  availability: 'Available' | 'Near Limit' | 'Full Load';
  initials: string;
}

interface PanelWorkloadMonitoringProps {
  onBack: () => void;
}

export const PanelWorkloadMonitoring: React.FC<PanelWorkloadMonitoringProps> = ({ onBack }) => {
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Drawer and selected lecturer details state
  const [selectedLecturer, setSelectedLecturer] = useState<LecturerWorkloadRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Student details lookup matching high-fidelity reference precisely
  const academicStudentsMap = useMemo(() => {
    return {
      'LEC-001': [
        { name: 'Sarah Natasha', id: 'MEA2301184', topic: 'Blockchain-Based Verification Framework for Academic Credentials', date: '13 Oct 2025' },
        { name: 'Jason Lee', id: 'MEA2302199', topic: 'Quantum Computing Algorithms in Cryptographic Key Distribution', date: '05 Jan 2025' },
        { name: 'Nur Aina Rahman', id: 'MEA2400712', topic: 'Blockchain-Based Academic Record Verification', date: '20 Oct 2025' },
        { name: 'Kumar Raj', id: 'MEA2400881', topic: 'Cloud-Based Research Document Management', date: '10 Sep 2025' }
      ],
      'LEC-002': [
        { name: 'Azizul Ibrahim', id: 'MEA2301140', topic: 'Generative AI and Pattern Recognition Systems', date: '12 Nov 2025' },
        { name: 'Chloe Ding', id: 'MEA2301290', topic: 'Deep Learning frameworks in NLP Sentiment Tracking', date: '14 Nov 2025' },
        { name: 'Siddharth Sen', id: 'MEA2400115', topic: 'Reinforcement Learning in Virtual Sandbox Games', date: '08 Dec 2025' },
        { name: 'Farhan Hanif', id: 'MEA2400288', topic: 'Intelligent Swarm Agent Orchestration Protocols', date: '10 Dec 2025' },
        { name: 'Zahra Al-Habshi', id: 'MEA2400990', topic: 'Computer Vision Security Surveillance Architectures', date: '15 Dec 2025' }
      ],
      'LEC-003': [
        { name: 'Goh Boon Keng', id: 'MEA2301211', topic: 'High-Throughput Concurrent Network Packet Parsers', date: '11 Oct 2025' },
        { name: 'Elena Rostova', id: 'MEA2400320', topic: 'Distributed Consensus Engines for Multi-Tenant Clouds', date: '14 Oct 2025' },
        { name: 'Michael Tan', id: 'MEA2400650', topic: 'Microkernel Virtualization Vetting Under Sandbox Constraints', date: '01 Nov 2025' }
      ],
      'LEC-004': [
        { name: 'Danial Syafiq', id: 'MEA2301880', topic: 'Anomaly Identification in Time-Series Financial Ledgers', date: '30 Sep 2025' },
        { name: 'Lisa Montgomery', id: 'MEA2400199', topic: 'Neural Style Transfer Optimization on Low-Power IoT Chips', date: '15 Oct 2025' }
      ],
      'LEC-005': [
        { name: 'Ravi Teja', id: 'MEA2400810', topic: 'Automated Test Suite Synthesis from Natural Language User Stories', date: '22 Nov 2025' }
      ]
    } as Record<string, Array<{ name: string; id: string; topic: string; date: string }>>;
  }, []);

  // Base list of lecturers from high-fidelity reference + extra rows for proper page pagination
  const [lecturers, setLecturers] = useState<LecturerWorkloadRecord[]>([
    {
      id: 'LEC-001',
      name: 'Dr. Siti Noor',
      department: 'Faculty of Computing',
      currentStudents: 4,
      workloadLimit: 5,
      availability: 'Near Limit',
      initials: 'SN'
    },
    {
      id: 'LEC-002',
      name: 'Dr. Aris Ghaffar',
      department: 'Faculty of Computing',
      currentStudents: 5,
      workloadLimit: 5,
      availability: 'Full Load',
      initials: 'AG'
    },
    {
      id: 'LEC-003',
      name: 'Dr. Wey Cheng',
      department: 'Faculty of Computing',
      currentStudents: 3,
      workloadLimit: 5,
      availability: 'Available',
      initials: 'WC'
    },
    {
      id: 'LEC-004',
      name: 'Assoc. Prof. Dr. Amina Malik',
      department: 'Data Science',
      currentStudents: 2,
      workloadLimit: 5,
      availability: 'Available',
      initials: 'AM'
    },
    {
      id: 'LEC-005',
      name: 'Prof. Dr. Ahmad Kamil',
      department: 'Software Engineering',
      currentStudents: 1,
      workloadLimit: 5,
      availability: 'Available',
      initials: 'AK'
    },
    // Realistic extra entries so pagination is functional:
    {
      id: 'LEC-006',
      name: 'Dr. Robert Chen',
      department: 'Faculty of Computing',
      currentStudents: 3,
      workloadLimit: 5,
      availability: 'Available',
      initials: 'RC'
    },
    {
      id: 'LEC-007',
      name: 'Dr. Sarah Lim',
      department: 'Data Science',
      currentStudents: 4,
      workloadLimit: 5,
      availability: 'Near Limit',
      initials: 'SL'
    },
    {
      id: 'LEC-008',
      name: 'Prof. Dr. Harold Vance',
      department: 'Software Engineering',
      currentStudents: 5,
      workloadLimit: 5,
      availability: 'Full Load',
      initials: 'HV'
    },
    {
      id: 'LEC-009',
      name: 'Dr. Jane Doe',
      department: 'Information Technology',
      currentStudents: 2,
      workloadLimit: 5,
      availability: 'Available',
      initials: 'JD'
    },
    {
      id: 'LEC-010',
      name: 'Dr. Marcus Aurelius',
      department: 'Faculty of Computing',
      currentStudents: 0,
      workloadLimit: 5,
      availability: 'Available',
      initials: 'MA'
    },
    {
      id: 'LEC-011',
      name: 'Dr. Yusuf Islam',
      department: 'Data Science',
      currentStudents: 1,
      workloadLimit: 5,
      availability: 'Available',
      initials: 'YI'
    },
  ]);

  // Interactive UI Filter values
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [semesterFilter, setSemesterFilter] = useState('Semester 1, 2024/2025');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  // Actively applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    department: 'All Departments',
    semester: 'Semester 1, 2024/2025',
    status: 'All Statuses'
  });

  // Pagination state range
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleApplyFilters = () => {
    setAppliedFilters({
      search: searchQuery,
      department: departmentFilter,
      semester: semesterFilter,
      status: statusFilter
    });
    setCurrentPage(1);
    showToast("Workload filters applied successfully.");
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('All Departments');
    setSemesterFilter('Semester 1, 2024/2025');
    setStatusFilter('All Statuses');
    setAppliedFilters({
      search: '',
      department: 'All Departments',
      semester: 'Semester 1, 2024/2025',
      status: 'All Statuses'
    });
    setCurrentPage(1);
    showToast("Filters reset to default.");
  };

  // Perform client-side filter
  const filteredLecturers = useMemo(() => {
    return lecturers.filter(lec => {
      const searchLower = appliedFilters.search.toLowerCase();
      const matchSearch = !searchLower || 
        lec.name.toLowerCase().includes(searchLower) ||
        lec.id.toLowerCase().includes(searchLower) ||
        lec.department.toLowerCase().includes(searchLower);

      const matchDept = appliedFilters.department === 'All Departments' || 
        lec.department === appliedFilters.department;

      const matchStatus = appliedFilters.status === 'All Statuses' ||
        lec.availability === appliedFilters.status;

      return matchSearch && matchDept && matchStatus;
    });
  }, [lecturers, appliedFilters]);

  // Paginated partition view
  const paginatedLecturers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLecturers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLecturers, currentPage]);

  const totalPages = Math.ceil(filteredLecturers.length / itemsPerPage) || 1;

  // Stats calculation dynamically
  const totalPanelsCount = filteredLecturers.length;
  const availableCount = filteredLecturers.filter(l => l.availability === 'Available').length;
  const nearLimitCount = filteredLecturers.filter(l => l.availability === 'Near Limit').length;
  const fullLoadCount = filteredLecturers.filter(l => l.availability === 'Full Load').length;

  const availablePercentage = totalPanelsCount > 0 
    ? Math.round((availableCount / totalPanelsCount) * 100) 
    : 0;

  const handleExportCSV = () => {
    showToast("Compiling and downloading panel_workload_monitoring_report.csv");
  };

  return (
    <div id="panel-workload-viewport" className="space-y-8 animate-fade-in text-left font-sans">
      
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-brand-navy text-white py-3 px-5 rounded-xl shadow-sm flex items-center gap-3 text-xs font-bold font-sans border border-slate-700"
          >
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb & Navigation Heading */}
      <div id="workload-nav-header" className="space-y-1.5 text-left">
        <button
          onClick={onBack}
          className="back-link group mb-3"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Panel Appointment Management</span>
        </button>
        
        <h1 className="page-title">
          Panel Workload Monitoring
        </h1>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 leading-relaxed max-w-3xl">
          Monitor lecturer panel assignment loads by semester, department, and availability.
        </p>
      </div>

      {/* Summary Cards Grid Row */}
      <div id="workload-vitals-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Panels */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
            TOTAL PANELS
          </span>
          <span className="text-3xl font-black text-brand-navy block mt-3">
            {totalPanelsCount}
          </span>
        </div>

        {/* Available */}
        <div className="bg-white border-l-4 border-l-emerald-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
            AVAILABLE
          </span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-black text-slate-850">
              {availableCount}
            </span>
            <span className="text-xs font-bold text-emerald-600">
               {availablePercentage}%
            </span>
          </div>
        </div>

        {/* Near Limit */}
        <div className="bg-white border-l-4 border-l-amber-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
            NEAR LIMIT
          </span>
          <span className="text-3xl font-black text-amber-500 block mt-3">
            {nearLimitCount}
          </span>
        </div>

        {/* Full Load */}
        <div className="bg-white border-l-4 border-l-red-500 border border-y-slate-200 border-r-slate-200 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
            FULL LOAD
          </span>
          <span className="text-3xl font-black text-red-600 block mt-3">
            {fullLoadCount}
          </span>
        </div>

      </div>

      {/* Filter and Distribution Row Grid */}
      <div id="operations-layout-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start text-xs font-sans">
        
        {/* Filter Selection Panel (Span 8) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-3xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span className="font-extrabold text-brand-navy uppercase tracking-wider text-xs">
              Filter Panels
            </span>
          </div>

          <div className="space-y-4">
            
            {/* Row A: Search box and Department Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label htmlFor="search-input" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                  SEARCH
                </label>
                <div id="search-container" className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search lecturer name or department"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none transition font-semibold text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dept-selection" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                  DEPARTMENT
                </label>
                <div className="relative">
                  <select
                    id="dept-selection"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 appearance-none font-sans text-xs font-extrabold text-slate-700"
                  >
                    <option>All Departments</option>
                    <option>Faculty of Computing</option>
                    <option>Data Science</option>
                    <option>Software Engineering</option>
                    <option>Information Technology</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                </div>
              </div>

            </div>

            {/* Row B: Semester & Workload status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label htmlFor="semester-selection" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                  SEMESTER
                </label>
                <div className="relative">
                  <select
                    id="semester-selection"
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 appearance-none font-sans text-xs font-extrabold text-slate-700"
                  >
                    <option>Semester 1, 2024/2025</option>
                    <option>Semester 2, 2024/2025</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="status-selection" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                  WORKLOAD STATUS
                </label>
                <div className="relative">
                  <select
                    id="status-selection"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 appearance-none font-sans text-xs font-extrabold text-slate-700"
                  >
                    <option>All Statuses</option>
                    <option>Available</option>
                    <option>Near Limit</option>
                    <option>Full Load</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                </div>
              </div>

            </div>

            {/* Apply filters action buttons row */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-250 font-extrabold text-[11px] rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                Reset
              </button>
              
              <button
                onClick={handleApplyFilters}
                className="px-5 py-2.5 bg-brand-navy hover:bg-slate-800 text-white font-black text-[11px] rounded-xl uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Apply Filters</span>
              </button>
            </div>

          </div>
        </div>

        {/* Workload Distribution Summary Graph Card (Span 4) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-3xs flex flex-col justify-between h-full">
          <div className="space-y-4">
            <span className="text-[10px] font-black text-brand-navy uppercase tracking-widest block border-b border-slate-100 pb-3">
              WORKLOAD DISTRIBUTION
            </span>

            {/* Simulated bars matching high-fidelity screenshot exactly */}
            <div className="space-y-4 pt-1">
              
              {/* Available block */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 font-semibold">Available</span>
                  </div>
                  <span className="text-slate-850 font-extrabold">{availableCount}</span>
                </div>
                <div className="w-full h-2 bg-slate-105 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalPanelsCount > 0 ? (availableCount / totalPanelsCount) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Near Limit */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-slate-700 font-semibold">Near Limit</span>
                  </div>
                  <span className="text-slate-850 font-extrabold">{nearLimitCount}</span>
                </div>
                <div className="w-full h-2 bg-slate-105 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${totalPanelsCount > 0 ? (nearLimitCount / totalPanelsCount) * 100 : 0}%` }} />
                </div>
              </div>

              {/* Full Load */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-slate-700 font-semibold">Full Load</span>
                  </div>
                  <span className="text-slate-850 font-extrabold">{fullLoadCount}</span>
                </div>
                <div className="w-full h-2 bg-slate-105 rounded-full overflow-hidden">
                  <div className="h-full bg-red-650 rounded-full" style={{ width: `${totalPanelsCount > 0 ? (fullLoadCount / totalPanelsCount) * 100 : 0}%` }} />
                </div>
              </div>

            </div>
          </div>

          <p className="text-slate-450 text-[10.5px] font-medium leading-relaxed pt-5 border-t border-slate-100 mt-5">
            System-wide average panel assignment load is 2.8 students per panel against a cap of 5.0.
          </p>
        </div>

      </div>

      {/* Panel Workload Records Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs text-left">
        
        <div id="table-head-section" className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
            PANEL WORKLOAD RECORDS
          </span>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand-navy transition-colors focus:outline-none cursor-pointer uppercase tracking-wider text-[11px]"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Scrollable table ledger matching screenshot exact visual styling */}
        <div id="table-scroll-ledger" className="overflow-x-auto">
          <table className="w-full text-left min-w-[850px] border-collapse font-sans text-xs">
            <thead>
              <tr className="data-thead bg-slate-50 select-none">
                <th className="data-th">Lecturer ID</th>
                <th className="data-th">Lecturer Name</th>
                <th className="data-th">Department</th>
                <th className="data-th text-center">Current Panel Assignments</th>
                <th className="data-th text-center">Workload Limit</th>
                <th className="data-th text-center">Availability</th>
                <th className="data-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              
              {paginatedLecturers.length > 0 ? (
                paginatedLecturers.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-55 transition-colors">
                    
                    {/* ID */}
                    <td className="data-td font-semibold text-slate-500 font-mono text-[11px]">
                      {rec.id}
                    </td>

                    {/* Name block nested initials circle avatar */}
                    <td className="data-td">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold tracking-wider text-[11px]">
                          {rec.initials}
                        </div>
                        <span className="font-extrabold text-brand-navy text-xs">
                          {rec.name}
                        </span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="data-td font-bold text-slate-600">
                      {rec.department}
                    </td>

                    {/* Current Students load */}
                    <td className="data-td text-center font-black text-brand-navy text-sm">
                      {rec.currentStudents}
                    </td>

                    {/* Limit */}
                    <td className="data-td text-center font-bold text-slate-400 text-xs">
                      {rec.workloadLimit}
                    </td>

                    {/* Availability status color chips */}
                    <td className="data-td">
                      <div className="flex items-center justify-center">
                        {rec.availability === 'Available' ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 tracking-wide font-black text-[9px] uppercase rounded-full border border-emerald-100">
                            Available
                          </span>
                        ) : rec.availability === 'Near Limit' ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 tracking-wide font-black text-[9px] uppercase rounded-full border border-amber-100">
                            Near Limit
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-red-50 text-red-650 tracking-wide font-black text-[9px] uppercase rounded-full border border-red-100">
                            Full Load
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action Column view detail button */}
                    <td className="data-td text-right">
                      <button
                        onClick={() => {
                          setSelectedLecturer(rec);
                          setIsDrawerOpen(true);
                          showToast(`Opening workload detail drawer for ${rec.name}`);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-extrabold uppercase text-[10px] tracking-widest hover:underline cursor-pointer focus:outline-none"
                      >
                        View
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-450 font-semibold whitespace-nowrap">
                    No lecturer panel records match the applied filtration parameters.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

        {/* Pagination Block footer */}
        <div id="table-pagination-nav" className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
          
          <span className="text-slate-450 font-semibold">
            Showing {filteredLecturers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredLecturers.length)} of {filteredLecturers.length} panels
          </span>

          <div className="flex items-center gap-1.5 select-none">
            
            {/* Prev button */}
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 disabled:opacity-45 hover:bg-slate-50 transition cursor-pointer"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>

            {/* Numeric buttons */}
            {Array.from({ length: totalPages }).map((_, inx) => {
              const pNum = inx + 1;
              const isCurrent = currentPage === pNum;
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition cursor-pointer ${
                    isCurrent 
                      ? 'bg-brand-navy text-white border border-brand-navy' 
                      : 'bg-white border border-slate-205 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            {/* Next button */}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 disabled:opacity-45 hover:bg-slate-50 transition cursor-pointer"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>

          </div>

        </div>

      </div>

      {/* Lecturer Workload Detail Right Sliding Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedLecturer && (
          <>
            {/* Dimmed Background Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-brand-navy/60 z-40 backdrop-blur-sm cursor-pointer"
            />

            {/* Right Drawer Layout */}
            <motion.div
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 h-full w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl bg-slate-50 shadow-sm z-50 overflow-hidden flex flex-col justify-between border-l border-slate-200 text-left font-sans"
            >
              
              {/* Drawer Header */}
              <div className="bg-white p-5 border-b border-slate-200 flex items-center justify-between shadow-3xs">
                <h3 className="text-base font-extrabold text-brand-navy tracking-tight">
                  Lecturer Workload Detail
                </h3>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-navy hover:bg-slate-100 transition focus:outline-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                
                {/* 1. Lecturer Profile Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-3xs space-y-4">
                  <div className="flex items-start gap-4">
                    {selectedLecturer.id === 'LEC-001' ? (
                      <img 
                        src="/src/assets/images/prof_headshot_1779877027369.png" 
                        alt={selectedLecturer.name} 
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-250 shadow-3xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center font-black text-lg border border-blue-100 uppercase">
                        {selectedLecturer.initials}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-extrabold text-brand-navy text-xs sm:text-sm truncate leading-tight">
                          {selectedLecturer.name}
                        </h4>
                        
                        {selectedLecturer.availability === 'Available' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold text-[8px] uppercase rounded-full border border-emerald-100">
                            Available
                          </span>
                        ) : selectedLecturer.availability === 'Near Limit' ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-extrabold text-[8px] uppercase rounded-full border border-amber-100">
                            Near Limit
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-50 text-red-650 font-extrabold text-[8px] uppercase rounded-full border border-red-100">
                            Full Load
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-1.5 text-[11px] font-semibold text-slate-500">
                        <div className="flex justify-between">
                          <span className="text-slate-400">ID</span>
                          <span className="font-mono text-brand-navy font-bold">{selectedLecturer.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dept.</span>
                          <span className="text-brand-navy truncate max-w-[200px] text-right">{selectedLecturer.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Email</span>
                          <span className="text-blue-600 hover:underline">{selectedLecturer.id === 'LEC-001' ? 'siti.noor@fsktm.edu.my' : `${selectedLecturer.name.toLowerCase().replace(/[\s\.]+/g, '').replace(/[^a-z0-9]/g, '')}@fsktm.edu.my`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Workload Summary Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-3xs space-y-4">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                    <span className="font-extrabold text-brand-navy text-[10px] uppercase tracking-wider">
                      Workload Summary
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                      Sem 1 2024/2025
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-2 border-r border-slate-100">
                      <span className="text-xl sm:text-2xl font-black text-brand-navy block leading-none">
                        {selectedLecturer.currentStudents}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-450 uppercase block mt-1.5 leading-tight">
                        Assigned Panel Students
                      </span>
                    </div>

                    <div className="p-2 border-r border-slate-100">
                      <span className="text-xl sm:text-2xl font-black text-slate-500 block leading-none">
                        {selectedLecturer.workloadLimit}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-450 uppercase block mt-1.5 leading-tight">
                        Workload Limit
                      </span>
                    </div>

                    <div className="p-2">
                      <span className="text-xl sm:text-2xl font-black text-blue-600 block leading-none">
                        {Math.max(0, selectedLecturer.workloadLimit - selectedLecturer.currentStudents)}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-450 uppercase block mt-1.5 leading-tight">
                        Slots Available
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                      <span>Capacity Utilization</span>
                      <span className="text-brand-navy font-bold">{Math.round((selectedLecturer.currentStudents / selectedLecturer.workloadLimit) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-110 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedLecturer.availability === 'Full Load' ? 'bg-red-500' :
                          selectedLecturer.availability === 'Near Limit' ? 'bg-amber-500' : 'bg-blue-650'
                        }`} 
                        style={{ width: `${Math.round((selectedLecturer.currentStudents / selectedLecturer.workloadLimit) * 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Assigned Panel Students Table */}
                <div className="space-y-2">
                  <span className="font-extrabold text-brand-navy text-[10px] uppercase tracking-wider block text-left">
                    Active Assigned Panel Students
                  </span>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-[11px]">
                        <thead>
                          <tr className="data-thead bg-slate-50">
                            <th className="data-th w-5/12">Student & ID</th>
                            <th className="data-th w-7/12">Research Topic</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(academicStudentsMap[selectedLecturer.id] || []).length > 0 ? (
                            (academicStudentsMap[selectedLecturer.id] || []).map((student) => (
                              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="data-td">
                                  <div className="font-extrabold text-brand-navy break-words">
                                    {student.name}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                                    {student.id}
                                  </div>
                                </td>
                                <td className="data-td text-slate-600 font-medium leading-relaxed break-words py-2.5">
                                  {student.topic}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="py-6 text-center text-slate-400 font-medium">
                                No active student panel assignments.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 4. Recent Panel Appointments List */}
                <div className="space-y-2">
                  <span className="font-extrabold text-brand-navy text-[10px] uppercase tracking-wider block text-left">
                    Recent Panel Appointments
                  </span>

                  <div className="space-y-2.5">
                    {(academicStudentsMap[selectedLecturer.id] || []).slice(0, 3).map((student) => (
                      <div 
                        key={`${student.id}-appointment`}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-brand-navy text-xs truncate">
                            {student.name}
                          </h5>
                          <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                            {student.date}
                          </span>
                        </div>
                        
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[8px] uppercase tracking-wide rounded-full border border-emerald-100 flex-shrink-0">
                          Approved
                        </span>
                      </div>
                    ))}
                    {(academicStudentsMap[selectedLecturer.id] || []).length === 0 && (
                      <div className="bg-white border border-slate-150 p-4 rounded-xl text-center text-slate-400 font-medium text-xs">
                        No recent panel appointment actions.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Drawer Bottom Actions Footer */}
              <div className="bg-white p-5 border-t border-slate-200 flex items-center justify-between gap-3 shadow-sm">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-250 text-brand-navy hover:bg-slate-50 transition text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Close
                </button>
                
                <button
                  onClick={() => {
                    showToast(`Redirecting to panel assignments registry for ${selectedLecturer.name}...`);
                  }}
                  className="px-5 py-2.5 text-blue-600 hover:text-blue-800 transition text-[11px] font-black uppercase tracking-wider cursor-pointer font-sans"
                >
                  View Related Records
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
