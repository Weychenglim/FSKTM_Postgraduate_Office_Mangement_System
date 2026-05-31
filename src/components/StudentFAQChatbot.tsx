/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Send, 
  Paperclip, 
  X, 
  HelpCircle, 
  CheckCircle, 
  Download, 
  FileText, 
  Sparkles,
  Bot,
  User,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalToast } from './PortalPrimitives';

interface ChatMessage {
  id: string;
  sender: 'student' | 'assistant';
  text: string;
  timestamp: string;
  checklistItems?: string[];
  attachment?: {
    name: string;
    size: string;
  };
}

export const StudentFAQChatbot: React.FC = () => {
  // Toast notifications for user actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Pre-seeded chat messages stack matching user instructions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: "Hello! I'm your FSKTM Postgraduate Assistant. I can help you with thesis guidelines, grant applications, or administrative procedures. How can I assist you today?",
      timestamp: '09:41 AM'
    },
    {
      id: 'msg-2',
      sender: 'student',
      text: "What are the latest rules for thesis submission in FSKTM? I'm nearing the end of my research phase.",
      timestamp: '09:42 AM'
    },
    {
      id: 'msg-3',
      sender: 'assistant',
      text: "For the Faculty of Computer Science and Information Technology, the submission process has been digitized. Here are the key points:",
      timestamp: '09:43 AM',
      checklistItems: [
        "Submission of the Notice of Intent (NOI) is required at least 3 months prior to your final submission.",
        "You must ensure your Turnitin report has a similarity index below 15%.",
        "Final softcopy submission must be uploaded through the Student Portal under the Thesis Submission tab."
      ],
      attachment: {
        name: 'Full Guidelines 2024.pdf',
        size: '1.4 MB'
      }
    }
  ]);

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  // Suggestion chips
  const suggestionChips = [
    'Supervisor deadline?',
    'Update profile info',
    'Grant application status',
    'VIVA-VOCE Schedule'
  ];

  // Send handler
  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    // 1. Append Student Message
    const studentMsg: ChatMessage = {
      id: `student-msg-${Date.now()}`,
      sender: 'student',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, studentMsg]);
    setInputValue('');
    setAttachedFile(null); // Clear active attachment
    setIsTyping(true);

    // 2. Simulate AI response matching requested style
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "";
      let checklist: string[] | undefined = undefined;
      let fileAttachment: { name: string; size: string } | undefined = undefined;

      const lowerText = textToSend.toLowerCase();

      if (lowerText.includes('deadline') || lowerText.includes('supervisor')) {
        replyText = "The deadline for appointing or presenting a change in master supervisor is typically the 4th week of the active academic term. Please check the Academic Calendar guidelines.";
        checklist = [
          "Verify supervisor workloads beforehand.",
          "Fill out form FSKTM-PG-04 with mutual consents.",
          "Upload signed copies through your portal interface."
        ];
      } else if (lowerText.includes('profile')) {
        replyText = "To update your graduation stream or cohort registration details, please visit the Settings tab in the Postgraduate portal. Major corrections require Dean confirmation.";
      } else if (lowerText.includes('grant') || lowerText.includes('sponsorship')) {
        replyText = "Grant submission registers are audited monthly. Here is the latest progress outline:";
        checklist = [
          "Check documentation ledger consistency.",
          "Verify similarity checks for proposal abstract below 10%.",
          "Download the template below as reference:"
        ];
        fileAttachment = { name: 'Grant Application Master Guide.pdf', size: '945 KB' };
      } else if (lowerText.includes('viva') || lowerText.includes('schedule')) {
        replyText = "VIVA-VOCE presentation slots are populated dynamically post thesis evaluation task completion by assigned panel members. Typically within 4-6 weeks after softcopy files are processed.";
      } else {
        replyText = "Thank you for the inquiry. Your message has been logged by the FSKTM Academic Intelligent Router. I recommend checking the official administrative handbook, or querying a specific postgraduate appointment schedule.";
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-msg-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checklistItems: checklist,
        attachment: fileAttachment
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    }, 1500);
  };

  // File trigger simulation
  const handleAttachFileSimulation = () => {
    const mockFiles = ['Draft_Abstract.docx', 'TurnitIn_Similarity_Report.pdf', 'Notice_Intent_Form.pdf'];
    const chosen = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    setAttachedFile(chosen);
    showToast(`Simulation: Bound local file "${chosen}" to active inquiry draft.`);
  };

  // Download simulation
  const handleDownloadSimulation = (fileName: string) => {
    showToast(`Downloading "${fileName}" to your local computer... Finished.`);
  };

  return (
    <div id="student-faq-chatbot-view" className="space-y-6 text-left font-sans pb-12 animate-fade-in">
      
      <PortalToast message={toastMessage} />

      {/* Page Header Area */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1 select-none">
          <span>Student Support Desk</span>
          <span>/</span>
          <span className="text-brand-navy">FAQ Chatbot</span>
        </div>
        
        <h1 className="page-title">
          FAQ Chatbot
        </h1>
        <p className="page-subtitle">
          Query automated academic advice, download procedural handouts, and check administrative protocols immediately.
        </p>
      </div>

      {/* Main chat center interface panel */}
      <div className="bg-white border border-[#e2e8f0]/85 rounded-2xl p-5 shadow-3xs flex flex-col h-[650px] justify-between overflow-hidden">
        
        {/* Scrollable Conversation Stack */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-4">
          {chatMessages.map((msg) => {
            const isAssis = msg.sender === 'assistant';
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[88%] ${isAssis ? 'mr-auto text-left' : 'ml-auto flex-row-reverse text-right'}`}
              >
                
                {/* Visual sender icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isAssis 
                    ? 'bg-brand-navy text-white' 
                    : 'bg-indigo-55 text-indigo-700 border border-indigo-200 bg-indigo-50'
                }`}>
                  {isAssis ? <Bot className="w-4 h-4 text-indigo-300" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message block container */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  
                  {/* Speech bubble */}
                  <div className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed ${
                    isAssis 
                      ? 'bg-[#f8fafc] text-slate-800 rounded-tl-none border border-slate-100 shadow-3xs' 
                      : 'bg-brand-navy text-white rounded-tr-none'
                  }`}>
                    
                    {/* Plain Text Body */}
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Integrated Bullet Points with Blue Checks */}
                    {isAssis && msg.checklistItems && (
                      <div className="mt-4 space-y-3 pl-1">
                        {msg.checklistItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2.5 items-start">
                            <span className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mt-0.5 shrink-0 select-none">
                              <CheckCircle className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                            <span className="text-slate-600 font-medium flex-1">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Document attachment downloadable block */}
                    {msg.attachment && (
                      <div className="mt-4 bg-white border border-slate-200/90 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-3xs select-none">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div className="text-left leading-none min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate">{msg.attachment.name}</span>
                            <span className="text-[9px] font-bold text-slate-400 block mt-1 font-mono">{msg.attachment.size}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadSimulation(msg.attachment!.name)}
                          className="px-3 py-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-slate-50 transition border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer font-mono shrink-0"
                        >
                          Download
                        </button>
                      </div>
                    )}

                  </div>

                  {/* Metadata line beneath speech bubble */}
                  <div className={`text-[9px] font-bold text-slate-400 select-none px-1 block uppercase tracking-wide`}>
                    {isAssis ? `AI ASSISTANT • ${msg.timestamp}` : `YOU • ${msg.timestamp}`}
                  </div>
                </div>

              </div>
            );
          })}

          {/* Typing simulation view */}
          {isTyping && (
            <div className="flex gap-3 max-w-[80%] items-start">
              <div className="w-8 h-8 rounded-xl bg-brand-navy text-white flex items-center justify-center shrink-0.5 shadow-sm">
                <Bot className="w-4 h-4 text-indigo-300 animate-pulse" />
              </div>
              <div className="bg-[#f8fafc] border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-3xs">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Area */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          
          {/* Quick Query suggestion chips */}
          <div className="flex flex-wrap items-center gap-2 select-none">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="bg-slate-100 hover:bg-slate-205 active:bg-slate-150 text-slate-650 hover:text-slate-800 font-bold px-3 py-1.5 rounded-full text-[10px] tracking-wide transition cursor-pointer shrink-0 border border-slate-150/50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Active upload file thumbnail tag indicator */}
          {attachedFile && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-1.5 w-fit max-w-full select-none text-[10px] font-bold text-slate-700 animate-fade-in/40">
              <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate max-w-[200px]">{attachedFile}</span>
              <button 
                type="button" 
                onClick={() => setAttachedFile(null)} 
                className="text-slate-400 hover:text-rose-500 p-0.5"
                title="Discard attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chat text message Input bar */}
          <div className="bg-white border border-slate-200 p-2 rounded-2xl shadow-sm flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAttachFileSimulation}
                className="p-2.5 text-slate-400 hover:text-brand-navy hover:bg-slate-50 rounded-lg transition cursor-pointer"
                title="Attach Document"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Type your academic inquiry here..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }
              }}
              className="flex-1 bg-transparent border-none text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none py-2"
            />

            <div className="flex items-center gap-2">
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                disabled={!inputValue.trim()}
                onClick={() => handleSendMessage(inputValue)}
                className="w-10 h-10 rounded-full bg-brand-navy text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-brand-navy transition-all shadow-3xs"
              >
                <Send className="w-3.5 h-3.5 shrink-0 ml-0.5" />
              </button>
            </div>

          </div>

          {/* Dynamic AI disclaimer helper note */}
          <div className="flex items-start gap-1.5 text-slate-400 text-[10px] leading-normal select-none">
            <Info className="w-3.5 h-3.5 text-slate-350 mt-0.5 shrink-0" />
            <p>
              FSKTM Academic Assistant may produce inaccurate information about specific faculty policies. Always verify with official documentation.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
