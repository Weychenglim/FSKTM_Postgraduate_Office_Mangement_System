/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  onForgotPasswordClick?: () => void;
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  label,
  onForgotPasswordClick,
  error,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div id={`wrapper-${id}`} className="w-full flex flex-col text-left mb-4">
      <div className="flex justify-between items-center mb-2">
        <label 
          id={`label-${id}`} 
          htmlFor={id} 
          className="text-[11px] font-extrabold text-slate-700 tracking-wider uppercase"
        >
          {label}
        </label>
        {onForgotPasswordClick && (
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            Forgot Password?
          </button>
        )}
      </div>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
          <KeyRound className="w-4 h-4" />
        </div>
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className={`w-full bg-[#f8fafc] text-slate-900 placeholder-slate-400 text-sm rounded-xl border ${
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
              : 'border-slate-200 focus:border-[#091124] focus:ring-1 focus:ring-[#091124]'
          } pl-11 pr-11 py-3.5 outline-none transition-all duration-200 font-sans ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && (
        <span id={`err-msg-${id}`} className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
          {error}
        </span>
      )}
    </div>
  );
};
