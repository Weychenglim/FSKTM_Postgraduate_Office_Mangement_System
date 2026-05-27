/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  label,
  error,
  className = '',
  rows = 4,
  ...props
}) => {
  return (
    <div id={`textarea-wrapper-${id}`} className="w-full flex flex-col text-left mb-5">
      <label
        id={`textarea-label-${id}`}
        htmlFor={id}
        className="text-[11px] font-extrabold text-slate-700 tracking-wider mb-2 uppercase"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={`w-full bg-white text-slate-800 text-xs rounded-xl border p-3.5 focus:outline-none transition-all duration-200 font-sans font-medium ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-300 focus:border-[#0c1424] focus:ring-1 focus:ring-[#0c1424]'
        } ${className}`}
        {...props}
      />
      {error && (
        <span id={`textarea-err-${id}`} className="text-xs text-red-500 mt-1.5 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
