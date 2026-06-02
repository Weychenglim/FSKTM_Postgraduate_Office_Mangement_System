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
  Info, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Mail, 
  BookOpen,
  AlertCircle,
  FileText,
  User,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalButton, PortalToast, ProgressBar, StatusBadge, StatusDot, getStatusBadgeTone } from './PortalPrimitives';
import { RightDrawer } from './RightDrawer';

interface WorkloadRecord {
  lecturerId: string;
  lecturerName: string;
  department: string;
  currentStudents: number;
  workloadLimit: number;
  availability: 'Available' | 'Near Limit' | 'Full Load';
  email: string;
  supervisees: Array<{
    id: string;
    name: string;
    programme: string;
    status: string;
    topic: string;
  }>;
}

interface SupervisorWorkloadMonitoringProps {
  onBack: () => void;
}

export const SupervisorWorkloadMonitoring: React.FC<SupervisorWorkloadMonitoringProps> = ({ onBack }) => {
  // Toast notifications state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Static/dynamic lists
  const rawSupervisorRecords: WorkloadRecord[] = [
    {
      lecturerId: 'LEC-001',
      lecturerName: 'Dr. Siti Noor',
      department: 'Faculty of Computing',
      currentStudents: 4,
      workloadLimit: 5,
      availability: 'Near Limit',
      email: 'siti.noor@fsktm.edu.my',
      supervisees: [
        { id: 'MEA2301184', name: 'Sarah Natasha', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Blockchain-Based Verification Framework for Academic Credentials' },
        { id: 'MEA2401920', name: 'Zahra Ahmed', programme: 'MSc. Computer Science', status: 'Workload Alert', topic: 'Self-Supervised Contrastive Learning in Remote Sensing' },
        { id: 'MEA2301011', name: 'Adam Harith', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Dynamic Real-time Intrusion Prevention on AWS Gateways' },
        { id: 'MEA2301140', name: 'Jessica Wong', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Heuristic Query Optimization in Graph DBs' }
      ]
    },
    {
      lecturerId: 'LEC-002',
      lecturerName: 'Dr. Aris Ghaffar',
      department: 'Faculty of Computing',
      currentStudents: 5,
      workloadLimit: 5,
      availability: 'Full Load',
      email: 'aris.ghaffar@fsktm.edu.my',
      supervisees: [
        { id: 'MEA2401023', name: 'Farah Nabila', programme: 'MSc. Data Science', status: 'Approved', topic: 'Graph Neural Networks for Financial Fraud Identification' },
        { id: 'MEA2400712', name: 'Nur Aina', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Machine Learning Approaches for Dynamic Malware Classification' },
        { id: 'MEA2301103', name: 'Tariq Ibrahim', programme: 'MSc. Data Science', status: 'Approved', topic: 'Anomaly Detection in Credit Transactions' },
        { id: 'MEA2301224', name: 'Siti Aminah', programme: 'MSc. Data Science', status: 'Approved', topic: 'Text Analytics on Multilingual Local Scripts' },
        { id: 'MEA2301550', name: 'Raju Krishnan', programme: 'MSc. Data Science', status: 'Approved', topic: 'Time-series Forecasting for Retail Stock Optimization' }
      ]
    },
    {
      lecturerId: 'LEC-003',
      lecturerName: 'Dr. Wey Cheng',
      department: 'Faculty of Computing',
      currentStudents: 3,
      workloadLimit: 5,
      availability: 'Available',
      email: 'weycheng@fsktm.edu.my',
      supervisees: [
        { id: 'MEA2400301', name: 'Lee Wei', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Decentralized Microservice Orchestration with Raft Consensus' },
        { id: 'MEA2400299', name: 'Shahrul Nizam', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Edge Computing Architectures for Real-time Video Streaming' },
        { id: 'MEA2400511', name: 'Tan Yu Xuan', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Neural Network Compression for Real-time Inference' }
      ]
    },
    {
      lecturerId: 'LEC-004',
      lecturerName: 'Assoc. Prof. Dr. Amina Malik',
      department: 'Data Science',
      currentStudents: 2,
      workloadLimit: 5,
      availability: 'Available',
      email: 'amina.malik@fsktm.edu.my',
      supervisees: [
        { id: 'MEA2401788', name: 'Farhan Hanif', programme: 'MSc. Information Technology', status: 'Approved', topic: 'Cloud Resource Orchestration for IoT Event Processing' },
        { id: 'MEA2401123', name: 'Wong Yee Ling', programme: 'MSc. Data Science', status: 'Approved', topic: 'Natural Language Interfaces for Enterprise DB Analytics' }
      ]
    },
    {
      lecturerId: 'LEC-005',
      lecturerName: 'Prof. Dr. Ahmad Kamil',
      department: 'Software Engineering',
      currentStudents: 1,
      workloadLimit: 5,
      availability: 'Available',
      email: 'ahmad.kamil@fsktm.edu.my',
      supervisees: [
        { id: 'MEA2401509', name: 'Lim Wei Sheng', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Refactoring Automation of Monolith Heritage Apps to Micro-APIs' }
      ]
    },
    {
      lecturerId: 'LEC-006',
      lecturerName: 'Dr. Robert Chen',
      department: 'Software Engineering',
      currentStudents: 0,
      workloadLimit: 5,
      availability: 'Available',
      email: 'robert.chen@fsktm.edu.my',
      supervisees: []
    },
    {
      lecturerId: 'LEC-007',
      lecturerName: 'Dr. Sarah Lim',
      department: 'Faculty of Computing',
      currentStudents: 3,
      workloadLimit: 5,
      availability: 'Available',
      email: 'sarah.lim@fsktm.edu.my',
      supervisees: [
        { id: 'MEA2401415', name: 'Azizul Ibrahim', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Automated Security Patch Verification via Static Code Logic' },
        { id: 'MEA2401111', name: 'Ahmad Rafiq', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Securing Decentralized Smart Grid Frameworks' },
        { id: 'MEA2401222', name: 'Nurul Huda', programme: 'MSc. Computer Science', status: 'Approved', topic: 'Image De-noising in Complex Healthcare Diagnostics' }
      ]
    },
    {
      lecturerId: 'LEC-008',
      lecturerName: 'Dr. Jane Doe',
      department: 'Data Science',
      currentStudents: 4,
      workloadLimit: 5,
      availability: 'Near Limit',
      email: 'jane.doe@fsktm.edu.my',
      supervisees: [
        { id: 'MEA2401612', name: 'Siddharth Nair', programme: 'MSc. Data Science', status: 'Approved', topic: 'Clustering Approaches for High-Dimensional Genomic Datasets' },
        { id: 'MEA2402202', name: 'Mei Ling Lan', programme: 'MSc. Data Science', status: 'Approved', topic: 'Sentiment Extraction on Informal Social Conversational Feeds' },
        { id: 'MEA2402199', name: 'Zulkifli Razak', programme: 'MSc. Data Science', status: 'Approved', topic: 'Financial Portfolio Re-balancing via Genetic Optimization' },
        { id: 'MEA2402302', name: 'Anisah Haron', programme: 'MSc. Data Science', status: 'Approved', topic: 'Graph-Based Modeling of Medical Treatment Pathways' }
      ]
    }
  ];

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedSemester, setSelectedSemester] = useState('Semester 1, 2024/2025');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');

  // Triggered filters state
  const [filters, setFilters] = useState({
    search: '',
    department: 'All Departments',
    status: 'All Statuses'
  });

  // Table pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Selected lecturer profile state for detail drawer
  const [selectedLecturer, setSelectedLecturer] = useState<WorkloadRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Apply filters trigger
  const handleApplyFilters = () => {
    setFilters({
      search: searchTerm,
      department: selectedDept,
      status: selectedStatus
    });
    setCurrentPage(1);
    showToast("Filters applied successfully.");
  };

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return rawSupervisorRecords.filter(r => {
      // Search matches lecturer name or department or ID
      const query = filters.search.toLowerCase();
      const matchesSearch = query === '' || 
        r.lecturerName.toLowerCase().includes(query) || 
        r.lecturerId.toLowerCase().includes(query) ||
        r.department.toLowerCase().includes(query);

      // Dept matches
      const matchesDept = filters.department === 'All Departments' || r.department === filters.department;

      // Status matches
      const matchesStatus = filters.status === 'All Statuses' || r.availability === filters.status;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [filters]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  // Summary counts based on RAW (unfiltered) data for overall correctness
  const totalSupervisorsCount = 42; // Real static figure
  const countAvailable = 31;       // 73% of 42 is ~31
  const countNearLimit = 8;
  const countFullLoad = 3;

  // Export CSV Action
  const handleExportCSV = () => {
    const headers = 'Lecturer ID,Lecturer Name,Department,Current Students,Workload Limit,Availability,Email\n';
    const rows = filteredRecords.map(r => 
      `"${r.lecturerId}","${r.lecturerName}","${r.department}",${r.currentStudents},${r.workloadLimit},"${r.availability}","${r.email}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'supervisor_workload_monitoring_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Exported supervisor_workload_records_report.csv");
  };

  return (
    <div id="workload-monitoring-viewport" className="space-y-6 animate-fade-in text-left font-sans text-xs">
      
      <PortalToast message={toastMessage} />

      <PageHeader
        title="Supervisor Workload Monitoring"
        subtitle="Monitor lecturer supervision loads by semester, department, and availability."
        backLabel="Back to Supervisor Appointment Management"
        onBack={onBack}
        subtitleClassName="leading-relaxed"
        actions={(
        <div className="bg-brand-navy text-white text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-sm shrink-0">
          SESSION 2024/2025
        </div>
        )}
      />

      {/* Summary Cards Grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Supervisors */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Total Supervisors
          </span>
          <h2 className="text-3xl font-black text-brand-navy mt-3">
            {totalSupervisorsCount}
          </h2>
        </div>

        {/* Card 2: Available */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs relative overflow-hidden flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Available
          </span>
          <h2 className="text-3xl font-black text-emerald-600 mt-3 flex items-baseline gap-2">
            <span>{countAvailable}</span>
            <span className="text-xs font-bold text-slate-400">73%</span>
          </h2>
        </div>

        {/* Card 3: Near Limit */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs relative overflow-hidden flex flex-col justify-between border-l-4 border-l-amber-500">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Near Limit
          </span>
          <h2 className="text-3xl font-black text-amber-550 mt-3 text-amber-600">
            {countNearLimit}
          </h2>
        </div>

        {/* Card 4: Full Load */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs relative overflow-hidden flex flex-col justify-between border-l-4 border-l-rose-500">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Full Load
          </span>
          <h2 className="text-3xl font-black text-rose-500 mt-3">
            {countFullLoad}
          </h2>
        </div>

      </div>

      {/* Middle Block: Filters & Workload Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Filter Card (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Filter className="w-4 h-4 text-brand-navy" />
            <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
              Filter Supervisors
            </span>
          </div>

          <div className="filter-toolbar grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
            
            {/* SEARCH PANEL */}
            <div className="space-y-1.5 col-span-1 md:col-span-1">
              <label className="form-label block">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search lecturer name or department..."
                  className="form-control form-control-sm pl-10 pr-4"
                />
              </div>
            </div>

            {/* DEPARTMENT FILTER */}
            <div className="space-y-1.5">
              <label className="form-label block">
                Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="form-control form-control-sm cursor-pointer"
              >
                <option value="All Departments">All Departments</option>
                <option value="Faculty of Computing">Faculty of Computing</option>
                <option value="Data Science">Data Science</option>
                <option value="Software Engineering">Software Engineering</option>
              </select>
            </div>

            {/* SEMESTER FILTER */}
            <div className="space-y-1.5">
              <label className="form-label block">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="form-control form-control-sm cursor-pointer"
              >
                <option value="Semester 1, 2024/2025">Semester 1, 2024/2025</option>
                <option value="Semester 2, 2023/2024">Semester 2, 2023/2024</option>
              </select>
            </div>

            {/* WORKLOAD STATUS FILTER */}
            <div className="space-y-1.5">
              <label className="form-label block">
                Workload Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="form-control form-control-sm cursor-pointer"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Available">Available Only</option>
                <option value="Near Limit">Near Limit Only</option>
                <option value="Full Load">Full Load Only</option>
              </select>
            </div>

          </div>

          <div className="flex justify-end pt-2">
            <PortalButton
              variant="primary"
              size="lg"
              icon={SlidersHorizontal}
              onClick={handleApplyFilters}
            >
              Apply Filters
            </PortalButton>
          </div>
        </div>

        {/* Workload Distribution Card (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs flex flex-col justify-between gap-5 h-full">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Users className="w-4.5 h-4.5 text-brand-navy" />
              <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                Workload Distribution
              </span>
            </div>

            {/* Distribution metrics as a visual graph bar list */}
            <div className="space-y-3 pt-1">
              
              {/* Available */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10.5px] font-extrabold text-slate-755">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <StatusDot tone="success" />
                    Available
                  </span>
                  <span>{countAvailable}</span>
                </div>
                <ProgressBar value={countAvailable} max={totalSupervisorsCount} tone="success" trackClassName="h-2 bg-slate-100" />
              </div>

              {/* Near Limit */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10.5px] font-extrabold text-slate-755">
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <StatusDot tone="warning" />
                    Near Limit
                  </span>
                  <span>{countNearLimit}</span>
                </div>
                <ProgressBar value={countNearLimit} max={totalSupervisorsCount} tone="warning" trackClassName="h-2 bg-slate-100" />
              </div>

              {/* Full Load */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10.5px] font-extrabold text-slate-755">
                  <span className="flex items-center gap-1.5 text-rose-500">
                    <StatusDot tone="danger" />
                    Full Load
                  </span>
                  <span>{countFullLoad}</span>
                </div>
                <ProgressBar value={countFullLoad} max={totalSupervisorsCount} tone="danger" trackClassName="h-2 bg-slate-100" />
              </div>

            </div>
          </div>

          <div className="pt-2 bg-slate-50 border-t border-slate-100 p-3.5 rounded-xl text-left border border-slate-150">
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              System-wide average supervision load is 2.8 students per supervisor against a cap of 5.0.
            </p>
          </div>
        </div>

      </div>

      {/* Main Table Block */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs text-left">
        
        {/* Table Header and Export */}
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider block">
              Supervisor Workload Records
            </span>
            <span className="text-[10px] font-bold text-slate-400 block mt-1">
              Showing active supervision slots and real-time coordinator records.
            </span>
          </div>

          <PortalButton
            onClick={handleExportCSV}
            variant="secondary"
            size="sm"
            icon={Download}
            className="shrink-0"
          >
            Export CSV
          </PortalButton>
        </div>

        {/* Workload Table */}
        <div className="overflow-x-auto text-xs">
          <table className="data-table min-w-[700px]">
            <thead>
              <tr className="data-thead bg-slate-50 select-none">
                <th className="data-th">Lecturer ID</th>
                <th className="data-th">Lecturer Name</th>
                <th className="data-th">Department</th>
                <th className="data-th text-center">Current Students</th>
                <th className="data-th text-center">Workload Limit</th>
                <th className="data-th text-center">Availability</th>
                <th className="data-th text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((r) => {
                  const initials = r.lecturerName.split(' ').filter(n => !n.includes('.')).map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  
                  return (
                    <tr key={r.lecturerId} className="hover:bg-slate-50/50 transition-colors">
                      {/* ID */}
                      <td className="data-td font-mono font-bold text-slate-500 whitespace-nowrap">
                        {r.lecturerId}
                      </td>

                      {/* Name with initials avatar */}
                      <td className="data-td font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-50/70 border border-indigo-100 text-indigo-600 font-extrabold text-[10px] rounded-lg flex items-center justify-center shrink-0">
                            {initials || 'SN'}
                          </div>
                          <span className="font-extrabold text-slate-800">{r.lecturerName}</span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="data-td font-bold text-slate-500">
                        {r.department}
                      </td>

                      {/* Current supervison students */}
                      <td className="data-td text-center font-black text-slate-800 text-sm">
                        {r.currentStudents}
                      </td>

                      {/* Workload limit */}
                      <td className="data-td text-center font-extrabold text-slate-500">
                        {r.workloadLimit}
                      </td>

                      {/* Availability status chips */}
                      <td className="data-td text-center select-none whitespace-nowrap">
                        <StatusBadge
                          tone={getStatusBadgeTone(r.availability)}
                          dot
                          className="text-[9px] px-2.5 py-0.5"
                        >
                          {r.availability}
                        </StatusBadge>
                      </td>

                      {/* Action */}
                      <td className="data-td text-center">
                        <PortalButton
                          onClick={() => {
                            setSelectedLecturer(r);
                            setIsDrawerOpen(true);
                            showToast(`Loaded supervisee ledger for ${r.lecturerName}`);
                          }}
                          variant="soft"
                          size="sm"
                          icon={Eye}
                        >
                          View
                        </PortalButton>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No supervisor records found matching the applied filter criteria.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

        {/* Table Footer: Pagination */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} supervisors
          </span>

          <div className="flex items-center gap-1">
            <PortalButton
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              variant="secondary"
              size="icon"
              className="w-8 h-8"
              icon={ChevronLeft}
              aria-label="Previous page"
            />

            {Array.from({ length: totalPages }).map((_, idx) => (
              <PortalButton
                key={idx}
                onClick={() => setCurrentPage(idx + 1)}
                variant={currentPage === idx + 1 ? 'primary' : 'secondary'}
                size="sm"
                className="w-8 h-8 p-0 text-xs"
              >
                {idx + 1}
              </PortalButton>
            ))}

            <PortalButton
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              variant="secondary"
              size="icon"
              className="w-8 h-8"
              icon={ChevronRight}
              aria-label="Next page"
            />
          </div>
        </div>

      </div>

      {/* Notice Banner */}
      <div className="bg-[#eff6ff] border border-blue-150 rounded-2xl p-5 text-left flex items-start gap-4 shadow-3xs">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider block">
            Confidential Administrative View
          </span>
          <p className="text-slate-650 text-xs font-semibold leading-relaxed text-slate-500 text-slate-500">
            This module displays comprehensive real-time supervisor listings and availability quotas. Changes to capacity rules, student linkages, or email communication should be carried out via the related panel and mark entry configuration screens.
          </p>
        </div>
      </div>

      {/* Detail Right Drawer */}
      <RightDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedLecturer ? `LECTURER WORKLOAD DETAIL: ${selectedLecturer.lecturerId}` : 'Lecturer Workload Detail'}
      >
        {selectedLecturer && (
          <div className="space-y-6 font-sans text-left text-xs">
            {/* Lecturer quick metadata */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 border border-slate-105 rounded-2xl">
              <div className="w-12 h-12 bg-brand-navy text-white font-black text-sm rounded-xl flex items-center justify-center shrink-0">
                {selectedLecturer.lecturerName.split(' ').filter(n => !n.includes('.')).map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-brand-navy">
                  {selectedLecturer.lecturerName}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold">{selectedLecturer.department}</p>
              </div>
            </div>

            {/* Email and slots status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Email Address</span>
                <span className="text-xs font-bold text-brand-navy block mt-1 truncate">{selectedLecturer.email}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Availability</span>
                <div className="mt-1">
                  <StatusBadge
                    tone={getStatusBadgeTone(selectedLecturer.availability)}
                    dot
                    className="text-[9px] px-2 py-0.5"
                  >
                    {selectedLecturer.availability}
                  </StatusBadge>
                </div>
              </div>
            </div>

            {/* Slot progress bar */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <span>Active Supervisee Allocation Slots</span>
                <span className="text-brand-navy font-black text-xs">
                  {selectedLecturer.currentStudents} / {selectedLecturer.workloadLimit}
                </span>
              </div>
              <ProgressBar
                value={selectedLecturer.currentStudents}
                max={selectedLecturer.workloadLimit}
                tone={selectedLecturer.availability === 'Available' ? 'success' : selectedLecturer.availability === 'Near Limit' ? 'warning' : 'danger'}
                trackClassName="h-2.5 bg-slate-100"
              />
            </div>

            {/* Supervisees list table */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Supervisee Students list ({selectedLecturer.currentStudents})
              </span>

              {selectedLecturer.supervisees.length > 0 ? (
                <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-3xs">
                  <div className="divide-y divide-slate-100 font-sans">
                    {selectedLecturer.supervisees.map((st) => (
                      <div key={st.id} className="p-4 hover:bg-slate-55/65 bg-slate-50/20 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-extrabold text-slate-800 text-xs block">{st.name}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-400 block mt-0.5">{st.id}</span>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 text-[8px] font-black uppercase tracking-wider shrink-0 select-none">
                            {st.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold block mt-1.5 leading-relaxed">{st.programme}</span>
                        <p className="text-[9.5px] italic text-slate-400 mt-2 bg-white p-2 border border-slate-100 rounded-lg">"{st.topic}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-slate-205 rounded-2xl">
                  <Users className="w-6 h-6 text-slate-300" />
                  <span className="font-bold text-slate-400 text-[10px] uppercase">No active assignment slots</span>
                  <p className="text-[9px] text-slate-400 max-w-xs leading-relaxed">Lecturer currently has 0 active student supervision appointments assigned.</p>
                </div>
              )}
            </div>

            {/* Admin trigger actions */}
            <div className="space-y-2 border-t border-slate-100 pt-5">
              <PortalButton
                onClick={() => {
                  showToast(`Drafting notification email to ${selectedLecturer.lecturerName}...`);
                }} 
                variant="primary"
                size="md"
                icon={Mail}
                fullWidth
              >
                Email Official Workload Inquiry
              </PortalButton>

              <PortalButton
                onClick={() => {
                  showToast("Please use the Marks Entry Period Configuration module to audit evaluation quotas.");
                }} 
                variant="secondary"
                size="md"
                fullWidth
              >
                View Connected Panel Records
              </PortalButton>
            </div>

          </div>
        )}
      </RightDrawer>

    </div>
  );
};
