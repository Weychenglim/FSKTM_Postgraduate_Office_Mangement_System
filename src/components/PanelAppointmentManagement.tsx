/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  SlidersHorizontal,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  X,
  User,
  GraduationCap,
  Calendar,
  AlertCircle,
  FileDown,
  Printer,
  ChevronRightSquare,
  HelpCircle,
  Mail,
  TrendingUp,
  Award,
  BookOpen,
  CheckSquare,
  Building,
  UserCheck,
  ChevronDown,
  Lock,
  ExternalLink
} from 'lucide-react';
import { PanelAppointmentDetail } from './PanelAppointmentDetail';
import { PanelWorkloadMonitoring } from './PanelWorkloadMonitoring';
import { PageHeader, PortalButton, PortalToast, StatusDot } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { PanelRecord } from '../types';
import { getPanelAppointments } from '../services';

// Interfaces for our Dataset (PanelRecord now lives in src/types).
export interface WorkloadStat {
  lecturerName: string;
  assigned: number;
  limit: number;
  status: 'AVAILABLE' | 'NEAR LIMIT' | 'FULL';
}

export interface AttentionItem {
  id: string;
  label: string;
  desc: string;
  filterTab: 'All Records' | 'No Panel' | 'Pending' | 'Approved' | 'Rejected' | 'Workload Alert';
}

export const PanelAppointmentManagement: React.FC = () => {
  // Current view of the panel module: 'list' | 'detail' | 'workload'
  const [panelView, setPanelView] = useState<'list' | 'detail' | 'workload'>('list');
  const [selectedRecord, setSelectedRecord] = useState<PanelRecord | null>(null);

  // Panel records loaded from appointmentsApi (mock-backed today).
  const [records, setRecords] = useState<PanelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(() => {
    setLoading(true);
    setError(null);
    getPanelAppointments()
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load panel appointments.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Main input filters
  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('All Programmes');
  const [semesterFilter, setSemesterFilter] = useState('All Semesters');

  // Interactive pill filter selection
  const [activeTab, setActiveTab] = useState<'All Records' | 'No Panel' | 'Pending' | 'Approved' | 'Rejected' | 'Workload Alert'>('All Records');

  // Trigger filters only when 'Apply Filters' is specifically clicked (screenshot business requirement)
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    programme: 'All Programmes',
    semester: 'All Semesters'
  });

  // Pagination page tracker
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter application
  const handleApplyFilters = () => {
    setAppliedFilters({
      search: searchQuery,
      programme: programmeFilter,
      semester: semesterFilter
    });
    setCurrentPage(1);
    showToast("Filters applied for student, supervisor, or course criteria.");
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setProgrammeFilter('All Programmes');
    setSemesterFilter('All Semesters');
    setAppliedFilters({
      search: '',
      programme: 'All Programmes',
      semester: 'All Semesters'
    });
    setCurrentPage(1);
    showToast("Reset all search parameters.");
  };

  // Status-tab quick filtering
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // 1. Text Search matching student name, ID, supervisor, panel member or course
      const terms = appliedFilters.search.toLowerCase();
      const matchSearch = !terms || 
        rec.id.toLowerCase().includes(terms) ||
        rec.studentName.toLowerCase().includes(terms) ||
        rec.supervisor.toLowerCase().includes(terms) ||
        rec.panelMember.toLowerCase().includes(terms);

      // 2. Programme select filter
      const matchProg = appliedFilters.programme === 'All Programmes' || 
        rec.programme === appliedFilters.programme;

      // 3. Semester select filter
      const matchSem = appliedFilters.semester === 'All Semesters' || 
        rec.semester === appliedFilters.semester;

      // 4. Status Tab Filter
      let matchTab = true;
      if (activeTab === 'No Panel') {
        matchTab = rec.status === 'No Panel';
      } else if (activeTab === 'Pending') {
        // Recommendations or pending items in queue
        matchTab = rec.status === 'Pending' || rec.status === 'Recommendation';
      } else if (activeTab === 'Approved') {
        matchTab = rec.status === 'Approved';
      } else if (activeTab === 'Rejected') {
        matchTab = rec.status === 'Rejected';
      } else if (activeTab === 'Workload Alert') {
        matchTab = rec.status === 'Workload Alert';
      }

      return matchSearch && matchProg && matchSem && matchTab;
    });
  }, [records, appliedFilters, activeTab]);

  // Paginated chunk
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;

  // CSV Exporter
  const handleExportCSV = () => {
    showToast("Instructing browser to compile and download panel_appointments_report.csv");
  };

  // Sub-view view triggers
  const handleViewDetail = (rec: PanelRecord) => {
    setSelectedRecord(rec);
    setPanelView('detail');
  };

  // Mini data lists mockup
  const attentionItems: AttentionItem[] = [
    { id: '1', label: 'Students without approved panel', desc: '12 records outstanding', filterTab: 'No Panel' },
    { id: '2', label: 'Panel recommendations pending over 7 days', desc: '4 records in queue', filterTab: 'Pending' },
    { id: '3', label: 'Lecturers near workload limit', desc: '3 lecturers identified', filterTab: 'Workload Alert' },
    { id: '4', label: 'Missing confirmation letters', desc: '2 records requiring file', filterTab: 'All Records' }
  ];

  const workloadAlerts: WorkloadStat[] = [
    { lecturerName: 'Dr. Siti Noor', assigned: 4, limit: 5, status: 'NEAR LIMIT' },
    { lecturerName: 'Dr. Aris Ghaffar', assigned: 5, limit: 5, status: 'FULL' },
    { lecturerName: 'Dr. Wey Cheng', assigned: 3, limit: 5, status: 'AVAILABLE' }
  ];

  return (
    <div id="panel-module-root" className="space-y-8 animate-fade-in text-left">
      
      <PortalToast message={toastMessage} />

      {/* RENDER PATH 1: DETAILED VIEW OF ONE REPORT */}
      {panelView === 'detail' && selectedRecord && (
        <PanelAppointmentDetail
          onBack={() => setPanelView('list')}
          record={selectedRecord}
        />
      )}


      {/* RENDER PATH 2: WORKLOAD MONITORING LIST */}
      {panelView === 'workload' && (
        <PanelWorkloadMonitoring onBack={() => setPanelView('list')} />
      )}


      {/* RENDER PATH 3: MAIN LISTING PORTAL BOARD (DEFAULT) */}
      {panelView === 'list' && (
        <div id="panel-dashboard-container" className="space-y-8 animate-fade-in text-left">
          
          <PageHeader
            title="Panel Appointment Management"
            subtitle="Monitor panel appointment records, panel member workload, and records needing attention."
            subtitleClassName="leading-relaxed"
          />

          {/* Core Summary Cards Grid row matching screenshots exactly */}
          <div id="panel-summary-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-sans">
            
            {/* Card 1: Students Without Panel */}
            <div className="bg-white border-l-4 border-l-red-500 border border-y-slate-205 border-r-slate-205 rounded-xl p-5 shadow-3xs flex flex-col justify-between hover:shadow-2xs transition group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                    Students Without Panel
                  </span>
                  <span className="text-3xl font-black text-brand-navy block mt-2.5">
                    12
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                  <User className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-[#e11d48] text-[10px] font-extrabold tracking-wide">
                <StatusDot tone="danger" pulse />
                <span>No approved panel record.</span>
              </div>
            </div>

            {/* Card 2: Pending Recommendations */}
            <div className="bg-white border-l-4 border-l-blue-500 border border-y-slate-205 border-r-slate-205 rounded-xl p-5 shadow-3xs flex flex-col justify-between hover:shadow-2xs transition group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                    Pending Recommendations
                  </span>
                  <span className="text-3xl font-black text-brand-navy block mt-2.5">
                    8
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-55 text-blue-500 flex items-center justify-center shrink-0 border border-blue-100">
                  <Clock className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-amber-600 text-[10px] font-extrabold tracking-wide">
                <StatusDot tone="warning" />
                <span>Panel recommendations still in workflow.</span>
              </div>
            </div>

            {/* Card 3: Approved Panels */}
            <div className="bg-white border-l-4 border-l-emerald-500 border border-y-slate-205 border-r-slate-205 rounded-xl p-5 shadow-3xs flex flex-col justify-between hover:shadow-2xs transition group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                    Approved Panels
                  </span>
                  <span className="text-3xl font-black text-brand-navy block mt-2.5">
                    126
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-110">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-emerald-600 text-[10px] font-extrabold tracking-wide">
                <StatusDot tone="success" />
                <span>Confirmed panel appointments.</span>
              </div>
            </div>

            {/* Card 4: Workload Alerts */}
            <div className="bg-white border-l-4 border-l-amber-500 border border-y-slate-205 border-r-slate-205 rounded-xl p-5 shadow-3xs flex flex-col justify-between hover:shadow-2xs transition group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                    Workload Alerts
                  </span>
                  <span className="text-3xl font-black text-brand-navy block mt-2.5">
                    3
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 border border-amber-100">
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4 text-amber-600 text-[10px] font-extrabold tracking-wide">
                <StatusDot tone="warning" />
                <span>Lecturers near panel limit.</span>
              </div>
            </div>

          </div>


          {/* Mid Section Layout: Search filter box left, attention widgets right */}
          <div id="filters-layout-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans text-xs">
            
            {/* Filter Section (Left Col) */}
            <div className="lg:col-span-8 bg-white border border-slate-205 p-6 rounded-2xl shadow-3xs text-left">
              <h3 className="font-extrabold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span>Search Records</span>
              </h3>

              {/* Grid with fields */}
              <div className="space-y-5">
                
                {/* Search Text field */}
                <div>
                  <label htmlFor="student-id-query" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Search Records
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      id="student-id-query"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by student name, ID, supervisor, panel member or research title"
                      className="form-control form-control-sm pl-10 pr-4"
                    />
                  </div>
                </div>

                {/* Dropdowns side-by-side row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Programme Selection */}
                  <div>
                    <label htmlFor="programme-selection-field" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Programme
                    </label>
                    <div className="relative">
                      <select
                        id="programme-selection-field"
                        value={programmeFilter}
                        onChange={(e) => setProgrammeFilter(e.target.value)}
                        className="form-control form-control-sm appearance-none pr-9 cursor-pointer"
                      >
                        <option>All Programmes</option>
                        <option>MSc. Computer Science</option>
                        <option>MSc. Data Science</option>
                        <option>MSc. Information Technology</option>
                        <option>MSc. Software Engineering</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Semester Selection */}
                  <div>
                    <label htmlFor="semester-selection-field" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Semester
                    </label>
                    <div className="relative">
                      <select
                        id="semester-selection-field"
                        value={semesterFilter}
                        onChange={(e) => setSemesterFilter(e.target.value)}
                        className="form-control form-control-sm appearance-none pr-9 cursor-pointer"
                      >
                        <option>All Semesters</option>
                        <option>Sem 1 2025/2026</option>
                        <option>Sem 2 2024/2025</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                    </div>
                  </div>

                </div>

                {/* Lower Action buttons Row */}
                <div className="pt-3 flex flex-wrap items-center gap-3 border-t border-slate-100">
                  
                  {/* Apply click handler */}
                  <PortalButton
                    onClick={handleApplyFilters}
                    variant="primary"
                    size="md"
                  >
                    Apply Filters
                  </PortalButton>

                  <PortalButton
                    onClick={handleResetFilters}
                    variant="secondary"
                    size="md"
                  >
                    Reset Grid
                  </PortalButton>

                </div>

                {/* Interactive Horizontal filter tabs mimicking screenshot exactly */}
                <div id="inner-status-pills" className="pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5 select-none">
                    {(['All Records', 'No Panel', 'Pending', 'Approved', 'Rejected', 'Workload Alert'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                          activeTab === tab 
                            ? 'bg-slate-100 text-slate-900 border border-slate-300' 
                            : 'text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Records Needing Attention Widgets Column (Right Col) */}
            <div className="lg:col-span-4 lg:row-start-1 lg:row-span-2 space-y-6 text-left">
              
              {/* Box A: Attention list card */}
              <div className="bg-white border border-slate-205 p-5 rounded-2xl shadow-3xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <h4 className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                    Records Needing Attention
                  </h4>
                </div>

                <div className="space-y-4">
                  {attentionItems.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-2.5 text-xs font-sans">
                      <div className="text-left">
                        <span className="font-bold text-slate-800 block leading-snug">
                          {item.label}
                        </span>
                        <span className="text-[10px] font-bold text-amber-600">
                          {item.desc}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab(item.filterTab);
                          showToast(`Focused on: ${item.label}`);
                        }}
                        className="text-blue-600 font-extrabold text-[10px] uppercase hover:underline leading-none pt-0.5 cursor-pointer"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box B: Panel Workload Snapshot */}
              <div className="bg-white border border-slate-205 p-5 rounded-2xl shadow-3xs text-xs font-sans">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <span className="font-extrabold text-brand-navy text-xs uppercase tracking-wider">
                    Panel Workload Snapshot
                  </span>
                  <TrendingUp className="w-4 h-4 text-slate-450" />
                </div>

                <div className="space-y-4 text-left">
                  {workloadAlerts.map((w, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-800">{w.lecturerName}</span>
                        <span className={`text-[9px] font-black ${
                          w.status === 'FULL' ? 'text-red-600' :
                          w.status === 'NEAR LIMIT' ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {w.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-450">
                        <span>{w.assigned} / {w.limit} students assigned</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          w.status === 'FULL' ? 'bg-red-600' :
                          w.status === 'NEAR LIMIT' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`} style={{ width: `${(w.assigned / w.limit) * 100}%` }} />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => setPanelView('workload')}
                    className="w-full py-2.5 mt-3 text-center border border-slate-205 text-brand-navy font-bold text-xs uppercase rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    View All Workload
                  </button>
                </div>
              </div>

              {/* Box C: Quick Tip dark panel */}
              <div className="bg-brand-navy text-slate-300 rounded-2xl p-5 text-left relative overflow-hidden shadow-sm">
                <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-2">
                  System Tip
                </span>
                <p className="text-xs font-sans text-slate-300 leading-relaxed font-semibold">
                  Panel recommendations are monitored for workload balance and released to candidates only after postgraduate secretariat approval is approved.
                </p>
                <button
                  onClick={() => showToast("Downloading administrative policy manual booklet...")}
                  className="mt-4 inline-flex items-center gap-2 text-indigo-300 hover:text-white text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Read Policy Document</span>
                </button>
              </div>

            </div>

          {/* 3. Panel Appointment Records Table Container */}
          <div className="lg:col-span-8 lg:col-start-1 lg:row-start-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs text-left">
            
            <div className="px-6 py-5 border-b border-light-slate flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-brand-navy text-sm uppercase tracking-wider">
                  Panel Appointment Records
                </h3>
                <span className="text-slate-450 text-xs font-medium block mt-0.5">
                  View and monitor panel appointment records across students and faculty members.
                </span>
              </div>
              
              <button
                onClick={handleExportCSV}
                className="py-2 px-4 bg-white hover:bg-slate-50 text-brand-navy border border-slate-205 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-550" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Inner responsive table view */}
            <div className="overflow-x-auto">
              <table className="data-table min-w-[850px] text-xs">
                <thead>
                  <tr className="data-thead bg-slate-50">
                    <th className="data-th">Student ID / Name</th>
                    <th className="data-th">Programme / Sem</th>
                    <th className="data-th">Supervisor</th>
                    <th className="data-th">Panel Member</th>
                    <th className="data-th">Status</th>
                    <th className="data-th">Updated</th>
                    <th className="data-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">

                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <LoadingState message="Loading panel appointments…" />
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <ErrorState message={error} onRetry={loadRecords} />
                      </td>
                    </tr>
                  ) : paginatedRecords.length > 0 ? (
                    paginatedRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-55 transition-colors">
                        
                        {/* ID & Name matched block with exact bold elements */}
                        <td className="data-td">
                          <button
                            onClick={() => handleViewDetail(rec)}
                            className="font-bold text-brand-navy tracking-tight text-xs block hover:underline cursor-pointer text-left focus:outline-none"
                          >
                            {rec.id}
                          </button>
                          <span className="text-slate-500 font-medium block mt-0.5">
                            {rec.studentName}
                          </span>
                        </td>

                        {/* Program & Semester info */}
                        <td className="data-td leading-relaxed">
                          <span className="font-bold text-slate-700 block">{rec.programme}</span>
                          <span className="text-[10px] text-slate-450 font-medium mt-0.5 block">{rec.semester}</span>
                        </td>

                        {/* Supervisor */}
                        <td className="data-td font-bold text-slate-700">
                          {rec.supervisor}
                        </td>

                        {/* Panel Member Status Vetted color styles */}
                        <td className="data-td">
                          {rec.panelMember === 'Not Assigned' ? (
                            <span className="text-red-600 font-extrabold tracking-wide uppercase text-[10px]">
                              Not Assigned
                            </span>
                          ) : rec.panelMember === 'Pending' ? (
                            <span className="text-slate-450 font-bold italic">
                              Pending
                            </span>
                          ) : (
                            <span className="font-extrabold text-slate-800 text-xs">
                              {rec.panelMember}
                            </span>
                          )}
                        </td>

                        {/* Vetting Status Chips matched strictly with mockup colors */}
                        <td className="data-td">
                          {rec.status === 'Approved' ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase border border-emerald-100">
                              Approved
                            </span>
                          ) : rec.status === 'No Panel' ? (
                            <span className="px-2.5 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-full uppercase border border-rose-100">
                              No Panel
                            </span>
                          ) : rec.status === 'Recommendation' ? (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full uppercase border border-amber-100">
                              Recommendation
                            </span>
                          ) : rec.status === 'Workload Alert' ? (
                            <span className="px-2.5 py-1 bg-orange-50 text-orange-650 text-[10px] font-black rounded-full uppercase border border-orange-100">
                              Workload Alert
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-50 text-rose-605 text-[10px] font-black rounded-full uppercase border border-red-100">
                              {rec.status}
                            </span>
                          )}
                        </td>

                        {/* Action date */}
                        <td className="data-td font-bold text-slate-500 font-mono text-[11px]">
                          {rec.updatedDate}
                        </td>

                        {/* Action button trigger View detail */}
                        <td className="data-td text-right">
                          <button
                            onClick={() => handleViewDetail(rec)}
                            className="py-1.5 px-3.5 bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-800 border border-slate-200 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition cursor-pointer shadow-3xs"
                          >
                            View
                          </button>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold whitespace-nowrap">
                        No panel appointment records meet the applied search and status parameters.
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>

            {/* Pagination Controls aligning with mockup exact styling */}
            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
              
              <span className="text-slate-450 font-medium">
                Showing {paginatedRecords.length} of {filteredRecords.length} records
              </span>

              <div id="table-pagination-nav" className="flex items-center gap-1.5 select-none">
                
                {/* Previous button */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-250 flex items-center justify-center text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>

                {/* Standard numbers list */}
                {Array.from({ length: totalPages }).map((_, ipg) => {
                  const pgNum = ipg + 1;
                  const isCurrent = currentPage === pgNum;
                  return (
                    <button
                      key={pgNum}
                      onClick={() => setCurrentPage(pgNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition cursor-pointer ${
                        isCurrent 
                          ? 'bg-brand-navy text-white border border-brand-navy' 
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pgNum}
                    </button>
                  );
                })}

                {/* Next button */}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-250 flex items-center justify-center text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>

              </div>

            </div>

          </div>

          </div>

        </div>
      )}

    </div>
  );
};
