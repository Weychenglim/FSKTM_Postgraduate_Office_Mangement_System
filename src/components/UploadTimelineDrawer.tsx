/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Info, 
  Download, 
  CheckCircle2, 
  XCircle,
  FileSpreadsheet, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (events: any[]) => void;
}

export const UploadTimelineDrawer: React.FC<UploadTimelineDrawerProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // File drag states
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Validation status states
  const [isValidating, setIsValidating] = useState(false);
  const [validationCompleted, setValidationCompleted] = useState(false);
  
  // Checklist verification states (empty circle = 'pending', green check = 'success', red X = 'fail')
  const [checklist, setChecklist] = useState({
    columns: 'pending' as 'pending' | 'success' | 'fail',
    format: 'pending' as 'pending' | 'success' | 'fail',
    duplicates: 'pending' as 'pending' | 'success' | 'fail',
    conflicts: 'pending' as 'pending' | 'success' | 'fail',
    roles: 'pending' as 'pending' | 'success' | 'fail',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      triggerToast('Validation Error: Only Excel templates represented as .xlsx are accepted.');
      return;
    }
    setUploadedFile(file);
    setValidationCompleted(false);
    // Reset checklists
    setChecklist({
      columns: 'pending',
      format: 'pending',
      duplicates: 'pending',
      conflicts: 'pending',
      roles: 'pending',
    });
    triggerToast(`Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Ready for validation.`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    triggerToast('Generating Excel master template download...');
    setTimeout(() => {
      const element = document.createElement("a");
      const file = new Blob(["FSKTM Office Postgraduate Timeline Template Placeholder"], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = "FSKTM_Master_Timeline_Template.xlsx";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 1000);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    setValidationCompleted(false);
    setChecklist({
      columns: 'pending',
      format: 'pending',
      duplicates: 'pending',
      conflicts: 'pending',
      roles: 'pending',
    });
  };

  const handleValidateAndUpload = () => {
    if (!uploadedFile) {
      triggerToast('Error: Please select or drop an Excel timeline file first.');
      return;
    }

    setIsValidating(true);
    triggerToast('Initiating structural schema verification audits...');

    // Stagger checklist item transitions to simulate a thorough audit checks
    setTimeout(() => {
      setChecklist(prev => ({ ...prev, columns: 'success' }));
    }, 400);

    setTimeout(() => {
      setChecklist(prev => ({ ...prev, format: 'success' }));
    }, 800);

    setTimeout(() => {
      setChecklist(prev => ({ ...prev, duplicates: 'success' }));
    }, 1200);

    setTimeout(() => {
      setChecklist(prev => ({ ...prev, conflicts: 'success' }));
    }, 1600);

    setTimeout(() => {
      setChecklist(prev => ({ ...prev, roles: 'success' }));
      setIsValidating(false);
      setValidationCompleted(true);
      triggerToast('Validation passed! All 5 critical parameters successfully verified.');
    }, 2000);
  };

  const handleFinalImport = () => {
    if (!validationCompleted) {
      triggerToast('Error: Please run schema validations before executing database commit.');
      return;
    }

    // Pass custom mock data back representing the newly updated elements
    const mockImported = [
      {
        id: 'ent_1_new',
        event: 'Supervisor Request Period (Reloaded)',
        category: 'Supervisor Appointment',
        startDate: '02 Oct 2025',
        endDate: '16 Oct 2025',
        targetRole: ['STUDENT'],
        status: 'Completed'
      },
      {
        id: 'ent_2_new',
        event: 'Panel Recommendation Period (Reloaded)',
        category: 'Panel Appointment',
        startDate: '17 Oct 2025',
        endDate: '01 Nov 2025',
        targetRole: ['LECTURER'],
        status: 'Active'
      },
      {
        id: 'ent_3_new',
        event: 'Proposal Upload Deadline (Reloaded)',
        category: 'Document Submission',
        startDate: '27 Oct 2025',
        endDate: '27 Oct 2025',
        targetRole: ['STUDENT'],
        status: 'Deadline'
      }
    ];

    if (onImportSuccess) {
      onImportSuccess(mockImported);
    }
    
    onClose();
  };

  const renderChecklistBullet = (state: 'pending' | 'success' | 'fail') => {
    if (state === 'success') {
      return (
        <span className="shrink-0 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 fill-emerald-50 text-emerald-600" />
        </span>
      );
    }
    if (state === 'fail') {
      return (
        <span className="shrink-0 text-rose-600 flex items-center justify-center">
          <XCircle className="w-4 h-4" />
        </span>
      );
    }
    return (
      <div className="w-4 h-4 rounded-full border border-slate-300 bg-white shadow-3xs shrink-0" />
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="upload-timeline-drawer-root" 
          className="fixed inset-0 z-50 flex justify-end font-sans text-xs text-left"
        >
          {/* Dimmed Background Overlay */}
          <motion.div
            id="upload-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0c1424] backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          {/* Toast Notification internally nested to remain inside drawer context */}
          {toastMessage && (
            <div className="fixed top-5 right-5 z-55 bg-[#0c1424] text-white font-extrabold px-5 py-3 rounded-xl border border-white/10 shadow-2xl flex items-center gap-2 max-w-xs transition-transform">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping shrink-0" />
              <span className="leading-snug">{toastMessage}</span>
            </div>
          )}

          {/* Slide-In Side Panel Container */}
          <motion.div
            id="upload-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-md sm:max-w-xl h-full bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200"
          >
            {/* Drawer Header Layout */}
            <div 
              id="upload-drawer-header-content" 
              className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 select-none"
            >
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-slate-800" />
                <h3 className="font-black text-[#0c1424] text-[15px] tracking-tight">
                  Upload Timeline
                </h3>
              </div>
              
              <button
                id="upload-drawer-close-btn"
                onClick={onClose}
                className="w-9 h-9 hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center transition text-slate-400 hover:text-slate-800"
                aria-label="Close upload details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Drawer Body with No Extra Blank Verticals */}
            <div 
              id="upload-drawer-scrollable-body" 
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-white"
            >
              
              {/* Target Semester Parameter List Stats Card */}
              <div 
                id="drawer-target-semester-card"
                className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4.5 space-y-3.5"
              >
                <div className="grid grid-cols-12 gap-1 items-baseline">
                  <div className="col-span-5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    Target semester
                  </div>
                  <div className="col-span-7 text-[#0c1424] font-black text-right text-xs">
                    Sem 1 2025/2026
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-1 items-baseline pt-0.5 border-t border-slate-100">
                  <div className="col-span-5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    Upload type
                  </div>
                  <div className="col-span-7 text-[#0c1424] font-black text-right text-xs">
                    Semester Timeline
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-1 items-baseline pt-1.5 border-t border-slate-100">
                  <div className="col-span-5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    Accepted format
                  </div>
                  <div className="col-span-7 text-[#2563eb] font-black text-right text-xs">
                    Excel (.xlsx)
                  </div>
                </div>
              </div>

              {/* Blue Colored Directive Alert Warning */}
              <div 
                id="drawer-directive-alert-box"
                className="bg-sky-50/70 border border-sky-100 rounded-2xl p-4 flex gap-3 text-sky-800"
              >
                <Info className="w-4.5 h-4.5 text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-2 text-[11px] leading-relaxed">
                  <p className="font-semibold text-sky-950">
                    Use the official Excel template to avoid validation errors and ensure data integrity.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 text-[#2563eb] hover:text-blue-800 font-extrabold uppercase text-[9.5px] tracking-wider transition bg-transparent border-0 p-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Download Template</span>
                  </button>
                </div>
              </div>

              {/* Drag-And-Drop Master File Upload Sandbox Zone */}
              <div
                id="drawer-drag-upload-dropzone"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50/20' 
                    : uploadedFile 
                      ? 'border-emerald-400 bg-emerald-50/10' 
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/20 hover:bg-slate-50/55'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-3xs mb-3 text-slate-700">
                  {uploadedFile ? (
                    <FileCheck className="w-6 h-6 text-emerald-600 animate-pulse" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-slate-550" />
                  )}
                </div>

                {uploadedFile ? (
                  <div className="space-y-1">
                    <span className="text-xs font-black text-[#0c1424] block max-w-xs truncate px-4">
                      {uploadedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-bold">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • Completed
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 select-none">
                    <span className="text-xs font-black text-[#0c1424] block">
                      Drag and drop timeline file here
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Excel .xlsx format only (Max 10MB)
                    </span>
                  </div>
                )}

                {uploadedFile ? (
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="mt-3 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 font-extrabold uppercase text-[9px] tracking-wider rounded-lg hover:bg-rose-100/50 transition cursor-pointer"
                  >
                    Clear Selected File
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseClick();
                    }}
                    className="mt-3.5 px-4.5 py-1.5 bg-white border border-slate-355 border-slate-300 hover:bg-slate-50 text-[#0c1424] font-extrabold uppercase text-[9.5px] tracking-wider rounded-xl shadow-3xs transition cursor-pointer"
                  >
                    Browse File
                  </button>
                )}
              </div>

              {/* Validation Checklist Panel Module */}
              <div id="drawer-validation-checklist-panel" className="space-y-3 pt-5">
                <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-widest block">
                  VALIDATION CHECKLIST
                </span>

                <div className="space-y-2.5 pl-1 text-[11.5px]">
                  
                  {/* Parameter 1: Required columns */}
                  <div className="flex items-center gap-3">
                    {renderChecklistBullet(checklist.columns)}
                    <span className={`font-semibold ${checklist.columns === 'success' ? 'text-[#0c1424] font-bold' : 'text-slate-500'}`}>
                      Required columns present
                    </span>
                  </div>

                  {/* Parameter 2: Date formats */}
                  <div className="flex items-center gap-3">
                    {renderChecklistBullet(checklist.format)}
                    <span className={`font-semibold ${checklist.format === 'success' ? 'text-[#0c1424] font-bold' : 'text-slate-500'}`}>
                      Date format valid
                    </span>
                  </div>

                  {/* Parameter 3: Duplicate records */}
                  <div className="flex items-center gap-3">
                    {renderChecklistBullet(checklist.duplicates)}
                    <span className={`font-semibold ${checklist.duplicates === 'success' ? 'text-[#0c1424] font-bold' : 'text-slate-500'}`}>
                      No duplicate timeline events
                    </span>
                  </div>

                  {/* Parameter 4: Conflicting dates */}
                  <div className="flex items-center gap-3">
                    {renderChecklistBullet(checklist.conflicts)}
                    <span className={`font-semibold ${checklist.conflicts === 'success' ? 'text-[#0c1424] font-bold' : 'text-slate-500'}`}>
                      No conflicting date ranges
                    </span>
                  </div>

                  {/* Parameter 5: Roles mapping */}
                  <div className="flex items-center gap-3">
                    {renderChecklistBullet(checklist.roles)}
                    <span className={`font-semibold ${checklist.roles === 'success' ? 'text-[#0c1424] font-bold' : 'text-slate-500'}`}>
                      Target roles recognized
                    </span>
                  </div>

                </div>
              </div>

              {/* Dynamic import summary placeholders block */}
              <div id="drawer-import-summary" className="pt-2">
                <AnimatePresence mode="wait">
                  {validationCompleted ? (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4.5 space-y-2.5 text-emerald-900"
                    >
                      <h4 className="font-extrabold text-[#0c1424] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Ready for import commit</span>
                      </h4>
                      <p className="font-semibold text-[11px] text-emerald-850 leading-relaxed">
                        Validation checks complete. Found <strong>5 new calendar milestones</strong> spanning 3 months. No overlaps found.
                      </p>
                    </motion.div>
                  ) : isValidating ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-slate-50 border border-slate-205 rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-2.5 py-7 select-none"
                    >
                      <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                      <span className="font-bold text-slate-500 text-[10.5px]">
                        Analyzing timeline dates schema records...
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 1 }}
                      className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 text-center py-6 select-none border-dashed"
                    >
                      <span className="font-semibold text-slate-400 text-[11px] tracking-wide block">
                        Import summary will appear after validation.
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

            {/* Bottom Actions Drawer Footer (Keeps compact close spacer) */}
            <div 
              id="upload-drawer-submit-footer"
              className="px-6 py-5.5 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0"
            >
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-705 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition cursor-pointer shadow-3xs"
              >
                Cancel
              </button>

              {validationCompleted ? (
                <button
                  type="button"
                  onClick={handleFinalImport}
                  className="px-5.5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Commit Import</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleValidateAndUpload}
                  disabled={isValidating || !uploadedFile}
                  className="px-5.5 py-3 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{isValidating ? 'Validating...' : 'Validate and Upload'}</span>
                  {!isValidating && <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
