/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  icon: Icon,
  error,
  className = '',
  ...props
}) => {
  return (
    <div id={`wrapper-${id}`} className="w-full flex flex-col text-left mb-5">
      <label id={`label-${id}`} htmlFor={id} className="form-label block">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id}
          className={`form-control form-control-md ${error ? 'form-control-error' : ''} ${Icon ? 'pl-11' : 'pl-4'} pr-4 ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span id={`err-msg-${id}`} className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
          {error}
        </span>
      )}
    </div>
  );
};
