/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  Info, 
  Save, 
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  User,
  Calendar,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { EvaluationTask } from '../types';
import { PageHeader, PortalConfirmModal } from './PortalPrimitives';

interface MarkEntryDetailProps {
  task: EvaluationTask;
  onBack: () => void;
  onSave: (updatedTask: EvaluationTask) => void;
  onSubmit: (updatedTask: EvaluationTask) => void;
}

const evaluatorRoleLabel = (task: EvaluationTask): string =>
  task.evaluatorRoleLabel || (
    task.evaluatorRole === 'SUPERVISOR'
      ? 'Supervisor'
      : task.evaluatorRole === 'BACKUP'
      ? 'Backup Evaluator'
      : 'Panel Member'
  );

const LegacyMarkEntryDetail: React.FC<MarkEntryDetailProps> = ({
  task,
  onBack,
  onSave,
  onSubmit,
}) => {
  // Define component states aligned with the 5 rubric components
  const [problemDefScore, setProblemDefScore] = useState<number | ''>(
    task.problemDefinitionScore !== undefined ? task.problemDefinitionScore : 0
  );
  const [problemDefComment, setProblemDefComment] = useState(
    task.problemDefinitionFeedback || ''
  );

  const [litReviewScore, setLitReviewScore] = useState<number | ''>(
    task.literatureReviewScore !== undefined ? task.literatureReviewScore : 0
  );
  const [litReviewComment, setLitReviewComment] = useState(
    task.literatureReviewFeedback || ''
  );

  const [methodologyScoreValue, setMethodologyScoreValue] = useState<number | ''>(
    task.methodologyScore !== undefined ? task.methodologyScore : 0
  );
  const [methodologyComment, setMethodologyComment] = useState(
    task.methodologyFeedback || ''
  );

  const [technicalScore, setTechnicalScore] = useState<number | ''>(
    task.technicalUnderstandingScore !== undefined ? task.technicalUnderstandingScore : 0
  );
  const [technicalComment, setTechnicalComment] = useState(
    task.technicalUnderstandingFeedback || ''
  );

  const [presentationScoreValue, setPresentationScoreValue] = useState<number | ''>(
    task.presentationScore !== undefined ? task.presentationScore : 0
  );
  const [presentationComment, setPresentationComment] = useState(
    task.presentationFeedback || ''
  );

  // Error validations state
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const isReadOnly = task.status === 'SUBMITTED';

  // Component max limits
  const maxProblemDef = 20;
  const maxLitReview = 20;
  const maxMethodology = 25;
  const maxTechnical = 20;
  const maxPresentation = 15;

  // Real-time calculation
  const score1 = Number(problemDefScore) || 0;
  const score2 = Number(litReviewScore) || 0;
  const score3 = Number(methodologyScoreValue) || 0;
  const score4 = Number(technicalScore) || 0;
  const score5 = Number(presentationScoreValue) || 0;
  const totalScore = score1 + score2 + score3 + score4 + score5;

  // Run validation checks when scores or comments change to provide inline warnings
  useEffect(() => {
    const listErrors: string[] = [];

    // Score validations
    if (problemDefScore !== '' && (problemDefScore < 0 || problemDefScore > maxProblemDef)) {
      listErrors.push(`Problem Definition score must be between 0 and ${maxProblemDef}.`);
    }
    if (litReviewScore !== '' && (litReviewScore < 0 || litReviewScore > maxLitReview)) {
      listErrors.push(`Literature Review score must be between 0 and ${maxLitReview}.`);
    }
    if (methodologyScoreValue !== '' && (methodologyScoreValue < 0 || methodologyScoreValue > maxMethodology)) {
      listErrors.push(`Methodology score must be between 0 and ${maxMethodology}.`);
    }
    if (technicalScore !== '' && (technicalScore < 0 || technicalScore > maxTechnical)) {
      listErrors.push(`Technical Understanding score must be between 0 and ${maxTechnical}.`);
    }
    if (presentationScoreValue !== '' && (presentationScoreValue < 0 || presentationScoreValue > maxPresentation)) {
      listErrors.push(`Presentation & Q&A score must be between 0 and ${maxPresentation}.`);
    }

    // "Comments are required for marks < 50%" policy checker
    // Let's implement validation for when an item's mark is < 50% of its max.
    if (problemDefScore !== '' && problemDefScore < (maxProblemDef * 0.5) && !problemDefComment.trim()) {
      listErrors.push('Problem Definition score is below 50%; feedback comment is required.');
    }
    if (litReviewScore !== '' && litReviewScore < (maxLitReview * 0.5) && !litReviewComment.trim()) {
      listErrors.push('Literature Review score is below 50%; feedback comment is required.');
    }
    if (methodologyScoreValue !== '' && methodologyScoreValue < (maxMethodology * 0.5) && !methodologyComment.trim()) {
      listErrors.push('Methodology score is below 50%; feedback comment is required.');
    }
    if (technicalScore !== '' && technicalScore < (maxTechnical * 0.5) && !technicalComment.trim()) {
      listErrors.push('Technical Understanding score is below 50%; feedback comment is required.');
    }
    if (presentationScoreValue !== '' && presentationScoreValue < (maxPresentation * 0.5) && !presentationComment.trim()) {
      listErrors.push('Presentation & Q&A score is below 50%; feedback comment is required.');
    }

    setErrors(listErrors);
  }, [
    problemDefScore, problemDefComment,
    litReviewScore, litReviewComment,
    methodologyScoreValue, methodologyComment,
    technicalScore, technicalComment,
    presentationScoreValue, presentationComment
  ]);

  // Handle score changes safely
  const handleScoreChange = (
    value: string, 
    setMaxLimit: number, 
    updateState: (val: number | '') => void
  ) => {
    if (value === '') {
      updateState('');
      return;
    }
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      // Allow user to write transient numbers, validation triggers inline warnings
      updateState(parsed);
    }
  };

  // Check if submission is ready
  const isFormComplete = 
    problemDefScore !== '' && 
    litReviewScore !== '' && 
    methodologyScoreValue !== '' && 
    technicalScore !== '' && 
    presentationScoreValue !== '';

  const canSubmit = isFormComplete && errors.length === 0 && !isReadOnly;

  // Actions
  const handleSaveDraftAction = () => {
    const updated: EvaluationTask = {
      ...task,
      status: 'DRAFT SAVED',
      problemDefinitionScore: problemDefScore === '' ? 0 : problemDefScore,
      problemDefinitionFeedback: problemDefComment,
      literatureReviewScore: litReviewScore === '' ? 0 : litReviewScore,
      literatureReviewFeedback: litReviewComment,
      methodologyScore: methodologyScoreValue === '' ? 0 : methodologyScoreValue,
      methodologyFeedback: methodologyComment,
      technicalUnderstandingScore: technicalScore === '' ? 0 : technicalScore,
      technicalUnderstandingFeedback: technicalComment,
      presentationScore: presentationScoreValue === '' ? 0 : presentationScoreValue,
      presentationFeedback: presentationComment,
      comments: `Draft updated with components sum of ${totalScore}`,
    };
    onSave(updated);
  };

  const submitEvaluation = () => {
    const nowStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const updated: EvaluationTask = {
      ...task,
      status: 'SUBMITTED',
      problemDefinitionScore: Number(problemDefScore),
      problemDefinitionFeedback: problemDefComment,
      literatureReviewScore: Number(litReviewScore),
      literatureReviewFeedback: litReviewComment,
      methodologyScore: Number(methodologyScoreValue),
      methodologyFeedback: methodologyComment,
      technicalUnderstandingScore: Number(technicalScore),
      technicalUnderstandingFeedback: technicalComment,
      presentationScore: Number(presentationScoreValue),
      presentationFeedback: presentationComment,
      submittedDate: nowStr,
      comments: `Submitted evaluation total ${totalScore}/100.`,
    };
    setIsSubmitConfirmOpen(false);
    onSubmit(updated);
  };

  const handleSubmitEvaluationAction = () => {
    if (!isFormComplete) {
      alert('Please enter marks for all 5 rubric components before submitting.');
      return;
    }
    if (errors.length > 0) {
      alert('Please correct the validation warnings before submitting (e.g. providing feedback comments for marks under 50%).');
      return;
    }

    setIsSubmitConfirmOpen(true);
  };

  return (
    <div id="mark-entry-detail-page" className="space-y-6 text-left">
      <PortalConfirmModal
        isOpen={isSubmitConfirmOpen}
        title="Submit and lock marks?"
        message={`You are about to finalize marks for ${task.studentName}. Submitted marks become locked immediately and can only be reopened by authorized office staff.`}
        confirmLabel="Submit Marks"
        cancelLabel="Review Again"
        tone="warning"
        onConfirm={submitEvaluation}
        onCancel={() => setIsSubmitConfirmOpen(false)}
      />

      
      <PageHeader
        title="Mark Entry Detail"
        subtitle="Enter rubric marks and submit evaluation for the assigned student."
        backLabel="Back to Marks Entry"
        onBack={onBack}
        className="select-none"
      />

      {/* 3. Outer Responsive Layout splits Left/Right Columns (65% vs 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Student summary card + Rubric table card */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* A. Student summary card */}
          <div id="student-summary-card-block" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs space-y-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-[42px] h-[42px] rounded-xl bg-sky-50 border border-sky-100/60 text-sky-600 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-brand-navy leading-tight select-all">
                    {task.studentName}
                  </h3>
                  <p className="text-xs text-slate-400 font-extrabold tracking-wide uppercase mt-0.5">
                    ID: <span className="font-mono">{task.studentId}</span>
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {task.status === 'NOT STARTED' ? (
                  <span className="bg-[#f1f5f9] text-[#64748b] border border-slate-200 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full">
                    Not Started
                  </span>
                ) : task.status === 'DRAFT SAVED' ? (
                  <span className="bg-[#eff6ff] text-[#1d4ed8] border border-blue-150 border-blue-100 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full">
                    Draft Saved
                  </span>
                ) : (
                  <span className="bg-[#e6fbf2] text-[#00a15c] border border-[#bef5db] text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full">
                    Submitted
                  </span>
                )}
              </div>
            </div>

            {/* Grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Programme
                </span>
                <span className="font-black text-slate-800 block mt-1">
                  MSc. Computer Science
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Evaluation Stage
                </span>
                <span className="font-black text-slate-800 block mt-1">
                  EE Evaluation, Sem 1 25/26
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Deadline
                </span>
                <span className="font-extrabold text-[#e11d48] flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 stroke-[2.3]" />
                  10 Dec 2025
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Research Title
                </span>
                <span className="font-extrabold text-slate-700 block mt-1 leading-relaxed">
                  {task.researchTitle}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Your Role
                </span>
                <span className="font-black text-indigo-750 text-brand-navy block mt-1">
                  {evaluatorRoleLabel(task)}
                </span>
              </div>
            </div>
          </div>

          {/* B. Rubric table card */}
          <div id="rubric-marks-entry-table-box" className="bg-white border border-[#e2e8f0]/80 rounded-2xl shadow-3xs overflow-hidden">
            
            {/* Header with TOTAL view */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
              <h3 className="text-base font-black text-brand-navy">
                Rubric Marks Entry
              </h3>

              {/* Score indicator styled exactly as reference */}
              <div className="bg-sky-50 border border-sky-100/80 px-4 py-2 rounded-xl flex items-center gap-2.5">
                <span className="text-[10px] font-black uppercase text-sky-700 tracking-widest">
                  TOTAL:
                </span>
                <span className="font-black text-lg text-sky-850 text-indigo-950 font-mono">
                  {totalScore} <span className="text-xs text-sky-600 font-semibold">/ 100</span>
                </span>
              </div>
            </div>

            {/* Validation warnings drawer */}
            {errors.length > 0 && !isReadOnly && (
              <div className="p-4 bg-amber-50/60 border-b border-amber-100 flex gap-2.5 items-start">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 stroke-[2.3] mt-0.5" />
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wide block">
                    Marking Requirements
                  </span>
                  <ul className="list-disc pl-3 text-[10.5px] text-amber-800 font-semibold space-y-0.5">
                    {errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {/* Clean, readable Table representation */}
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 select-none bg-slate-50/20">
                    <th className="p-4 w-[180px]">Component</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-center w-[60px]">Max</th>
                    <th className="p-4 text-center w-[90px]">Awarded</th>
                    <th className="p-4 w-[280px]">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 text-slate-700 leading-normal">
                  
                  {/* Row 1: Problem Definition */}
                  <tr className={isReadOnly ? 'bg-slate-50/20' : 'hover:bg-slate-50/10'}>
                    <td className="p-4 align-top font-extrabold text-brand-navy">
                      Problem Definition
                    </td>
                    <td className="p-4 align-top text-slate-500 text-[11px] font-medium leading-relaxed max-w-xs">
                      Clarity of problem statement, background, and significance.
                    </td>
                    <td className="p-4 align-top text-center font-bold text-slate-900">
                      20
                    </td>
                    <td className="p-4 align-top text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        disabled={isReadOnly}
                        value={problemDefScore}
                        onChange={(e) => handleScoreChange(e.target.value, maxProblemDef, setProblemDefScore)}
                        onBlur={() => {
                          if (problemDefScore !== '' && problemDefScore > maxProblemDef) setProblemDefScore(maxProblemDef);
                          if (problemDefScore !== '' && problemDefScore < 0) setProblemDefScore(0);
                        }}
                        className={`w-14 text-center py-1.5 bg-slate-50 border rounded-lg font-mono text-xs font-black focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                          problemDefScore !== '' && problemDefScore < (maxProblemDef * 0.5) 
                            ? 'border-amber-300 text-amber-700 bg-amber-50/30' 
                            : 'border-slate-200 text-brand-navy'
                        } disabled:opacity-70 disabled:bg-slate-100`}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        value={problemDefComment}
                        onChange={(e) => setProblemDefComment(e.target.value)}
                        placeholder="Add comments..."
                        className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all disabled:opacity-70 resize-none"
                      />
                    </td>
                  </tr>

                  {/* Row 2: Literature Review */}
                  <tr className={isReadOnly ? 'bg-slate-50/20' : 'hover:bg-slate-50/10'}>
                    <td className="p-4 align-top font-extrabold text-brand-navy">
                      Literature Review
                    </td>
                    <td className="p-4 align-top text-slate-500 text-[11px] font-medium leading-relaxed max-w-xs">
                      Relevance and depth of existing research coverage.
                    </td>
                    <td className="p-4 align-top text-center font-bold text-slate-900">
                      20
                    </td>
                    <td className="p-4 align-top text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        disabled={isReadOnly}
                        value={litReviewScore}
                        onChange={(e) => handleScoreChange(e.target.value, maxLitReview, setLitReviewScore)}
                        onBlur={() => {
                          if (litReviewScore !== '' && litReviewScore > maxLitReview) setLitReviewScore(maxLitReview);
                          if (litReviewScore !== '' && litReviewScore < 0) setLitReviewScore(0);
                        }}
                        className={`w-14 text-center py-1.5 bg-slate-50 border rounded-lg font-mono text-xs font-black focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                          litReviewScore !== '' && litReviewScore < (maxLitReview * 0.5) 
                            ? 'border-amber-300 text-amber-700 bg-amber-50/30' 
                            : 'border-slate-200 text-brand-navy'
                        } disabled:opacity-70 disabled:bg-slate-100`}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        value={litReviewComment}
                        onChange={(e) => setLitReviewComment(e.target.value)}
                        placeholder="Add comments..."
                        className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all disabled:opacity-70 resize-none"
                      />
                    </td>
                  </tr>

                  {/* Row 3: Methodology */}
                  <tr className={isReadOnly ? 'bg-slate-50/20' : 'hover:bg-slate-50/10'}>
                    <td className="p-4 align-top font-extrabold text-brand-navy">
                      Methodology
                    </td>
                    <td className="p-4 align-top text-slate-500 text-[11px] font-medium leading-relaxed max-w-xs">
                      Suitability and completeness of research design.
                    </td>
                    <td className="p-4 align-top text-center font-bold text-slate-900">
                      25
                    </td>
                    <td className="p-4 align-top text-center">
                      <input
                        type="number"
                        min="0"
                        max="25"
                        disabled={isReadOnly}
                        value={methodologyScoreValue}
                        onChange={(e) => handleScoreChange(e.target.value, maxMethodology, setMethodologyScoreValue)}
                        onBlur={() => {
                          if (methodologyScoreValue !== '' && methodologyScoreValue > maxMethodology) setMethodologyScoreValue(maxMethodology);
                          if (methodologyScoreValue !== '' && methodologyScoreValue < 0) setMethodologyScoreValue(0);
                        }}
                        className={`w-14 text-center py-1.5 bg-slate-50 border rounded-lg font-mono text-xs font-black focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                          methodologyScoreValue !== '' && methodologyScoreValue < (maxMethodology * 0.5) 
                            ? 'border-amber-300 text-amber-700 bg-amber-50/30' 
                            : 'border-slate-200 text-brand-navy'
                        } disabled:opacity-70 disabled:bg-slate-100`}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        value={methodologyComment}
                        onChange={(e) => setMethodologyComment(e.target.value)}
                        placeholder="Add comments..."
                        className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all disabled:opacity-70 resize-none"
                      />
                    </td>
                  </tr>

                  {/* Row 4: Technical Understanding */}
                  <tr className={isReadOnly ? 'bg-slate-50/20' : 'hover:bg-slate-50/10'}>
                    <td className="p-4 align-top font-extrabold text-brand-navy">
                      Technical Understanding
                    </td>
                    <td className="p-4 align-top text-slate-500 text-[11px] font-medium leading-relaxed max-w-xs">
                      Understanding of systems and technical constraints.
                    </td>
                    <td className="p-4 align-top text-center font-bold text-slate-900">
                      20
                    </td>
                    <td className="p-4 align-top text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        disabled={isReadOnly}
                        value={technicalScore}
                        onChange={(e) => handleScoreChange(e.target.value, maxTechnical, setTechnicalScore)}
                        onBlur={() => {
                          if (technicalScore !== '' && technicalScore > maxTechnical) setTechnicalScore(maxTechnical);
                          if (technicalScore !== '' && technicalScore < 0) setTechnicalScore(0);
                        }}
                        className={`w-14 text-center py-1.5 bg-slate-50 border rounded-lg font-mono text-xs font-black focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                          technicalScore !== '' && technicalScore < (maxTechnical * 0.5) 
                            ? 'border-amber-300 text-amber-700 bg-amber-50/30' 
                            : 'border-slate-200 text-brand-navy'
                        } disabled:opacity-70 disabled:bg-slate-100`}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        value={technicalComment}
                        onChange={(e) => setTechnicalComment(e.target.value)}
                        placeholder="Add comments..."
                        className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all disabled:opacity-70 resize-none"
                      />
                    </td>
                  </tr>

                  {/* Row 5: Presentation & Q&A */}
                  <tr className={isReadOnly ? 'bg-slate-50/20' : 'hover:bg-slate-50/10'}>
                    <td className="p-4 align-top font-extrabold text-brand-navy">
                      Presentation & Q&A
                    </td>
                    <td className="p-4 align-top text-slate-500 text-[11px] font-medium leading-relaxed max-w-xs">
                      Communication and quality of answers provided.
                    </td>
                    <td className="p-4 align-top text-center font-bold text-slate-900">
                      15
                    </td>
                    <td className="p-4 align-top text-center">
                      <input
                        type="number"
                        min="0"
                        max="15"
                        disabled={isReadOnly}
                        value={presentationScoreValue}
                        onChange={(e) => handleScoreChange(e.target.value, maxPresentation, setPresentationScoreValue)}
                        onBlur={() => {
                          if (presentationScoreValue !== '' && presentationScoreValue > maxPresentation) setPresentationScoreValue(maxPresentation);
                          if (presentationScoreValue !== '' && presentationScoreValue < 0) setPresentationScoreValue(0);
                        }}
                        className={`w-14 text-center py-1.5 bg-slate-50 border rounded-lg font-mono text-xs font-black focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                          presentationScoreValue !== '' && presentationScoreValue < (maxPresentation * 0.5) 
                            ? 'border-amber-300 text-amber-700 bg-amber-50/30' 
                            : 'border-slate-200 text-brand-navy'
                        } disabled:opacity-70 disabled:bg-slate-100`}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        value={presentationComment}
                        onChange={(e) => setPresentationComment(e.target.value)}
                        placeholder="Add comments..."
                        className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg p-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all disabled:opacity-70 resize-none"
                      />
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4.5 bg-[#f8fafc] border-t border-slate-100 flex items-center justify-between font-bold text-[10px] uppercase text-slate-400 tracking-wider">
              <span>Total Possible Marks</span>
              <span className="font-mono text-slate-800 text-xs pr-14">100</span>
            </div>
          </div>

          {/* C. Bottom Action Buttons Container */}
          <div className="flex justify-end gap-3.5 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
            >
              Cancel
            </button>

            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraftAction}
                  className="inline-flex items-center gap-1.5 border border-brand-navy hover:bg-slate-50 text-brand-navy px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmitEvaluationAction}
                  className={`inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer shadow-sm ${
                    canSubmit 
                      ? 'bg-brand-navy hover:bg-slate-800 text-white' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-205'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Submit Evaluation</span>
                </button>
              </>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Info blocks, documents, school policies */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Card 1: RESEARCH INFORMATION */}
          <div id="research-info-card-panel" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs text-left space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-indigo-400 stroke-[2.3]" />
              Research Information
            </h4>

            <div className="space-y-3.5 text-xs font-medium text-slate-700">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                  Area
                </span>
                <span className="font-extrabold text-slate-800 block mt-1 leading-snug">
                  Blockchain / Academic Credential Verification
                </span>
              </div>

              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                  Supervisor
                </span>
                <span className="font-bold text-slate-800 block mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-4 h-4 bg-sky-50 text-sky-600 rounded-full font-black text-[9px] flex items-center justify-center">SN</span>
                  Dr. Siti Noor
                </span>
              </div>

              <div className="pt-1.5 border-t border-slate-100">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Abstract Snippet
                </span>
                <p className="text-slate-500 font-semibold italic text-[11px] leading-relaxed text-justify">
                  &ldquo;This research explores how blockchain can be used to verify academic credentials securely, reduce document forgery, and streamline automated verification systems for corporate stakeholders.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: DOCUMENTS */}
          <div id="documents-card-panel" className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-5 shadow-3xs text-left space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">
              Documents
            </h4>

            <div className="space-y-2">
              {/* Doc 1 */}
              <a
                href="#proposal"
                onClick={(e) => { e.preventDefault(); alert('Opening Proposal.pdf preview...'); }}
                className="flex items-center justify-between p-3 border border-slate-100 hover:border-slate-350 hover:bg-slate-50/50 rounded-xl transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Proposal.pdf</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              {/* Doc 2 */}
              <a
                href="#rubric"
                onClick={(e) => { e.preventDefault(); alert('Opening Evaluation Rubric.pdf...'); }}
                className="flex items-center justify-between p-3 border border-slate-100 hover:border-slate-350 hover:bg-slate-50/50 rounded-xl transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <FileSpreadsheet className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Evaluation Rubric.pdf</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              {/* Doc 3 */}
              <a
                href="#slides"
                onClick={(e) => { e.preventDefault(); alert('Opening Presentation Slides.pdf...'); }}
                className="flex items-center justify-between p-3 border border-slate-100 hover:border-slate-350 hover:bg-slate-50/50 rounded-xl transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Presentation Slides.pdf</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Card 3: Marking Policy info box */}
          <div id="marking-policy-block" className="bg-[#eff6ff] border border-blue-200/60 rounded-2xl p-5 text-left flex gap-3.5 items-start">
            <Info className="w-4.5 h-4.5 text-blue-600 stroke-[2.3] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-black text-[#1d4ed8] uppercase tracking-wider">
                Marking Policy
              </h5>
              <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                Marks must be within max range. Comments are required for any component mark that is less than 50% of its maximum.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

const legacyComponentFields: Record<string, {
  score: keyof EvaluationTask;
  feedback: keyof EvaluationTask;
}> = {
  problem_definition: {
    score: 'problemDefinitionScore',
    feedback: 'problemDefinitionFeedback',
  },
  literature_review: {
    score: 'literatureReviewScore',
    feedback: 'literatureReviewFeedback',
  },
  methodology: {
    score: 'methodologyScore',
    feedback: 'methodologyFeedback',
  },
  technical_understanding: {
    score: 'technicalUnderstandingScore',
    feedback: 'technicalUnderstandingFeedback',
  },
  presentation: {
    score: 'presentationScore',
    feedback: 'presentationFeedback',
  },
};

const DynamicMarkEntryDetail: React.FC<MarkEntryDetailProps> = ({
  task,
  onBack,
  onSave,
  onSubmit,
}) => {
  const [values, setValues] = useState(() => Object.fromEntries(
    (task.components || []).map((component) => [
      component.id,
      {
        mark: component.marksAwarded === null ? '' : component.marksAwarded,
        feedback: component.feedback,
      },
    ]),
  ));
  const [comments, setComments] = useState(task.comments || '');
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const isReadOnly = task.status === 'SUBMITTED';
  const components = task.components || [];
  const total = components.reduce(
    (sum, component) => sum + Number(values[component.id]?.mark || 0),
    0,
  );
  const maximum = components.reduce(
    (sum, component) => sum + Number(component.maxMarks),
    0,
  );
  const errors = components.flatMap((component) => {
    const raw = values[component.id]?.mark;
    if (component.required && raw === '') return [`${component.name} is required.`];
    const mark = Number(raw);
    if (!Number.isFinite(mark) || mark < 0 || mark > Number(component.maxMarks)) {
      return [`${component.name} must be between 0 and ${component.maxMarks}.`];
    }
    return [];
  });

  const buildTask = (status: EvaluationTask['status']): EvaluationTask => {
    const updated: EvaluationTask = {
      ...task,
      status,
      comments,
      components: components.map((component) => ({
        ...component,
        marksAwarded: values[component.id]?.mark === ''
          ? null
          : String(values[component.id]?.mark ?? 0),
        feedback: values[component.id]?.feedback || '',
      })),
    };
    for (const component of updated.components || []) {
      const fields = legacyComponentFields[component.code];
      if (!fields) continue;
      (updated as unknown as Record<string, unknown>)[fields.score] =
        component.marksAwarded === null ? undefined : Number(component.marksAwarded);
      (updated as unknown as Record<string, unknown>)[fields.feedback] = component.feedback;
    }
    return updated;
  };

  return (
    <div className="space-y-6 text-left">
      <PortalConfirmModal
        isOpen={isSubmitConfirmOpen}
        title="Submit and lock marks?"
        message={`You are about to finalize marks for ${task.studentName}. Submitted marks become locked immediately and can only be reopened by authorized office staff.`}
        confirmLabel="Submit Marks"
        cancelLabel="Review Again"
        tone="warning"
        onConfirm={() => {
          setIsSubmitConfirmOpen(false);
          onSubmit(buildTask('SUBMITTED'));
        }}
        onCancel={() => setIsSubmitConfirmOpen(false)}
      />

      <PageHeader
        title="Mark Entry Detail"
        subtitle="Enter marks using the active rubric configured by the postgraduate office."
        backLabel="Back to Marks Entry"
        onBack={onBack}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-brand-navy">{task.studentName}</h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  {task.studentId} · {task.researchTitle}
                </p>
              </div>
              <span className="inline-flex self-start px-3 py-1 rounded-full bg-slate-100 text-[9px] font-extrabold tracking-wider text-slate-600 uppercase border border-slate-200">
                {evaluatorRoleLabel(task)}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {components.map((component, index) => (
              <div key={component.id} className="p-6 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-brand-navy text-white flex items-center justify-center text-[10px] font-black">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-xs font-black text-brand-navy">{component.name}</h3>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                        {component.description || 'Configured evaluation component'}
                      </p>
                    </div>
                  </div>
                  <textarea
                    disabled={isReadOnly}
                    value={values[component.id]?.feedback || ''}
                    onChange={(event) => setValues((current) => ({
                      ...current,
                      [component.id]: {
                        ...current[component.id],
                        feedback: event.target.value,
                      },
                    }))}
                    placeholder="Evaluator feedback"
                    className="form-control mt-4 min-h-[82px]"
                  />
                </div>
                <label className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Marks / {component.maxMarks}
                  </span>
                  <input
                    disabled={isReadOnly}
                    type="number"
                    min="0"
                    max={component.maxMarks}
                    step="0.01"
                    value={values[component.id]?.mark ?? ''}
                    onChange={(event) => setValues((current) => ({
                      ...current,
                      [component.id]: {
                        ...current[component.id],
                        mark: event.target.value,
                      },
                    }))}
                    className="form-control text-right font-black text-brand-navy"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-slate-100">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Overall comments
            </label>
            <textarea
              disabled={isReadOnly}
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              className="form-control mt-2 min-h-[96px]"
            />
          </div>
        </div>

        <aside className="bg-brand-navy text-white rounded-2xl p-6 shadow-sm space-y-5 sticky top-6">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] font-black text-indigo-300">
              Calculated total
            </p>
            <p className="text-4xl font-black mt-2">
              {total.toFixed(2)}
              <span className="text-sm text-slate-400"> / {maximum.toFixed(2)}</span>
            </p>
          </div>

          {errors.length > 0 && !isReadOnly && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-300/20 p-4">
              {errors.map((error) => (
                <p key={error} className="text-[10px] font-semibold text-rose-100 leading-relaxed">
                  {error}
                </p>
              ))}
            </div>
          )}

          {!isReadOnly && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onSave(buildTask('DRAFT SAVED'))}
                className="w-full py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-black uppercase tracking-wider"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={errors.length > 0}
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="w-full py-2.5 rounded-xl bg-white text-brand-navy disabled:opacity-40 text-xs font-black uppercase tracking-wider"
              >
                Submit and Lock
              </button>
            </div>
          )}
          {isReadOnly && (
            <div className="rounded-xl bg-emerald-400/10 border border-emerald-300/20 p-4 text-xs font-bold text-emerald-100">
              Submitted marks are locked. Office staff may reopen them through Django Admin.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export const MarkEntryDetail: React.FC<MarkEntryDetailProps> = (props) =>
  props.task.components && props.task.components.length > 0
    ? <DynamicMarkEntryDetail {...props} />
    : <LegacyMarkEntryDetail {...props} />;
