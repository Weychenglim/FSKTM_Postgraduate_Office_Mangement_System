/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  CheckCircle,
  Bot,
  Info
} from 'lucide-react';
import { PageHeader } from './PortalPrimitives';

interface ChatMessage {
  id: string;
  sender: 'student' | 'assistant';
  text: string;
  timestamp: string;
  checklistItems?: string[];
}

export const StudentFAQChatbot: React.FC = () => {
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

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [workspaceLeft, setWorkspaceLeft] = useState(0);
  const [footerOffset, setFooterOffset] = useState(0);
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

  // The composer is pinned to the screen; once the page footer scrolls into
  // view, lift the composer above it so the footer links stay usable.
  useEffect(() => {
    const footer = document.getElementById('portal-footer');
    if (!footer) return;
    const update = () => setFooterOffset(Math.max(0, window.innerHeight - footer.getBoundingClientRect().top));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
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
    if (!textToSend.trim() || isTyping) return;

    // 1. Append Student Message
    const studentMsg: ChatMessage = {
      id: `student-msg-${Date.now()}`,
      sender: 'student',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, studentMsg]);
    setInputValue('');
    setIsTyping(true);

    // 2. Simulate AI response matching requested style
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "";
      let checklist: string[] | undefined = undefined;

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
        replyText = "Grant submission registers are audited monthly. Before you apply:";
        checklist = [
          "Check documentation ledger consistency.",
          "Verify similarity checks for proposal abstract below 10%.",
          "Ask the PG Office for the current grant application guide."
        ];
      } else if (lowerText.includes('viva') || lowerText.includes('schedule')) {
        replyText = "VIVA-VOCE presentation slots are populated dynamically post thesis evaluation task completion by assigned panel members. Typically within 4-6 weeks after softcopy files are processed.";
      } else {
        replyText = "I don't have an answer for that yet. Please check the official postgraduate handbook, or contact the PG Office for help with your question.";
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-msg-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checklistItems: checklist
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    }, 1500);
  };

  return (
    <div id="student-faq-chatbot-view" className="text-left font-sans animate-fade-in">

      <PageHeader
        title="FAQ Chatbot"
        subtitle="Ask common postgraduate questions and get pointers to the right procedure."
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
      <div className="fixed right-0 z-20 pointer-events-none" style={{ left: workspaceLeft, bottom: footerOffset }}>
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

            {/* Chat text message input */}
            <div className="bg-white border border-slate-200 p-2 pl-4 rounded-3xl shadow-md flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Type your academic inquiry here..."
                aria-label="Your question"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  // Enter while an IME is composing picks a candidate; it must not send.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
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
                aria-label="Send"
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
