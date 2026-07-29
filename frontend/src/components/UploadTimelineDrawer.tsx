/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Info, 
  Download, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalButton, PortalToast } from './PortalPrimitives';
import { TimelineEntry } from '../types';
import {
  downloadTimelineTemplate,
  saveBlob,
  timelineEntryToLegacy,
  uploadTimelineFile,
} from '../services';
import { validateTimelineUploadFile } from '../utils/timelineUploadValidation';

interface UploadTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (events: TimelineEntry[], importedCount?: number) => void;
  defaultSemester: string;
  defaultSession: string;
}

export const UploadTimelineDrawer: React.FC<UploadTimelineDrawerProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  defaultSemester,
  defaultSession,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // File drag states
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Validation status states
  const [isValidating, setIsValidating] = useState(false);
  const [validationCompleted, setValidationCompleted] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [semester, setSemester] = useState(defaultSemester);
  const [session, setSession] = useState(defaultSession);
  
  // Checklist verification states (empty circle = 'pending', green check = 'success', red X = 'fail')
  const [checklist, setChecklist] = useState({
    columns: 'pending' as 'pending' | 'success' | 'fail',
    format: 'pending' as 'pending' | 'success' | 'fail',
    duplicates: 'pending' as 'pending' | 'success' | 'fail',
    conflicts: 'pending' as 'pending' | 'success' | 'fail',
    roles: 'pending' as 'pending' | 'success' | 'fail',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSemester(defaultSemester);
    setSession(defaultSession);
  }, [defaultSemester, defaultSession, isOpen]);

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
    const validationError = validateTimelineUploadFile(file);
    if (validationError) {
      triggerToast(`Validation Error: ${validationError}`);
      return;
    }
    setUploadedFile(file);
    setValidationCompleted(false);
    setImportedCount(null);
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
    downloadTimelineTemplate()
      .then((blob) => {
        saveBlob(blob, 'FSKTM_Semester_Timeline_Template.xlsx');
        triggerToast('Success! FSKTM_Semester_Timeline_Template.xlsx downloaded.');
      })
      .catch((e) => {
        triggerToast(e instanceof Error ? e.message : 'Failed to download timeline template.');
      });
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    setValidationCompleted(false);
    setImportedCount(null);
    setChecklist({
      columns: 'pending',
      format: 'pending',
      duplicates: 'pending',
      conflicts: 'pending',
      roles: 'pending',
    });
  };

  const handleValidateAndUpload = () => {
    if (!semester.trim() || !session.trim()) {
      triggerToast('Error: Semester and academic session are required.');
      return;
    }
    if (!uploadedFile) {
      triggerToast('Error: Please select or drop an Excel timeline file first.');
      return;
    }

    setIsValidating(true);
    setImportedCount(null);
    setChecklist({
      columns: 'pending',
      format: 'pending',
      duplicates: 'pending',
      conflicts: 'pending',
      roles: 'pending',
    });
    triggerToast('Uploading timeline file for backend validation...');

    uploadTimelineFile(uploadedFile, semester.trim(), session.trim())
      .then((result) => {
        const importedEntries = result.timeline.levels.flatMap((group) =>
          group.entries.map(timelineEntryToLegacy)
        );
        setChecklist({
          columns: 'success',
          format: 'success',
          duplicates: 'success',
          conflicts: 'success',
          roles: 'success',
        });
        setImportedCount(result.importedCount);
        setValidationCompleted(true);
        onImportSuccess?.(importedEntries, result.importedCount);
        triggerToast(`Import completed. ${result.importedCount} entries committed.`);
      })
      .catch((e) => {
        setChecklist({
          columns: 'fail',
          format: 'fail',
          duplicates: 'fail',
          conflicts: 'fail',
          roles: 'fail',
        });
        setValidationCompleted(false);
        triggerToast(e instanceof Error ? e.message : 'Timeline import failed.');
      })
      .finally(() => {
        setIsValidating(false);
      });
  };

  const handleDone = () => {
    setUploadedFile(null);
    setValidationCompleted(false);
    setImportedCount(null);
    setChecklist({
      columns: 'pending',
      format: 'pending',
      duplicates: 'pending',
      conflicts: 'pending',
      roles: 'pending',
    });
    onClose();
  };

  const handleFinalImport = () => {
    if (validationCompleted) {
      handleDone();
      return;
    }
    if (!uploadedFile) {
      triggerToast('Error: Please select or drop an Excel timeline file first.');
      return;
    }
    if (!semester.trim() || !session.trim()) {
      triggerToast('Error: Semester and academic session are required.');
      return;
    }

    setIsImporting(true);
    uploadTimelineFile(uploadedFile, semester.trim(), session.trim())
      .then((result) => {
        const importedEntries = result.timeline.levels.flatMap((group) =>
          group.entries.map(timelineEntryToLegacy)
        );
        onImportSuccess?.(importedEntries, result.importedCount);
        triggerToast(`Import completed. ${result.importedCount} entries committed.`);
        handleDone();
      })
      .catch((e) => {
        triggerToast(e instanceof Error ? e.message : 'Timeline import failed.');
      })
      .finally(() => {
        setIsImporting(false);
      });
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
            className="fixed inset-0 bg-brand-navy backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          <PortalToast message={toastMessage} />

          {/* Slide-In Side Panel Container */}
          <motion.div
            id="upload-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="drawer-panel"
          >
            {/* Drawer Header Layout */}
            <div 
              id="upload-drawer-header-content" 
              className="drawer-header"
            >
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-slate-800" />
                <h3 className="font-black text-brand-navy text-[15px] tracking-tight">
                  Upload Timeline
                </h3>
              </div>
              
              <button
                id="upload-drawer-close-btn"
                onClick={onClose}
                className="icon-button w-9 h-9"
                aria-label="Close upload details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Drawer Body with No Extra Blank Verticals */}
            <div 
              id="upload-drawer-scrollable-body" 
              className="drawer-body"
            >
              
              {/* Target Semester Parameter List Stats Card */}
              <div 
                id="drawer-target-semester-card"
                className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4.5 space-y-3.5"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="form-label block">Target semester</span>
                    <input
                      className="form-control form-control-sm"
                      value={semester}
                      onChange={(event) => setSemester(event.target.value)}
                      placeholder="e.g. Semester I"
                      required
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="form-label block">Academic session</span>
                    <input
                      className="form-control form-control-sm"
                      value={session}
                      onChange={(event) => setSession(event.target.value)}
                      placeholder="e.g. 2026/2027"
                      required
                    />
                  </label>
                </div>

                <div className="grid grid-cols-12 gap-1 items-baseline pt-3 border-t border-slate-100">
                  <div className="col-span-5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    Upload type
                  </div>
                  <div className="col-span-7 text-brand-navy font-black text-right text-xs">
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
                  <PortalButton
                    type="button"
                    onClick={handleDownloadTemplate}
                    variant="ghost"
                    size="sm"
                    icon={Download}
                    className="px-0 py-0 h-auto"
                  >
                    Download Template
                  </PortalButton>
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
                    <span className="text-xs font-black text-brand-navy block max-w-xs truncate px-4">
                      {uploadedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-bold">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • Completed
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 select-none">
                    <span className="text-xs font-black text-brand-navy block">
                      Drag and drop timeline file here
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Excel .xlsx format only (Max 10MB)
                    </span>
                  </div>
                )}

                {uploadedFile ? (
                  <PortalButton
                    type="button"
                    onClick={handleClearFile}
                    variant="danger"
                    size="sm"
                    className="mt-3"
                  >
                    Clear Selected File
                  </PortalButton>
                ) : (
                  <PortalButton
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseClick();
                    }}
                    variant="secondary"
                    size="sm"
                    className="mt-3.5"
                  >
                    Browse File
                  </PortalButton>
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
                    <span className={`font-semibold ${checklist.columns === 'success' ? 'text-brand-navy font-bold' : 'text-slate-500'}`}>
                      Required columns present
                    </span>
                  </div>

                  {/* Parameter 2: Date formats */}
                  <div className="flex items-center gap-3">
                    {renderChecklistBullet(checklist.format)}
                    <span className={`font-semibold ${checklist.format === 'success' ? 'text-brand-navy font-bold' : 'text-slate-500'}`}>
                      Date format valid
                    </span>
                  </div>

                  {/* Parameter 3: Duplicate records */}
                  <div className="flex items-center gap-3">
                    {renderChecklistBullet(checklist.duplicates)}
                    <span className={`font-semibold ${checklist.duplicates === 'success' ? 'text-brand-navy font-bold' : 'text-slate-500'}`}>
                      No duplicate timeline events
                    </span>
                  </div>

                  {/* Parameter 4: Conflicting dates */}
                  <div className="flex items-center gap-3">
                    {renderChecklistBullet(checklist.conflicts)}
                    <span className={`font-semibold ${checklist.conflicts === 'success' ? 'text-brand-navy font-bold' : 'text-slate-500'}`}>
                      No conflicting date ranges
                    </span>
                  </div>

                  {/* Parameter 5: Roles mapping */}
                  <div className="flex items-center gap-3">
                    {renderChecklistBullet(checklist.roles)}
                    <span className={`font-semibold ${checklist.roles === 'success' ? 'text-brand-navy font-bold' : 'text-slate-500'}`}>
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
                      <h4 className="font-extrabold text-brand-navy text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Ready for import commit</span>
                      </h4>
                      <p className="font-semibold text-[11px] text-emerald-850 leading-relaxed">
                        Backend validation passed and <strong>{importedCount ?? 0} timeline entries</strong> were committed to the active semester timeline.
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
              className="drawer-footer"
            >
              <PortalButton
                type="button"
                onClick={onClose}
                variant="secondary"
                size="md"
              >
                Cancel
              </PortalButton>

              {validationCompleted ? (
                <PortalButton
                  type="button"
                  onClick={handleFinalImport}
                  variant="success"
                  size="md"
                  icon={ArrowRight}
                  iconPosition="right"
                  isLoading={isImporting}
                  disabled={isImporting}
                >
                  Done
                </PortalButton>
              ) : (
                <PortalButton
                  type="button"
                  onClick={handleValidateAndUpload}
                  disabled={isValidating || !uploadedFile}
                  variant="primary"
                  size="md"
                  icon={ArrowRight}
                  iconPosition="right"
                  isLoading={isValidating}
                >
                  {isValidating ? 'Uploading...' : 'Validate and Import'}
                </PortalButton>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
