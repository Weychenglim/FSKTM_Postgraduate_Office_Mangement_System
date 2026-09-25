/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, HelpCircle } from 'lucide-react';
import { PortalButton } from './PortalPrimitives';

interface AppLayoutProps {
  children: React.ReactNode;
  activeItem: string;
  onNavigate: (item: string) => void;
  onLogout: () => void;
  onNotificationsTrigger: () => void;
  userName: string;
  userRole: string;
  
  // Handlers for modal interactions
  activeModal: 'help' | null;
  setActiveModal: (modal: 'help' | null) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeItem,
  onNavigate,
  onLogout,
  onNotificationsTrigger,
  userName,
  userRole,
  activeModal,
  setActiveModal
}) => {
  // Responsive sidebar drawer — open on desktop (lg+), closed on mobile by default
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  return (
    <div id="master-portal-viewport" className="min-h-screen w-full flex bg-[#f1f5f9] text-left">
      {/* 1. Left navigation sidebar (collapsible drawer) */}
      <Sidebar
        activeItem={activeItem}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />

      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-navy/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Main workflow workspace content viewport */}
      <div id="portal-workspace" className="flex-grow flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header Navigation panel */}
        <TopHeader
          userName={userName}
          userRole={userRole}
          onLogout={onLogout}
          onHelpdeskTrigger={() => setActiveModal('help')}
          onNotificationsTrigger={onNotificationsTrigger}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
        />

        {/* Actionable page frame details scrollable box */}
        <main id="portal-inner-content" className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Portal Footer — single global footer, transparent so it blends with the page background */}
        <footer id="portal-footer" className="shrink-0 border-t border-[#e2e8f0] font-sans">
          <div className="max-w-7xl w-full mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-[10px] font-bold">
            <div className="text-left font-sans text-slate-400">
              © 2026 FACULTY OF COMPUTER SCIENCE AND INFORMATION TECHNOLOGY (FSKTM)
            </div>
            <div id="footer-actions-links" className="flex items-center flex-wrap gap-4 uppercase tracking-wider font-sans text-slate-400">
              <button
                type="button"
                className="hover:text-slate-800 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>|</span>
              <button
                type="button"
                className="hover:text-slate-800 transition-colors cursor-pointer"
              >
                System Manual
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => setActiveModal('help')}
                className="hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5 inline text-slate-400" />
                <span>Support Desk</span>
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Interactive Global admin Modal Overlays */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            {/* Backdrop Dismiss */}
            <div className="absolute inset-0" onClick={() => setActiveModal(null)} />

            {/* Modal Body Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-sm relative z-10 border border-slate-100 text-left"
            >
              {/* Close Button top right */}
              <PortalButton
                type="button"
                onClick={() => setActiveModal(null)}
                variant="ghost"
                size="icon"
                icon={X}
                className="absolute top-6 right-6 w-9 h-9 text-slate-400 hover:text-brand-navy"
                title="Dismiss Dialog"
              />

              {activeModal === 'help' && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2.5 mb-4 text-brand-navy">
                    <Users className="w-6 h-6 text-indigo-500" />
                    <h3 className="text-xl font-extrabold tracking-tight">FSKTM Office Contacts</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Direct access portals for FSKTM administrative divisions, postgraduate supervision boards, development partners, and technical service counters.
                  </p>

                  <div className="space-y-3 mb-6 bg-[#f8fafc] p-4.5 border border-slate-150 rounded-xl text-xs text-slate-700">
                    <div className="flex justify-between py-1.5 border-b border-slate-200/50">
                      <span className="text-slate-400 font-semibold">Academic Secretariat Desk</span>
                      <span className="text-slate-900 font-bold">Block A Level 2, Desk Ext 4902</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-200/50">
                      <span className="text-slate-400 font-semibold">Postgraduate Office Email</span>
                      <span className="text-blue-600 font-bold hover:underline">postgrad.fsktm@edu.my</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-200/50">
                      <span className="text-slate-400 font-semibold">Database Center System Ops</span>
                      <span className="text-slate-900 font-bold">{userName}</span>
                    </div>

                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400 font-semibold">Host Counter Ingress</span>
                      <span className="font-mono text-[10px] text-zinc-500 font-bold">PROD-INGRESS-3000</span>
                    </div>
                  </div>

                  <PortalButton
                    onClick={() => setActiveModal(null)}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    Done
                  </PortalButton>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
