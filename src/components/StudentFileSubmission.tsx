/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  UploadCloud, 
  Trash2, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  File, 
  ChevronDown, 
  History, 
  Loader2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalToast } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { SubmissionRecord } from '../types';
import { getStudentSubmissions } from '../services';

// SubmissionRecord now lives in src/types.

export const StudentFileSubmission: React.FC = () => {
  // Available Submission Categories
  const categories = [
    'Thesis Proposal',
    'Midterm Progress Report',
    'Final Thesis Draft',
    'Research Methodology Progress',
    'Ethics Clearance Application',
    'Sponsorship Clearance Form'
  ];

  // Student submissions loaded from filesApi (mock-backed today).
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(() => {
    setLoading(true);
    setError(null);
    getStudentSubmissions()
      .then(setSubmissions)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load submissions.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // UI state
  const [selectedCategory, setSelectedCategory] = useState<string>('Thesis Proposal');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger auto-dismiss toast alerts
  const triggerToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper formatting for file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Drag and drop events
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // File Picker Trigger
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Main file processor with 50MB size & DOCX/PDF type validation
  const processFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isSupported = extension === 'pdf' || extension === 'docx';
    const isUnderSize = file.size <= 50 * 1024 * 1024; // 50MB

    if (!isSupported) {
      triggerToast('Unsupported file type. Please upload a PDF or DOCX file.', 'error');
      return;
    }

    if (!isUnderSize) {
      triggerToast('File size exceeds the 50MB threshold.', 'error');
      return;
    }

    // Simulate animated upload progress
    setUploadingName(file.name);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Append new draft upload
            const newRecord: SubmissionRecord = {
              id: `sub-${Date.now()}`,
              name: file.name,
              category: selectedCategory,
              uploaded: `${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              size: formatBytes(file.size),
              sizeBytes: file.size,
              status: 'Draft' // Always uploads as Draft initial state for editing
            };
            setSubmissions(prevSub => [newRecord, ...prevSub]);
            setUploadProgress(null);
            setUploadingName('');
            triggerToast(`"${file.name}" uploaded successfully as a draft submission.`, 'success');
          }, 300);
          return 100;
        }
        return prev + 25; // upload increment
      });
    }, 150);
  };

  // Action handlers
  const handleDownload = (record: SubmissionRecord) => {
    triggerToast(`Establishing secure SSL handshake connection. Downloading "${record.name}"...`, 'info');
  };

  const handleDeleteDraft = (id: string, name: string) => {
    setSubmissions(prev => prev.filter(item => item.id !== id));
    triggerToast(`Draft file "${name}" has been permanently purged.`, 'success');
  };

  const handleExportHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerToast('Generating encrypted digital ledger audit trail export. PDF summary ready shortly.', 'success');
  };

  return (
    <div id="student-file-submission-workspace" className="space-y-6 text-left font-sans pb-12 select-none">
      
      <PortalToast message={toast?.text ?? null} tone={toast?.type === 'error' ? 'danger' : toast?.type === 'success' ? 'success' : 'info'} />

      {/* Structured Clean Grid Layout Header Block */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between border-b border-slate-100 pb-5 gap-4">
        <div className="space-y-1">
          <h1 className="page-title">
            Submission Portal
          </h1>
          <p className="page-subtitle max-w-2xl leading-relaxed">
            Upload your research documents for faculty review. Ensure your submission aligns with the FSKTM academic standards.
          </p>
        </div>

        {/* Categories pulldown menu strictly aligned */}
        <div className="w-full lg:w-72 space-y-1.5 self-start lg:self-end">
          <label htmlFor="submission-category-select" className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Submission Category
          </label>
          <div className="relative">
            <select
              id="submission-category-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                triggerToast(`Category switched to "${e.target.value}". Drag files or browse below.`, 'info');
              }}
              className="w-full bg-white border border-[#e2e8f0] text-xs font-bold text-slate-800 px-4 py-3 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-950 shadow-3xs"
            >
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Drag-And-Drop High Fidelity Area */}
      <div 
        id="drag-dropzone-uploader"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 flex flex-col items-center justify-center min-h-[260px] relative ${
          isDragging 
            ? 'border-brand-navy bg-slate-50/80 ring-2 ring-[#0c1424]/10' 
            : 'border-slate-200/80 bg-white hover:border-slate-350 hover:bg-slate-50/30'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx"
          className="hidden" 
        />

        {uploadProgress !== null ? (
          /* Custom uploading progression feedback widget exactly mirroring pristine mockup guidelines */
          <div className="space-y-4 max-w-xs w-full animate-pulse select-none">
            <div className="w-12 h-12 bg-brand-navy/5 text-brand-navy rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-800 truncate" title={uploadingName}>
                Uploading {uploadingName}
              </p>
              <p className="text-[10px] font-bold text-slate-400 font-mono">
                Progress: {uploadProgress}% Completed
              </p>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-150 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 select-none">
            {/* Round elegant Cloud icon wrapper */}
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 text-brand-navy rounded-2xl flex items-center justify-center mx-auto shadow-3xs">
              <UploadCloud className="w-6 h-6 text-indigo-600" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-black text-slate-800">
                Drag &amp; drop your thesis or report here, or{' '}
                <button 
                  type="button" 
                  onClick={handleBrowseClick}
                  className="text-indigo-600 hover:text-indigo-800 underline underline-offset-4 cursor-pointer font-black"
                >
                  browse
                </button>
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Supported formats: PDF, DOCX up to 50MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section Title: Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-brand-navy uppercase tracking-wider">
            Recent Activity
          </h2>
          <button
            type="button"
            onClick={handleExportHistory}
            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1 cursor-pointer hover:underline underline-offset-4"
          >
            <History className="w-3.5 h-3.5" />
            <span>Export Full History</span>
          </button>
        </div>

        {/* Clean responsive table block */}
        <div className="bg-white border border-[#e2e8f0]/85 rounded-2xl overflow-hidden shadow-3xs text-xs">
          <div className="overflow-x-auto">
            <table id="recent-activity-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-105 select-none">
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-450 text-slate-400 tracking-wider">File Name</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-450 text-slate-400 tracking-wider">Category</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-450 text-slate-400 tracking-wider">Uploaded</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-450 text-slate-400 tracking-wider">Size</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-450 text-slate-400 tracking-wider">Status</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase text-slate-450 text-slate-400 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <LoadingState message="Loading submissions…" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <ErrorState message={error} onRetry={loadSubmissions} />
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-bold select-none">
                      No recent submissions recorded under your index. Select a category and upload to begin.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => {
                    const isDraft = sub.status === 'Draft';
                    const isApproved = sub.status === 'Approved';
                    const isPending = sub.status === 'Pending Review';

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/40 transition">
                        {/* File Name cell */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              sub.name.endsWith('.pdf') 
                                ? 'bg-rose-50 border-rose-100 text-rose-500' 
                                : 'bg-blue-50 border-blue-100 text-blue-500'
                            }`}>
                              <File className="w-4 h-4" />
                            </div>
                            <span className="font-extrabold text-slate-800 text-xs truncate max-w-[210px] block select-all" title={sub.name}>
                              {sub.name}
                            </span>
                          </div>
                        </td>

                        {/* Category cell */}
                        <td className="py-4 px-6 text-slate-500">
                          {sub.category}
                        </td>

                        {/* Uploaded date cell */}
                        <td className="py-4 px-6 font-medium text-slate-500">
                          {sub.uploaded}
                        </td>

                        {/* Size cell */}
                        <td className="py-4 px-6 font-mono text-slate-500 text-[11px]">
                          {sub.size}
                        </td>

                        {/* Status Chip cell exactly matching color presets */}
                        <td className="py-4 px-6">
                          {isApproved && (
                            <span className="bg-emerald-50/80 border border-emerald-150 text-emerald-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 select-none">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          )}

                          {isPending && (
                            <span className="bg-amber-50/80 border border-amber-150 text-amber-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 select-none">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              <span>Pending Review</span>
                            </span>
                          )}

                          {isDraft && (
                            <span className="bg-blue-50 border border-blue-150 text-blue-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 select-none">
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span>Draft</span>
                            </span>
                          )}
                        </td>

                        {/* Actions item triggers */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            {/* Download Icon always allowed for all states */}
                            <button
                              type="button"
                              onClick={() => handleDownload(sub)}
                              className="p-1.5 hover:bg-slate-100 hover:text-brand-navy rounded-lg transition-colors cursor-pointer text-slate-500"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Delete Icon ONLY shown for Draft state */}
                            {isDraft ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteDraft(sub.id, sub.name)}
                                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer text-slate-400"
                                title="Purge Draft submission"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              /* Empty disabled cell to preserve grid balance */
                              <div className="w-7 h-7" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
