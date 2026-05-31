/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Check, 
  Eye, 
  X, 
  CheckCircle, 
  HelpCircle, 
  Clock, 
  User, 
  Mail, 
  ExternalLink, 
  Printer, 
  Download, 
  Edit3, 
  ZoomIn, 
  ZoomOut, 
  RefreshCcw,
  Info,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalToast } from './PortalPrimitives';

interface LetterTemplate {
  id: string;
  name: string;
  description: string;
  badge: 'Standard' | 'Priority';
  refNo: string;
  date: string;
  body: string;
  notes: string;
}

export const StudentLetterGeneration: React.FC = () => {
  // Available templates matching instructions
  const templates: LetterTemplate[] = [
    {
      id: 'enrollment',
      name: 'Confirmation of Enrollment',
      description: 'Official status verification for current students.',
      badge: 'Standard',
      refNo: 'UMF/PG/2024/0822',
      date: 'October 24, 2023',
      body: 'This is to confirm that the following student is currently registered at the Faculty of Computer Science and Information Technology, University of Malaya:',
      notes: 'The student is expected to complete their studies by March 2025, subject to fulfillment of academic requirements.'
    },
    {
      id: 'visa',
      name: 'Visa Support Letter',
      description: 'Embassy-ready documentation for travel or extension.',
      badge: 'Priority',
      refNo: 'UMF/PG/25/V-0918',
      date: 'November 12, 2025',
      body: 'This official document is issued to support the student visa renewal application with the Immigration Department of Malaysia for the following candidate:',
      notes: 'The Faculty fully supports this progress review endorsement to allow completion of the candidate\'s thesis viva obligations.'
    },
    {
      id: 'completion',
      name: 'Completion Letter',
      description: 'Proof of degree fulfillment post-viva.',
      badge: 'Standard',
      refNo: 'UMF/PG/25/C-3294',
      date: 'December 05, 2025',
      body: 'We are pleased to verify that the following postgraduate scholar has satisfactorily fulfilled all coursework and research publication criteria for degree conferral:',
      notes: 'The final Senate approval is pending formal degree presentation at the upcoming university graduation ceremony.'
    },
    {
      id: 'sponsorship',
      name: 'Sponsorship Claim',
      description: 'Financial clearance and fee structure details.',
      badge: 'Standard',
      refNo: 'UMF/PG/25/S-7731',
      date: 'January 14, 2026',
      body: 'This statement is generated to verify candidate standing and fee ledger invoice details for external scholarship disbursement authorities:',
      notes: 'All academic performance standards are met. The student remains in good regular registration standing.'
    }
  ];

  // State management
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate>(templates[0]);
  const [zoomScale, setZoomScale] = useState<number>(100); // Zoom level in percent
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);
  
  // Custom Student Info Fields (Modify Details feature)
  const [studentName, setStudentName] = useState<string>('Ahmed Bin Mohammad Al-Farsi');
  const [matricNumber, setMatricNumber] = useState<string>('WQD190001');
  const [programName, setProgramName] = useState<string>('Master of Data Science (By Coursework)');
  const [currentStatus, setCurrentStatus] = useState<string>('Active - Semester 1, Session 2023/2024');

  // Trigger temporary toast messages
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Action Button handlers
  const handleGeneratePDF = () => {
    triggerToast(`Initializing high-precision PDF compilation for "${selectedTemplate.name}"... Official digital signature embedded.`);
  };

  const handlePrintCollection = () => {
    triggerToast(`Document sent to FSKTM Office queue. Print Job Ref: JOB-${Math.floor(Math.random() * 90000) + 10000}. Ready for counter collection.`);
  };

  const handleZoomIn = () => {
    if (zoomScale < 120) setZoomScale(p => p + 10);
  };

  const handleZoomOut = () => {
    if (zoomScale > 80) setZoomScale(p => p - 10);
  };

  return (
    <div id="student-letter-generation-workspace" className="space-y-6 text-left font-sans pb-12">
      
      <PortalToast message={toastMessage} />

      {/* Page Header */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1 select-none">
          <span>Official Documents</span>
          <span>/</span>
          <span className="text-brand-navy">Letter Generation</span>
        </div>
        
        <h1 className="page-title">
          Letter Generation
        </h1>
        <p className="page-subtitle">
          Select an available letter template, preview the generated letter, and generate or print your official PDF document.
        </p>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: LETTER TEMPLATES LIBRARY (4 Cols) */}
        <div id="templates-sidebar-panel" className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#e2e8f0]/85 rounded-2xl p-5 shadow-3xs flex flex-col justify-between min-h-[520px]">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 select-none">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Letter Templates
                </span>
                <span className="bg-slate-100 text-slate-600 font-bold text-[9px] px-2 py-0.5 rounded-full font-mono">
                  0{templates.length} Forms
                </span>
              </div>

              {/* Template interactive items */}
              <div className="space-y-3">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate.id === tpl.id;
                  const isPriority = tpl.badge === 'Priority';
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer block relative overflow-hidden group ${
                        isSelected 
                          ? 'bg-slate-55/40 bg-slate-50/50 border-brand-navy ring-1 ring-[#0c1424]/40 shadow-xs' 
                          : 'bg-white border-slate-200 hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 ${isSelected ? 'text-brand-navy stroke-[2.3]' : 'text-slate-400'}`} />
                          <span className={`text-xs font-black leading-tight ${isSelected ? 'text-brand-navy' : 'text-slate-800'}`}>
                            {tpl.name}
                          </span>
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 font-mono ${
                          isPriority 
                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {tpl.badge}
                        </span>
                      </div>

                      <p className="text-[10px] font-semibold text-slate-450 text-slate-400 mt-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Help-Tip and Replacement for Admin Button */}
            <div className="pt-6 border-t border-slate-100 space-y-4 select-none">
              
              <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-slate-505 text-slate-500 leading-normal">
                  Selection updates the preview live. You may customize allowed fields under "Modify Details" inside the preview pane.
                </p>
              </div>

              {/* Student-Facing Action Button replacing "Edit Templates" */}
              <button
                type="button"
                onClick={() => {
                  triggerToast("Draft request initiated. FSKTM administrator has been pinged for any customized verification guidelines.");
                }}
                className="w-full py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-350 active:bg-slate-150 text-brand-navy text-[10px] font-black uppercase tracking-widest rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
              >
                <span>Request Custom Letter</span>
              </button>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW PANE + simulated A4 document sheet (8 Cols) */}
        <div id="preview-panel" className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-[#e2e8f0]/85 rounded-2xl p-6 shadow-3xs text-left flex flex-col justify-between">
            
            {/* Toolbar block */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4 select-none">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-brand-navy uppercase tracking-wider">
                  Preview Pane
                </span>
              </div>

              {/* Toolbar zoom state controls & Friendly Preview Mode pill */}
              <div className="flex items-center gap-3">
                {/* Plus / Minus Zoom buttons */}
                <div className="flex items-center bg-slate-100/80 border border-slate-200 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-black font-mono px-2 text-slate-600 shrink-0 min-w-[36px] text-center">
                    {zoomScale}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Friendly Client-Facing Status Badge */}
                <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-indigo-600 stroke-[2.3]" />
                  <span>Preview Mode</span>
                </span>
              </div>
            </div>

            {/* Simulated Live Edit Drawer (Modify details) */}
            <AnimatePresence>
              {isEditingDetails && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b border-dashed border-slate-200 mt-2"
                >
                  <div className="p-4 bg-slate-50/80 rounded-xl my-3 border border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Student Name</span>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full bg-white border border-slate-250 text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg focus:ring-1 focus:ring-slate-900 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Matric Number</span>
                      <input
                        type="text"
                        value={matricNumber}
                        onChange={(e) => setMatricNumber(e.target.value)}
                        className="w-full bg-white border border-slate-250 text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg focus:ring-1 focus:ring-slate-900 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Program / Coursework</span>
                      <input
                        type="text"
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                        className="w-full bg-white border border-slate-250 text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg focus:ring-1 focus:ring-slate-900 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Registration Status & Semester</span>
                      <input
                        type="text"
                        value={currentStatus}
                        onChange={(e) => setCurrentStatus(e.target.value)}
                        className="w-full bg-white border border-slate-250 text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg focus:ring-1 focus:ring-slate-900 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center justify-between border-t border-slate-200/65 pt-3 mt-1.5 select-none">
                      <p className="text-[9px] text-slate-400 font-semibold italic">Customized values are bound instantly to the template schema below.</p>
                      <button
                        type="button"
                        onClick={() => setIsEditingDetails(false)}
                        className="px-3.5 py-1 bg-brand-navy text-white text-[9px] font-black uppercase tracking-wider rounded transition hover:bg-slate-850 cursor-pointer"
                      >
                        Accept Changes
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Deeply Clean and Polished Simulated A4 Document Container */}
            <div className="bg-slate-100/60 border border-slate-200 rounded-2xl my-5 p-6 md:p-8 overflow-x-auto">
              
              {/* Dynamic Scaling A4 paper design */}
              <div 
                style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'top center' }}
                className="bg-white border border-slate-300 rounded p-8 md:p-11 shadow-sm font-sans mx-auto max-w-[580px] min-h-[720px] text-left text-[11px] text-slate-700 leading-relaxed relative flex flex-col justify-between transition-transform duration-100"
              >
                
                <div>
                  {/* Top Header Block: University Branding exactly like official documentation */}
                  <div className="border-b-2 border-double border-slate-800 pb-4 mb-6 flex items-center justify-between gap-4">
                    {/* Universiti Malaya visual representation box */}
                    <div className="flex items-center gap-3 select-none">
                      <div className="w-12 h-12 rounded bg-brand-navy text-white font-black flex items-center justify-center border border-slate-350 font-sans tracking-tight text-[10px] text-center leading-tight">
                        UNIV<br/>UM
                      </div>
                      <div className="text-left font-serif">
                        <h4 className="text-[11px] font-extrabold uppercase text-slate-900 leading-none">
                          UNIVERSITI MALAYA
                        </h4>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-none block mt-1">
                          Faculty of Computer Science &amp; IT
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-[8px] font-sans font-bold text-slate-450 text-slate-450 leading-relaxed text-slate-400 max-w-[210px] select-none">
                      Faculty of Computer Science &amp; IT<br/>
                      Academic Affairs Office, Level 4<br/>
                      50603 Kuala Lumpur, Malaysia<br/>
                      +603-7967 6300 | pg.fsktm@um.edu.my
                    </div>
                  </div>

                  {/* Ref Nos and Date block with absolute pristine typography */}
                  <div className="flex justify-between items-baseline mb-6 font-semibold text-slate-600 font-mono text-[9.5px]">
                    <div>
                      <span>Our Ref: </span>
                      <span className="text-slate-800 select-all font-sans font-extrabold">{selectedTemplate.refNo}</span>
                    </div>
                    <div>
                      <span>Date: </span>
                      <span className="text-slate-805 select-all font-sans font-bold">{selectedTemplate.date}</span>
                    </div>
                  </div>

                  {/* Standardized Letter Recipient / Title banner */}
                  <div className="text-center font-extrabold text-slate-950 text-xs tracking-wider uppercase mb-5 select-none border-y border-dashed border-slate-200 py-1.5">
                    TO WHOM IT MAY CONCERN
                  </div>

                  {/* Body Paragraph 1 */}
                  <p className="text-slate-850 font-medium mb-4">
                    {selectedTemplate.body}
                  </p>

                  {/* High Quality Structured Grid/Table of Student Metadata WITHOUT corrupted characters */}
                  <div className="bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden mb-5 font-sans">
                    
                    {/* Row Item A: Student Name */}
                    <div className="grid grid-cols-3 border-b border-slate-100 last:border-0 p-3 items-center">
                      <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">Student Name</span>
                      <span className="col-span-2 text-xs font-black text-slate-800 capitalize select-all">
                        {studentName}
                      </span>
                    </div>

                    {/* Row Item B: Matric Number */}
                    <div className="grid grid-cols-3 border-b border-slate-100 last:border-0 p-3 items-center">
                      <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">Matric Number</span>
                      <span className="col-span-2 text-xs font-extrabold text-slate-850 select-all font-mono">
                        {matricNumber}
                      </span>
                    </div>

                    {/* Row Item C: Program */}
                    <div className="grid grid-cols-3 border-b border-slate-100 last:border-0 p-3 items-center">
                      <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">Program</span>
                      <span className="col-span-2 text-[11px] font-bold text-slate-850 select-all">
                        {programName}
                      </span>
                    </div>

                    {/* Row Item D: Status */}
                    <div className="grid grid-cols-3 border-b border-slate-100 last:border-0 p-3 items-center">
                      <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">Current Status</span>
                      <span className="col-span-2 text-[11px] font-extrabold text-slate-850 select-all">
                        {currentStatus}
                      </span>
                    </div>

                  </div>

                  {/* Body Paragraph 2 */}
                  <p className="text-slate-850 font-medium mb-4">
                    {selectedTemplate.notes}
                  </p>

                  {/* Footer Statement */}
                  <p className="text-slate-500 font-semibold text-[10px] leading-relaxed select-none">
                    This letter is issued upon the student's request for official purposes only. Any alteration to this document shall render it invalid.
                  </p>
                </div>

                {/* Secure Seal & Signature Section */}
                <div className="border-t border-slate-100 pt-5 mt-8 flex justify-between items-end">
                  <div className="space-y-1 flex-1 text-left">
                    <div className="w-20 border-b border-slate-350 h-5 select-none" />
                    <p className="font-extrabold text-slate-900 leading-tight">Dean of Postgraduate Studies</p>
                    <p className="text-slate-405 text-slate-400 uppercase tracking-widest text-[8px] font-black font-sans mt-0.5 block leading-none select-none">
                      FSKTM Office Executive Secretariat
                    </p>
                  </div>

                  {/* Encryption / Verification Watermark checkmark block */}
                  <div className="flex bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 items-center gap-2 select-none select-none shrink-0">
                    <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600">
                      <ShieldCheck className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="text-left leading-none">
                      <span className="text-[7.5px] uppercase font-black text-slate-450 text-slate-400 block tracking-wider">E-Signature</span>
                      <span className="text-[8px] font-black text-indigo-600 block mt-0.5 tracking-wide">Encrypted Verified</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* LOWER CTAS ACTION BAR */}
            <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">
              
              <button
                type="button"
                onClick={() => setIsEditingDetails(p => !p)}
                className={`w-full md:w-auto px-5 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                  isEditingDetails 
                    ? 'bg-slate-100 text-brand-navy hover:bg-slate-200' 
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modify Details</span>
              </button>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                {/* Print button */}
                <button
                  type="button"
                  onClick={handlePrintCollection}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-250 text-brand-navy font-black text-[10px] tracking-widest uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print for Collection</span>
                </button>

                {/* Generate PDF button */}
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  className="w-full sm:w-auto px-6 py-3 bg-brand-navy hover:bg-slate-850 text-white font-black text-[10px] tracking-widest uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileCheck className="w-3.5 h-3.5 stroke-[2.3]" />
                  <span>Generate PDF</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
