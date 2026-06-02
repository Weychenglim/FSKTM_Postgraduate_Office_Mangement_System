/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  Upload, 
  ArrowLeft, 
  Save, 
  Send, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';

interface SupervisorAppointmentApplicationPageProps {
  onBack: () => void;
  onSuccess: (newApplication: any) => void;
}

export const SupervisorAppointmentApplicationPage: React.FC<SupervisorAppointmentApplicationPageProps> = ({
  onBack,
  onSuccess
}) => {
  // Stepper tracking - decorative/informational as matched in screenshots
  const steps = [
    { number: 1, title: 'Project Details', subtitle: 'Research Foundations' },
    { number: 2, title: 'Supervisor Selection', subtitle: 'Academic Matching' },
    { number: 3, title: 'Document Upload', subtitle: 'Supporting Evidence' }
  ];

  // Form Fields
  const [researchTitle, setResearchTitle] = useState('');
  const [researchAbstract, setResearchAbstract] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [lastSaved, setLastSaved] = useState('Today at 09:42 AM');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supervisors static mock with match scoring / slots
  const supervisors = [
    { id: 'sv-1', name: 'Dr. Siti Noor', initials: 'SN', filled: 4, total: 5, domain: 'Cybersecurity' },
    { id: 'sv-2', name: 'Assoc. Prof. Henry Lim', initials: 'HL', filled: 2, total: 5, domain: 'Software Engineering' },
    { id: 'sv-3', name: 'Prof. Dr. Ahmad Kamil', initials: 'AK', filled: 0, total: 5, domain: 'Artificial Intelligence' }
  ];

  // Filtering based on search query
  const filteredSupervisors = supervisors.filter(sv => 
    sv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sv.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drag and drop handling
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropFiles = (Array.from(e.dataTransfer.files) as File[]).filter(file => 
        file.type === "application/pdf" || 
        file.name.endsWith(".docx") || 
        file.name.endsWith(".doc")
      );
      if (dropFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...dropFiles]);
      } else {
        alert("Unsupported file format! Only PDF, DOCX format documents accepted.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectFiles = (Array.from(e.target.files) as File[]).filter(file => 
        file.type === "application/pdf" || 
        file.name.endsWith(".docx") || 
        file.name.endsWith(".doc")
      );
      if (selectFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...selectFiles]);
      } else {
        alert("Unsupported file format! Only PDF, DOCX format documents accepted.");
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSaveAsDraft = () => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSaved(`Today at ${timeNow}`);
    alert('Draft progress saved successfully! You can resume and complete the application anytime.');
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();

    if (!researchTitle.trim()) {
      alert("Please provide your proposed Research Title.");
      return;
    }
    if (!researchAbstract.trim()) {
      alert("Please provide your Research Abstract.");
      return;
    }
    if (!selectedSupervisorId) {
      alert("Please choose a proposed research supervisor from the matching matrix.");
      return;
    }
    if (uploadedFiles.length === 0) {
      alert("Please upload at least one supporting document (e.g. Research Proposal outline files).");
      return;
    }

    const selectedSv = supervisors.find(sv => sv.id === selectedSupervisorId);

    // Assembly of new tracking item
    const newAppPayload = {
      id: `SV-APP-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
      title: researchTitle,
      supervisor: selectedSv ? selectedSv.name : 'Unspecified Supervisor',
      date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'PENDING REVIEW'
    };

    onSuccess(newAppPayload);
  };

  return (
    <form id="submission-supervisor-form" onSubmit={handleSubmitRequest} className="space-y-8 text-left font-sans pb-12">
      
      {/* 1. Header/Navigator Navigation row */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="back-link group mb-3"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Supervisor Appointments</span>
        </button>

        <h1 className="page-title">
          Supervisor Appointment Application
        </h1>
        <p className="page-subtitle max-w-4xl leading-relaxed">
          Complete the following steps to formally request a research supervisor. Ensure your proposal abstract is clear and aligned with the faculty's research pillars.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE-STEPPER HEADER CAROUSEL                                          */}
      {/* ========================================================================= */}
      <div id="application-stepper-row" className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 select-none">
        {steps.map((st, idx) => (
          <div key={st.number} className="flex items-center gap-3.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
              idx === 0 
                ? 'bg-brand-navy text-white shadow-xs' 
                : 'bg-slate-200 text-slate-550 text-slate-500'
            }`}>
              {st.number}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-none">
                {st.title}
              </h3>
              <p className="text-[10px] text-slate-450 text-slate-400 font-medium font-mono mt-1">
                {st.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. STEP 1: RESEARCH PROJECT DETAILS                                      */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 space-y-5 shadow-3xs text-left">
        <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 select-none border-b border-slate-100 pb-3">
          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">1</span>
          Research Project Details
        </h3>

        {/* Input Field: Research Title */}
        <div className="space-y-1.5">
          <label htmlFor="research-title-input" className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Research Title
          </label>
          <input
            id="research-title-input"
            type="text"
            value={researchTitle}
            onChange={(e) => setResearchTitle(e.target.value)}
            placeholder="Enter the full working title of your research"
            className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 focus:ring-offset-0 rounded-xl px-4 py-3 text-xs font-semibold text-slate-805 text-slate-800 placeholder-slate-400 transition"
          />
        </div>

        {/* Text Area Field: Research Abstract */}
        <div className="space-y-1.5">
          <label htmlFor="research-abstract-input" className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Research Abstract
          </label>
          <textarea
            id="research-abstract-input"
            rows={5}
            value={researchAbstract}
            onChange={(e) => setResearchAbstract(e.target.value)}
            placeholder="Provide a concise summary of your research objectives, methodology, and expected outcomes (max 500 words)..."
            className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 focus:ring-offset-0 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-805 text-slate-800 placeholder-slate-400 transition leading-relaxed"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono pt-1">
            <span>Minimum word count parameter recommended for review: 150 words</span>
            <span>Character Count: {researchAbstract.length}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STEP 2: SUPERVISOR SELECTION                                          */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 space-y-5 shadow-3xs text-left">
        <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 select-none border-b border-slate-100 pb-3">
          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">2</span>
          Supervisor Selection
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Search filter + selection list (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">
              Select Proposed Supervisor
            </span>

            {/* Search filter input bar wrapper */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-navy transition-all" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or expertise..."
                className="w-full bg-slate-50 hover:bg-slate-50/75 focus:bg-white border-0 focus:ring-2 focus:ring-indigo-500/85 pl-10 pr-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 transition rounded-xl"
              />
            </div>

            {/* Render matched supervisors lists */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {filteredSupervisors.length > 0 ? (
                filteredSupervisors.map((sv) => {
                  const isSelected = selectedSupervisorId === sv.id;
                  const isFull = sv.filled >= sv.total;
                  
                  return (
                    <div
                      key={sv.id}
                      onClick={() => {
                        if (!isFull) {
                          setSelectedSupervisorId(sv.id);
                        } else {
                          alert(`Sorry, ${sv.name} has reached maximum advisory capacity of ${sv.total} slots.`);
                        }
                      }}
                      className={`flex items-center justify-between p-3.5 border rounded-xl transition cursor-pointer text-left select-none ${
                        isSelected 
                          ? 'bg-indigo-50/40 border-indigo-400 shadow-3xs' 
                          : isFull 
                            ? 'bg-slate-50/50 border-slate-200/50 opacity-60 cursor-not-allowed' 
                            : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      {/* Avatar Initials block */}
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 uppercase ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-brand-navy text-white'
                        }`}>
                          {sv.initials}
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">
                            {sv.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                            Expertise: {sv.domain}
                          </span>
                        </div>
                      </div>

                      {/* Right capacity indicator slots chip */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border select-none ${
                        isFull 
                          ? 'bg-rose-50 text-rose-600 border-rose-200' 
                          : isSelected 
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                            : 'bg-slate-100 text-slate-600 border-slate-200/70'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${isFull ? 'bg-rose-500' : 'bg-slate-500'}`} />
                        <span>{sv.filled}/{sv.total} Slots Filled</span>
                      </span>

                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-xl">
                  No matching supervisors found
                </div>
              )}
            </div>
          </div>

          {/* Right panel matching rule descriptor (5 cols) */}
          <div className="lg:col-span-5 h-full">
            <div className="bg-[#f0fdf4]/50 border border-[#bbf7d0]/60 rounded-2xl p-5 flex gap-4 items-start relative h-full">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 pt-0.5 select-none">
                <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">
                  Academic Matching Rule
                </h4>
                <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                  System automatically filters supervisors based on your registered research domain (<strong className="text-slate-800">Cybersecurity</strong>). Please select a supervisor with available capacity.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. STEP 3: SUPPORTING DOCUMENTS UPLOAD ZONE                               */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 space-y-5 shadow-3xs text-left">
        <h3 className="text-sm font-bold text-brand-navy uppercase tracking-wider flex items-center gap-2 select-none border-b border-slate-100 pb-3">
          <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[11px] font-black">3</span>
          Supporting Documents
        </h3>

        {/* Upload Dropzone interaction wrapper */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-2xl p-8 text-center justify-center items-center flex flex-col gap-4 cursor-pointer transition select-none ${
            dragActive 
              ? 'border-indigo-55 bg-indigo-50/40 border-indigo-500' 
              : 'border-slate-250 border-slate-200/85 hover:border-indigo-400 hover:bg-slate-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100/90 shadow-2xs">
            <Upload className="w-5 h-5 text-indigo-500 stroke-[2.3]" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-extrabold text-brand-navy tracking-tight">
              Drag and drop your proposal files
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              PDF, DOCX format only. Maximum file size 10MB.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 bg-brand-navy hover:bg-slate-850 text-white font-extrabold text-[10px] tracking-wider uppercase px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 stroke-[2.3]" />
            <span>Browse Files</span>
          </button>
        </div>

        {/* List of successfully uploaded proposal files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block leading-none">
              Uploaded Proposal Documents ({uploadedFiles.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 px-1 py-0.5 rounded cursor-pointer uppercase tracking-wider text-[10px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. CURRENT SAVE/SUBMISSION BOTTOM ACTION CONTROL BAR                       */}
      {/* ========================================================================= */}
      <div id="sticky-draft-submit-control" className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 select-none">
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
          Last saved: {lastSaved}
        </div>

        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSaveAsDraft}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-brand-navy font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.3]" />
            <span>Save as Draft</span>
          </button>
          
          <button
            type="submit"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-brand-navy hover:bg-slate-850 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition shadow-3xs cursor-pointer"
          >
            <Send className="w-4 h-4 stroke-[2.3]" />
            <span>Submit SV Request</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. SUPPORTING CARDS FOOTER CONTAINER                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Eligibility Checked */}
        <div className="bg-[#e0f2fe]/30 border border-sky-100 rounded-2xl p-5 shadow-3xs select-none">
          <div className="w-10 h-10 rounded-xl bg-sky-100/70 flex items-center justify-center text-sky-600 mb-4">
            <ShieldCheck className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Eligibility Checked
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Your current credit hours and CGPA meet the minimum requirements for supervisor appointment.
          </p>
        </div>

        {/* Review Process */}
        <div className="bg-[#f3e8ff]/30 border border-[#e9d5ff]/70 rounded-2xl p-5 shadow-3xs select-none">
          <div className="w-10 h-10 rounded-xl bg-purple-100/70 flex items-center justify-center text-purple-600 mb-4">
            <Clock className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Review Process
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed font-sans">
            Applications are reviewed within <strong className="text-slate-800">7-10 working days</strong> by the Departmental Research Committee.
          </p>
        </div>

        {/* Need Assistance? */}
        <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs select-none">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <HelpCircle className="w-5 h-5 stroke-[2.3]" />
          </div>
          <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-2">
            Need Assistance?
          </h4>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Contact the FSKTM Office Directory or use our FAQ Chatbot for technical issues.
          </p>
        </div>

      </div>

    </form>
  );
};
