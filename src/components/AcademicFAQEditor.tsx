/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquareCode, 
  Trash2, 
  Plus, 
  X, 
  Eye, 
  Bold, 
  Italic, 
  Link2, 
  List, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  CornerDownRight, 
  RefreshCw, 
  RotateCcw, 
  Database, 
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Definitions for tag items
interface KeywordTag {
  id: string;
  text: string;
}

// Definition for message bubble item in Simulator
interface ChatMessage {
  id: string;
  sender: 'student' | 'chatbot';
  text: string;
  timestamp: string;
  confidence?: string;
  refCode?: string;
}

export const AcademicFAQEditor: React.FC = () => {
  // Toast notification system
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. FAQ Editor States (Presets match screenshot perfectly)
  const [intentCategory, setIntentCategory] = useState('Supervisor Appointment');
  const [question, setQuestion] = useState('How do I change my main supervisor after the first semester?');
  
  // Keyword tags list state
  const [keywordTags, setKeywordTags] = useState<KeywordTag[]>([
    { id: 't1', text: 'change supervisor' },
    { id: 't2', text: 'switch sv' },
    { id: 't3', text: 'supervisor update' }
  ]);
  const [newTagInput, setNewTagInput] = useState('');

  // Rich Text Answer Content
  const [answerBody, setAnswerBody] = useState(
    `To change your main supervisor, you must first consult your current supervisor and the proposed new supervisor. Once both agree, download the **Change of Supervisor Form (FSKTM-PG-04)** from the portal.\n\nSubmit the completed form along with a brief justification for the change to the Postgraduate Office. Changes are usually processed within 7 working days following the departmental committee meeting.`
  );

  // Active view formatted states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // 2. Simulator Interface Chat Messages Stack
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'student',
      text: 'Hi, I want to change my main supervisor. How do I do that?',
      timestamp: '10:42 AM'
    },
    {
      id: 'm2',
      sender: 'chatbot',
      text: 'To change your main supervisor, you must first consult your current supervisor and the proposed new supervisor. Once both agree, download the Change of Supervisor Form (FSKTM-PG-04) from the portal. Submit the completed form to the Postgraduate Office.',
      timestamp: 'Just now',
      confidence: '98.4%',
      refCode: 'FSKTM-PG-04-A'
    }
  ]);
  const [testQuestion, setTestQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Sync editor changes with the live chatbot simulator bubble!
  useEffect(() => {
    // When the answer body changes, update the last chatbot message so they match perfectly
    setChatMessages(prev => prev.map(msg => {
      if (msg.sender === 'chatbot' && msg.id === 'm2') {
        // Strip markdown stars for preview cleanliness like the real model
        const cleanedText = answerBody.replace(/\*\*/g, '');
        return {
          ...msg,
          text: cleanedText || 'Write an official answer in the form to see real-time preview.'
        };
      }
      return msg;
    }));
  }, [answerBody]);

  // Handlers for Keyword tags
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    if (keywordTags.some(t => t.text.toLowerCase() === newTagInput.trim().toLowerCase())) {
      showToast('This keyword phrasing already exists.');
      return;
    }
    setKeywordTags([...keywordTags, { id: Date.now().toString(), text: newTagInput.trim().toLowerCase() }]);
    setNewTagInput('');
    showToast('Alternative keyword phrase appended.');
  };

  const handleRemoveTag = (id: string, text: string) => {
    setKeywordTags(keywordTags.filter(t => t.id !== id));
    showToast(`Removed tag: "${text}"`);
  };

  // Form Reset / Clear
  const handleClearForm = () => {
    setIntentCategory('Supervisor Appointment');
    setQuestion('');
    setKeywordTags([]);
    setAnswerBody('');
    showToast('FAQ Editor form cleared successfully.');
  };

  // Saving FAQ to Knowledge Base
  const handleSaveToKB = () => {
    if (!question.trim()) {
      showToast('Error: Form question cannot be left blank.');
      return;
    }
    if (!answerBody.trim()) {
      showToast('Error: Content body answer cannot be left blank.');
      return;
    }
    showToast('Success: FAQ entry saved successfully to Knowledge Base!');
  };

  // Discard changes trigger
  const handleDiscardChanges = () => {
    setIntentCategory('Supervisor Appointment');
    setQuestion('How do I change my main supervisor after the first semester?');
    setKeywordTags([
      { id: 't1', text: 'change supervisor' },
      { id: 't2', text: 'switch sv' },
      { id: 't3', text: 'supervisor update' }
    ]);
    setAnswerBody(
      `To change your main supervisor, you must first consult your current supervisor and the proposed new supervisor. Once both agree, download the **Change of Supervisor Form (FSKTM-PG-04)** from the portal.\n\nSubmit the completed form along with a brief justification for the change to the Postgraduate Office. Changes are usually processed within 7 working days following the departmental committee meeting.`
    );
    showToast('Edits discarded. Reverted back to the published master record.');
  };

  // Deploy FAQ to Live Environment
  const handleDeployToLive = () => {
    showToast('Deploying FAQ updates... Synchronizing rules with Live FSKTM FAQ Chatbot server!');
    setTimeout(() => {
      showToast('Success: Knowledge assertions compiled. Live FAQ Chatbot updated successfully.');
    }, 1500);
  };

  // Simulator test question submit
  const handleSendTestQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuestion.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'student',
      text: testQuestion,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    const originalQuery = testQuestion;
    setTestQuestion('');
    setIsTyping(true);

    // Simulate AI model intelligence thinking time
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "I apologize, but this specific request is outside my predefined academic scope. Please contact Wey Cheng at the Secretariat Office for precise administrative guidelines.";
      let confidence = "52.1%";
      let refCode = "FSKTM-GEN-01";

      // Simple keyword matching for interactive fun
      const lowerQuery = originalQuery.toLowerCase();
      if (lowerQuery.includes('supervisor') || lowerQuery.includes('sv') || lowerQuery.includes('change')) {
        replyText = answerBody.replace(/\*\*/g, '');
        confidence = "98.4%";
        refCode = "FSKTM-PG-04-A";
      } else if (lowerQuery.includes('exam') || lowerQuery.includes('grade')) {
        replyText = "Exam timetables are synchronized via Google Forms Sync. Candidates are requested to download the schedule directly via the Student Portal under Exam Desk.";
        confidence = "89.2%";
        refCode = "FSKTM-EXM-09";
      } else if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
        replyText = "Hello! FSKTM Chatbot here. How may I assist you with your postgraduate supervisor, file submissions, or administrative queries today?";
        confidence = "99.9%";
        refCode = "FSKTM-GREET";
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'chatbot',
        text: replyText,
        timestamp: 'Just now',
        confidence,
        refCode
      };

      setChatMessages(prev => [...prev, botMsg]);
    }, 1000);
  };

  return (
    <div id="faq-editor-dashboard" className="font-sans text-[#0c1424] text-xs pb-12 animate-fade-in">
      
      {/* Toast Alert Toaster Notification bar */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-[100] bg-[#0c1424] text-white p-4 rounded-xl shadow-xl flex items-center gap-2.5 border border-white/10 font-bold"
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[11px] tracking-wide">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Section Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 text-left">
        <div>
          <span className="text-blue-600 font-extrabold uppercase tracking-widest text-[9px] block">
            Knowledge Management
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#0c1424] tracking-tight mt-0.5">
            Academic FAQ Editor
          </h1>
        </div>

        {/* Global actions row */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDiscardChanges}
            className="px-4 py-2.5 bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-extrabold tracking-wide rounded-xl transition text-[11px] uppercase cursor-pointer"
          >
            Discard Changes
          </button>

          <button
            type="button"
            onClick={handleDeployToLive}
            className="px-5 py-2.5 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold tracking-wide uppercase text-[11px] rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Deploy to Live</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
        
        {/* LEFT COLUMN: INTENT EDITOR FORM (lg:col-span-7) */}
        <div id="faq-editor-form-col" className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 text-left shadow-2xs">
            
            {/* Field 1: Intent Category Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Intent Category
              </label>
              <div className="relative">
                <select
                  value={intentCategory}
                  onChange={(e) => setIntentCategory(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-205 text-xs font-bold text-slate-800 pl-4 pr-10 py-3.5 rounded-xl appearance-none outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 cursor-pointer"
                >
                  <option value="Supervisor Appointment">Supervisor Appointment</option>
                  <option value="Marks Submission">Marks Submission</option>
                  <option value="Enrollment & Fees">Enrollment & Fees</option>
                  <option value="General Evaluation">General Evaluation</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Field 2: Question Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Question
              </label>
              <input
                type="text"
                placeholder="Type the main FAQ query..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full bg-[#f8fafc] border border-slate-205 text-xs font-bold text-slate-800 px-4 py-3.5 rounded-xl placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            {/* Field 3: Keywords / Alternative Phrasings Tags */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Keywords / Alternative Phrasings
              </label>
              
              <div className="bg-[#f8fafc] border border-slate-205 rounded-xl p-3 flex flex-wrap gap-2 items-center">
                {keywordTags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 bg-[#0c1424] text-white font-extrabold text-[10px] pl-3 pr-2 py-1.5 rounded-lg select-none"
                  >
                    <span>{tag.text}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id, tag.text)}
                      className="hover:bg-white/20 p-0.5 rounded transition text-indigo-200 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Mini input to add on the fly */}
                <div className="flex items-center gap-1 min-w-[120px] flex-1">
                  <input
                    type="text"
                    placeholder="Add more..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none placeholder:text-slate-400 py-1.5 w-full"
                  />
                  {newTagInput && (
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="p-1 bg-slate-200 text-slate-700 hover:bg-[#0c1424] hover:text-white rounded-lg transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Field 4: Rich Text Answer Content wrapper */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Answer
              </label>

              {/* Simple simulated rich text editor frame */}
              <div className="border border-slate-205 rounded-xl overflow-hidden bg-white">
                {/* Editor styling toolbar */}
                <div className="bg-slate-50 border-b border-slate-205 px-4 py-2.5 flex items-center justify-between select-none">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setIsBold(!isBold); showToast(isBold ? 'Bold style deactivated.' : 'Bold style activated.'); }}
                      className={`p-1.5 rounded hover:bg-slate-200/60 transition ${isBold ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                      title="Bold Text"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsItalic(!isItalic); showToast(isItalic ? 'Italic style deactivated.' : 'Italic style activated.'); }}
                      className={`p-1.5 rounded hover:bg-slate-200/60 transition ${isItalic ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                      title="Italic Text"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-4 bg-slate-300 mx-1" />

                    <button
                      type="button"
                      onClick={() => showToast('Hyperlink option selected. Highlight word to bind URL.')}
                      className="p-1.5 rounded hover:bg-slate-200/60 transition text-slate-500"
                      title="Insert Link"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => showToast('Bulleted list formatted.')}
                      className="p-1.5 rounded hover:bg-slate-200/60 transition text-slate-500"
                      title="Bulleted List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Right side toolbar buttons */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => showToast('Interactive Markdown preview assertions evaluated correctly.')}
                      className="p-1.5 rounded hover:bg-slate-200/60 transition text-slate-500"
                      title="Preview Mode"
                    >
                      <Eye className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                    </button>
                  </div>
                </div>

                {/* Textarea for actual content */}
                <textarea
                  rows={9}
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                  className={`w-full p-4 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none bg-[#f8fafc]/50 resize-none leading-relaxed ${isBold ? 'font-black' : ''} ${isItalic ? 'italic' : ''}`}
                  placeholder="Enter the official automated response answer details here..."
                />
              </div>
            </div>

            {/* Bottom Actions of Form Card: Clear & Save to Knowledge Base */}
            <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClearForm}
                className="px-4 py-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 font-extrabold tracking-wide rounded-xl uppercase text-[10px] transition cursor-pointer"
              >
                Clear Form
              </button>

              <button
                type="button"
                onClick={handleSaveToKB}
                className="px-5 py-2.5 bg-[#0c1424] hover:bg-slate-800 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-indigo-300" />
                <span>Save to Knowledge Base</span>
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME PREVIEW PANEL (lg:col-span-5) */}
        <div id="faq-preview-col" className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col h-[550px]">
            
            {/* Header with LIVE SIMULATOR indicator in header card */}
            <div className="bg-[#0c1424] px-5 py-4 flex items-center justify-between text-white select-none">
              <div className="flex items-center gap-2">
                <MessageSquareCode className="w-4.5 h-4.5 text-indigo-300" />
                <span className="text-[11px] font-black tracking-wide uppercase">
                  Real-Time Preview
                </span>
              </div>

              {/* LIVE SIMULATOR green badge */}
              <div className="flex items-center gap-1.5 bg-[#2563eb]/20 border border-blue-500/30 px-3 py-1 rounded-full text-[9px] font-extrabold tracking-wider text-blue-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>LIVE SIMULATOR</span>
              </div>
            </div>

            {/* Simulated Chat Feed Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 border-b border-slate-100 relative">
              
              <AnimatePresence>
                {chatMessages.map((msg) => {
                  const isStudent = msg.sender === 'student';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col text-left max-w-[85%] ${isStudent ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      {/* Bubble Text */}
                      <div className={`p-4 rounded-2xl text-[11px] font-semibold leading-relaxed ${
                        isStudent 
                          ? 'bg-slate-200 text-[#0c1424] rounded-br-none' 
                          : 'bg-[#0f172a] text-white rounded-bl-none shadow-md'
                      }`}>
                        {msg.text}
                      </div>

                      {/* Footer descriptor beneath bubble */}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-bold text-slate-400">
                        <span>{isStudent ? `Student • ${msg.timestamp}` : `AI Assistant • ${msg.timestamp}`}</span>
                        
                        {/* If bot, display Confidence badge metrics */}
                        {!isStudent && msg.confidence && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded border border-blue-500/20 font-black">
                              <CheckCircle className="w-2.5 h-2.5 text-blue-400" />
                              <span>{msg.confidence} Confidence</span>
                            </span>
                            
                            {msg.refCode && (
                              <span className="text-[10px] text-slate-450 font-mono tracking-wide">
                                Ref: {msg.refCode}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Animated Typing state */}
                {isTyping && (
                  <div className="flex flex-col items-start mr-auto max-w-[80%]">
                    <div className="bg-[#0f172a] text-white p-3.5 rounded-2xl rounded-bl-none flex items-center gap-1 shadow-md">
                      <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </AnimatePresence>

            </div>

            {/* Input form at bottom of preview */}
            <form onSubmit={handleSendTestQuestion} className="p-3 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a test question..."
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                className="flex-1 bg-slate-100 border border-transparent hover:border-slate-200 focus:border-[#0c1424] text-xs font-bold text-slate-800 px-4 py-2.5 rounded-full outline-none transition"
              />
              <button
                type="submit"
                disabled={!testQuestion.trim()}
                className="w-9 h-9 rounded-full bg-[#0c1424] hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-[#0c1424] text-white flex items-center justify-center shrink-0 transition cursor-pointer"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>

          </div>
        </div>

      </div>

      {/* BOTTOM METRICS STATS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left mb-6">
        
        {/* Metric 1: Total FAQ entries */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider">
              Total FAQ Entries
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                1,248
              </span>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full select-none">
                +12%
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-150">
            <Database className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Metric 2: Avg Response Confidence */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between shadow-3xs">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider">
              Avg Response Confidence
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                94.2%
              </span>
              <span className="text-[10px] font-black text-emerald-605 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full select-none">
                Stable
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-150">
            <Sparkles className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
          </div>
        </div>

      </div>

      {/* Clean Administrative Secretariat Footer Row */}
      <div className="border-t border-slate-250/70 pt-5 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 select-none">
        <div className="flex items-center gap-1.5">
          <MessageSquareCode className="w-4 h-4 text-slate-350" />
          <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">
            Knowledge Agent Engine v2.4a
          </span>
        </div>
        <div className="text-[10px] font-semibold">
          FSKTM Postgraduate Administrative Center &bull; Universiti Malaya
        </div>
      </div>

    </div>
  );
};
