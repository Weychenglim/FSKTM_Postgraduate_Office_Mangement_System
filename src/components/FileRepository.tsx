/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Upload, 
  FolderLock, 
  FileText, 
  FileCode, 
  FileSpreadsheet, 
  FileImage, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Download, 
  Archive, 
  Check, 
  Grid, 
  List, 
  ZoomIn, 
  ZoomOut, 
  Filter, 
  User, 
  Tag as TagIcon,
  Trash2,
  Lock,
  Plus,
  HelpCircle,
  Clock,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadNewDocument } from './UploadNewDocument';

// Custom typescript types
export interface FileItem {
  id: string;
  name: string;
  studentId: string;
  category: 'Coursework' | 'Research' | 'Administrative' | 'Evaluation';
  sem: string;
  uploadedBy: string;
  date: string;
  size: string;
  status: 'Active' | 'Archived';
  tags: string[];
  moduleName?: string;
  fileType: 'pdf' | 'docx' | 'xlsx' | 'pptx';
  description?: string;
}

export const FileRepository: React.FC = () => {
  // Mock initial state for files
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: 'file_1',
      name: 'WIE2003_Assignment1_Final.pdf',
      studentId: 'U2001234',
      category: 'Coursework',
      sem: '2023/24 S1',
      uploadedBy: 'Ahmad S.',
      date: '24 Oct 2023',
      size: '2.4 MB',
      status: 'Active',
      tags: ['Assignment', 'Final'],
      moduleName: 'Research Methodology',
      fileType: 'pdf',
      description: 'First assignment submission addressing core research planning methodologies.'
    },
    {
      id: 'file_2',
      name: 'Research_Proposal_Draft_v2.docx',
      studentId: 'S2109988',
      category: 'Research',
      sem: '2023/24 S1',
      uploadedBy: 'Dr. Lee M.',
      date: '22 Oct 2023',
      size: '1.1 MB',
      status: 'Active',
      tags: ['Proposal'],
      moduleName: 'Thesis Preparation',
      fileType: 'docx',
      description: 'Second draft framework for dissertation panel feedback.'
    },
    {
      id: 'file_3',
      name: 'Old_Syllabus_2021.pdf',
      studentId: 'Admin',
      category: 'Administrative',
      sem: '2021/22 S2',
      uploadedBy: 'System',
      date: '15 Jan 2022',
      size: '4.8 MB',
      status: 'Archived',
      tags: ['Deprecated', 'Confidential'],
      moduleName: 'Curriculum Master',
      fileType: 'pdf',
      description: 'Legacy Master Syllabus references. Retained for retrospective audit purposes.'
    },
    {
      id: 'file_4',
      name: 'Student_Grades_Draft.xlsx',
      studentId: 'Admin',
      category: 'Evaluation',
      sem: '2023/24 S1',
      uploadedBy: 'Sarah J.',
      date: '20 Oct 2023',
      size: '520 KB',
      status: 'Active',
      tags: ['Confidential'],
      moduleName: 'Marks Entry Audit',
      fileType: 'xlsx',
      description: 'Intermediate raw grades consolidation before faculty submission lock.'
    },
    {
      id: 'file_5',
      name: 'Panel_Exemption_List.xlsx',
      studentId: 'Admin',
      category: 'Administrative',
      sem: '2023/24 S1',
      uploadedBy: 'Ahmad S.',
      date: '10 Nov 2023',
      size: '1.2 MB',
      status: 'Active',
      tags: ['Confidential'],
      moduleName: 'Panel Appointment',
      fileType: 'xlsx',
      description: 'Listing of student exceptions approved by the postgraduate panel.'
    },
    {
      id: 'file_6',
      name: 'Supervisor_Agreement_Forms.pdf',
      studentId: 'U2005882',
      category: 'Coursework',
      sem: '2023/24 S1',
      uploadedBy: 'Dr. Sarah Lim',
      date: '18 Nov 2023',
      size: '3.1 MB',
      status: 'Active',
      tags: ['Agreement'],
      moduleName: 'Supervisor Selection',
      fileType: 'pdf',
      description: 'Signed agreements allocating final supervisor quotas.'
    }
  ]);

  // View state options
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFileId, setSelectedFileId] = useState<string>('file_1');
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tag Filter list
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // Dropdown filter parameters
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [moduleFilter, setModuleFilter] = useState<string>('All');
  const [semesterFilter, setSemesterFilter] = useState<string>('All');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Multi Selection state
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  
  // Actions Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [currentSubView, setCurrentSubView] = useState<'repository' | 'upload'>('repository');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for manual uploading entry simulation
  const [newFileName, setNewFileName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newCategory, setNewCategory] = useState<'Coursework' | 'Research' | 'Administrative' | 'Evaluation'>('Coursework');
  const [newSem, setNewSem] = useState('2023/24 S1');
  const [newTagsStr, setNewTagsStr] = useState('Assignment, Final');
  const [newFileType, setNewFileType] = useState<'pdf' | 'docx' | 'xlsx' | 'pptx'>('pdf');
  const [newDescription, setNewDescription] = useState('');

  // Zoom size indicator simulation
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Trigger Toast Notification helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Lists of tags, categories and parameters dynamically extracted
  const allAvailableTags = useMemo(() => {
    const list = new Set<string>();
    files.forEach(f => f.tags.forEach(t => list.add(t)));
    return Array.from(list);
  }, [files]);

  const allAvailableSemesters = useMemo(() => {
    return Array.from(new Set(files.map(f => f.sem)));
  }, [files]);

  const allAvailableModules = useMemo(() => {
    return Array.from(new Set(files.filter(f => f.moduleName).map(f => f.moduleName as string)));
  }, [files]);

  // Filtered List calculation
  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      // Search Box text (Checks File Name, Student ID, Tags)
      const matchesSearch = searchTerm.trim() === '' || 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      // Dropdown Category
      const matchesCategory = categoryFilter === 'All' || f.category === categoryFilter;
      
      // Dropdown Module
      const matchesModule = moduleFilter === 'All' || f.moduleName === moduleFilter;

      // Dropdown Semester
      const matchesSemester = semesterFilter === 'All' || f.sem === semesterFilter;

      // Dropdown FileType
      const matchesFileType = fileTypeFilter === 'All' || f.fileType === fileTypeFilter;

      // Filter Status
      const matchesStatus = (statusFilter === 'All' && !showArchivedOnly) || 
        (showArchivedOnly && f.status === 'Archived') ||
        (!showArchivedOnly && statusFilter !== 'All' && f.status === statusFilter);

      // Selected Tag Pills multi filter
      const matchesTagsList = selectedTags.length === 0 || 
        selectedTags.some(tag => f.tags.includes(tag));

      return matchesSearch && matchesCategory && matchesModule && matchesSemester && matchesFileType && matchesStatus && matchesTagsList;
    });
  }, [files, searchTerm, categoryFilter, moduleFilter, semesterFilter, fileTypeFilter, statusFilter, showArchivedOnly, selectedTags]);

  // Selected file item metadata mapping
  const selectedFileItem = useMemo(() => {
    return files.find(f => f.id === selectedFileId) || files[0] || null;
  }, [files, selectedFileId]);

  // Checkbox multi logic
  const handleCheckboxAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setCheckedIds(filteredFiles.map(f => f.id));
    } else {
      setCheckedIds([]);
    }
  };

  const handleCheckboxSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop row preview selection logic from firing
    if (checkedIds.includes(id)) {
      setCheckedIds(prev => prev.filter(item => item !== id));
    } else {
      setCheckedIds(prev => [...prev, id]);
    }
  };

  // Reset Filters logic
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All');
    setModuleFilter('All');
    setSemesterFilter('All');
    setFileTypeFilter('All');
    setStatusFilter('All');
    setSelectedTags([]);
    setShowArchivedOnly(false);
    triggerToast('All file filters cleared successfully.');
  };

  // Download File simulation handler
  const handleDownloadFile = (fileName: string) => {
    triggerToast(`Dowloading document: "${fileName}" in progress.`);
  };

  // Multi Archive simulation
  const handleBulkArchive = () => {
    if (checkedIds.length === 0) return;
    setFiles(prev => prev.map(f => {
      if (checkedIds.includes(f.id)) {
        return { ...f, status: 'Archived' };
      }
      return f;
    }));
    triggerToast(`Successfully archived ${checkedIds.length} selected document(s).`);
    setCheckedIds([]);
  };

  // Toggle Single Archive status
  const handleToggleArchiveSingle = (id: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        const nextStatus = f.status === 'Active' ? 'Archived' : 'Active';
        triggerToast(`Document "${f.name}" is now marked as ${nextStatus}.`);
        return { ...f, status: nextStatus };
      }
      return f;
    }));
  };

  // Manual Creation Entry (Upload simulation)
  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      triggerToast('Validation Error: File name cannot be empty.');
      return;
    }

    const payloadTags = newTagsStr
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const generatedId = `file_${Date.now()}`;
    const newDoc: FileItem = {
      id: generatedId,
      name: newFileName,
      studentId: newStudentId || 'Admin',
      category: newCategory,
      sem: newSem,
      uploadedBy: 'Admin Office Staff',
      date: '28 May 2026',
      size: '1.5 MB',
      status: 'Active',
      tags: payloadTags,
      moduleName: 'Administrative',
      fileType: newFileType,
      description: newDescription || 'Newly uploaded custom administrative reference file.'
    };

    setFiles(prev => [newDoc, ...prev]);
    setSelectedFileId(generatedId);
    setIsUploadOpen(false);
    triggerToast(`Document "${newFileName}" uploaded successfully!`);

    // Reset Form Fields
    setNewFileName('');
    setNewStudentId('');
    setNewCategory('Coursework');
    setNewSem('2023/24 S1');
    setNewTagsStr('Assignment, Final');
    setNewFileType('pdf');
    setNewDescription('');
  };

  // Utility to map file types to icons
  const getFileIcon = (type: FileItem['fileType']) => {
    switch (type) {
      case 'pdf':
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'docx':
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-150">
            <FileCode className="w-4 h-4" />
          </div>
        );
      case 'xlsx':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-slate-150 flex items-center justify-center text-slate-500">
            <FileImage className="w-4 h-4" />
          </div>
        );
    }
  };

  // Calculate generic aggregate stats to feed upper metadata columns
  const activeCount = files.filter(f => f.status === 'Active').length;
  const archivedCount = files.filter(f => f.status === 'Archived').length;

  if (currentSubView === 'upload') {
    return (
      <UploadNewDocument 
        onBack={() => setCurrentSubView('repository')}
        onUploadSuccess={(newFile) => {
          const generatedId = `file_${Date.now()}`;
          const newDocItem: FileItem = {
            id: generatedId,
            name: newFile.name,
            studentId: newFile.studentId,
            category: newFile.category,
            sem: newFile.semester,
            uploadedBy: 'Office Staff/Admin',
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            size: '4.2 MB',
            status: 'Active',
            tags: newFile.tags,
            moduleName: newFile.category === 'Administrative' ? 'Administrative' : newFile.name.substring(0, 20),
            fileType: newFile.fileType,
            description: newFile.description
          };
          setFiles(prev => [newDocItem, ...prev]);
          setSelectedFileId(generatedId);
          setCurrentSubView('repository');
          triggerToast(`Document "${newFile.name}" has been successfully uploaded & logged.`);
        }}
      />
    );
  }

  return (
    <div id="file-repository-workspace" className="font-sans text-[#0c1424] text-xs">
      
      {/* Dynamic Toast warning block */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-[100] bg-[#0c1424] text-white p-4 rounded-xl shadow-xl flex items-center gap-3.5 border border-white/10 font-bold"
          >
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[11px] font-sans tracking-wide">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white transition">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Header with action buttons */}
      <div id="file-page-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="text-left">
          <h1 className="page-title">
            File Repository
          </h1>
          <p className="page-subtitle leading-relaxed">
            Browse, preview and download documents
          </p>
        </div>

        {/* Action Controls for uploading & toggling archived archives */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => {
              setShowArchivedOnly(!showArchivedOnly);
              triggerToast(showArchivedOnly ? 'Viewing active files.' : 'Filtered dataset to Archived files only.');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-2 border shadow-xs cursor-pointer ${
              showArchivedOnly 
                ? 'bg-amber-50 border-amber-300 text-amber-800 font-extrabold' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <FolderLock className="w-4 h-4 stroke-[2]" />
            <span>Archived Files</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentSubView('upload')}
            className="px-4 py-2.5 bg-[#0c1424] hover:bg-slate-800 text-white rounded-xl text-xs font-black font-sans transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4 stroke-[2]" />
            <span>Upload New File</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards Row */}
      <div id="file-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 text-left">
        {/* TOTAL FILES */}
        <div className="bg-white border border-slate-200/70 p-6 rounded-2xl flex flex-col space-y-1 shadow-2xs relative">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Files</span>
          <span className="text-2xl font-black text-[#0c1424] tracking-tight">12,458</span>
          <span className="text-[10px] text-slate-500 font-medium pt-1">Active + archived documents</span>
        </div>

        {/* ACTIVE DOCUMENTS */}
        <div className="bg-white border border-slate-200/70 p-6 rounded-2xl flex flex-col space-y-1 shadow-2xs relative">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Documents</span>
          <span className="text-2xl font-black text-[#0c1424] tracking-tight">11,204</span>
          <span className="text-[10px] text-emerald-600 font-bold pt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            90% of overall database files
          </span>
        </div>

        {/* ARCHIVED */}
        <div className="bg-white border border-slate-200/70 p-6 rounded-2xl flex flex-col space-y-1 shadow-2xs relative">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Archived</span>
          <span className="text-2xl font-black text-[#0c1424] tracking-tight">1,254</span>
          <span className="text-[10px] text-slate-500 font-medium pt-1">Historical files storage</span>
        </div>

        {/* STORAGE USED */}
        <div className="bg-white border border-slate-200/70 p-6 rounded-2xl flex flex-col space-y-1 shadow-2xs relative">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Storage Used</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#0c1424] tracking-tight">45.2 GB</span>
            <span className="text-[10px] text-slate-400 font-bold">/ 100 GB</span>
          </div>
          {/* Progress slider bar illustration */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '45.2%' }} />
          </div>
        </div>
      </div>

      {/* Main Grid: Left side list filters, Right side Preview Dock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Files List Panel (Colspan depends on Preview Open) */}
        <div className={`${isPreviewOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          
          {/* White Panel container */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            
            {/* Filter controls section */}
            <div className="p-5 border-b border-slate-150 space-y-4">
              
              {/* Row 1: Search block */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by file name, student ID, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-[#0c1424] focus:outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                </div>

                {/* Grid vs List toggles */}
                <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl p-1 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => { setViewMode('grid'); triggerToast('Switched to Grid thumbnails layout.'); }}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Grid view"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewMode('list'); }}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-400 hover:text-slate-600'}`}
                    title="List table view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Row 2: Selected active parameters summary */}
              <div className="flex items-center gap-3 flex-wrap">
                
                {/* Category select */}
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="appearance-none bg-[#f8fafc] border border-slate-200 text-slate-700 hover:border-slate-300 px-3 py-1.5 pr-8 rounded-lg font-bold text-[11px] cursor-pointer focus:outline-none"
                  >
                    <option value="All">Category: All</option>
                    <option value="Coursework">Coursework</option>
                    <option value="Research">Research</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Evaluation">Evaluation</option>
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {/* Module Filter */}
                <div className="relative">
                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="appearance-none bg-[#f8fafc] border border-slate-200 text-slate-700 hover:border-slate-300 px-3 py-1.5 pr-8 rounded-lg font-bold text-[11px] cursor-pointer focus:outline-none"
                  >
                    <option value="All">Module: All</option>
                    {allAvailableModules.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {/* Semester select */}
                <div className="relative">
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="appearance-none bg-[#f8fafc] border border-slate-200 text-slate-700 hover:border-slate-300 px-3 py-1.5 pr-8 rounded-lg font-bold text-[11px] cursor-pointer focus:outline-none"
                  >
                    <option value="All">Semester: All</option>
                    {allAvailableSemesters.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {/* File Type Filter */}
                <div className="relative">
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value)}
                    className="appearance-none bg-[#f8fafc] border border-slate-200 text-slate-700 hover:border-slate-300 px-3 py-1.5 pr-8 rounded-lg font-bold text-[11px] cursor-pointer focus:outline-none"
                  >
                    <option value="All">File Type: All</option>
                    <option value="pdf">PDF files</option>
                    <option value="docx">Word docs</option>
                    <option value="xlsx">Excel files</option>
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-[#f8fafc] border border-slate-200 text-slate-700 hover:border-slate-300 px-3 py-1.5 pr-8 rounded-lg font-bold text-[11px] cursor-pointer focus:outline-none"
                  >
                    <option value="All">Status: All</option>
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {/* Clear Actions link button */}
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-indigo-600 hover:text-indigo-800 font-extrabold text-[11px] px-2 py-1 hover:underline transition select-none cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>

              {/* Row 3: Multiselect bulk actions */}
              {checkedIds.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-150 p-3 rounded-xl flex items-center justify-between text-indigo-900 font-bold text-[11px] animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600" />
                    <span><strong>{checkedIds.length}</strong> document(s) checked.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(`${checkedIds.length} selected zip package`)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition text-[10px] uppercase font-extrabold tracking-wide"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Bundle</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkArchive}
                      className="px-3 py-1.5 bg-white border border-indigo-200 hover:bg-slate-50 rounded-lg text-slate-700 flex items-center gap-1.5 transition text-[10px] uppercase font-extrabold tracking-wide"
                    >
                      <Archive className="w-3 h-3 text-indigo-600" />
                      <span>Archive Selected</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Row 4: Tag filters list */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                  <TagIcon className="w-3 h-3 text-slate-400" />
                  Quick tags:
                </span>
                {allAvailableTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTags(prev => prev.filter(t => t !== tag));
                        } else {
                          setSelectedTags(prev => [...prev, tag]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#0c1424] text-white border border-[#0c1424]'
                          : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* List vs Grid display block */}
            {filteredFiles.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 mx-auto flex items-center justify-center mb-3">
                  <Database className="w-5 h-5 text-slate-400" />
                </div>
                <p className="font-extrabold text-[#0c1424]">No matching templates or records</p>
                <p className="text-[10px] mt-1 text-slate-400">Please relax search strings or clear quick active filter badges.</p>
              </div>
            ) : viewMode === 'list' ? (
              
              /* LIST TYPE TABLE VIEW */
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr className="data-thead bg-[#f8fafc]">
                      <th className="data-th px-5 w-6 select-none">
                        <input
                          type="checkbox"
                          checked={checkedIds.length > 0 && checkedIds.length === filteredFiles.map(f => f.id).length}
                          onChange={handleCheckboxAll}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-650 focus:ring-slate-900 cursor-pointer"
                        />
                      </th>
                      <th className="data-th px-5">File Name</th>
                      <th className="data-th px-4">Student ID</th>
                      <th className="data-th px-4">Category</th>
                      <th className="data-th px-3">Sem</th>
                      <th className="data-th px-4">Uploaded By</th>
                      <th className="data-th px-4">Date</th>
                      <th className="data-th px-3">Size</th>
                      <th className="data-th px-4 text-center">Status</th>
                      <th className="data-th px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((f, idx) => {
                      const isSelected = selectedFileId === f.id;
                      const isChecked = checkedIds.includes(f.id);
                      return (
                        <tr
                          key={f.id}
                          onClick={() => { setSelectedFileId(f.id); setIsPreviewOpen(true); }}
                          className={`border-b border-slate-100 font-sans hover:bg-slate-50 cursor-pointer group transition-colors ${
                            isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : ''
                          }`}
                        >
                          {/* Checked Checkbox selection */}
                          <td className="px-5 py-4 w-6 select-none" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCheckedIds(prev => [...prev, f.id]);
                                } else {
                                  setCheckedIds(prev => prev.filter(item => item !== f.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-305 text-indigo-650 focus:ring-slate-900 cursor-pointer"
                            />
                          </td>

                          {/* File logo & styling name */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {getFileIcon(f.fileType)}
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-800 text-[11px] group-hover:text-indigo-600 transition-colors block leading-tight max-w-[190px] truncate" title={f.name}>
                                  {f.name}
                                </span>
                                {/* Child small tags */}
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {f.tags.map(t => (
                                    <span key={t} className="text-[8px] font-black uppercase text-slate-400 bg-slate-50 border border-slate-150 rounded px-1 tracking-wider scale-95 origin-left">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Student ID */}
                          <td className="px-4 py-4 font-bold text-slate-500 whitespace-nowrap">
                            {f.studentId}
                          </td>

                          {/* Category pill column with beautiful custom layouts */}
                          <td className="px-4 py-4">
                            {f.category === 'Coursework' ? (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100 text-[10px]">Coursework</span>
                            ) : f.category === 'Research' ? (
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-100 text-[10px]">Research</span>
                            ) : f.category === 'Administrative' ? (
                              <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-600 font-bold border border-slate-150 text-[10px]">Administrative</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-100 text-[10px]">Evaluation</span>
                            )}
                          </td>

                          {/* Semester text */}
                          <td className="px-3 py-4 font-bold text-slate-500 whitespace-nowrap">
                            {f.sem}
                          </td>

                          {/* Uploaded By */}
                          <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-[8px] border border-slate-200">
                                {f.uploadedBy[0]}
                              </div>
                              <span className="font-bold">{f.uploadedBy}</span>
                            </div>
                          </td>

                          {/* Upload Date */}
                          <td className="px-4 py-4 text-slate-500 font-medium whitespace-nowrap">
                            {f.date}
                          </td>

                          {/* File size size */}
                          <td className="px-3 py-4 text-slate-500 font-bold whitespace-nowrap">
                            {f.size}
                          </td>

                          {/* Status option */}
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            {f.status === 'Active' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-[9px] font-black uppercase tracking-wider">
                                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-full text-[9px] font-black uppercase tracking-wider">
                                <span className="w-1 h-1 rounded-full bg-slate-400" />
                                <span>Archived</span>
                              </span>
                            )}
                          </td>

                          {/* Actions button */}
                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(f.name)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-800 transition"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleArchiveSingle(f.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-amber-700 transition"
                                title={f.status === 'Active' ? 'Archive file' : 'Activate file'}
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              
              /* GRID TYPE THUMBNAILS COMPONENT DISPLAY */
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-left font-sans text-xs">
                {filteredFiles.map(f => {
                  const isSelected = selectedFileId === f.id;
                  const isChecked = checkedIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => { setSelectedFileId(f.id); setIsPreviewOpen(true); }}
                      className={`border border-slate-200 hover:border-slate-350 p-4.5 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-xs cursor-pointer transition relative ${
                        isSelected ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white'
                      }`}
                    >
                      {/* Checkbox and toggle absolute positions */}
                      <div className="flex items-start justify-between">
                        <div onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCheckedIds(prev => [...prev, f.id]);
                              } else {
                                setCheckedIds(prev => prev.filter(item => item !== f.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-650 focus:ring-slate-900 cursor-pointer"
                          />
                        </div>

                        {f.status === 'Active' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[8px] font-black uppercase">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-full text-[8px] font-black uppercase">Archived</span>
                        )}
                      </div>

                      {/* File main identifiers */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {getFileIcon(f.fileType)}
                          <span className="font-extrabold text-slate-805 text-[11px] leading-tight line-clamp-1" title={f.name}>
                            {f.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">{f.studentId} • {f.sem}</p>
                      </div>

                      {/* Pill tags */}
                      <div className="flex flex-wrap gap-1">
                        {f.tags.map(t => (
                          <span key={t} className="text-[8px] font-black uppercase text-slate-400 bg-slate-50 border border-slate-150 px-1 rounded">
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Footer size & uploader details */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[10px] font-bold">
                        <span>{f.size}</span>
                        <span>{f.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination / records tracker summary footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between text-slate-500 font-bold select-none text-[11px]">
              <span>Showing 1-{filteredFiles.length} of {filteredFiles.length} files (Filtered from 11,204 files)</span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 border border-slate-250 bg-white rounded-lg opacity-40 cursor-not-allowed flex items-center gap-1 text-[10px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 border border-slate-250 bg-white rounded-lg opacity-40 cursor-not-allowed flex items-center gap-1 text-[10px]"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Interactive live File Preview Panel drawer (Sticky desk side column) */}
        {isPreviewOpen && selectedFileItem && (
          <div className="lg:col-span-4 h-full">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden sticky top-20 text-left font-sans text-xs">
              
              {/* Header Title section */}
              <div className="p-4 border-b border-slate-150 flex items-center justify-between">
                <span className="font-black text-[#0c1424] text-[13px] tracking-tight">
                  File Preview
                </span>

                {/* Magnifier zoom controllers & close selector */}
                <div className="flex items-center gap-1.5 select-none font-sans text-xs">
                  <button
                    type="button"
                    onClick={() => { setZoomLevel(prev => Math.max(50, prev - 10)); triggerToast('Zoomed out of document skeleton view.'); }}
                    className="w-7 h-7 bg-slate-50 hover:bg-slate-100 border border-slate-205 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setZoomLevel(prev => Math.min(200, prev + 10)); triggerToast('Zoomed in on page metrics mockup.'); }}
                    className="w-7 h-7 bg-slate-50 hover:bg-slate-100 border border-slate-205 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-250 mx-1" />
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(false)}
                    className="w-7 h-7 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 transition"
                    title="Close preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1. PDF Page visual mockup layout (Exact representation of the screenshot mockup) */}
              <div className="p-4.5 bg-[#f8fafc] border-b border-slate-100">
                <div 
                  className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mx-auto relative overflow-hidden transition-all duration-200 ease-in-out"
                  style={{ 
                    aspectRatio: '1 / 1.414',
                    width: '100%',
                    maxWidth: '240px',
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center'
                  }}
                >
                  {/* Visual Skeleton content of document page */}
                  <div className="space-y-4 font-sans text-left">
                    {/* Header line mockups */}
                    <div className="space-y-1.5">
                      <div className="h-2 bg-slate-100 rounded w-5/6" />
                      <div className="h-1.5 bg-slate-100 rounded w-1/2" />
                      <div className="h-1.5 bg-slate-100 rounded w-2/3" />
                    </div>

                    {/* PDF Visual image placeholder block with chart outline (From screenshot) */}
                    <div className="border border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 text-center flex flex-col items-center justify-center h-28 space-y-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-500">
                        {getFileIcon(selectedFileItem.fileType)}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider block uppercase">Chart Placeholder</span>
                    </div>

                    {/* Secondary lines mockups */}
                    <div className="space-y-2 pt-1.5">
                      <div className="h-1.5 bg-slate-100 rounded w-11/12" />
                      <div className="h-1.5 bg-slate-100 rounded w-full" />
                      <div className="h-1.5 bg-slate-100 rounded w-3/4" />
                    </div>
                  </div>

                  {/* Absolute Footer label inside page */}
                  <span className="absolute bottom-2.5 right-4 text-[7px] text-slate-400 font-bold">
                    Page 1 of 12
                  </span>
                </div>
              </div>

              {/* 2. File metadata descriptor info */}
              <div className="p-5 space-y-4 text-left font-sans text-xs">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug break-all">
                    {selectedFileItem.name}
                  </h4>
                  
                  {/* Category badgess row */}
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-extrabold border border-blue-100 text-[9px] uppercase tracking-wide">
                      {selectedFileItem.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-100 text-[9px] uppercase tracking-wide">
                      {selectedFileItem.status}
                    </span>
                  </div>
                </div>

                {/* Sub Metadata card details grid (Exact screenshot references) */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Student ID</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedFileItem.studentId}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Semester</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedFileItem.sem}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">File Size</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedFileItem.size}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Upload Date</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedFileItem.date}</span>
                  </div>
                </div>

                {/* Description summary */}
                <div className="space-y-0.5 pt-1">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Description</span>
                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                    {selectedFileItem.description || 'System standard file template repository reference.'}
                  </p>
                </div>

                {/* Uploaded By */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Uploaded By</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-full bg-slate-100 text-[#0c1424] font-black text-[9px] flex items-center justify-center border border-slate-200 capitalize">
                      {selectedFileItem.uploadedBy[0]}
                    </div>
                    <span className="font-extrabold text-slate-700">{selectedFileItem.uploadedBy} (Admin Office Staff)</span>
                  </div>
                </div>

                {/* Action parameters buttons */}
                <div className="space-y-2.5 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(selectedFileItem.name)}
                    className="w-full py-3 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Download File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleArchiveSingle(selectedFileItem.id)}
                    className="w-full py-3 border border-slate-200 hover:bg-[#fff5f5] text-rose-700 hover:text-rose-900 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                  >
                    <Archive className="w-3.5 h-3.5 text-rose-600" />
                    <span>{selectedFileItem.status === 'Active' ? 'Archive File' : 'Activate Document'}</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* Manual upload simulation dialog modal overlay */}
      <AnimatePresence>
        {isUploadOpen && (
          <div className="fixed inset-0 bg-[#0c1424]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-xs text-left">
            {/* Backdrop Dismiss */}
            <div className="absolute inset-0" onClick={() => setIsUploadOpen(false)} />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative z-10 border border-slate-100 text-left font-sans"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 select-none">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-black text-[#0c1424] text-[14px] tracking-tight">
                    Upload New File
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateFile} className="space-y-4">
                
                {/* File Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">File Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thesis_Chapter1_Draft.pdf"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full border border-slate-205 px-3 py-2 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none font-bold text-slate-800"
                  />
                </div>

                {/* Student ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Student ID Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. U2001552 or Admin"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    className="w-full border border-slate-205 px-3 py-2 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none font-bold text-slate-800"
                  />
                </div>

                {/* Category classification Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-[#f8fafc] border border-slate-205 px-3 py-2 rounded-xl focus:outline-none cursor-pointer font-bold text-slate-800"
                    >
                      <option value="Coursework">Coursework</option>
                      <option value="Research">Research</option>
                      <option value="Administrative">Administrative</option>
                      <option value="Evaluation">Evaluation</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">File Type</label>
                    <select
                      value={newFileType}
                      onChange={(e) => setNewFileType(e.target.value as any)}
                      className="w-full bg-[#f8fafc] border border-slate-205 px-3 py-2 rounded-xl focus:outline-none cursor-pointer font-bold text-slate-800"
                    >
                      <option value="pdf">PDF (*.pdf)</option>
                      <option value="docx">Word (*.docx)</option>
                      <option value="xlsx">Excel (*.xlsx)</option>
                    </select>
                  </div>
                </div>

                {/* Active Semester */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Active Semester Year</label>
                  <input
                    type="text"
                    required
                    value={newSem}
                    onChange={(e) => setNewSem(e.target.value)}
                    className="w-full border border-slate-205 px-3 py-2 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none font-bold text-slate-800"
                  />
                </div>

                {/* Sub tags input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Query search tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Proposal, Draft, Confirmed"
                    value={newTagsStr}
                    onChange={(e) => setNewTagsStr(e.target.value)}
                    className="w-full border border-slate-205 px-3 py-2 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none font-bold text-slate-800"
                  />
                </div>

                {/* Description parameters */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Brief Notes / Desc</label>
                  <textarea
                    rows={2.5}
                    placeholder="Enter file details or administrative guidelines notes..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full border border-slate-205 px-3 py-2 rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none font-medium text-slate-800 resize-none leading-relaxed"
                  />
                </div>

                {/* Drag-and-drop simulated indicator area */}
                <div className="border border-dashed border-slate-250 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-100/40 text-center space-y-1 transition-colors cursor-pointer select-none">
                  <Upload className="w-5 h-5 mx-auto text-slate-400 stroke-[2.5]" />
                  <span className="font-bold text-[#0c1424] block">Select document sheet / drag & drop</span>
                  <span className="text-[9px] text-slate-400 block font-medium">Accept pdf, docx, xlsx, pptx files up to 25MB</span>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="flex-1 py-2.5 border border-slate-350 bg-white hover:bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition cursor-pointer text-center"
                  >
                    Upload Document
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
