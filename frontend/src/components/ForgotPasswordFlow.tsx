/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Send,
  ChevronLeft,
  Check,
  Info,
  RotateCw,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authApi, ApiError } from '../services';

// ==================== PATTERN COMPONENTS ====================

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Standardized gradient page container with centering system for uncompromised clean look.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div 
      id="forgot-password-layout-root" 
      className="min-h-screen w-full bg-[#f8fafc] bg-gradient-to-br from-[#f1f5f9] via-[#f8fafc] to-[#e2e8f0]/40 flex flex-col justify-center items-center py-10 px-4 font-sans select-none relative overflow-hidden"
    >
      {/* Abstract subtle artistic lighting dots */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-100/20 rounded-full blur-3xl pointer-events-none -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-emerald-50/20 rounded-full blur-3xl pointer-events-none -ml-48 -mb-48" />

      <div className="w-full max-w-[490px] relative z-10 flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
};

interface BackLinkProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * Clean floating navigation links back to standard portal Sign In screens.
 */
export const BackLink: React.FC<BackLinkProps> = ({ onClick, label = "Back to Sign In", className = "" }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group px-1 py-1 text-xs text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-2 transition-all duration-200 cursor-pointer self-start select-none ${className}`}
    >
      <ChevronLeft className="w-4 h-4 stroke-[2.5] transform transition-transform duration-250 group-hover:-translate-x-0.5" />
      <span>{label}</span>
    </button>
  );
};

interface AuthCardProps {
  id?: string;
  badgeIcon?: React.ComponentType<any>;
  badgeBgClass?: string;
  badgeIconClass?: string;
  badgeCircle?: boolean; // True to render circular badge (for success), false for squire card badge (for lock)
  children: React.ReactNode;
}

/**
 * Uniform white card frame for clean focus block separation.
 */
export const AuthCard: React.FC<AuthCardProps> = ({ 
  id = "auth-card",
  badgeIcon: BadgeIcon,
  badgeBgClass = "bg-[#0c1424]",
  badgeIconClass = "text-indigo-300",
  badgeCircle = false,
  children
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      id={id}
      className="w-full bg-white rounded-[2rem] border border-slate-100 p-8 md:p-10 text-center relative flex flex-col items-center shadow-[0_20px_50px_rgba(15,23,42,0.04)]"
    >
      {/* Floating Header Badge */}
      {BadgeIcon && (
        <div 
          className={`shrink-0 flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-[1.03] ${
            badgeCircle 
              ? `w-14 h-14 bg-[#e6fbf2] border border-[#bef5db] rounded-full text-[#00a15c] mb-6`
              : `w-14 h-14 ${badgeBgClass} border border-white/10 rounded-2xl -mt-[68px] mb-6 shadow-indigo-950/15`
          }`}
        >
          <BadgeIcon className={badgeCircle ? "w-6 h-6 stroke-[3]" : `w-5 h-5 ${badgeIconClass}`} />
        </div>
      )}
      <div className="w-full flex flex-col">
        {children}
      </div>
    </motion.div>
  );
};

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  error?: string;
  required?: boolean;
}

/**
 * Custom text/email inputs with specific UM styling matches.
 */
export const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  icon: Icon,
  error,
  required,
  className = "",
  type,
  ...props
}) => {
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  // For password fields, swap the input type when the eye toggle is on.
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div id={`auth-input-wrapper-${id}`} className="w-full flex flex-col text-left mb-6">
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-2 select-none font-sans font-extrabold"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <Icon className="w-4 h-4 stroke-[2]" />
          </div>
        )}
        <input
          id={id}
          type={inputType}
          className={`w-full bg-[#f8fafc] text-slate-800 placeholder-slate-400 text-xs font-bold rounded-xl border px-4 py-3.5 outline-none transition-all duration-200 font-sans ${
            error
              ? "border-red-350 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-slate-205 focus:border-[#0c1424] focus:ring-1 focus:ring-[#0c1424]"
          } ${Icon ? 'pl-11' : 'pl-4'} ${isPassword ? 'pr-11' : ''} ${className}`}
          required={required}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4 stroke-[2]" /> : <Eye className="w-4 h-4 stroke-[2]" />}
          </button>
        )}
      </div>
      {error && (
        <span className="text-[10px] text-red-500 mt-1.5 font-bold font-sans">
          {error}
        </span>
      )}
    </div>
  );
};

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  icon?: React.ComponentType<any>;
  iconRight?: React.ComponentType<any>;
  isLoading?: boolean;
}

/**
 * Reusable visually consistent button component for primary administrative operations.
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  variant = 'primary',
  icon: Icon,
  iconRight: IconRight,
  isLoading = false,
  className = '',
  ...props
}) => {
  const baseStyle = "w-full py-3.5 px-6 rounded-xl font-extrabold uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 select-none transition-all duration-200 transform cursor-pointer";
  const styles = {
    primary: "bg-[#0c1424] text-white hover:bg-[#1a2b4b] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#0c1424]/30 shadow-md",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-100 shadow-3xs"
  };

  return (
    <button
      disabled={isLoading || props.disabled}
      className={`${baseStyle} ${styles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-indigo-300" />
          <span>Processing Link...</span>
        </div>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 stroke-[2]" />}
          <span>{children}</span>
          {IconRight && <IconRight className="w-3.5 h-3.5 stroke-[2.5]" />}
        </>
      )}
    </button>
  );
};

interface InfoMessageProps {
  message: string;
  icon?: React.ComponentType<any>;
}

/**
 * Gray informational callout system.
 */
export const InfoMessage: React.FC<InfoMessageProps> = ({ 
  message, 
  icon: Icon = Info 
}) => {
  return (
    <div className="w-full text-left p-4.5 bg-[#f8fafc]/90 border border-slate-100 rounded-2xl flex gap-3.5 items-start mt-6 select-none shadow-3xs">
      <div className="p-1 rounded-md text-slate-400 shrink-0">
        <Icon className="w-4.5 h-4.5 stroke-[2.5]" />
      </div>
      <p className="text-[10px] sm:text-[10.5px] text-slate-500 font-bold leading-relaxed font-sans">
        {message}
      </p>
    </div>
  );
};

interface FooterTextProps {
  text?: string;
}

/**
 * Institutional copyright string perfectly aligned matching administrative requirements.
 */
export const FooterText: React.FC<FooterTextProps> = ({ 
  text = "FSKTM Postgraduate Office System — Universiti Malaya" 
}) => {
  return (
    <p className="text-[10px] font-bold text-slate-400/90 tracking-wide mt-6 font-sans select-none">
      {text}
    </p>
  );
};

// ==================== MAIN GRAPHICAL SCREENS ====================

interface ForgotPasswordFlowProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordFlow: React.FC<ForgotPasswordFlowProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handlePostRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!email) {
      setErrorText('Please enter your institutional email address.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorText('Please enter a valid official email format (e.g. name@um.edu.my).');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.requestPasswordReset(email.trim());
      setIsSubmitted(true);
    } catch (err) {
      setErrorText(
        err instanceof ApiError ? err.message : 'Cannot reach the server. Please try again shortly.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setErrorText('');
    try {
      await authApi.requestPasswordReset(email.trim());
      alert('A new security reset link has been dispatched to your inbox.');
    } catch {
      setErrorText('Cannot reach the server. Please try again shortly.');
    } finally {
      setIsLoading(false);
    }
  };

  const openMailClient = () => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <AuthLayout>
      {/* Universal Floating Back link at Page Top Left */}
      <BackLink onClick={onBackToLogin} className="mb-2 pl-1 text-[#2563eb] self-start" />

      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.div
            key="forgot-password"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* SCREEN 1: FORGOT PASSWORD */}
            <AuthCard 
              id="forgot-password-card" 
              badgeIcon={Lock}
            >
              <h2 className="text-xl sm:text-2xl font-black text-[#0c1424] tracking-tight font-sans">
                Forgot Password
              </h2>
              <p className="text-[11.5px] sm:text-[12px] text-slate-500 font-bold mt-1.5 mb-8 leading-relaxed font-sans px-2">
                Enter your registered email address and we will send you a password reset link
              </p>

              <form onSubmit={handlePostRequest} className="w-full text-left">
                <FormInput
                  id="forgot-email"
                  label="Email Address"
                  type="email"
                  icon={Mail}
                  placeholder="your.email@um.edu.my"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errorText}
                  autoComplete="email"
                  required
                />

                <ActionButton 
                  type="submit" 
                  isLoading={isLoading} 
                  iconRight={Send}
                  className="mt-2"
                >
                  Send Reset Link
                </ActionButton>
              </form>

              {/* Card internal Divider */}
              <div className="relative flex items-center justify-center my-6 select-none">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <span className="relative px-3 bg-white text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                  or
                </span>
              </div>

              {/* Secondary Back to login button */}
              <button 
                type="button"
                onClick={onBackToLogin}
                className="text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider self-center mb-1 cursor-pointer select-none"
              >
                Back to Sign In
              </button>

              {/* Informative notice box */}
              <InfoMessage 
                message="If you do not receive an email within 5 minutes please check your spam folder or contact your Office Staff directly" 
                icon={Info}
              />

              {/* Footer system disclaimer */}
              <FooterText />
            </AuthCard>
          </motion.div>
        ) : (
          <motion.div
            key="reset-email-sent"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* SCREEN 2: SUCCESS STATE CARD */}
            <AuthCard 
              id="success-state-card" 
              badgeIcon={Check}
              badgeCircle={true}
            >
              <h2 className="text-xl sm:text-2xl font-black text-[#0c1424] tracking-tight font-sans">
                Email Sent Successfully
              </h2>
              
              <div className="text-slate-600 text-xs sm:text-[12.5px] leading-relaxed font-semibold mt-4 mb-6 font-sans px-1">
                A password reset link has been sent to{" "}
                <strong className="text-slate-900 font-extrabold break-all">{email || "your.email@um.edu.my"}</strong>. 
                Please check your inbox and follow the instructions to reset your password.
                
                <p className="text-[10px] sm:text-[10.5px] text-slate-450 font-extrabold text-[#748094] mt-2.5">
                  The reset link will expire in 30 minutes.
                </p>
              </div>

              <div className="w-full flex flex-col gap-3.5">
                <ActionButton 
                  type="button" 
                  onClick={openMailClient}
                  icon={Mail}
                >
                  Open Email App
                </ActionButton>

                <ActionButton 
                  type="button" 
                  variant="secondary"
                  onClick={handleResend}
                  isLoading={isLoading}
                  icon={RotateCw}
                >
                  Resend Reset Link
                </ActionButton>
              </div>

              {/* Expiry guidance check info box */}
              <InfoMessage 
                message="Didn't receive the email? Check your spam folder or try resending after a few minutes." 
                icon={Info}
              />

              {/* Footer system disclaimer */}
              <FooterText />
            </AuthCard>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};
