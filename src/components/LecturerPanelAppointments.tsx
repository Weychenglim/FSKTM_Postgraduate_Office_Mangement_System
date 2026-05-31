/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  FileText, 
  SlidersHorizontal,
  Mail, 
  Phone,
  Bookmark,
  ArrowLeft,
  X,
  Bell,
  HelpCircle,
  LogOut,
  Settings as SettingsIcon,
  Search,
  MessageSquareCode,
  FolderMinus,
  MailOpen,
  Megaphone,
  CheckSquare,
  Award,
  Filter,
  Check,
  Building,
  Download,
  Eye,
  Info,
  Calendar,
  AlertTriangle,
  Send,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortalToast } from './PortalPrimitives';
import { RecommendPanelMemberDrawer } from './RecommendPanelMemberDrawer';
import { SubmittedRecommendationsPage } from './SubmittedRecommendationsPage';
import { PanelAssignmentDetail } from './PanelAssignmentDetail';

// ==================== SUB-COMPONENTS & TYPES ====================

interface PanelAssignment {
  studentId: string;
  studentName: string;
  researchTitle: string;
  supervisor: string;
  appointmentDate: string;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  programme?: string;
  intake?: string;
  abstract?: string;
  initials?: string;
}

interface SubmittedRecommendation {
  studentId: string;
  studentName: string;
  programme: string;
  proposedTopic: string;
  recommendedMember: string;
  recommendedMemberId: string;
  submittedDate: string;
  status: 'SUBMITTED' | 'APPROVED' | 'UNDER REVIEW';
}

export const LecturerPanelAppointments: React.FC = () => {
  // Navigation states: 'list' | 'submitted' | 'detail'
  const [panelView, setPanelView] = useState<'list' | 'submitted' | 'detail'>('list');
  
  // Right Drawer state
  const [isRecommendDrawerOpen, setIsRecommendDrawerOpen] = useState(false);
  
  // Active selected entities
  const [selectedStudentName, setSelectedStudentName] = useState('Ahmad Luqman');
  const [selectedStudentId, setSelectedStudentId] = useState('MEA2209841');
  const [selectedAssignment, setSelectedAssignment] = useState<PanelAssignment | null>(null);

  // Recommendations inputs
  const [recMember, setRecMember] = useState('');
  const [recComments, setRecComments] = useState('');

  // Toast Notification
  const [toastText, setToastText] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText(null);
    }, 4500);
  };

  // Static Data
  const [assignments, setAssignments] = useState<PanelAssignment[]>([
    {
      studentId: 'MEA2301184',
      studentName: 'Sarah Natasha',
      researchTitle: 'Blockchain-Based Verification Framework for Academic Credentials',
      supervisor: 'Dr. Siti Noor',
      appointmentDate: '05 Jan 2024',
      status: 'ACTIVE',
      initials: 'SN',
      programme: 'MSc. Computer Science (Research)',
      intake: 'Sem 2 2023/2024',
      abstract: 'This dissertation investigates decentralized systems for verifying diploma validity. It models gas-efficiency across distributed networks and deploys off-chain cryptographic commitments to prove validity without exposing candidate personal records.'
    },
    {
      studentId: 'MEA2302199',
      studentName: 'Jason Lee',
      researchTitle: 'Quantum Computing Algorithms in Cryptography & Cybersecurity',
      supervisor: 'Dr. Aris Ghaffar',
      appointmentDate: '14 Mar 2024',
      status: 'ACTIVE',
      initials: 'JL',
      programme: 'MSc. Computer Science (Research)',
      intake: 'Sem 1 2023/2024',
      abstract: 'Examines threat vectors on modern elliptic curve cryptography from Shor’s and Grover’s algorithms, and implements post-quantum replacement protocols securely in Java-based simulation environments.'
    }
  ]);

  const [submittedRecs, setSubmittedRecs] = useState<SubmittedRecommendation[]>([
    {
      studentId: 'MEA2400712',
      studentName: 'Nur Aina Rahman',
      programme: 'MSc. Computer Science',
      proposedTopic: 'Blockchain-Based Decentralized Identity Management',
      recommendedMember: 'Assoc. Prof. Dr. Amina Malik',
      recommendedMemberId: 'A004812',
      submittedDate: '20 May 2026',
      status: 'APPROVED'
    }
  ]);

  // Combine custom submissions with default mock recommendations list so newly recommended items pop up immediately in the table!
  const combinedRecommendations = useMemo(() => {
    const baseList = [
      {
        id: 'REC-2025-021',
        studentName: 'Nur Aina Rahman',
        studentId: '17204561',
        researchTitle: 'Blockchain-Based Verification Framework for Academic Credentials',
        recommendedPanel: 'Assoc. Prof. Dr. Amina Malik',
        date: '10 Oct 2025',
        status: 'Approved' as const,
        semester: 'Sem 1 2025/2026',
        programme: 'MSc. Computer Science',
        abstract: 'This research outlines the implementation of a decentralized identity (DID) platform for public service registration. Utilizing custom smart contracts alongside cryptographic zero-knowledge proof components, it provides security against identification tampering.',
        justification: 'The lecturer possesses 6+ years of expertise in Big Data and decentralized ledgers, with multiple published journals in international indexing circles.'
      },
      {
        id: 'REC-2025-018',
        studentName: 'Jason Lee',
        studentId: '17208832',
        researchTitle: 'Quantum Computing Algorithms in Cryptography & Cybersecurity',
        recommendedPanel: 'Dr. Robert Chen',
        date: '01 Sep 2025',
        status: 'Approved' as const,
        semester: 'Sem 1 2025/2026',
        programme: 'MSc. Computer Science',
        abstract: 'Examines threat vectors on modern elliptic curve cryptography from Shor’s and Grover’s algorithms, and implements post-quantum replacement protocols securely in Java-based simulation environments.',
        justification: 'Dr. Robert Chen focuses on practical post-quantum security schemes and is highly suitable for validating cryptographic proof aspects of this topic.'
      },
      {
        id: 'REC-2025-014',
        studentName: 'Farhan Tariq',
        studentId: '17200021',
        researchTitle: 'Federated Learning Models for Privacy-Preserving Applications',
        recommendedPanel: 'Dr. Sarah Lim',
        date: '14 May 2025',
        status: 'Pending Approval' as const,
        semester: 'Sem 2 2024/2025',
        programme: 'MSc. Computer Science',
        abstract: 'Investigates decentralized server training mechanics across dynamic device groups while preserving private structural feature layers using additive secret sharing policies.',
        justification: 'Dr. Sarah Lim has a rich background in adversarial learning models and federated systems evaluation pipelines.'
      },
      {
        id: 'REC-2024-032',
        studentName: 'Tan Jia Min',
        studentId: '17199923',
        researchTitle: 'Privacy-Aware Student Data Analytics & Systems',
        recommendedPanel: 'Assoc. Prof. Dr. Amina Malik',
        date: '20 Nov 2024',
        status: 'Approved' as const,
        semester: 'Sem 2 2024/2025',
        programme: 'MSc. Computer Science',
        abstract: 'Evaluates predictive courses recommendation algorithms in higher learning without harvesting individual tracking datasets.',
        justification: 'She has spearheaded several institutional privacy audits and research contracts regarding Student Information System governance.'
      },
      {
        id: 'REC-2024-019',
        studentName: 'Kumar Raj',
        studentId: '17188842',
        researchTitle: 'Cloud-Based Research Document Management Workflow Platform',
        recommendedPanel: 'Dr. Robert Chen',
        date: '03 Aug 2024',
        status: 'Rejected' as const,
        semester: 'Sem 1 2024/2025',
        programme: 'MSc. Software Engineering',
        abstract: 'A software framework implementing dynamic document version control pipelines securely over decentralized server node storage files.',
        justification: 'The candidate theme falls into conventional database patterns which do not fully align with the active research cluster focuses.'
      },
      {
        id: 'REC-2024-008',
        studentName: 'Siti Sarah',
        studentId: '17208852',
        researchTitle: 'Reinforcement Learning in Drone Pathfinding Routines',
        recommendedPanel: 'Dr. Siti Noor',
        date: '10 Apr 2024',
        status: 'Approved' as const,
        semester: 'Sem 2 2023/2024',
        programme: 'MSc. Computer Science',
        abstract: 'Applies neural feedback reward policies to determine shortest collision-free routes under wind fluctuation constraints.',
        justification: 'Dr. Siti Noor is active in cellular automation paradigms and mobile robotics steering validation.'
      },
      {
        id: 'REC-2024-005',
        studentName: 'Chong Wei',
        studentId: '17193202',
        researchTitle: 'LLM Prompt Engineering for Automated API Code Generation',
        recommendedPanel: 'Dr. Robert Chen',
        date: '18 Jan 2024',
        status: 'Approved' as const,
        semester: 'Sem 2 2023/2024',
        programme: 'MSc. Software Engineering',
        abstract: 'Provides structured prompt matrices to synthesize verified gRPC route files from YAML endpoints specification.',
        justification: 'He has worked closely on software pattern generators and has direct experience evaluating automated code systems.'
      },
      {
        id: 'REC-2023-045',
        studentName: 'Devi Nair',
        studentId: '17193321',
        researchTitle: 'Containerized Broker Infrastructure for Smart Home Gateway Devices',
        recommendedPanel: 'Dr. Siti Noor',
        date: '22 Nov 2023',
        status: 'Approved' as const,
        semester: 'Sem 1 2023/2024',
        programme: 'MSc. Computer Science',
        abstract: 'Deploys lightweight message parsing agents onto limited computing environments to balance active event triggers.',
        justification: 'Suitable candidate based on local network virtualization research projects launched.'
      },
      {
        id: 'REC-2023-033',
        studentName: 'Lim Chin Hock',
        studentId: '17201931',
        researchTitle: 'Neural Threat Detection Plugin over Software Defined Networks',
        recommendedPanel: 'Assoc. Prof. Dr. Amina Malik',
        date: '15 Sep 2023',
        status: 'Approved' as const,
        semester: 'Sem 1 2023/2024',
        programme: 'MSc. Computer Science',
        abstract: 'Monitors open flow protocol exchanges using light convolutional filters to log DDoS triggers before they affect router states.',
        justification: 'Outstanding record in system protection frameworks and distributed databases.'
      },
      {
        id: 'REC-2023-021',
        studentName: 'Fatima Zahra',
        studentId: '17150567',
        researchTitle: 'Automating UI Test Script Refactoring with Abstract Syntax Trees',
        recommendedPanel: 'Dr. Robert Chen',
        date: '12 Jun 2023',
        status: 'Approved' as const,
        semester: 'Sem 2 2022/2023',
        programme: 'MSc. Software Engineering',
        abstract: 'Decodes outdated test files and automatically maps them to updated elements trees via grammar translation frameworks.',
        justification: 'Expertise in validation tooling and automated parsing models fits this topic.'
      },
      {
        id: 'REC-2023-009',
        studentName: 'Samuel Tan',
        studentId: '17140924',
        researchTitle: 'Ensemble Learning applied to Real-Time Sentiment Index Tracking',
        recommendedPanel: 'Assoc. Prof. Dr. Amina Malik',
        date: '02 May 2022',
        status: 'Approved' as const,
        semester: 'Sem 1 2022/2023',
        programme: 'MSc. Computer Science',
        abstract: 'Extracts real-time trading sentiment from financial publications using transformer embeddings and weights outputs proportionately.',
        justification: 'Matches her active focus on big-data analytics and advanced natural processing architectures.'
      }
    ];

    const customList = submittedRecs
      .filter(r => r.studentId !== 'MEA2400712' && r.studentId !== '17204561')
      .map((r, i) => ({
        id: `REC-2026-${String(100 + i).slice(1)}`,
        studentName: r.studentName,
        studentId: r.studentId,
        researchTitle: r.proposedTopic,
        recommendedPanel: r.recommendedMember,
        date: r.submittedDate,
        status: (r.status === 'SUBMITTED' ? 'Pending Approval' : r.status === 'APPROVED' ? 'Approved' : 'Rejected') as 'Approved' | 'Pending Approval' | 'Rejected',
        semester: 'Sem 1 2025/2026',
        programme: r.programme,
        abstract: 'This research explores novel architectural improvements for GANs to improve synthetic data quality in languages with limited linguistic resources, aiming to enhance machine translation and speech recognition accuracy in indigenous contexts.'
      }));

    return [...customList, ...baseList];
  }, [submittedRecs]);

  // Handle recommendation form submit
  const submitPanelRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recMember) {
      alert("Please select a panel member to recommend.");
      return;
    }

    const newRec: SubmittedRecommendation = {
      studentId: selectedStudentId,
      studentName: selectedStudentName,
      programme: 'MSc. Computer Science',
      proposedTopic: 'Optimizing Generative Adversarial Networks for Low-Resource Languages',
      recommendedMember: recMember === 'amina' 
        ? 'Assoc. Prof. Dr. Amina Malik' 
        : recMember === 'siti' 
        ? 'Dr. Siti Noor' 
        : 'Dr. Robert Chen',
      recommendedMemberId: recMember === 'amina' ? 'A004812' : recMember === 'siti' ? 'A004918' : 'A002931',
      submittedDate: '29 May 2026',
      status: 'SUBMITTED'
    };

    setSubmittedRecs([newRec, ...submittedRecs]);
    setIsRecommendDrawerOpen(false);
    setRecMember('');
    setRecComments('');
    
    // Smooth scroll back to top and trigger delightful notification banner
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerToast(`Recommendation submitted successfully! recommended ${newRec.recommendedMember} for candidate ${newRec.studentName}.`);
  };

  const activeRecommendationsCount = submittedRecs.filter(r => r.status === 'SUBMITTED').length;

  return (
    <div id="lecturer-panel-module-container" className="space-y-8 animate-fade-in text-left">
      
      <PortalToast message={toastText} />

      {/* RENDER LAYOUT 1: MAIN LISTING PORTAL VIEW */}
      {panelView === 'list' && (
        <div id="main-panel-listing-view" className="space-y-8">
          
          {/* Section Breadcrumbs Title */}
          <div id="section-meta-heading text-left" className="select-none">
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest block leading-none mb-2">
              Lecturer Portal
            </span>
            <h1 className="page-title">
              Panel Appointments
            </h1>
            <p className="page-subtitle leading-relaxed max-w-4xl">
              Recommend panel members for your supervisees and view students assigned to you as panel member.
            </p>
          </div>

          {/* TWO DYNAMIC WORKLOAD CARDS */}
          <div id="panel-metrics-summary-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
            
            {/* CARD 1: PANEL WORKLOAD */}
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-auto relative overflow-hidden group hover:border-[#cbd5e1] transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                    Panel Workload
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block pt-0.5 uppercase tracking-wider">
                    Academic Year 2025/2026
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-[#bef5db] bg-[#e6fbf2] text-[#00a15c]">
                  <span className="w-1 h-1 rounded-full bg-[#00a15c] animate-pulse" />
                  AVAILABLE
                </span>
              </div>

              <div className="mt-5">
                <div className="text-3xl font-black text-brand-navy tracking-tight">
                  2 <span className="text-slate-300 font-medium">/ 5 Assignments</span>
                </div>
                {/* Custom fluid workload tracking progress bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden relative border border-slate-200/40">
                  <div className="bg-blue-600 h-full rounded-full w-[40%] transition-all duration-500" />
                </div>
              </div>
            </div>

            {/* CARD 2: PENDING RECOMMENDATIONS */}
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-auto relative overflow-hidden group hover:border-[#cbd5e1] transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                    Pending Recommendations
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-blue-200 bg-blue-50 text-blue-600">
                  1 NEW
                </span>
              </div>

              <div className="mt-4 flex gap-3.5 items-center">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-[11.5px] text-slate-500 font-semibold leading-normal text-left max-w-sm">
                  Students under your supervision need panel member recommendation.
                </p>
              </div>
            </div>

          </div>

          {/* DYNAMIC LISTING CONTAINER SECTION: PANEL RECOMMENDATIONS */}
          <div id="panel-supervisors-recommendations-layout" className="space-y-4">
            <div className="flex justify-between items-center select-none font-sans">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider block text-left">
                  Panel Recommendations for My Supervisees
                </h3>
                <span className="bg-blue-600 border border-blue-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg">
                  1 NEW
                </span>
              </div>

              <button
                onClick={() => setPanelView('submitted')}
                className="inline-flex items-center gap-2 text-xs font-black text-brand-navy hover:text-slate-800 tracking-wide uppercase px-4 py-2 bg-white border border-slate-200 hover:border-slate-350 shadow-3xs rounded-xl transition-all cursor-pointer"
              >
                <span>View Submitted Recommendations</span>
              </button>
            </div>

            {/* Sub-Layout Cards Box row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* Left Recommendation Required Student info */}
              <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-all relative">
                
                {/* Header status bar */}
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 bg-indigo-50 text-brand-navy font-black text-xs rounded-full flex items-center justify-center border border-indigo-100">
                        AL
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-black text-brand-navy leading-snug">
                          Ahmad Luqman
                        </h4>
                        <span className="font-mono text-[10px] text-slate-410 text-slate-400 font-extrabold block">
                          MEA2209841
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-amber-200 bg-amber-50 text-amber-700 select-none leading-none">
                      RECOMMENDATION NEEDED
                    </span>
                  </div>

                  {/* Program Intake Info Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                        PROGRAMME
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 block mt-1">
                        MSc. Computer Science
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                        INTAKE
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 block mt-1">
                        Sem 1 2025/2026
                      </span>
                    </div>
                  </div>

                  {/* Research Title Abstract line */}
                  <div className="mt-5 space-y-1 bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 text-left">
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider text-slate-400 block leading-none select-none">
                      PROPOSED RESEARCH TOPIC
                    </span>
                    <p className="text-xs font-extrabold text-brand-navy leading-relaxed italic mt-1.5 font-sans">
                      "Optimizing Generative Adversarial Networks for Low-Resource Languages"
                    </p>
                  </div>
                </div>

                {/* Confirm recommend member action button */}
                <button
                  onClick={() => {
                    setSelectedStudentName('Ahmad Luqman');
                    setSelectedStudentId('MEA2209841');
                    setIsRecommendDrawerOpen(true);
                  }}
                  className="w-full mt-6 py-3.5 bg-brand-navy text-white hover:bg-slate-800 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-sm select-none cursor-pointer text-center"
                >
                  Recommend Panel Member
                </button>
              </div>

              {/* Right Empty placeholder card matches mock design */}
              <div className="bg-white border border-[#e2e8f0]/40 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center select-none space-y-3 min-h-[310px]">
                <div className="w-12 h-12 rounded-full border border-slate-150 flex items-center justify-center bg-slate-50 text-slate-400">
                  <Check className="w-5 h-5 text-slate-400 stroke-[2.2]" />
                </div>
                <p className="text-slate-400 font-bold text-xs max-w-xs">
                  No other supervisees need panel recommendations right now.
                </p>
              </div>

            </div>
          </div>

          {/* MY PANEL ASSIGNMENTS DATA SECTION */}
          <div id="panel-assignments-roster" className="space-y-4">
            
            {/* Header info */}
            <div>
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider">
                    My Panel Assignments
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-450 text-slate-400 mt-1 leading-none select-none">
                    Students where you have been assigned as the panel member.
                  </p>
                </div>

                <button 
                  onClick={() => alert("Assignments lookup filters applied.")}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer shadow-3xs"
                  title="Filter Assignments"
                >
                  <Filter className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Table data shell */}
            <div className="bg-white border border-[#e2e8f0]/80 rounded-2xl overflow-hidden shadow-3xs text-left font-sans">
              <div className="overflow-x-auto">
                  <table className="data-table min-w-[850px] text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] font-bold text-slate-400 tracking-wider uppercase select-none">
                      <th className="py-4 px-6">STUDENT ID</th>
                      <th className="py-4 px-6">STUDENT NAME</th>
                      <th className="py-4 px-6">RESEARCH TITLE</th>
                      <th className="py-4 px-6">SUPERVISOR</th>
                      <th className="py-4 px-6">APPT. DATE</th>
                      <th className="py-4 px-6">STATUS</th>
                      <th className="py-4 px-6 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-brand-navy">
                    {assignments.map((asg) => (
                      <tr key={asg.studentId} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-5 px-6 font-mono font-black text-slate-550 select-all shrink-0">
                          {asg.studentId}
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3 select-all">
                            <div className="w-7 h-7 bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-3xs">
                              {asg.initials}
                            </div>
                            <span className="font-extrabold text-brand-navy block">
                              {asg.studentName}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-6 font-semibold text-slate-500 max-w-[260px] truncate select-all" title={asg.researchTitle}>
                          {asg.researchTitle}
                        </td>
                        <td className="py-5 px-6 font-black text-slate-700">
                          {asg.supervisor}
                        </td>
                        <td className="py-5 px-6 font-extrabold text-slate-400">
                          {asg.appointmentDate}
                        </td>
                        <td className="py-5 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                            {asg.status}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <button
                            onClick={() => {
                              setSelectedAssignment(asg);
                              setPanelView('detail');
                            }}
                            className="inline-flex items-center gap-1 bg-brand-navy hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all select-none cursor-pointer shadow-3xs border border-brand-navy"
                          >
                            <span>View Assignment</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* RENDER LAYOUT 2: SUBMITTED RECOMMENDATIONS HISTORY */}
      {panelView === 'submitted' && (
        <SubmittedRecommendationsPage
          onBack={() => setPanelView('list')}
          recommendations={combinedRecommendations}
        />
      )}

      {/* RENDER LAYOUT 3: PANEL ASSIGNMENT DETAIL PAGE */}
      {panelView === 'detail' && selectedAssignment && (
        <PanelAssignmentDetail
          assignment={selectedAssignment}
          onBack={() => {
            setSelectedAssignment(null);
            setPanelView('list');
          }}
          onOpenMarksEntry={() => {
            alert(`Redirecting to Marks Entry dashboard to grade candidate: ${selectedAssignment.studentName}.`);
          }}
        />
      )}

      {/* RIGHT SLIDING DRAWER: RECOMMEND PANEL MEMBER DRAWER */}
      <RecommendPanelMemberDrawer
        isOpen={isRecommendDrawerOpen}
        onClose={() => setIsRecommendDrawerOpen(false)}
        onSubmit={(notes, candidateId) => {
          const recommendedLecturer = candidateId === 'amina' 
            ? 'Assoc. Prof. Dr. Amina Malik' 
            : candidateId === 'siti' 
            ? 'Dr. Siti Noor' 
            : candidateId === 'robert'
            ? 'Dr. Robert Chen'
            : 'Dr. Aris Ghaffar';
            
          const lecturerId = candidateId === 'amina' 
            ? 'A004812' 
            : candidateId === 'siti' 
            ? 'A004918' 
            : candidateId === 'robert'
            ? 'A002931'
            : 'A003328';

          const newRec: SubmittedRecommendation = {
            studentId: selectedStudentId,
            studentName: selectedStudentName,
            programme: 'MSc. Computer Science',
            proposedTopic: 'Optimizing Generative Adversarial Networks for Low-Resource Languages',
            recommendedMember: recommendedLecturer,
            recommendedMemberId: lecturerId,
            submittedDate: '29 May 2026',
            status: 'SUBMITTED'
          };

          setSubmittedRecs([newRec, ...submittedRecs]);
          setIsRecommendDrawerOpen(false);
          
          window.scrollTo({ top: 0, behavior: 'smooth' });
          triggerToast(`Recommendation submitted successfully! recommended ${newRec.recommendedMember} for candidate ${newRec.studentName}.`);
        }}
        onSaveDraft={(notes, candidateId) => {
          setIsRecommendDrawerOpen(false);
          triggerToast(`Draft recommendation saved successfully for candidate ${selectedStudentName}.`);
        }}
      />

    </div>
  );
};
