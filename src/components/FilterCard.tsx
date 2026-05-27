/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';

interface FilterCardProps {
  semester: string;
  setSemester: (sem: string) => void;
  stage: string;
  setStage: (stage: string) => void;
  statusText?: string;
  onExportAction?: () => void;
}

export const FilterCard: React.FC<FilterCardProps> = ({
  semester,
  setSemester,
  stage,
  setStage,
  statusText = 'READY',
  onExportAction
}) => {
  const semesters = [
    { value: 'Sem 1 2025/2026', label: 'Sem 1 2025/2026' },
    { value: 'Sem 2 2025/2026', label: 'Sem 2 2025/2026' },
    { value: 'Sem 1 2024/2025', label: 'Sem 1 2024/2025' }
  ];

  const stages = [
    { value: 'EE Evaluation', label: 'EE Evaluation' },
    { value: 'Proposal Evaluation', label: 'Proposal Evaluation' },
    { value: 'Viva Oral Defense', label: 'Viva Oral Defense' }
  ];

  return (
    <div id="rubrics-filter-panel" className="bg-white rounded-3xl border border-slate-200/80 p-5 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-5 text-left shadow-[0_4px_20px_rgba(241,245,249,0.3)]">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Semester Filter */}
        <div className="flex flex-col">
          <label className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1.5 label-semester">
            Semester
          </label>
          <div className="relative">
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-[#f8fafc] border border-slate-200/90 py-3 pl-3.5 pr-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer appearance-none"
            >
              {semesters.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Evaluation Stage Filter */}
        <div className="flex flex-col">
          <label className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1.5 label-evaluation-stage">
            Evaluation Stage
          </label>
          <div className="relative">
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-[#f8fafc] border border-slate-200/90 py-3 pl-3.5 pr-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer appearance-none"
            >
              {stages.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Status ready chip + Upload indicator */}
      <div className="flex items-center gap-4 shrink-0 justify-end pt-2 md:pt-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-extrabold tracking-widest uppercase">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{statusText}</span>
        </span>

        <button
          onClick={onExportAction}
          className="w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs"
          title="Share/Upload configuration"
        >
          <Upload className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};
