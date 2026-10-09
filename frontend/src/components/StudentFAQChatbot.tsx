/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Paperclip,
  X,
  CheckCircle,
  FileText,
  Bot,
  Info
} from 'lucide-react';
import { PageHeader, PortalToast } from './PortalPrimitives';

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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: "Hello! I'm your FSKTM Postgraduate Assistant. I can help you with thesis guidelines, grant applications, or administrative procedures. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [workspaceLeft, setWorkspaceLeft] = useState(0);
  const hasAsked = chatMessages.some((msg) => msg.sender === 'student');

  useEffect(() => {
    const workspace = document.getElementById('portal-workspace');
    if (!workspace) return;
    const update = () => setWorkspaceLeft(workspace.getBoundingClientRect().left);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(workspace);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (chatMessages.length > 1 || isTyping) {
      conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatMessages.length, isTyping]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [inputValue]);

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
    <div id="student-faq-chatbot-view" className="text-left font-sans animate-fade-in">

      <PortalToast message={toastMessage} />

      <PageHeader
        title="FAQ Chatbot"
        subtitle="Query automated academic advice, download procedural handouts, and check administrative protocols immediately."
        className="border-b border-slate-100 pb-5"
      />

      {/* Conversation — flows with the page, like a chat assistant */}
      <div className="max-w-3xl mx-auto pt-8 space-y-8">
        {chatMessages.map((msg) => (
          msg.sender === 'assistant' ? (
            <div key={msg.id} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-4 h-4 text-indigo-300" />
              </div>

              <div className="flex-1 min-w-0 space-y-2 pt-1">
                <p className="text-[13px] font-medium text-slate-800 leading-relaxed whitespace-pre-line">{msg.text}</p>

                {msg.checklistItems && (
                  <div className="space-y-2.5 pl-1">
                    {msg.checklistItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <span className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mt-0.5 shrink-0 select-none">
                          <CheckCircle className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span className="text-[13px] text-slate-600 font-medium flex-1">{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.attachment && (
                  <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-3xs select-none max-w-md">
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

                <div className="text-[9px] font-bold text-slate-400 select-none uppercase tracking-wide">
                  AI Assistant • {msg.timestamp}
                </div>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[80%] space-y-1.5 text-right">
                <div className="inline-block text-left bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-2xl rounded-br-md text-[13px] font-medium leading-relaxed shadow-3xs whitespace-pre-line">
                  {msg.text}
                </div>
                <div className="text-[9px] font-bold text-slate-400 select-none uppercase tracking-wide px-1">
                  You • {msg.timestamp}
                </div>
              </div>
            </div>
          )
        ))}

        {/* Typing simulation view */}
        {isTyping && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4 text-indigo-300 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Keeps the last message clear of the pinned composer */}
        <div ref={conversationEndRef} className="h-48" />
      </div>

      {/* Composer pinned to the bottom of the screen */}
      <div className="fixed bottom-0 right-0 z-20 pointer-events-none" style={{ left: workspaceLeft }}>
        <div className="bg-gradient-to-t from-[#f1f5f9] via-[#f1f5f9] to-transparent pt-10 pb-4 px-4">
          <div className="max-w-3xl mx-auto space-y-2.5 pointer-events-auto">

            {/* Quick Query suggestion chips */}
            {!hasAsked && (
              <div className="flex flex-wrap items-center gap-2 select-none">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="bg-white hover:bg-slate-50 text-slate-650 hover:text-slate-800 font-bold px-3 py-1.5 rounded-full text-[10px] tracking-wide transition cursor-pointer shrink-0 border border-slate-200 shadow-3xs"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Active upload file thumbnail tag indicator */}
            {attachedFile && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 w-fit max-w-full select-none text-[10px] font-bold text-slate-700">
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

            {/* Chat text message input */}
            <div className="bg-white border border-slate-200 p-2 rounded-3xl shadow-md flex items-end gap-2">
              <button
                type="button"
                onClick={handleAttachFileSimulation}
                className="p-2.5 text-slate-400 hover:text-brand-navy hover:bg-slate-50 rounded-full transition cursor-pointer shrink-0"
                title="Attach Document"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Type your academic inquiry here..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                className="flex-1 resize-none bg-transparent border-none text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none py-2.5 leading-relaxed max-h-40"
              />

              <button
                type="button"
                disabled={!inputValue.trim() || isTyping}
                onClick={() => handleSendMessage(inputValue)}
                className="w-10 h-10 rounded-full bg-brand-navy text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-brand-navy transition-all shadow-3xs"
                title="Send"
              >
                <Send className="w-3.5 h-3.5 shrink-0 ml-0.5" />
              </button>
            </div>

            {/* Dynamic AI disclaimer helper note */}
            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] leading-normal select-none text-center">
              <Info className="w-3.5 h-3.5 text-slate-350 shrink-0" />
              <p>
                FSKTM Academic Assistant may produce inaccurate information about specific faculty policies. Always verify with official documentation.
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};
