/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, AlertTriangle, Save, GraduationCap, Users, Sliders, ListRestart, HelpCircle } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  activeItem: string;
  onNavigate: (item: string) => void;
  onLogout: () => void;
  onNotificationsTrigger: () => void;
  
  // Handlers for modal interactions
  activeModal: 'period' | 'rubric' | 'generate' | 'help' | null;
  setActiveModal: (modal: 'period' | 'rubric' | 'generate' | 'help' | null) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeItem,
  onNavigate,
  onLogout,
  onNotificationsTrigger,
  activeModal,
  setActiveModal
}) => {
  // Modal configurations states
  const [periodStart, setPeriodStart] = useState('2025-12-01');
  const [periodEnd, setPeriodEnd] = useState('2025-12-10');
  
  const [rubrics, setRubrics] = useState([
    { id: 1, name: 'Research Methodology Proposal', weight: 20 },
    { id: 2, name: 'Oral Defense Presentation', weight: 30 },
    { id: 3, name: 'Written Thesis Dissertation Progress', weight: 40 },
    { id: 4, name: 'Technical Demo & Artifacts', weight: 10 }
  ]);

  const [generating, setGenerating] = useState(false);
  const [generateLogs, setGenerateLogs] = useState<string[]>([]);

  const runTaskGenerator = () => {
    setGenerating(true);
    setGenerateLogs(['Initializing Task Assigner engine...', 'Fetching candidate registers (48 Students)...']);
    
    setTimeout(() => {
      setGenerateLogs(prev => [...prev, 'Cross-referencing approved Panel Members...', 'Configuring weights (20/30/40/10)...']);
    }, 600);

    setTimeout(() => {
      setGenerating(false);
      setGenerateLogs(prev => [...prev, '✅ 48 Evaluation task schedules successfully generated!']);
    }, 1300);
  };

  const handleWeightChange = (index: number, val: number) => {
    const updated = [...rubrics];
    updated[index].weight = isNaN(val) ? 0 : val;
    setRubrics(updated);
  };

  const rubricSum = rubrics.reduce((acc, obj) => acc + obj.weight, 0);

  return (
    <div id="master-portal-viewport" className="min-h-screen w-full flex bg-[#f1f5f9] text-left">
      
      {/* 1. Left sticky navigation sidebar */}
      <Sidebar activeItem={activeItem} onNavigate={onNavigate} />

      {/* 2. Main workflow workspace content viewport */}
      <div id="portal-workspace" className="flex-grow flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header Navigation panel */}
        <TopHeader 
          userName="Wey Cheng" 
          userRole="Office Staff / Admin" 
          onLogout={onLogout}
          onHelpdeskTrigger={() => setActiveModal('help')}
          onNotificationsTrigger={onNotificationsTrigger}
        />

        {/* Actionable page frame details scrollable box */}
        <main id="portal-inner-content" className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Portal Footer — single global footer, transparent so it blends with the page background */}
        <footer id="portal-footer" className="shrink-0 border-t border-[#e2e8f0] font-sans">
          <div className="max-w-7xl w-full mx-auto px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-[10px] font-bold">
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
          <div className="fixed inset-0 bg-[#0c1424]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            {/* Backdrop Dismiss */}
            <div className="absolute inset-0" onClick={() => setActiveModal(null)} />

            {/* Modal Body Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative z-10 border border-slate-100 text-left"
            >
              {/* Close Button top right */}
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                title="Dismiss Dialog"
              >
                <X className="w-5 h-5" />
              </button>

              {/* A. CONFIGURE MARK ENTRY PERIOD */}
              {activeModal === 'period' && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2.5 mb-4 text-slate-900">
                    <Calendar className="w-6 h-6 text-indigo-500" />
                    <h3 className="text-xl font-extrabold tracking-tight">Configure Mark Entry Period</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Set the active chronological threshold during which teaching faculty, internal panels, and external examiners are permitted to submit assessment marks using the portal.
                  </p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                        Active Semester
                      </label>
                      <input 
                        type="text" 
                        readOnly 
                        value="Semester 1, Academic Year 2025/2026" 
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                          Portal Open Date
                        </label>
                        <input 
                          type="date"
                          value={periodStart} 
                          onChange={(e) => setPeriodStart(e.target.value)}
                          className="w-full text-xs text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-lg font-mono focus:ring-1 focus:ring-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                          Portal Deadline Date
                        </label>
                        <input 
                          type="date" 
                          value={periodEnd} 
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          className="w-full text-xs text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-lg font-mono focus:ring-1 focus:ring-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-900 mb-6 text-xs">
                    <AlertTriangle className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span className="font-semibold">Modifying dates notifies all 48 coordinator modules with immediate broadcast logs.</span>
                  </div>

                  <button
                    onClick={() => {
                      alert(`Administrative configuration saved: Mark entry window defined as ${periodStart} to ${periodEnd}.`);
                      setActiveModal(null);
                    }}
                    className="w-full py-3 bg-[#0c1424] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase hover:bg-slate-800 transition shadow-sm cursor-pointer text-center"
                  >
                    Apply Parameters
                  </button>
                </div>
              )}

              {/* B. MANAGE RUBRIC COMPONENTS */}
              {activeModal === 'rubric' && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2.5 mb-4 text-slate-900">
                    <Sliders className="w-6 h-6 text-indigo-500" />
                    <h3 className="text-xl font-extrabold tracking-tight">Manage Rubric Components</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Balance academic scoring parameters for evaluating candidate coursework portfolios. Weights must sum exactly to <strong className="text-indigo-600 font-extrabold">100%</strong> to deploy evaluation matrices.
                  </p>

                  <div className="space-y-4 mb-6 max-h-[240px] overflow-y-auto pr-1">
                    {rubrics.map((rub, idx) => (
                      <div key={rub.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex-1">
                          <span className="text-[10px] font-extrabold text-indigo-500 block">RUBRIC 0{rub.id}</span>
                          <span className="font-bold text-[#0c1424] block mt-0.5">{rub.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={rub.weight} 
                            onChange={(e) => handleWeightChange(idx, parseInt(e.target.value))}
                            className="w-16 text-center text-xs font-bold font-mono border border-slate-200 px-2 py-1.5 rounded-lg focus:outline-none"
                          />
                          <span className="text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Weight totals summary */}
                  <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-100 border border-slate-200 mb-6 text-xs font-bold">
                    <span className="text-slate-500">Accumulated Matrix Score Sum:</span>
                    <span className={`text-sm font-mono ${rubricSum === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {rubricSum}% {rubricSum === 100 ? '✓ Validated' : '✗ Requires 100% Balance'}
                    </span>
                  </div>

                  <button
                    disabled={rubricSum !== 100}
                    onClick={() => {
                      alert("Rubric weight distribution metrics deployed to grading schemas.");
                      setActiveModal(null);
                    }}
                    className="w-full py-3 bg-[#0c1424] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm cursor-pointer text-center"
                  >
                    Save & Distribute Rubrics
                  </button>
                </div>
              )}

              {/* C. GENERATE EVALUATION TASKS */}
              {activeModal === 'generate' && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2.5 mb-4 text-slate-900">
                    <ListRestart className="w-6 h-6 text-indigo-500" />
                    <h3 className="text-xl font-extrabold tracking-tight">Generate Evaluation Tasks</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Map postgraduate student dissertations individually with assigned panel members and academic supervisors. Automatically creates mark cards for evaluation counters.
                  </p>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-3">
                      <span>Mapped Students Checklist:</span>
                      <span className="text-indigo-600 font-extrabold">48 enrolled records</span>
                    </div>

                    <div className="space-y-1.5 text-[10px] text-slate-500 font-mono">
                      {generateLogs.length === 0 ? (
                        <div className="text-slate-400 italic text-center py-4">Click below to initialize tasks compilation...</div>
                      ) : (
                        generateLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span>&gt;</span>
                            <span>{log}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    disabled={generating}
                    onClick={runTaskGenerator}
                    className="w-full py-3.5 bg-blue-600 font-extrabold text-xs tracking-wider uppercase text-white hover:bg-blue-700 rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {generating ? 'Processing Engine...' : 'Run Generation Protocol'}
                  </button>
                </div>
              )}

              {/* D. FAQ RESOURCE HELPDESK */}
              {activeModal === 'help' && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2.5 mb-4 text-[#0c1424]">
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
                      <span className="text-slate-900 font-bold">Prof. Wey Cheng Lim</span>
                    </div>

                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400 font-semibold">Host Counter Ingress</span>
                      <span className="font-mono text-[10px] text-zinc-500 font-bold">PROD-INGRESS-3000</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase transition hover:bg-slate-800 cursor-pointer text-center"
                  >
                    Done
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
