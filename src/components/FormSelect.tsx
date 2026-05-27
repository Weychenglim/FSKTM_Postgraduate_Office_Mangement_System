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
      <label
        id={`select-label-${id}`}
        htmlFor={id}
        className="text-[11px] font-extrabold text-slate-700 tracking-wider mb-2 uppercase"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className={`w-full bg-[#f8fafc] text-slate-800 text-xs rounded-xl border appearance-none ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-slate-200 focus:border-[#0c1424] focus:ring-1 focus:ring-[#0c1424]'
          } pl-4 pr-10 py-3.5 outline-none transition-all duration-200 font-sans font-medium cursor-pointer ${className}`}
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
