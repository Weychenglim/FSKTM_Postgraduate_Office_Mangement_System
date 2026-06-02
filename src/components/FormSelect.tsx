/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  options: Option[];
  error?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  id,
  label,
  options,
  error,
  className = '',
  ...props
}) => {
  return (
    <div id={`select-wrapper-${id}`} className="w-full flex flex-col text-left mb-5">
      <label id={`select-label-${id}`} htmlFor={id} className="form-label block">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className={`form-control form-control-md appearance-none pr-10 cursor-pointer ${error ? 'form-control-error' : ''} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom arrow decoration icon */}
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <span id={`select-err-${id}`} className="text-xs text-red-500 mt-1.5 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
