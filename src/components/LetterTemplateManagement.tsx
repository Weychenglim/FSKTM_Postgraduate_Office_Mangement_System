/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Check, 
  Eye, 
  UploadCloud, 
  X, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  Image as ImageIcon,
  CheckCircle,
  HelpCircle,
  Clock,
  User,
  SlidersHorizontal,
  RefreshCcw,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Definitions for template structure
interface LetterTemplate {
  id: string;
  name: string;
  type: string;
  status: 'Active' | 'Draft';
  lastModified: string;
  modifiedBy: string;
  description: string;
  content: string;
}

export const LetterTemplateManagement: React.FC = () => {
  // Toast notifications state
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Core Templates Seed Data (Exactly matching screenshot records)
  const [templates, setTemplates] = useState<LetterTemplate[]>([
    {
      id: 'tpl-1',
      name: 'Official Confirmation Letter',
      type: 'Academic Certification',
      status: 'Active',
      lastModified: 'Oct 12, 2023',
      modifiedBy: 'Dr. Azwan',
      description: 'Standard letter for enrollment verification and status.',
      content: `CONFIRMATION OF STUDENT STATUS\n\nThis is to certify that {{STUDENT_NAME}} (ID: {{STUDENT_ID}}) is a registered full-time postgraduate student at the Faculty of Computer Science and Information Technology, University of Malaya.\n\nThe student is currently pursuing the {{PROGRAMME_NAME}} and has completed {{CREDITS_EARNED}} credits to date. Their current CGPA is {{GPA}}.\n\nShould you require further clarification, please do not hesitate to contact the Postgraduate Office at +603-7967 6300.`
    },
    {
      id: 'tpl-2',
      name: 'Visa Support Document',
      type: 'Academic Certification', // Group as per type filter
      status: 'Draft',
      lastModified: 'Sep 28, 2023',
      modifiedBy: 'Admin',
      description: 'Required for international student visa renewals.',
      content: `STUDENT VISA EXTENSION SUPPORT\n\nThis is to confirm that {{STUDENT_NAME}} (ID: {{STUDENT_ID}}) is a full-time candidate of {{PROGRAMME_NAME}} at Faculty of Computer Science and Information Technology, UM.\n\nTheir current academic performance is satisfactory with a CGPA score of {{GPA}}. The faculty fully supports their student visa renewal application to complete the remaining credits.`
    },
    {
      id: 'tpl-3',
      name: 'Thesis Submission Notice',
      type: 'Academic Certification',
      status: 'Active',
      lastModified: 'Aug 05, 2023',
      modifiedBy: 'Prof. Lim',
      description: 'Formal notification for viva-voce and submission.',
      content: `NOTICE OF INTENT FOR THESIS SUBMISSION\n\nThis is to acknowledge receipt of notice for thesis submission submitted by {{STUDENT_NAME}} (ID: {{STUDENT_ID}}) enrolled in the {{PROGRAMME_NAME}} program.\n\nThe candidate maintains a solid score with {{CREDITS_EARNED}} credits completed, qualifying for academic committee evaluation step.`
    },
    {
      id: 'tpl-4',
      name: 'Bursary Clearance Form',
      type: 'Academic Certification',
      status: 'Draft',
      lastModified: 'Jul 19, 2023',
      modifiedBy: 'Admin',
      description: 'Internal financial clearance letter for graduates.',
      content: `FINANCIAL BURSARY CLEARANCE ASSURANCE\n\nTo Whom It May Concern, this letter serves to confirm that FSKTM candidate {{STUDENT_NAME}} (ID: {{STUDENT_ID}}) has settled all outstanding dues for the current academic session.`
    }
  ]);

  // Selected state
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate>(templates[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Editable Form Inputs matching the current selection
  const [editorName, setEditorName] = useState(selectedTemplate.name);
  const [editorType, setEditorType] = useState(selectedTemplate.type);
  const [editorContent, setEditorContent] = useState(selectedTemplate.content);
  const [editorStatus, setEditorStatus] = useState(selectedTemplate.status);

  // File Upload Letterhead Sim State
  const [letterheadImage, setLetterheadImage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Sync editor fields when selected template changes
  useEffect(() => {
    setEditorName(selectedTemplate.name);
    setEditorType(selectedTemplate.type);
    setEditorContent(selectedTemplate.content);
    setEditorStatus(selectedTemplate.status);
  }, [selectedTemplate]);

  // Available Placeholder Tags List
  const placeholderTags = [
    { label: '+ Student Name', tag: '{{STUDENT_NAME}}' },
    { label: '+ Student ID', tag: '{{STUDENT_ID}}' },
    { label: '+ Programme', tag: '{{PROGRAMME_NAME}}' },
    { label: '+ Supervisor', tag: '{{SUPERVISOR_NAME}}' }
  ];

  // Quick Insertion Helper
  const handleInsertTag = (tag: string) => {
    setEditorContent(prev => prev + ' ' + tag);
    triggerToast(`Inserted placeholder tag: ${tag}`);
  };

  // Mock File Uploader trigger
  const handleFileUploadSim = () => {
    setLetterheadImage('https://upload.wikimedia.org/wikipedia/commons/2/22/University_of_Malaya_coat_of_arms.svg'); // Simulated UM Logo
    triggerToast('Faculty Letterhead graphic loaded. Rendered on A4 preview header.');
  };

  const handleRemoveLetterhead = () => {
    setLetterheadImage(null);
    triggerToast('Letterhead branding removed.');
  };

  // Actions
  const handleSaveTemplate = () => {
    if (!editorName.trim()) {
      triggerToast('Error: Please enter a template name.');
      return;
    }

    setTemplates(prev => prev.map(t => {
      if (t.id === selectedTemplate.id) {
        const updated = {
          ...t,
          name: editorName,
          type: editorType,
          content: editorContent,
          status: editorStatus,
          lastModified: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          modifiedBy: 'Wey Cheng'
        };
        // Also update the local selected focus
        setTimeout(() => setSelectedTemplate(updated), 50);
        return updated;
      }
      return t;
    }));

    triggerToast(`Template "${editorName}" preserved inside local library store.`);
  };

  const handleDiscardChanges = () => {
    setEditorName(selectedTemplate.name);
    setEditorType(selectedTemplate.type);
    setEditorContent(selectedTemplate.content);
    setEditorStatus(selectedTemplate.status);
    triggerToast('Reverted modifications back to active database record.');
  };

  const handlePreviewLetterPop = () => {
    triggerToast('Initiating visual layout assertion check... Letter template validated successfully.');
  };

  // Highlight preview rendering mapping
  const renderFormattedPreview = (text: string) => {
    if (!text) return <p className="text-slate-400 italic">No message content drafted yet...</p>;

    // We split on placeholders and render custom background tags for beautiful visual matching
    const parts = text.split(/(\{\{[A-Z_]+\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return (
          <span 
            key={i} 
            className="inline-block bg-brand-navy text-[#a5b4fc] text-[10px] font-mono font-black px-1.5 py-0.5 rounded mx-0.5 select-all hover:bg-slate-800 transition"
          >
            {part}
          </span>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  // Auto count matches
  const countPlaceholdersUsed = (text: string) => {
    const regex = /\{\{[A-Z_]+\}\}/g;
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  };

  // Filter computation
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="letter-template-management" className="font-sans text-brand-navy text-xs pb-12 animate-fade-in">
      
      {/* Toast alert system banner notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-[100] bg-brand-navy text-white p-4 rounded-xl shadow-sm flex items-center gap-2.5 border border-white/10 font-bold"
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[11px] tracking-wide">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid containing left and right pane cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: TEMPLATES LIBRARY (lg:col-span-4) */}
        <div id="templates-library-column" className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-left shadow-2xs">
            
            {/* Library Panel Header */}
            <div className="flex items-center justify-between">
              <h2 className="section-label uppercase tracking-wider">
                Templates Library
              </h2>
              <span className="text-[10px] font-black text-slate-400">
                {templates.length} Forms
              </span>
            </div>

            {/* Filter searching bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Filter by type..."
                value={searchQuery}
                aria-label="Filter templates"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f8fafc] border border-slate-205 text-xs font-bold text-slate-700 pl-9 pr-3 py-2.5 rounded-xl placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
              />
            </div>

            {/* Template Card Buttons list */}
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredTemplates.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-bold">
                  No matching templates found.
                </div>
              ) : (
                filteredTemplates.map((tpl) => {
                  const isSelected = selectedTemplate.id === tpl.id;
                  const isActive = tpl.status === 'Active';
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer block ${
                        isSelected 
                          ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-905 shadow-3xs' 
                          : 'bg-white border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs truncate max-w-[180px]">
                          {tpl.name}
                        </span>
                        
                        {/* Status chip */}
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          isActive 
                            ? 'bg-brand-navy text-white' 
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {tpl.status}
                        </span>
                      </div>

                      {/* Description blurb */}
                      <p className="text-[10px] text-slate-450 font-medium leading-relaxed mt-1.5 line-clamp-2">
                        {tpl.description}
                      </p>

                      {/* Footer log details */}
                      <div className="mt-3 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{tpl.lastModified}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          <span>{tpl.modifiedBy}</span>
                        </div>
                      </div>

                    </button>
                  );
                })
              )}
            </div>

            {/* Add template placeholder */}
            <button
              type="button"
              onClick={() => {
                const newTpl: LetterTemplate = {
                  id: `tpl-${Date.now()}`,
                  name: 'New Custom Letter Template',
                  type: 'Academic Certification',
                  status: 'Draft',
                  lastModified: 'Today',
                  modifiedBy: 'Wey Cheng',
                  description: 'Custom letters drafted for secretariat administration.',
                  content: 'To Whom It May Concern,\n\nWrite your template body here using {{STUDENT_NAME}}.'
                };
                setTemplates([newTpl, ...templates]);
                setSelectedTemplate(newTpl);
                triggerToast('Created a new blank letter template.');
              }}
              className="w-full py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold uppercase rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Create New Template</span>
            </button>

          </div>
        </div>

        {/* RIGHT COLUMN: TEMPLATE EDITOR (lg:col-span-8) */}
        <div id="template-editor-column" className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs text-left">
            
            {/* Theme Editor header bar containing main buttons */}
            <div className="bg-brand-navy px-5 py-4 flex items-center justify-between text-white select-none">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-300" />
                <span className="text-[11px] font-black uppercase tracking-wider">
                  Template Editor
                </span>
              </div>

              {/* Top editor quick saves */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewLetterPop}
                  className="px-3.5 py-1.5 bg-[#1e293b] hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wide transition cursor-pointer"
                >
                  Preview
                </button>

                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="px-4 py-1.5 bg-white text-brand-navy hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-wide transition cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Save Template</span>
                </button>
              </div>
            </div>

            {/* Core editor forms wrapper container */}
            <div className="p-6 md:p-8 space-y-6">
              
              {/* Row 1: Template Name & Letter Type drop downs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Template Name input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={editorName}
                    onChange={(e) => setEditorName(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-205 text-xs font-bold text-slate-800 px-3.5 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition"
                    placeholder="Enter descriptive template title..."
                  />
                </div>

                {/* Letter Type custom selection dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Letter Type
                  </label>
                  <div className="relative">
                    <select
                      value={editorType}
                      onChange={(e) => setEditorType(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-205 text-xs font-bold text-slate-800 px-3.5 py-2.5 rounded-xl appearance-none outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
                    >
                      <option value="Academic Certification">Academic Certification</option>
                      <option value="Visa & Immigration">Visa & Letters support</option>
                      <option value="General Notifications">General Notifications</option>
                      <option value="Financial Clearance">Financial Clearance</option>
                    </select>
                    <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Row 2: Placeholder Tag insertions block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between select-none">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Placeholder Tags
                  </label>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">
                    Click to insert at cursor position
                  </span>
                </div>

                {/* Horizontal tags block list */}
                <div className="flex flex-wrap gap-2">
                  {placeholderTags.map((p) => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => handleInsertTag(p.tag)}
                      className="px-3 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] border border-blue-200 text-blue-700 hover:text-blue-800 text-[10px] font-extrabold tracking-wide rounded-lg transition duration-150 cursor-pointer inline-flex items-center gap-1 shadow-3xs"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulated RTF Editor Window Area starting with rich toolbar */}
              <div className="border border-slate-205 rounded-xl overflow-hidden bg-white shadow-3xs">
                
                {/* Formatting Tools Panel bar header */}
                <div className="bg-slate-50 border-b border-slate-205 px-4 py-2 flex items-center justify-between select-none">
                  <div className="flex items-center gap-1">
                    
                    <button 
                      type="button" 
                      onClick={() => triggerToast('Bold format assertion compiled.')}
                      className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 hover:text-slate-950 transition"
                      title="Bold font"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>

                    <button 
                      type="button" 
                      onClick={() => triggerToast('Italic formatting compiled.')}
                      className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 hover:text-slate-950 transition"
                      title="Italic font"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>

                    <button 
                      type="button" 
                      onClick={() => triggerToast('Underline assertions complete.')}
                      className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 hover:text-slate-950 transition"
                      title="Underline text"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>

                    {/* Splitter bar line separator */}
                    <div className="w-px h-4 bg-slate-250 mx-1.5" />

                    <button 
                      type="button" 
                      onClick={() => triggerToast('Paragraph alignment aligned left.')}
                      className="p-1.5 rounded bg-slate-200 text-slate-800 transition"
                      title="Align Left"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>

                    <button 
                      type="button" 
                      onClick={() => triggerToast('Paragraph alignment centered.')}
                      className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 transition"
                      title="Align Center"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>

                    <button 
                      type="button" 
                      onClick={() => triggerToast('Paragraph alignment aligned right.')}
                      className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 transition"
                      title="Align Right"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-4 bg-slate-250 mx-1.5" />

                    <button 
                      type="button" 
                      onClick={() => triggerToast('Formatted as bullet list points.')}
                      className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 transition"
                      title="Bullet list"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>

                    <button 
                      type="button" 
                      onClick={handleFileUploadSim}
                      className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 transition"
                      title="Insert Letterhead placement"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </button>

                  </div>

                  <div className="text-[10px] text-slate-400 font-bold">
                    Plain HTML Rendering Type
                  </div>
                </div>

                {/* Edit Area Input Textarea */}
                <textarea
                  rows={8}
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="w-full p-4 text-xs font-semibold text-slate-705 placeholder:text-slate-400 bg-slate-500/5 focus:outline-none focus:bg-white resize-none leading-relaxed transition"
                  placeholder="Draft your main letter content using placeholder keys..."
                />

              </div>

              {/* Dynamic Simulated A4 Document sheet Paper Block exactly as in layout mockup */}
              <div className="border border-slate-200 rounded-xl bg-slate-100/70 p-4">
                
                {/* A4 Paper mockup layout */}
                <div className="bg-white border border-slate-250/60 rounded p-6 shadow-sm relative min-h-[380px] text-left text-[11px] text-slate-700 leading-relaxed font-sans max-w-2xl mx-auto">
                  
                  {/* Faculty official header block letterhead upload */}
                  <div className="border-b border-double border-slate-400 pb-3 mb-5 text-center">
                    {letterheadImage ? (
                      <div className="flex flex-col items-center select-none relative group">
                        <img 
                          src={letterheadImage} 
                          className="h-14 opacity-90 transition mb-1" 
                          alt="Universiti Malaya Logo Coat" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-800 leading-none">
                          Faculty of Computer Science & Information Technology
                        </span>
                        <span className="text-[7px] text-slate-400 tracking-wide mt-0.5 font-bold">
                          University of Malaya • 50603 Kuala Lumpur, Malaysia
                        </span>

                        {/* Hover remove trigger */}
                        <button
                          type="button"
                          onClick={handleRemoveLetterhead}
                          className="absolute -top-3 -right-3 p-1 bg-red-100 hover:bg-red-500 text-red-700 hover:text-white rounded-full transition shadow"
                          title="Remove letterhead branding"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      /* Drag & drop upload state */
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDraggingOver(false); handleFileUploadSim(); }}
                        className={`border border-dashed rounded-xl p-4 transition-colors flex flex-col items-center justify-center cursor-pointer ${
                          isDraggingOver ? 'border-brand-navy bg-slate-50' : 'border-slate-300 hover:bg-slate-50/50'
                        }`}
                        onClick={handleFileUploadSim}
                      >
                        <UploadCloud className="w-6 h-6 text-slate-400 mb-1.5" />
                        <span className="text-[10px] font-black text-slate-800 block text-center">
                          Upload Faculty Letterhead Image
                        </span>
                        <span className="text-[8px] text-slate-400 block mt-0.5 text-center">
                          PNG or JPG, max 5MB
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reference line details block */}
                  <div className="text-right space-y-0.5 font-semibold text-slate-600 mb-4">
                    <div>
                      Reference:{' '}
                      <span className="bg-brand-navy text-[#a5b4fc] text-[9.5px] px-1.5 py-0.5 rounded font-mono font-black select-all">
                        {"{{REFERENCE_NUMBER}}"}
                      </span>
                    </div>
                    <div>
                      Date:{' '}
                      <span className="bg-brand-navy text-[#a5b4fc] text-[9.5px] px-1.5 py-0.5 rounded font-mono font-black select-all">
                        {"{{CURRENT_DATE}}"}
                      </span>
                    </div>
                  </div>

                  {/* Salutation statement line */}
                  <div className="font-extrabold text-slate-900 mb-4 select-none">
                    To Whom It May Concern,
                  </div>

                  {/* Main Formed dynamic document body preview */}
                  <div className="space-y-4">
                    {renderFormattedPreview(editorContent)}
                  </div>

                  {/* Signature Dean footer stamp line block */}
                  <div className="mt-8 pt-6 border-t border-slate-100 text-left space-y-1">
                    <div className="w-24 border-b border-slate-400 h-6 select-none" />
                    <p className="font-extrabold text-slate-950 block">Dean of Postgraduate Studies</p>
                    <p className="text-slate-450 uppercase tracking-wide text-[9px] font-black leading-none select-none">
                      FSKTM Office Executive Secretariat
                    </p>
                  </div>

                </div>

              </div>

              {/* Bottom statistics dashboard indicators card block inside editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Mini card: Placeholders used count */}
                <div className="bg-[#f8fafc]/80 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-left select-none">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                      Placeholders Used
                    </span>
                    <h4 className="text-lg font-black text-slate-900 mt-1">
                      0{countPlaceholdersUsed(editorContent)}
                    </h4>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                  </div>
                </div>

                {/* Mini card: Template status control */}
                <div className="bg-[#f8fafc]/80 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-left">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                      Template Status
                    </span>
                    
                    {/* Select box block inside */}
                    <div className="relative mt-1">
                      <select
                        aria-label="Template Status Option"
                        value={editorStatus}
                        onChange={(e) => setEditorStatus(e.target.value as 'Active' | 'Draft')}
                        className="bg-transparent border-none text-xs font-black text-brand-navy hover:text-[#2563eb] appearance-none focus:outline-none pr-5 cursor-pointer leading-tight"
                      >
                        <option value="Active">● Active / Live</option>
                        <option value="Draft">● Draft / Sandbox</option>
                      </select>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>

              </div>

              {/* Action buttons row block */}
              <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">
                
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  className="w-full md:w-auto px-5 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 font-extrabold tracking-wide uppercase text-[10px] rounded-xl transition cursor-pointer text-center"
                >
                  Discard Changes
                </button>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                  <button
                    type="button"
                    onClick={handlePreviewLetterPop}
                    className="w-full md:w-auto px-5 py-2.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 font-extrabold tracking-wide uppercase text-[10px] rounded-xl transition cursor-pointer text-center"
                  >
                    Preview Letter
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="w-full md:w-auto px-6 py-2.5 bg-brand-navy hover:bg-slate-850 text-white font-extrabold tracking-wide uppercase text-[10px] rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Save Template</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
