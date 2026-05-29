/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  ChevronLeft,
  Upload, 
  X, 
  CheckCircle, 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  Plus,
  HelpCircle,
  Clock,
  ShieldCheck,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Define Props for parent-level control
interface UploadNewDocumentProps {
  onBack: () => void;
  onUploadSuccess: (newFile: {
    name: string;
    studentId: string;
    category: 'Coursework' | 'Research' | 'Administrative' | 'Evaluation';
    semester: string;
    tags: string[];
    description: string;
    fileType: 'pdf' | 'docx' | 'xlsx' | 'pptx';
  }) => void;
}

interface RecentUpload {
  id: string;
  name: string;
  timeAgo: string;
  tag: string;
  type: 'pdf' | 'docx' | 'xlsx';
}

export const UploadNewDocument: React.FC<UploadNewDocumentProps> = ({ 
  onBack, 
  onUploadSuccess 
}) => {
  // 1. Form States
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState<'Coursework' | 'Research' | 'Administrative' | 'Evaluation'>('Coursework');
  const [selectedModule, setSelectedModule] = useState('Select Module...');
  const [semester, setSemester] = useState('Semester 1 2024/2025');
  const [notes, setNotes] = useState('');
  
  // Tag management State (Initialized with screenshot pre-populated chips)
  const [tags, setTags] = useState<string[]>(['Thesis Draft', 'Panel Review', 'Semester 1 2024']);
  const [tagInput, setTagInput] = useState('');

  // 2. Access Control Table Toggle States (matching the screenshot layout)
  const [access, setAccess] = useState({
    officeStaff: { view: true, download: true, archive: true },
    coordinator: { view: true, download: true, archive: false },
    lecturer: { view: true, download: false, archive: false },
    student: { view: false, download: false, archive: false }
  });

  // 3. Upload File Simulations state
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    progress: number;
    fileType: 'pdf' | 'docx' | 'xlsx';
  } | null>({
    name: 'Chapter_1_Literature_Review_Final.pdf',
    size: '4.2 MB',
    progress: 65,  // Pre-filled 65% as shown in screenshot
    fileType: 'pdf'
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recent Uploads matching screenshot exactly
  const [recentUploads] = useState<RecentUpload[]>([
    { id: '1', name: 'S2_2023_Examiner_Report.docx', timeAgo: '2 mins ago', tag: 'S172944', type: 'docx' },
    { id: '2', name: 'Official_Transcript_Req_Signed.pdf', timeAgo: '1 hr ago', tag: 'Administrative', type: 'pdf' },
    { id: '3', name: 'Cohort_2024_Grades_Draft.xlsx', timeAgo: '3 hrs ago', tag: 'WQD7001', type: 'xlsx' },
    { id: '4', name: 'Medical_Certificate_Leave.pdf', timeAgo: 'Yesterday', tag: 'S165022', type: 'pdf' }
  ]);

  // Helper toaster triggers
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Toggles Access state handler safely
  const togglePermission = (role: 'officeStaff' | 'coordinator' | 'lecturer' | 'student', field: 'view' | 'download' | 'archive') => {
    setAccess(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [field]: !prev[role][field]
      }
    }));
  };

  // Tag list operators
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,/g, '');
      if (val) {
        if (tags.includes(val)) {
          triggerToast(`Tag "${val}" is already included.`);
        } else {
          setTags(prev => [...prev, val]);
          setTagInput('');
        }
      }
    }
  };

  const handleRemoveTag = (tagText: string) => {
    setTags(prev => prev.filter(t => t !== tagText));
  };

  // Drag and drop simulations handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      let type: 'pdf' | 'docx' | 'xlsx' = 'pdf';
      if (ext === 'docx') type = 'docx';
      if (ext === 'xlsx' || ext === 'xls') type = 'xlsx';

      setUploadedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        progress: 100,
        fileType: type
      });
      triggerToast(`Successfully selected file "${file.name}" for upload.`);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      let type: 'pdf' | 'docx' | 'xlsx' = 'pdf';
      if (ext === 'docx') type = 'docx';
      if (ext === 'xlsx' || ext === 'xls') type = 'xlsx';

      setUploadedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        progress: 100,
        fileType: type
      });
      triggerToast(`Ready to upload: "${file.name}"`);
    }
  };

  // Submit flow
  const handleConfirmUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      triggerToast('Error: Please drag or select a document to upload first.');
      return;
    }

    // Submit payload matching requirements
    onUploadSuccess({
      name: uploadedFile.name,
      studentId: studentId.trim() || 'Admin',
      category: category,
      semester: semester,
      tags: tags,
      description: notes || 'Faculty master document uploaded to PG Central archive.',
      fileType: uploadedFile.fileType === 'docx' ? 'docx' : uploadedFile.fileType === 'xlsx' ? 'xlsx' : 'pdf'
    });
  };

  // Return file icon helpers
  const getFileIcon = (type: 'pdf' | 'docx' | 'xlsx') => {
    switch (type) {
      case 'docx':
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
            <FileCode className="w-4 h-4" />
          </div>
        );
      case 'xlsx':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div id="upload-document-workspace" className="font-sans text-[#0c1424] text-xs pb-12">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-[100] bg-[#0c1424] text-white p-4 rounded-xl shadow-xl flex items-center gap-2.5 border border-white/10 font-bold"
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[11px] font-sans tracking-wide">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to File Repository Link */}
      <div className="mb-4 text-left">
        <button 
          onClick={onBack}
          className="back-link group mb-3"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to File Repository</span>
        </button>
      </div>

      {/* Header text layout */}
      <div className="text-left mb-6">
        <h1 className="page-title">
          Upload New Document
        </h1>
        <p className="page-subtitle leading-relaxed">
          Add files to the central repository with metadata and tags.
        </p>
      </div>

      {/* Responsive Grid layout for side column info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Main metadata details form (col-span-7 or 8) */}
        <div className="lg:col-span-7 space-y-6">
          
          <form onSubmit={handleConfirmUpload} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 md:p-8 space-y-6 text-left">
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight pb-4 border-b border-slate-100">
                Document Details
              </h2>
            </div>

            {/* SECTION 1: FILE INFORMATION FIELDS */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                File Information
              </span>

              {/* Grid 2 rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Student ID */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black tracking-wider uppercase text-slate-500">
                    Student ID
                  </label>
                  <input
                    type="text"
                    placeholder="Leave blank if not linked to a specific student"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full bg-white border border-slate-205 text-xs font-bold text-slate-700 px-3.5 py-2.5 rounded-xl placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                  />
                </div>

                {/* Category drop selection */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black tracking-wider uppercase text-slate-500">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-205 text-xs font-bold text-slate-750 px-3.5 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Administrative">Academic Submission</option>
                      <option value="Coursework">Coursework</option>
                      <option value="Research">Research Draft</option>
                      <option value="Administrative">Administrative</option>
                      <option value="Evaluation">Evaluation</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <span className="text-[10px] font-bold">▼</span>
                    </div>
                  </div>
                </div>

                {/* Module selection Dropdown */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black tracking-wider uppercase text-slate-500">
                    Module
                  </label>
                  <div className="relative">
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      className="w-full bg-white border border-slate-205 text-xs font-bold text-slate-750 px-3.5 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Select Module...">Select Module...</option>
                      <option value="WIE2003 Research Methodology">WIE2003 Research Methodology</option>
                      <option value="WQD7001 Thesis Preparation">WQD7001 Thesis Preparation</option>
                      <option value="WIC3002 Advanced Software Engineering">WIC3002 Advanced Software Engineering</option>
                      <option value="WIE7002 Postgraduate Dissertation">WIE7002 Postgraduate Dissertation</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <span className="text-[10px] font-bold">▼</span>
                    </div>
                  </div>
                </div>

                {/* Semester selection */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black tracking-wider uppercase text-slate-500">
                    Semester
                  </label>
                  <div className="relative">
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full bg-white border border-slate-205 text-xs font-bold text-slate-750 px-3.5 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Semester 1 2024/2025">Semester 1 2024/2025</option>
                      <option value="Semester 2 2024/2025">Semester 2 2024/2025</option>
                      <option value="Semester 1 2023/24">Semester 1 2023/24</option>
                      <option value="Semester 2 2023/24">Semester 2 2023/24</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <span className="text-[10px] font-bold">▼</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 2: TAG INDIVIDUAL PILLS */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-baseline justify-between">
                <label className="text-[10px] font-black tracking-wider uppercase text-slate-500">
                  Tags
                </label>
                <span className="text-[9px] text-slate-400 font-medium">Press enter to register tag</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-3">
                Press enter to add new tags. Used for rapid searching.
              </p>

              {/* Box Containing list of chips + relative tag input */}
              <div className="bg-[#f8fafc]/60 border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2 items-center focus-within:ring-1 focus-within:ring-slate-900 focus-within:border-slate-900 transition-all">
                {tags.map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 bg-[#0c1424] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg select-none"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-white/20 p-0.5 rounded transition"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </span>
                ))}
                
                <input
                  type="text"
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  className="flex-1 bg-transparent border-none text-xs font-bold text-slate-700 placeholder:text-slate-400 outline-none px-1 py-1"
                />
              </div>
            </div>

            {/* SECTION 3: ADDITIONAL DISSERTATION NOTES */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black tracking-wider uppercase text-slate-500">
                Additional Notes
              </label>
              <textarea
                rows={4}
                placeholder="Enter any context, remarks, or specific instructions related to this document..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-205 text-xs font-semibold text-slate-700 px-3.5 py-3 rounded-xl placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all resize-none"
              />
            </div>

            {/* SECTION 4: ACCESS CONTROL GRID SWITCH TABLE */}
            <div className="space-y-3.5 text-left pt-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Access Control
              </span>
              
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <table className="w-full text-[11px] font-sans text-left border-collapse">
                  <thead>
                    <tr className="data-thead bg-[#f8fafc]">
                      <th className="data-th">Role</th>
                      <th className="data-th text-center">View</th>
                      <th className="data-th text-center">Download</th>
                      <th className="data-th text-center">Archive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Office Staff Row */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="data-td-strong">Office Staff</td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('officeStaff', 'view')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.officeStaff.view ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.officeStaff.view ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('officeStaff', 'download')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.officeStaff.download ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.officeStaff.download ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('officeStaff', 'archive')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.officeStaff.archive ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.officeStaff.archive ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                    </tr>

                    {/* Coordinator Row */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="data-td-strong">Coordinator</td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('coordinator', 'view')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.coordinator.view ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.coordinator.view ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('coordinator', 'download')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.coordinator.download ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.coordinator.download ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('coordinator', 'archive')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.coordinator.archive ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.coordinator.archive ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                    </tr>

                    {/* Lecturer Row */}
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="data-td-strong">Lecturer</td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('lecturer', 'view')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.lecturer.view ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.lecturer.view ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('lecturer', 'download')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.lecturer.download ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.lecturer.download ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('lecturer', 'archive')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.lecturer.archive ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.lecturer.archive ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                    </tr>

                    {/* Student Row */}
                    <tr className="hover:bg-slate-50/55 transition">
                      <td className="data-td-strong">Student</td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('student', 'view')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.student.view ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.student.view ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('student', 'download')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.student.download ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.student.download ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="data-td text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('student', 'archive')}
                          className={`mx-auto w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${access.student.archive ? 'bg-[#0c1424]' : 'bg-slate-200'}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-xs transition-all ${access.student.archive ? 'right-0.5 translate-x-0' : 'left-0.5'}`} />
                        </button>
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>

            {/* SEPARATOR BUTTON ACTIONS ROW */}
            <div className="flex md:items-center justify-between gap-4 pt-6 border-t border-slate-100 flex-col md:flex-row">
              <button
                type="button"
                onClick={onBack}
                className="w-full md:w-auto px-5 py-3 border border-slate-250 hover:bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer text-center text-[10px]"
              >
                Cancel and Go Back
              </button>

              <button
                type="submit"
                className="w-full md:w-auto px-6 py-3 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-[10px]"
              >
                <Upload className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Confirm and Upload</span>
              </button>
            </div>

          </form>

        </div>

        {/* RIGHT COLUMN: Upload Dropzone & Guidelines cards sidebar panel (col-span-4 or 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. File upload Drag and drop dropzone card container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
            
            {/* Dashed Drop Container area box */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-4 cursor-pointer transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' 
                  : 'border-slate-200 hover:border-slate-400 bg-[#f8fafc]/30'
              }`}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
              />

              {/* Upload Cloud SVG Icon bundle layout */}
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#0c1424] transition-colors">
                <Upload className="w-5 h-5 text-slate-650" />
              </div>

              <div className="space-y-1 select-none">
                <p className="font-extrabold text-slate-800 text-sm">
                  Drop your file here
                </p>
                <p className="text-[11px] text-blue-600 font-black hover:underline cursor-pointer">
                  Or click to browse
                </p>
              </div>

              <div className="text-[10px] text-slate-400 font-semibold space-y-1">
                <p>Supported formats: PDF, DOCX, XLSX, PNG, JPG</p>
                <p>Max size: 25MB</p>
              </div>
            </div>

            {/* Simulated Active Upload in-progress percentage card progress indicators */}
            <AnimatePresence>
              {uploadedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="bg-[#f0f4f9]/80 border border-slate-205 p-4 rounded-xl flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                    {getFileIcon(uploadedFile.fileType)}
                    <div className="flex-1 min-w-0 space-y-1 text-left">
                      <p className="font-extrabold text-slate-850 text-[11px] truncate" title={uploadedFile.name}>
                        {uploadedFile.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        {uploadedFile.size} • {uploadedFile.progress}%
                      </p>
                      {/* Interactive percentage progress bar indicator lines */}
                      <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1 bg-neutral-200">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${uploadedFile.progress}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => { setUploadedFile(null); triggerToast('Removed file queue.'); }}
                    className="p-1 rounded bg-white hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* 2. UPLOAD GUIDELINES SPEC RULES CARD LIST (matching screenshot bullet check indicators) */}
          <div className="bg-white border border-slate-200/95 rounded-2xl shadow-2xs p-5 space-y-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-left">
              Upload Guidelines
            </span>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-left text-slate-650">
                <CheckCircle className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed text-[11px]">
                  Link documents to a Student ID for automatic filing into their registry profile.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-left text-slate-650">
                <CheckCircle className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed text-[11px]">
                  Use descriptive tags to ensure the document appears in advanced repository searches.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-left text-slate-650">
                <CheckCircle className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed text-[11px]">
                  Maximum file size is strictly 25MB per upload.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-left text-slate-650">
                <CheckCircle className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed text-[11px]">
                  By default, files are not archived. Toggle &apos;Archive&apos; in access control for legacy docs.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-left text-slate-650">
                <CheckCircle className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed text-[11px]">
                  All uploads are recorded in the institutional audit log with your user stamp.
                </span>
              </div>
            </div>
          </div>

          {/* 3. RECENT UPLOADS CARD WITH ACTION VALUE */}
          <div className="bg-white border border-slate-200/95 rounded-2xl shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Recent Uploads
              </span>
              <button 
                type="button" 
                onClick={onBack}
                className="text-[10px] text-blue-600 hover:underline font-extrabold cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* List with 4 lines matching recent mockups */}
            <div className="space-y-3 select-none">
              {recentUploads.map(doc => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition duration-150"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.type)}
                    <div className="text-left space-y-0.5">
                      <p className="font-extrabold text-slate-800 text-[11px] truncate max-w-[170px]" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5">
                        <span>{doc.timeAgo}</span>
                        <span>•</span>
                        <span className="text-indigo-650 py-0.5 px-1.5 rounded bg-indigo-50 border border-indigo-100 uppercase tracking-widest text-[8px] font-black scale-95 origin-left">
                          {doc.tag}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
