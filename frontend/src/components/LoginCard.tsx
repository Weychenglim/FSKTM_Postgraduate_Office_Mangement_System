/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Server, 
  RefreshCw, 
  CheckCircle, 
  ShieldCheck, 
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FormInput } from './FormInput';
import { PasswordInput } from './PasswordInput';
import { ActionButton } from './ActionButton';
import { AlertMessage } from './AlertMessage';
import { DEMO_CREDENTIALS, DemoUser } from '../types';

interface LoginCardProps {
  onForgotPasswordClick?: () => void;
  onLoginSuccess?: (user: DemoUser) => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onForgotPasswordClick, onLoginSuccess }) => {
  // Input states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Validation / status states
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ id?: string; pass?: string }>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Active session status (simulates successful safe authentication)
  const [authenticatedUser, setAuthenticatedUser] = useState<DemoUser | null>(null);

  // Active interaction modal / detail alerts
  const [activeModal, setActiveModal] = useState<'forgot' | 'helpdesk' | 'manual' | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAlert(null);

    let currentErrors: { id?: string; pass?: string } = {};
    if (!identifier.trim()) {
      currentErrors.id = 'Please enter your Email or Student/Staff ID.';
    }
    if (!password) {
      currentErrors.pass = 'Password cannot be blank.';
    }

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      setAlert({ type: 'error', message: 'Credentials verification failed. Please correct fields.' });
      return;
    }

    setIsLoading(true);

    // Simulate verification delay
    setTimeout(() => {
      setIsLoading(false);
      
      // Match with demo credentials
      const cleanId = identifier.trim().toLowerCase();
      const matchKey = Object.keys(DEMO_CREDENTIALS).find(key => {
        const cred = DEMO_CREDENTIALS[key];
        return (
          cred.email.toLowerCase() === cleanId || 
          (cred.user.studentId && cred.user.studentId.toLowerCase() === cleanId) ||
          (cred.user.staffId && cred.user.staffId.toLowerCase() === cleanId)
        );
      });

      if (matchKey && DEMO_CREDENTIALS[matchKey].pass === password) {
        const matched = DEMO_CREDENTIALS[matchKey].user;
        setAuthenticatedUser(matched);
        if (onLoginSuccess) {
          onLoginSuccess(matched);
        }
        setAlert({ 
          type: 'success', 
          message: `Authorization approved! Welcome ${matched.fullName}.` 
        });
      } else {
        // Fallback for generic valid pattern or error
        if (password.length >= 6) {
          // Allow custom input login too
          const customUser: DemoUser = {
            id: 'usr_custom',
            email: identifier.includes('@') ? identifier : `${identifier}@fsktm.edu.my`,
            role: identifier.toLowerCase().includes('staff') || identifier.toLowerCase().includes('admin') ? 'Office Staff/Admin' : 'Student',
            fullName: identifier.split('@')[0],
            department: "Assigned Division"
          };
          setAuthenticatedUser(customUser);
          if (onLoginSuccess) {
            onLoginSuccess(customUser);
          }
          setAlert({ type: 'success', message: 'Session approved under generic credential configuration.' });
        } else {
          setAlert({ 
            type: 'error', 
            message: 'Invalid credentials. Use the Demo Quick-Selectors below to fill correct institutional accounts.' 
          });
        }
      }
    }, 1200);
  };

  const handleDemoPrefill = (roleKey: 'admin' | 'coordinator' | 'lecturer' | 'student') => {
    const creds = DEMO_CREDENTIALS[roleKey];
    setIdentifier(creds.email);
    setPassword(creds.pass);
    setErrors({});
    setAlert({ 
      type: 'info', 
      message: `Loaded valid credentials for "${creds.user.role}". Click Sign In to authorize.` 
    });
  };

  const handleLogout = () => {
    setAuthenticatedUser(null);
    setPassword('');
    setAlert({ type: 'info', message: 'You have logged out safely. Secure token cleared.' });
  };

  return (
    <div id="login-layout-card-container" className="w-full max-w-[490px] flex flex-col gap-6 items-center">
      
      {/* Centered elevated white Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        id="login-main-card" 
        className="w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-100 p-8 md:p-10 text-center relative flex flex-col items-center"
      >
        {/* Floating Locked padlock symbol badge */}
        <div 
          id="padlock-badge" 
          className="w-14 h-14 bg-[#0c1424] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0c1424]/20 -mt-[64px] mb-6 border border-white/10 group hover:scale-105 transition-transform duration-200"
        >
          <Lock id="badge-lock-icon" className="w-5 h-5 text-indigo-300" />
        </div>

        {/* Dynamic Card Interior depending on auth status */}
        <AnimatePresence mode="wait">
          {!authenticatedUser ? (
            <motion.div 
              key="login-form-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col"
            >
              {/* Header Titles */}
              <h2 id="sign-in-header" className="text-[28px] font-extrabold text-[#0c1424] tracking-tight font-sans">
                Sign In
              </h2>
              <p id="sign-in-subtext" className="text-slate-500 text-sm mt-1 mb-6 font-medium">
                Authenticate to access your workspace.
              </p>

              {/* Action/Error Notification messages */}
              {alert && (
                <div className="mb-5">
                  <AlertMessage 
                    type={alert.type} 
                    message={alert.message} 
                    onClose={() => setAlert(null)} 
                  />
                </div>
              )}

              {/* Form elements */}
              <form id="submission-form" onSubmit={handleLoginSubmit} className="w-full flex flex-col">
                <FormInput
                  id="email-or-username"
                  label="Email or Staff / Student ID"
                  icon={User}
                  placeholder="e.g. WEA200192 or admin@fsktm.edu.my"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  error={errors.id}
                  autoComplete="username"
                  required
                />

                <PasswordInput
                  id="user-password"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onForgotPasswordClick={onForgotPasswordClick || (() => setActiveModal('forgot'))}
                  error={errors.pass}
                  autoComplete="current-password"
                  required
                />

                {/* Remember Me line */}
                <div id="additional-controls" className="flex items-center gap-3 mb-6">
                  <label id="checkbox-container text-left" className="flex items-center gap-2.5 cursor-pointer group py-1">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0c1424] focus:ring-[#0c1424] bg-slate-50 checked:bg-[#0c1424] checked:border-transparent transition"
                    />
                    <span className="text-xs text-slate-600 font-semibold group-hover:text-slate-900 select-none transition-colors">
                      Remember me on this device
                    </span>
                  </label>
                </div>

                {/* SIGN IN Action Button */}
                <ActionButton id="login-action-btn" type="submit" isLoading={isLoading}>
                  Sign In
                </ActionButton>
              </form>

              {/* NEED HELP Split division */}
              <div id="card-divider" className="relative flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <span className="relative px-3 bg-white text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase select-none">
                  Need Help?
                </span>
              </div>

              {/* Helpdesk navigation buttons */}
              <p id="helpdesk-block" className="text-xs text-slate-500 leading-normal font-medium px-2">
                For technical assistance, please contact the{' '}
                <button 
                  type="button" 
                  onClick={() => setActiveModal('helpdesk')} 
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  IT Helpdesk
                </button>{' '}
                or consult the{' '}
                <button 
                  type="button" 
                  onClick={() => setActiveModal('manual')} 
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Student Manual
                </button>.
              </p>
            </motion.div>
          ) : (
            /* Secure Approved State view (replaces form upon login, fulfilling single page limits while confirming operation) */
            <motion.div 
              key="auth-success-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col text-left py-2"
            >
              <div className="flex flex-col items-center text-center pb-4 mb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-xl font-extrabold text-[#0c1424]">Secure Session Established</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Successfully authorized as a portal member</p>
              </div>

              <div className="space-y-3 mb-6 bg-[#f8fafc] p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Full Name:</span>
                  <span className="text-slate-900 font-bold">{authenticatedUser.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Portal Role:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {authenticatedUser.role}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Department / Course:</span>
                  <span className="text-slate-900 font-bold max-w-[200px] text-right truncate" title={authenticatedUser.department}>
                    {authenticatedUser.department}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Identity Code:</span>
                  <span className="text-slate-700 font-mono font-semibold">
                    {authenticatedUser.studentId || authenticatedUser.staffId || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/50">
                  <span className="text-slate-500 font-medium">Session token:</span>
                  <span className="text-emerald-600 font-mono text-[9px] font-bold">SHA256_SECURE_GRANTED</span>
                </div>
              </div>

              {/* Informative alert inside card */}
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-slate-700 mb-6 flex gap-2.5 items-start">
                <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-medium">
                  <strong>Standard Redirect Paused:</strong> To keep design layouts faithful to the Login reference specification, you are initialized inside this interactive session console. Back-office access is certified.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-3.5 bg-slate-950 text-white rounded-xl text-xs font-extrabold tracking-widest uppercase hover:bg-slate-800 transition shadow-sm cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                Sign Out & Terminate Session
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Absolute modal overlays inside login card container */}
        <AnimatePresence>
          {activeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 rounded-3xl p-8 flex flex-col justify-center items-center z-30"
            >
              {activeModal === 'forgot' && (
                <div className="w-full flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-orange-500" />
                  </div>
                  <h4 className="font-extrabold text-[#0c1424] text-lg">Password Recovery</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed font-normal">
                    To maintain FSKTM administration guidelines, please contact the postgraduate office desk with your registered Staff ID / Student Matric card to request password resets.
                  </p>
                  <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 text-left w-full text-[11px]">
                    <span className="text-slate-400 font-medium block">Office Email:</span>
                    <span className="text-slate-800 font-bold block mb-1.5">postgrad.fsktm@edu.my</span>
                    <span className="text-slate-400 font-medium block">Support Line:</span>
                    <span className="text-slate-800 font-bold block">+603-7967 6316</span>
                  </div>
                </div>
              )}

              {activeModal === 'helpdesk' && (
                <div className="w-full flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#e0f2fe] flex items-center justify-center mb-4">
                    <Server className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-extrabold text-[#0c1424] text-lg">IT Helpdesk Contact</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed font-normal">
                    The FSKTM Tech Support is cataloged to assist with student and staff account provisioning, single sign-on issues, and database interruptions.
                  </p>
                  <div className="mt-5 text-left w-full space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-500">Operation:</span><span className="font-semibold">Mon - Fri (8AM - 5PM)</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Service Counter:</span><span className="font-semibold">Block A, Level 2 Lab Office</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">IP Ext:</span><span className="font-mono text-blue-600 font-semibold">ext-4902</span></div>
                  </div>
                </div>
              )}

              {activeModal === 'manual' && (
                <div className="w-full flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-indigo-500" />
                  </div>
                  <h4 className="font-extrabold text-[#0c1424] text-lg">Student Manual Archive</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed font-normal">
                    Download the latest guidebooks detailing postgraduate procedures, thesis defense requirements, online registration steps, and grading scales for coursework modules.
                  </p>
                  <div className="mt-4 flex gap-2 w-full">
                    <a 
                      href="#download-manual" 
                      onClick={(e) => { e.preventDefault(); alert("Student Manual (PDF) download initiated in backend."); }} 
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold text-center block"
                    >
                      Download (PDF)
                    </a>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="mt-6 text-xs text-slate-500 font-bold hover:text-slate-800 transition cursor-pointer"
              >
                Close Guidance Window
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Online Status / Capsule badges row centered underneath login card */}
      <div id="status-badges-footer" className="w-full flex flex-col gap-2.5 items-center select-none">
        
        {/* Row 1 Status Capsules */}
        <div className="flex items-center gap-2">
          {/* Capsule 1: System status */}
          <div 
            id="status-capsule-online" 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f9ff]/90 border border-[#e0f2fe]/60 rounded-full text-[10px] font-extrabold text-sky-800 uppercase tracking-widest shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>

          {/* Capsule 2: Sync status */}
          <div 
            id="status-capsule-sync" 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f8fafc] border border-slate-200/50 rounded-full text-[10px] font-extrabold text-slate-500 uppercase tracking-widest shadow-xs"
          >
            <RefreshCw className="w-3 h-3 text-slate-400 rotate-smooth" />
            Updated Today
          </div>
        </div>

        {/* Row 2 Lock Capsule centered beneath */}
        <div 
          id="status-capsule-ssl" 
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50/70 border border-indigo-100/40 rounded-full text-[10px] font-extrabold text-[#1f2937] uppercase tracking-widest shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          SSL Secured
        </div>
      </div>

      {/* Interactive Developer Prefiller Demo Console */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        id="dev-demo-console" 
        className="w-full bg-[#0c1424]/90 border border-[#1a2c54]/30 p-5 rounded-2xl text-left shadow-lg backdrop-blur-sm"
      >
        <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest block mb-2.5">
          🔑 Portal Testing console (Interactive prefiller)
        </span>
        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
          Select any of the 4 FSKTM institutional roles below to instantly populate corresponding secure credentials:
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleDemoPrefill('student')}
            className={`px-3 py-2 text-left rounded-lg transition-all border text-xs cursor-pointer ${
              identifier === DEMO_CREDENTIALS.student.email 
                ? 'bg-indigo-950 text-indigo-200 border-indigo-550 ring-1 ring-indigo-500'
                : 'bg-white/[0.04] text-white border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            <span className="font-bold block text-[10px] text-indigo-300">1. Student</span>
            <span className="text-[9px] text-slate-400 block font-mono">WEA200192</span>
          </button>

          <button
            type="button"
            onClick={() => handleDemoPrefill('lecturer')}
            className={`px-3 py-2 text-left rounded-lg transition-all border text-xs cursor-pointer ${
              identifier === DEMO_CREDENTIALS.lecturer.email 
                ? 'bg-indigo-950 text-indigo-200 border-indigo-550 ring-1 ring-indigo-500'
                : 'bg-white/[0.04] text-white border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            <span className="font-bold block text-[10px] text-indigo-300">2. Lecturer</span>
            <span className="text-[9px] text-slate-400 block font-mono">Lecturer Account</span>
          </button>

          <button
            type="button"
            onClick={() => handleDemoPrefill('admin')}
            className={`px-3 py-2 text-left rounded-lg transition-all border text-xs cursor-pointer ${
              identifier === DEMO_CREDENTIALS.admin.email 
                ? 'bg-indigo-950 text-indigo-200 border-indigo-550 ring-1 ring-indigo-500'
                : 'bg-white/[0.04] text-white border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            <span className="font-bold block text-[10px] text-indigo-300">3. Office Staff/Admin</span>
            <span className="text-[9px] text-slate-400 block font-mono">Admin Center</span>
          </button>

          <button
            type="button"
            onClick={() => handleDemoPrefill('coordinator')}
            className={`px-3 py-2 text-left rounded-lg transition-all border text-xs cursor-pointer ${
              identifier === DEMO_CREDENTIALS.coordinator.email 
                ? 'bg-indigo-950 text-indigo-200 border-indigo-550 ring-1 ring-indigo-500'
                : 'bg-white/[0.04] text-white border-white/[0.08] hover:bg-white/[0.08]'
            }`}
          >
            <span className="font-bold block text-[10px] text-indigo-300">4. Coordinator</span>
            <span className="text-[9px] text-slate-400 block font-mono">Prog. Coordinator</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
